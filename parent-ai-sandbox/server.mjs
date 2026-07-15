import 'dotenv/config';
import { createServer } from 'node:http';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { extname, isAbsolute, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateParentTurnWithAgents,
  formatPlaytestReport,
  runAgentPlaytest,
} from '../parent-ai-core/agentEnsemble.mjs';
import {
  applyParentTurnResult,
  buildParentTurnPayload,
  createParentAiSession,
} from '../parent-ai-core/session.js';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const traceLogDir = join(rootDir, '..', 'tmp');
const traceLogPath = join(traceLogDir, 'parent-ai-traces.jsonl');
const port = Number(process.env.PORT || 5178);
const provider = (process.env.AI_PROVIDER || (process.env.DEEPSEEK_API_KEY ? 'deepseek' : 'gemini')).toLowerCase();
const model = provider === 'deepseek'
  ? process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
  : process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const deepSeekBaseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

function activeApiKey() {
  return provider === 'deepseek'
    ? process.env.DEEPSEEK_API_KEY
    : process.env.GEMINI_API_KEY;
}

function providerLabel() {
  if (provider === 'deepseek') return 'DeepSeek';
  if (provider === 'gemini') return 'Gemini';
  return provider;
}

function compactAgentTrace(evaluation) {
  return (evaluation?.evaluatorRuns ?? []).map((run) => ({
    id: run.profile?.id,
    label: run.profile?.label,
    score: run.result?.score,
    trustDelta: run.result?.trustDelta,
    safetyFlag: run.result?.safetyFlag,
    shouldEndRecommendation: run.result?.shouldEndRecommendation,
    hasSubstantiveOpenQuestion: run.result?.hasSubstantiveOpenQuestion,
    timing: run.timing,
  }));
}

async function appendParentAiTrace({ route, payload, evaluation, responseBody, error }) {
  const result = evaluation?.result ?? responseBody?.result ?? responseBody ?? {};
  const sessionBefore = payload?.session;
  const sessionAfter = responseBody?.session;
  const traceEntry = {
    recordedAt: new Date().toISOString(),
    route,
    provider: providerLabel(),
    model,
    sessionId: sessionBefore?.id ?? sessionAfter?.id ?? null,
    topicId: result?.timingTrace?.topicId
      ?? sessionBefore?.topics?.[0]?.id
      ?? payload?.topics?.[0]?.id
      ?? null,
    choiceId: result?.timingTrace?.choiceId
      ?? sessionBefore?.topics?.[0]?.selectedOutcome?.choiceId
      ?? payload?.topics?.[0]?.selectedOutcome?.choiceId
      ?? null,
    turnCountBefore: sessionBefore?.turnCount ?? payload?.turnCount ?? null,
    trustBefore: sessionBefore?.trust ?? payload?.trust ?? result?.timingTrace?.trustBefore ?? null,
    trustDelta: result?.trustDelta ?? null,
    trustAfter: sessionAfter?.trust ?? result?.timingTrace?.trustAfter ?? null,
    score: result?.score ?? null,
    shouldEnd: result?.shouldEnd ?? null,
    endReason: result?.endReason ?? null,
    safetyFlag: result?.safetyFlag ?? null,
    hasSubstantiveOpenQuestion: result?.hasSubstantiveOpenQuestion ?? result?.timingTrace?.hasSubstantiveOpenQuestion ?? null,
    playerReply: payload?.playerReply ?? payload?.currentPlayerReply ?? null,
    parentReply: result?.parentReply ?? null,
    timingTrace: result?.timingTrace ?? evaluation?.timingTrace ?? null,
    evaluatorTrace: compactAgentTrace(evaluation),
    error: error ? {
      message: error.message,
      name: error.name,
    } : null,
  };

  try {
    await mkdir(traceLogDir, { recursive: true });
    await appendFile(traceLogPath, `${JSON.stringify(traceEntry)}\n`, 'utf8');
  } catch {
    // Trace logging must never break gameplay.
  }
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Legacy reference retained for old trace comparison only. Runtime evaluation imports
// its schema and prompts from parent-ai-core/agentEnsemble.mjs; do not reuse this block.
const responseSchema = {
  type: 'object',
  properties: {
    score: { type: 'number' },
    trustDelta: { type: 'number' },
    parentMood: { type: 'string', enum: ['trusting', 'uncertain', 'upset'] },
    parentReply: { type: 'string' },
    coachFeedback: { type: 'string' },
    taskAssessments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            enum: ['emotional_facts', 'professional_reframe', 'action_partnership'],
          },
          status: { type: 'string', enum: ['missing', 'partial', 'complete'] },
          evidence: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['id', 'status', 'evidence', 'reason'],
      },
    },
    completedTaskIds: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['emotional_facts', 'professional_reframe', 'action_partnership'],
      },
    },
    missingTaskIds: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['emotional_facts', 'professional_reframe', 'action_partnership'],
      },
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
    },
    risks: {
      type: 'array',
      items: { type: 'string' },
    },
    harmfulStreak: { type: 'number' },
    harmfulSignalHistory: {
      type: 'array',
      items: { type: 'string' },
    },
    shouldEnd: { type: 'boolean' },
    endReason: { type: 'string', enum: ['resolved', 'failed', 'irrelevant', 'max_turns', 'continue'] },
    isIrrelevant: { type: 'boolean' },
    safetyFlag: { type: 'string', enum: ['none', 'caution', 'medical', 'privacy', 'harmful', 'irrelevant'] },
  },
  required: [
    'score',
    'trustDelta',
    'parentMood',
    'parentReply',
    'coachFeedback',
    'taskAssessments',
    'completedTaskIds',
    'missingTaskIds',
    'strengths',
    'risks',
    'harmfulStreak',
    'harmfulSignalHistory',
    'shouldEnd',
    'endReason',
    'isIrrelevant',
    'safetyFlag',
  ],
};

