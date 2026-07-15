import {
  evaluateParentTurnWithAgents,
} from '../../parent-ai-core/agentEnsemble.mjs';
import {
  applyParentTurnResult,
  buildParentTurnPayload,
  createParentAiSession,
} from '../../parent-ai-core/session.js';
import {
  sanitizeTurnPayload,
  getAnonymizerStatus,
} from './anonymizerAdapter.js';
import {
  appendIoaAuditEvent,
  buildIoaAuditEvent,
  buildIoaAuditResponse,
} from './ioaAuditLogger.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function getEnv(context, name) {
  return context?.env?.[name] ?? process.env[name];
}

function getProvider(context) {
  return String(
    getEnv(context, 'AI_PROVIDER')
      ?? (getEnv(context, 'DEEPSEEK_API_KEY') ? 'deepseek' : 'gemini'),
  ).toLowerCase();
}

function getModel(context, provider) {
  if (provider === 'deepseek') {
    return getEnv(context, 'DEEPSEEK_MODEL') || 'deepseek-v4-flash';
  }
  return getEnv(context, 'GEMINI_MODEL') || 'gemini-3.5-flash';
}

function getApiKey(context, provider) {
  return provider === 'deepseek'
    ? getEnv(context, 'DEEPSEEK_API_KEY')
    : getEnv(context, 'GEMINI_API_KEY');
}

function getBaseUrl(context, provider) {
  return provider === 'deepseek'
    ? getEnv(context, 'DEEPSEEK_BASE_URL') || 'https://api.deepseek.com'
    : undefined;
}

function providerLabel(provider) {
  if (provider === 'deepseek') return 'DeepSeek';
  if (provider === 'gemini') return 'Gemini';
  return provider;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

async function readJsonRequest(context) {
  const request = context?.request ?? context;
  if (!request?.json) return {};
  return request.json();
}

function getRuntimeConfig(context) {
  const provider = getProvider(context);
  const model = getModel(context, provider);
  const apiKey = getApiKey(context, provider);
  const baseUrl = getBaseUrl(context, provider);
  return { provider, model, apiKey, baseUrl };
}

function missingKeyError(provider) {
  const envName = provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : 'GEMINI_API_KEY';
  return `${envName} is not set. Parent AI turn requires API mode.`;
}

function buildAgentTrace(evaluation) {
  return evaluation.evaluatorRuns.map((run) => ({
    id: run.profile.id,
    label: run.profile.label,
    score: run.result.score,
    trustDelta: run.result.trustDelta,
    safetyFlag: run.result.safetyFlag,
    shouldEndRecommendation: run.result.shouldEndRecommendation,
    hasSubstantiveOpenQuestion: run.result.hasSubstantiveOpenQuestion,
    endReason: run.result.endReason,
    missingTaskIds: run.result.missingTaskIds,
    timing: run.timing,
  }));
}

async function buildAndRecordIoaAudit({
  turnPayload,
  sanitizedPayload,
  privacyGuard,
  evaluation,
  provider,
  model,
  error,
}) {
  try {
    const auditEvent = buildIoaAuditEvent({
      payload: turnPayload,
      sanitizedPayload,
      privacyGuard,
      evaluation,
      provider: providerLabel(provider),
      model,
      error,
    });
    const writeResult = await appendIoaAuditEvent(auditEvent);
    return buildIoaAuditResponse(auditEvent, writeResult);
  } catch {
    return { recorded: false, error: 'audit_build_failed', originalTextStored: false };
  }
}

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function handleStatus(context) {
  const { provider, model, apiKey, baseUrl } = getRuntimeConfig(context);
  return jsonResponse({
    provider: providerLabel(provider),
    hasKey: Boolean(apiKey),
    model,
    baseUrl,
    mode: apiKey ? 'agent_ensemble' : 'missing_api_key',
    sharedCore: true,
    runtime: 'edgeone_pages_cloud_functions',
    agentArchitecture: 'parent-turn: 2 evaluator agents + 1 aggregator reply generator',
    anonymizer: getAnonymizerStatus(),
    ioaAudit: {
      enabled: true,
      module: 'ioaAuditLogger',
      anomalyFlags: [
        'harmful_response',
        'privacy_risk',
        'medical_risk',
        'irrelevant_input',
        'large_trust_delta',
        'model_error',
        'missing_privacy_guard',
        'invalid_agent_output',
      ],
      originalTextStored: false,
      externalSink: Boolean(process.env.IOA_AUDIT_ENDPOINT),
    },
  });
}

export async function handleParentAiStart(context) {
  let payload;
  try {
    payload = await readJsonRequest(context);
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
  }

  try {
    return jsonResponse({
      session: createParentAiSession(payload),
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 400);
  }
}

export async function handleParentAiTurn(context) {
  const { provider, model, apiKey, baseUrl } = getRuntimeConfig(context);
  if (!apiKey) {
    return jsonResponse({ error: missingKeyError(provider) }, 400);
  }

  let payload;
  try {
    payload = await readJsonRequest(context);
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
  }

  const turnPayload = payload.session && typeof payload.playerReply === 'string'
    ? buildParentTurnPayload(payload.session, payload.playerReply)
    : payload.payload ?? payload;

  // --- HaS-Anonymizer 脱敏层 ---
  const { payload: sanitizedPayload, privacyGuard } = await sanitizeTurnPayload(turnPayload);

  // --- IOA Agent 行为审计（先声明，确保 error 分支也可用） ---
  let ioaAudit = null;

  try {
    const evaluation = await evaluateParentTurnWithAgents(sanitizedPayload, {
      provider,
      apiKey,
      model,
      baseUrl,
    });

    ioaAudit = await buildAndRecordIoaAudit({
      turnPayload,
      sanitizedPayload,
      privacyGuard,
      evaluation,
      provider,
      model,
    });

    const body = {
      result: evaluation.result,
      agentTrace: buildAgentTrace(evaluation),
      privacyGuard,
      ioaAudit,
    };

    if (payload.session && typeof payload.playerReply === 'string') {
      // 使用脱敏后的 playerReply 存入 session，原始敏感文本不保存
      body.session = applyParentTurnResult(payload.session, evaluation.result, sanitizedPayload.playerReply);
    }

    return jsonResponse(body);
  } catch (error) {
    ioaAudit = await buildAndRecordIoaAudit({
      turnPayload,
      sanitizedPayload,
      privacyGuard,
      evaluation: null,
      provider,
      model,
      error,
    });

    return jsonResponse({
      error: error.message,
      privacyGuard,
      ioaAudit,
    }, 502);
  }
}
