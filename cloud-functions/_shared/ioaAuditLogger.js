/**
 * Game IOA Agent behavior audit module.
 *
 * This module builds structured audit events for each parent-AI turn. It only
 * records safety metadata such as scores, trust deltas, safety flags,
 * anonymizer status, and agent summaries. It must never store raw player input,
 * raw history text, API keys, or other credentials.
 */

export function buildIoaAuditEvent({
  payload,
  sanitizedPayload,
  privacyGuard,
  evaluation,
  provider,
  model,
  error,
}) {
  const session = payload && typeof payload === 'object' ? payload : {};
  const result = evaluation?.result ?? {};
  const hasEvaluation = Boolean(evaluation && !error);

  const trustBefore = numberOrNull(session.trust);
  const trustDelta = numberOrNull(result.trustDelta);
  const safetyFlag = typeof result.safetyFlag === 'string' ? result.safetyFlag : null;
  const harmfulStreak = numberOrNull(result.harmfulStreak);
  const schemaValid = checkSchemaValid(evaluation);

  const event = {
    eventType: 'parent_ai_turn',
    recordedAt: new Date().toISOString(),
    sessionId: typeof session.id === 'string' ? session.id : null,
    week: numberOrNull(session.week),
    runtime: 'edgeone_pages_cloud_functions',
    provider,
    model,
    turnCountBefore: numberOrNull(session.turnCount),
    trustBefore,
    trustDelta,
    trustAfter: trustBefore !== null && trustDelta !== null
      ? clamp(trustBefore + trustDelta, 0, 100)
      : null,
    score: numberOrNull(result.score),
    safetyFlag,
    harmfulStreak,
    shouldEnd: typeof result.shouldEnd === 'boolean' ? result.shouldEnd : null,
    endReason: typeof result.endReason === 'string' ? result.endReason : null,
    privacyGuard: privacyGuard ? sanitizePrivacyGuardForAudit(privacyGuard) : null,
    agentTraceSummary: buildTraceSummary(evaluation),
    schemaValid,
    fallbackUsed: privacyGuard?.provider === 'has-anonymizer-fallback',
    sanitizedInputPresent: Boolean(sanitizedPayload?.playerReply),
    anomalyFlags: [],
  };

  event.anomalyFlags = detectAnomalyFlags({
    isHarmfulResponse: safetyFlag === 'harmful' || (harmfulStreak ?? 0) >= 2,
    privacyGuard,
    safetyFlag,
    trustDelta,
    hasEvaluation,
    schemaValid,
  });

  if (error) {
    event.anomalyFlags.push('model_error');
    event.modelError = truncate(error.message ?? error, 200);
  }

  return event;
}

export async function appendIoaAuditEvent(auditEvent) {
  const endpoint = process.env.IOA_AUDIT_ENDPOINT;
  if (!endpoint) {
    return { recorded: true, sink: 'response_only' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditEvent),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return {
      recorded: response.ok,
      sink: 'external_endpoint',
      status: response.status,
    };
  } catch {
    return {
      recorded: false,
      sink: 'external_endpoint',
      error: 'audit_endpoint_failed',
    };
  }
}

export function buildIoaAuditResponse(auditEvent, writeResult = { recorded: true, sink: 'response_only' }) {
  return {
    recorded: Boolean(writeResult.recorded),
    eventType: auditEvent.eventType,
    anomalyFlags: auditEvent.anomalyFlags ?? [],
    originalTextStored: false,
    schemaValid: auditEvent.schemaValid,
    fallbackUsed: auditEvent.fallbackUsed,
    sink: writeResult.sink ?? 'response_only',
  };
}

function buildTraceSummary(evaluation) {
  if (!evaluation?.evaluatorRuns?.length) return [];

  return evaluation.evaluatorRuns.map((run) => ({
    agentId: run.profile?.id ?? 'unknown',
    label: run.profile?.label ?? 'unknown',
    score: numberOrNull(run.result?.score),
    trustDelta: numberOrNull(run.result?.trustDelta),
    safetyFlag: run.result?.safetyFlag ?? null,
    shouldEndRecommendation: run.result?.shouldEndRecommendation ?? null,
    durationMs: numberOrNull(run.timing?.durationMs),
  }));
}

function checkSchemaValid(evaluation) {
  const result = evaluation?.result;
  if (!result || typeof result !== 'object') return false;

  const requiredFields = ['score', 'parentReply', 'trustDelta'];
  for (const field of requiredFields) {
    if (result[field] === undefined || result[field] === null) return false;
  }

  return Number.isFinite(Number(result.score))
    && typeof result.parentReply === 'string'
    && result.parentReply.trim().length > 0;
}

function detectAnomalyFlags({
  isHarmfulResponse,
  privacyGuard,
  safetyFlag,
  trustDelta,
  hasEvaluation,
  schemaValid,
}) {
  const flags = [];

  if (isHarmfulResponse) flags.push('harmful_response');
  if (privacyGuard?.piiTypes?.length) flags.push('privacy_risk');
  if (['medical', 'medical_risk', 'clinical_risk'].includes(safetyFlag)) flags.push('medical_risk');
  if (['irrelevant', 'off_topic'].includes(safetyFlag)) flags.push('irrelevant_input');
  if (Number.isFinite(trustDelta) && Math.abs(trustDelta) > 15) flags.push('large_trust_delta');
  if (!privacyGuard || privacyGuard.enabled !== true) flags.push('missing_privacy_guard');
  if (hasEvaluation && !schemaValid) flags.push('invalid_agent_output');

  return flags;
}

function sanitizePrivacyGuardForAudit(privacyGuard) {
  return {
    enabled: Boolean(privacyGuard.enabled),
    provider: privacyGuard.provider ?? null,
    piiTypes: Array.isArray(privacyGuard.piiTypes) ? [...privacyGuard.piiTypes] : [],
    piiSummary: Array.isArray(privacyGuard.piiSummary) ? [...privacyGuard.piiSummary] : [],
    originalTextStored: privacyGuard.originalTextStored === false ? false : Boolean(privacyGuard.originalTextStored),
  };
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function truncate(value, maxLen = 200) {
  const text = String(value ?? '');
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}