const systemPrompt = `
你是《星星照护所》家长沟通系统的临床教育取向评分器。

你的任务：
1. 根据本周触发的特殊事件、家长沟通风格、历史对话、已完成任务和玩家回复，判断玩家回复是否专业。
2. 判定这句回复完成了哪些沟通任务、还缺哪些任务、是否可以提前结束。
3. 生成家长下一句自然回应，同时给出教练式反馈。
4. 回复必须只输出符合 JSON schema 的对象。

沟通不是固定四轮。最多4次玩家回复只是上限，不是必须走满。
如果玩家一条回复已经高质量覆盖所有必需任务，可以 shouldEnd=true 并 endReason="resolved"。
如果回复无关、伤害性很强或信任降到底，可以提前失败。

必需任务：
- emotional_facts：共情家长的具体担忧，并说清楚可观察事实。
- professional_reframe：结合现场反应解释孩子为什么需要这种支持，并避免污名化、强迫或治愈承诺。
- action_partnership：给具体下一步，并邀请家庭观察或配合；这里已经包含后续反馈安排，不需要额外总结收尾任务。

评分标准：
- 共情家长担忧：确认家长具体在担心什么，不用空泛安慰带过。
- 可观察事实：说清楚孩子当时行为、环境、前后变化，不用“不配合/任性”等标签替代观察。
- ASD 支持原则：用感官负荷、可预期性、沟通差异、选择权、结构化环境、梯度暴露解释。
- 具体下一步：说明明天或后续怎么观察、调整、记录、反馈。
- 家园协同：邀请家长补充家中观察，给家庭可执行建议。
- 伦理边界：不承诺治愈，不强迫暴露，不说“ASD孩子都这样”，不泄露其他孩子隐私。

任务判定方式：
- 必须先输出 taskAssessments。每个任务都要有 id/status/evidence/reason。
- status 只能是 missing、partial、complete。
- emotional_facts：必须同时共情家长的具体担忧并说明可观察事实才 complete；只有其中一项就是 partial。
- professional_reframe：必须说清现场反应、判断依据和支持逻辑才 complete；只说“不是不配合/不是迁就”但没有解释原因，最多 partial。
- action_partnership：必须同时有照护所下一步和家庭协作/反馈才 complete；只有其中一项就是 partial。
- completedTaskIds 必须从 taskAssessments 中 status=complete 的任务推导，并包含历史已完成任务。
- missingTaskIds 只列尚未 complete 的必需任务；partial 仍需列入 missingTaskIds，但 UI 会通过 taskAssessments 显示它是部分完成。
- 如果 missingTaskIds 为空，shouldEnd=true，endReason="resolved"。
- 如果 turnCount + 1 >= maxTurns 且仍未解决，shouldEnd=true，endReason="max_turns"。
- 如果玩家回复与家长问题无关，isIrrelevant=true，shouldEnd=true，endReason="irrelevant"。
- 如果出现医疗诊断、隐私泄露、伤害性表达，用 safetyFlag 标记。

harmful 回复优先于普通评分：
- harmful 指把 ASD 儿童的需求道德化、污名化、强迫化，或直接否定支持需求。
- 第一次 harmful：safetyFlag="harmful"，harmfulStreak=输入 harmfulStreak+1，trustDelta 通常 <= -16，parentMood="upset"。家长回应要先表达不安/受伤/不放心，再追问事实或安全支持，不要像普通缺任务追问。
- 第二次连续 harmful：harmfulStreak>=2，shouldEnd=true，endReason="failed"，trustDelta 通常 <= -24。家长可以中断沟通。
- 如果本轮不是 harmful，harmfulStreak=0。
- harmfulSignalHistory 要保留本轮和历史 harmful 类型，用于后续失败句引用累计风险。
- harmful 回复不能完成 professional_reframe 或 action_partnership，即使里面夹杂了计划词。

小明的小恐龙事件中，以下意思属于 harmful：
- “只是玩具”“不用紧张”
- “不能惯着他”
- “ASD 孩子都这样”
- “统一收起来就会适应”
- “直接拿走小恐龙”

小丽阳光事件中，以下意思属于 harmful：
- “多晒晒就好了”
- “必须练到不怕”
- “她就是逃避/不想参加”
- “大家都能去阳光里，她也应该去”
- “不能一直特殊照顾”

不要误判否定式专业表达。例如“这不是不配合”“不能强迫她进入阳光”“不是惯着他”“不要把小恐龙当成只是玩具”不属于 harmful。

家长回应要像真实家长，不要像评分报告。parentReply 不要出现“感官支持”“专业转译”“高风险说法”“把支持说成惯着孩子”这类内部评分标签；要自然复述成“听起来您觉得多晒一晒就会好”“您把他概括成 ASD 孩子都这样，我会觉得他没有被当成具体的孩子看见”。如果玩家本轮有 partial 内容，家长回应要引用它，例如“您刚才说到她眯眼后退，我听到了，但我还想知道为什么这不是迁就”。如果已经 resolved，收束句要点出当前事件的具体安排：小明要提到小恐龙固定位置/标签/家里同步，小丽要提到树荫/半阴/可退回阴影点。coachFeedback 才是给玩家看的专业反馈。
`.trim();

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...corsHeaders,
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

function extractOutputText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  const chunks = [];
  for (const candidate of data.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (typeof part.text === 'string') chunks.push(part.text);
    }
  }
  for (const step of data.steps ?? []) {
    if (step.type !== 'model_output') continue;
    for (const content of step.content ?? []) {
      if (content.type === 'text' && typeof content.text === 'string') {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join('');
}

async function handleParentTurn(req, res) {
  const apiKey = activeApiKey();
  if (!apiKey) {
    const envName = provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : 'GEMINI_API_KEY';
    sendJson(res, 400, { error: `${envName} is not set. Use local smoke-test mode or set the environment variable.` });
    return;
  }

  let payload;
  try {
    payload = await readJson(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON request body.' });
    return;
  }

  try {
    const evaluation = await evaluateParentTurnWithAgents(payload, {
      provider,
      apiKey,
      model,
      baseUrl: provider === 'deepseek' ? deepSeekBaseUrl : undefined,
    });

    const body = {
      ...evaluation.result,
      agentTrace: evaluation.evaluatorRuns.map((run) => ({
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
      })),
      traceLogPath,
    };
    await appendParentAiTrace({ route: '/api/parent-turn', payload, evaluation, responseBody: body });
    sendJson(res, 200, body);
  } catch (error) {
    await appendParentAiTrace({ route: '/api/parent-turn', payload, error });
    sendJson(res, 502, { error: error.message });
  }
}

async function handleParentAiStart(req, res) {
  let payload;
  try {
    payload = await readJson(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON request body.' });
    return;
  }

  try {
    sendJson(res, 200, {
      session: createParentAiSession(payload),
    });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function handleParentAiTurn(req, res) {
  const apiKey = activeApiKey();
  if (!apiKey) {
    const envName = provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : 'GEMINI_API_KEY';
    sendJson(res, 400, { error: `${envName} is not set. Parent AI turn requires API mode.` });
    return;
  }

  let payload;
  try {
    payload = await readJson(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON request body.' });
    return;
  }

  const turnPayload = payload.session && typeof payload.playerReply === 'string'
    ? buildParentTurnPayload(payload.session, payload.playerReply)
    : payload.payload ?? payload;

  try {
    const evaluation = await evaluateParentTurnWithAgents(turnPayload, {
      provider,
      apiKey,
      model,
      baseUrl: provider === 'deepseek' ? deepSeekBaseUrl : undefined,
    });

    const body = {
      result: evaluation.result,
      agentTrace: evaluation.evaluatorRuns.map((run) => ({
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
      })),
      traceLogPath,
    };

    if (payload.session && typeof payload.playerReply === 'string') {
      body.session = applyParentTurnResult(payload.session, evaluation.result, payload.playerReply);
    }

    await appendParentAiTrace({ route: '/api/parent-ai/turn', payload, evaluation, responseBody: body });
    sendJson(res, 200, body);
  } catch (error) {
    await appendParentAiTrace({ route: '/api/parent-ai/turn', payload, error });
    sendJson(res, 502, { error: error.message });
  }
}

async function handleAgentPlaytest(req, res) {
  const apiKey = activeApiKey();
  if (!apiKey) {
    const envName = provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : 'GEMINI_API_KEY';
    sendJson(res, 400, { error: `${envName} is not set. Agent playtest requires API mode.` });
    return;
  }

  let payload;
  try {
    payload = await readJson(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON request body.' });
    return;
  }

  try {
    const report = await runAgentPlaytest({
      eventIds: payload.eventIds,
      eventOutcomes: payload.eventOutcomes,
      playerProfileIds: payload.playerProfileIds,
      parentStyleId: payload.parentStyleId,
      maxTurns: payload.maxTurns,
      provider,
      apiKey,
      model,
      baseUrl: provider === 'deepseek' ? deepSeekBaseUrl : undefined,
    });
    sendJson(res, 200, {
      report,
      markdown: formatPlaytestReport(report),
    });
  } catch (error) {
    sendJson(res, 502, { error: error.message });
  }
}

async function serveStatic(req, res) {
  const requested = new URL(req.url, `http://${req.headers.host}`).pathname;
  const relativePath = requested === '/' ? 'index.html' : decodeURIComponent(requested).replace(/^\/+/, '');
  const safePath = normalize(relativePath);

  if (isAbsolute(safePath) || safePath.startsWith('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const firstPathSegment = safePath.split(/[\\/]+/)[0];
  const baseDir = ['parent-ai-core', 'src'].includes(firstPathSegment)
    ? join(rootDir, '..')
    : rootDir;
  const filePath = join(baseDir, safePath);

  try {
    const content = await readFile(filePath);
    const contentType = mimeTypes[extname(filePath)] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType, ...corsHeaders });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders });
    res.end('Not found');
  }
}

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    if (req.method === 'GET' && pathname === '/api/status') {
      sendJson(res, 200, {
        provider: providerLabel(),
        hasKey: Boolean(activeApiKey()),
        model,
        baseUrl: provider === 'deepseek' ? deepSeekBaseUrl : undefined,
        mode: activeApiKey() ? 'agent_ensemble' : 'local_smoke_test',
        sharedCore: true,
        agentArchitecture: 'parent-turn: 2 evaluator agents + 1 aggregator reply generator; playtest: 3 player agents x parent-turn ensemble',
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/parent-turn') {
      await handleParentTurn(req, res);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/parent-ai/start') {
      await handleParentAiStart(req, res);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/parent-ai/turn') {
      await handleParentAiTurn(req, res);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/parent-ai/playtest') {
      await handleAgentPlaytest(req, res);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/agent-playtest') {
      await handleAgentPlaytest(req, res);
      return;
    }

    if (req.method === 'GET') {
      await serveStatic(req, res);
      return;
    }

    res.writeHead(405);
    res.end('Method not allowed');
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`Parent AI sandbox running at http://localhost:${port}`);
  console.log(`${providerLabel()} model: ${model}`);
});
