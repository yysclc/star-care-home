import {
  CARE_STANDARDS,
  COMMUNICATION_TASKS,
  FALLBACK_TOPICS,
  PARENT_AI_EVENTS,
  PARENT_STYLES,
} from '../parent-ai-core/data.js';
import {
  buildInitialParentMessage as buildCoreInitialParentMessage,
  getParentAiSampleReplies,
  resolveParentAiTopics,
} from '../parent-ai-core/session.js';
import {
  PARENT_AI_EVENT_BINDINGS,
  resolveParentAiEventOutcome,
} from '../parent-ai-core/eventBindings.js';
import { getFreeActionSpecialEvent } from '../src/data/freeActionSpecialEvents.js';
import {
  buildHarmfulParentReply,
  detectHarmfulSignals,
  hasHarmfulSignal,
  summarizeHarmfulSignals,
} from '../parent-ai-core/harmfulResponses.js';

const dom = {
  eventToggles: document.querySelector('#eventToggles'),
  parentStyle: document.querySelector('#parentStyle'),
  styleDescription: document.querySelector('#styleDescription'),
  useApi: document.querySelector('#useApi'),
  apiStatus: document.querySelector('#apiStatus'),
  resetBtn: document.querySelector('#resetBtn'),
  sampleReplies: document.querySelector('#sampleReplies'),
  conversationTitle: document.querySelector('#conversationTitle'),
  trustScore: document.querySelector('#trustScore'),
  arcStepper: document.querySelector('#arcStepper'),
  chatLog: document.querySelector('#chatLog'),
  replyForm: document.querySelector('#replyForm'),
  playerReply: document.querySelector('#playerReply'),
  sendBtn: document.querySelector('#sendBtn'),
  topicSummary: document.querySelector('#topicSummary'),
  evaluation: document.querySelector('#evaluation'),
  standards: document.querySelector('#standards'),
};

const state = {
  selectedEventIds: new Set([PARENT_AI_EVENTS[0].id]),
  selectedOutcomeId: '',
  parentStyleId: PARENT_STYLES[0].id,
  useApi: false,
  apiReady: false,
  apiModel: '',
  apiProvider: 'AI',
  turnCount: 0,
  maxTurns: 4,
  completedTaskIds: new Set(),
  taskAssessments: [],
  harmfulStreak: 0,
  harmfulSignalHistory: [],
  conversationEnded: false,
  trust: 50,
  messages: [],
  lastEvaluation: null,
};

const EVENT_OUTCOME_FIXTURES = PARENT_AI_EVENT_BINDINGS.flatMap((trigger) => {
  const event = getFreeActionSpecialEvent(trigger.week, trigger.roomId, trigger.actionId);
  return (event?.choices ?? [])
    .map((choice, choiceIndex) => resolveParentAiEventOutcome({
      week: trigger.week,
      roomId: trigger.roomId,
      actionId: trigger.actionId,
      choiceIndex,
      choice,
    }))
    .filter(Boolean);
});

state.selectedOutcomeId = EVENT_OUTCOME_FIXTURES.find(
  (outcome) => state.selectedEventIds.has(outcome.eventId),
)?.id ?? '';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function selectedTopics() {
  const eventIds = [...state.selectedEventIds];
  const outcome = selectedOutcome();
  return eventIds.length
    ? resolveParentAiTopics(eventIds, outcome ? [outcome] : [])
    : FALLBACK_TOPICS;
}

function selectedOutcome() {
  return EVENT_OUTCOME_FIXTURES.find((outcome) => outcome.id === state.selectedOutcomeId) ?? null;
}

function getMissingRequiredTaskIds() {
  return COMMUNICATION_TASKS
    .filter((task) => task.required && !state.completedTaskIds.has(task.id))
    .map((task) => task.id);
}

function getTaskTitle(taskId) {
  return COMMUNICATION_TASKS.find((task) => task.id === taskId)?.title ?? taskId;
}

function getAssessment(taskId, assessments = state.taskAssessments) {
  return assessments.find((assessment) => assessment.id === taskId);
}

function taskStatusLabel(status) {
  if (status === 'complete') return '已完成';
  if (status === 'partial') return '部分完成';
  return '待补足';
}

function activeStyle() {
  return PARENT_STYLES.find((style) => style.id === state.parentStyleId) ?? PARENT_STYLES[0];
}

function primaryTopic() {
  return selectedTopics()[0];
}

function parentName() {
  return primaryTopic().parentName;
}

function buildInitialParentMessage() {
  return buildCoreInitialParentMessage(primaryTopic(), activeStyle());
}

function addMessage(role, name, text) {
  state.messages.push({ role, name, text });
  renderChat();
}

function renderEventToggles() {
  dom.eventToggles.innerHTML = PARENT_AI_EVENTS.map(
    (event) => {
      const outcomes = EVENT_OUTCOME_FIXTURES.filter((outcome) => outcome.eventId === event.id);
      return `
      <label class="event-toggle">
        <input type="checkbox" value="${event.id}" ${state.selectedEventIds.has(event.id) ? 'checked' : ''} />
        <span>
          <strong>第 ${event.week ?? 1} 周 · ${event.title}</strong>
          <span>${event.triggerLabel}</span>
          ${state.selectedEventIds.has(event.id) ? `
            <select class="outcome-select" data-event-id="${event.id}">
              ${outcomes.map((outcome) => `<option value="${outcome.id}" ${state.selectedOutcomeId === outcome.id ? 'selected' : ''}>${outcome.choiceLabel}</option>`).join('')}
            </select>
            <span class="outcome-selected-text">${outcomes.find((outcome) => outcome.id === state.selectedOutcomeId)?.choiceLabel ?? ''}</span>
          ` : ''}
        </span>
      </label>
    `;
    },
  ).join('');

  dom.eventToggles.querySelectorAll('input').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) {
        state.selectedEventIds = new Set([input.value]);
        state.selectedOutcomeId = EVENT_OUTCOME_FIXTURES.find((outcome) => outcome.eventId === input.value)?.id ?? '';
      } else {
        state.selectedEventIds = new Set();
        state.selectedOutcomeId = '';
      }
      renderEventToggles();
      resetConversation();
    });
  });

  dom.eventToggles.querySelectorAll('.outcome-select').forEach((select) => {
    select.addEventListener('click', (event) => event.stopPropagation());
    select.addEventListener('change', () => {
      state.selectedOutcomeId = select.value;
      resetConversation();
    });
  });
}

function renderParentStyles() {
  dom.parentStyle.innerHTML = PARENT_STYLES.map(
    (style) => `<option value="${style.id}">${style.label}</option>`,
  ).join('');
  dom.parentStyle.value = state.parentStyleId;
  dom.styleDescription.textContent = activeStyle().description;
}

function renderSamples() {
  const samples = getParentAiSampleReplies({
    eventIds: [...state.selectedEventIds],
    eventOutcomes: selectedOutcome() ? [selectedOutcome()] : [],
  });
  dom.sampleReplies.innerHTML = samples.map(
    (sample, index) => `<button class="sample-btn" type="button" data-index="${index}">${sample.label}</button>`,
  ).join('');
  dom.sampleReplies.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      const sample = samples[Number(button.dataset.index)];
      dom.playerReply.value = sample.text;
      dom.playerReply.focus();
    });
  });
}

function renderStandards() {
  dom.standards.innerHTML = CARE_STANDARDS.map(
    (standard) => `
      <div class="standard-item">
        <strong>${standard.label}</strong>
        <p>${standard.description}</p>
      </div>
    `,
  ).join('');
}

function renderTopicSummary() {
  dom.topicSummary.innerHTML = selectedTopics().map(
    (topic) => `
      <div class="topic-card">
        <strong>${topic.title}</strong>
        <p>${topic.incidentSummary}</p>
        ${topic.selectedOutcome ? `
          <p><strong>实际选择：</strong>${topic.selectedOutcome.choiceLabel}</p>
          <p><strong>信息渠道：</strong>${topic.selectedOutcome.informationChannels.join('、')}</p>
          <p><strong>结构难度：</strong>${topic.selectedOutcome.difficultyTier === 'complex' ? '复杂线索' : '直接线索'}</p>
          ${topic.selectedOutcome.parentInterpretation ? `<p><strong>家长当前理解：</strong>${topic.selectedOutcome.parentInterpretation}</p>` : ''}
        ` : ''}
        <div class="tag-list">
          <span class="tag">${topic.room}</span>
          <span class="tag">${topic.childName}</span>
        </div>
      </div>
    `,
  ).join('');
}

function renderArc() {
  const missingRequired = getMissingRequiredTaskIds();
  dom.arcStepper.innerHTML = COMMUNICATION_TASKS.map((task) => {
    const assessment = getAssessment(task.id);
    const isDone = assessment?.status === 'complete' || state.completedTaskIds.has(task.id);
    const isPartial = assessment?.status === 'partial';
    const isActive = !isDone && missingRequired[0] === task.id;
    const status = isDone ? 'done' : isPartial ? 'partial' : isActive ? 'active' : '';
    return `
      <div class="arc-step ${status}">
        <strong>层级${task.level} · ${task.title}${assessment ? ` · ${taskStatusLabel(assessment.status)}` : ''}</strong>
        <span>${task.playerGoal}</span>
      </div>
    `;
  }).join('');
}

function renderChat() {
  dom.chatLog.innerHTML = state.messages.map(
    (message) => `
      <div class="message ${message.role}">
        <span class="message-name">${message.name}</span>
        ${escapeHtml(message.text)}
      </div>
    `,
  ).join('');
  dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderEvaluation() {
  const result = state.lastEvaluation;
  if (!result) {
    dom.evaluation.className = 'evaluation empty';
    dom.evaluation.textContent = '发送一条回复后，这里会显示评分、风险点和下一轮家长反应。';
    return;
  }

  const score = clamp(Number(result.score) || 0, 0, 100);
  const assessments = Array.isArray(result.taskAssessments) ? result.taskAssessments : [];
  dom.evaluation.className = 'evaluation';
  dom.evaluation.innerHTML = `
    <div class="eval-score">
      <strong>${score}</strong>
      <div>
        <div class="bar"><span style="width: ${score}%"></span></div>
        <p class="muted">信任变化：${result.trustDelta >= 0 ? '+' : ''}${result.trustDelta}</p>
      </div>
    </div>
    <div class="eval-card">
      <strong>家长反应</strong>
      <p>${escapeHtml(result.parentReply)}</p>
    </div>
    <div class="eval-card">
      <strong>专业反馈</strong>
      <p>${escapeHtml(result.coachFeedback)}</p>
      <div class="tag-list">
        ${(result.completedTaskIds ?? []).map((taskId) => `<span class="tag good">已完成：${escapeHtml(getTaskTitle(taskId))}</span>`).join('')}
        ${(result.missingTaskIds ?? []).map((taskId) => `<span class="tag warn">待补足：${escapeHtml(getTaskTitle(taskId))}</span>`).join('')}
        ${assessments.filter((assessment) => assessment.status === 'partial').map((assessment) => `<span class="tag partial">部分完成：${escapeHtml(getTaskTitle(assessment.id))}</span>`).join('')}
        ${result.safetyFlag && result.safetyFlag !== 'none' ? `<span class="tag warn">风险等级：${escapeHtml(result.safetyFlag)}</span>` : ''}
        ${result.harmfulStreak ? `<span class="tag warn">连续高风险：${escapeHtml(result.harmfulStreak)}</span>` : ''}
        ${(result.strengths ?? []).map((item) => `<span class="tag good">${escapeHtml(item)}</span>`).join('')}
        ${(result.risks ?? []).map((item) => `<span class="tag warn">${escapeHtml(item)}</span>`).join('')}
      </div>
    </div>
    ${assessments.length ? `
      <div class="eval-card">
        <strong>逐任务判定</strong>
        <div class="assessment-list">
          ${assessments.map((assessment) => `
            <div class="assessment-item ${escapeHtml(assessment.status)}">
              <strong>${escapeHtml(getTaskTitle(assessment.id))} · ${escapeHtml(taskStatusLabel(assessment.status))}</strong>
              <p>${escapeHtml(assessment.reason || '')}</p>
              ${assessment.evidence ? `<span>${escapeHtml(assessment.evidence)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function renderHeader() {
  const topics = selectedTopics();
  const label = topics.length ? topics.map((topic) => topic.title).join(' / ') : '原有家长话题';
  const weeks = [...new Set(topics.map((topic) => topic.week ?? 1))].sort((a, b) => a - b);
  const weekLabel = weeks.length === 1 ? `第 ${weeks[0]} 周` : `第 ${weeks.join('/')} 周`;
  dom.conversationTitle.textContent = `${weekLabel}：${label}`;
  dom.trustScore.textContent = String(state.trust);
}

function renderAll() {
  renderHeader();
  renderArc();
  renderTopicSummary();
  renderSamples();
  renderEvaluation();
}

function resetConversation() {
  state.turnCount = 0;
  state.completedTaskIds = new Set();
  state.taskAssessments = [];
  state.harmfulStreak = 0;
  state.harmfulSignalHistory = [];
  state.conversationEnded = false;
  state.trust = 50;
  state.messages = [];
  state.lastEvaluation = null;
  const outcome = selectedOutcome();
  if (outcome && outcome.parentInitiatedEligible !== true) {
    state.conversationEnded = true;
    addMessage('system', '系统', `事件已记录，但家长沟通未启动：${outcome.eligibilityReason}`);
    dom.sendBtn.disabled = true;
    renderAll();
    return;
  }
  addMessage('system', '系统', selectedTopics()[0].id.startsWith('fallback')
    ? '本周未选择特殊事件，已进入兜底家长话题。'
    : '家长发来一条消息。');
  addMessage('parent', parentName(), buildInitialParentMessage());
  dom.sendBtn.disabled = false;
  renderAll();
}

function keywordHits(text, words) {
  return words.filter((word) => text.includes(word));
}

function makeAssessment(id, status, evidence, reason) {
  return { id, status, evidence, reason };
}

function hasSupportReframePhrase(text) {
  return [
    '不是不配合',
    '不是被惯坏',
    '不是迁就',
    '不是逃避',
    '不是任性',
    '不能强迫',
    '不强迫',
    '不要强迫',
  ].some((phrase) => text.includes(phrase));
}

function mergeHistoricalAssessments(currentAssessments, previousAssessments = []) {
  return currentAssessments.map((assessment) => {
    const previous = previousAssessments.find((item) => item.id === assessment.id);
    if (!previous || previous.status !== 'complete' || assessment.status === 'complete') {
      return assessment;
    }
    return {
      ...previous,
      reason: `${previous.reason}（此前已完成，本轮未撤回。）`,
    };
  });
}

function suppressHarmfulTaskCompletions(assessments, hasHarmful) {
  if (!hasHarmful) return assessments;
  return assessments.map((assessment) => {
    if (!['professional_reframe', 'action_partnership'].includes(assessment.id)) {
      return assessment;
    }
    return {
      ...assessment,
      status: 'missing',
      evidence: '',
      reason: '本轮出现高风险表达，不能算作专业沟通任务完成。',
    };
  });
}

function buildTaskAssessments({
  text,
  validation,
  observable,
  asdSupport,
  action,
  partnership,
  hasHarmful,
  irrelevant,
  topic,
}) {
  const emotionalStatus = validation.length && observable.length
    ? 'complete'
    : validation.length || observable.length
      ? 'partial'
      : 'missing';
  const emotionalEvidence = [
    validation.length ? '共情了家长担忧' : '',
    observable.length ? `提到可观察信息：${observable.slice(0, 3).join('、')}` : '',
  ].filter(Boolean).join('；');

  const professionalPartial = asdSupport.length || hasSupportReframePhrase(text);
  const professionalStatus = hasHarmful || irrelevant
    ? 'missing'
    : asdSupport.length >= 2
      ? 'complete'
      : professionalPartial
        ? 'partial'
        : 'missing';
  const professionalEvidence = professionalStatus === 'complete'
    ? `使用支持视角：${asdSupport.slice(0, 3).join('、')}`
    : professionalStatus === 'partial'
      ? (asdSupport.length ? `已有支持词：${asdSupport.join('、')}` : '有否定标签化或强迫的表达，但还没有展开支持逻辑')
      : '';

  const actionStatus = hasHarmful || irrelevant
    ? 'missing'
    : action.length >= 2 && partnership.length
      ? 'complete'
      : action.length || partnership.length
        ? 'partial'
        : 'missing';
  const actionEvidence = [
    action.length ? `下一步：${action.slice(0, 3).join('、')}` : '',
    partnership.length ? `家园协同：${partnership.slice(0, 2).join('、')}` : '',
  ].filter(Boolean).join('；');

  return [
    makeAssessment(
      'emotional_facts',
      emotionalStatus,
      emotionalEvidence,
      emotionalStatus === 'complete'
        ? '既共情了家长的具体担忧，也补上了具体观察。'
        : emotionalStatus === 'partial'
          ? '只完成了共情家长担忧或说明可观察事实其中一部分。'
          : '还没有先共情家长担忧并说明当天观察。',
    ),
    makeAssessment(
      'professional_reframe',
      professionalStatus,
      professionalEvidence,
      hasHarmful
        ? '本轮出现高风险表达，不能算作合适的专业解释。'
        : professionalStatus === 'complete'
          ? `能结合现场反应解释${topic.childName}当时需要什么支持。`
          : professionalStatus === 'partial'
            ? '方向接近，但还没有把支持逻辑讲清楚。'
            : '还没有解释为什么这不是不配合、迁就或依赖。',
    ),
    makeAssessment(
      'action_partnership',
      actionStatus,
      actionEvidence,
      actionStatus === 'complete'
        ? '同时给出照护所下一步和家庭协作方式。'
        : actionStatus === 'partial'
          ? '有行动或家庭协作其中一部分，但还不够闭环。'
          : '还没有可执行的下一步和家园反馈安排。',
    ),
  ];
}

function completedIdsFromAssessments(assessments) {
  return assessments
    .filter((assessment) => assessment.status === 'complete')
    .map((assessment) => assessment.id);
}

function missingRequiredIdsFromAssessments(assessments) {
  return COMMUNICATION_TASKS
    .filter((task) => task.required && getAssessment(task.id, assessments)?.status !== 'complete')
    .map((task) => task.id);
}

function partialIdsFromAssessments(assessments) {
  return assessments
    .filter((assessment) => assessment.status === 'partial')
    .map((assessment) => assessment.id);
}

function scoreAssessment(status, completePoints, partialPoints) {
  if (status === 'complete') return completePoints;
  if (status === 'partial') return partialPoints;
  return 0;
}

function calculateScore({ assessments, topicSpecific, hasHarmful, harmfulSignals, hasCaution, harmfulStreak, irrelevant }) {
  if (irrelevant) return 0;
  const emotional = getAssessment('emotional_facts', assessments);
  const professional = getAssessment('professional_reframe', assessments);
  const action = getAssessment('action_partnership', assessments);
  let score = 24;
  score += scoreAssessment(emotional?.status, 18, 8);
  score += scoreAssessment(professional?.status, 22, 10);
  score += scoreAssessment(action?.status, 28, 11);
  score += Math.min(topicSpecific.length, 4) * 2;
  score -= harmfulSignals.filter((signal) => signal.severity === 'harmful').length * 22;
  score -= hasCaution ? 8 : 0;
  if (hasHarmful) score = Math.min(score, harmfulStreak >= 2 ? 16 : 32);
  return clamp(score, 0, 100);
}

function buildStrengths(assessments) {
  return assessments
    .filter((assessment) => assessment.status === 'complete')
    .map((assessment) => `完成：${getTaskTitle(assessment.id)}`);
}

function buildRisks({ assessments, hasHarmful, harmfulSignals, hasCaution, irrelevant }) {
  const risks = [];
  if (hasHarmful) risks.push(`出现高风险说法：${summarizeHarmfulSignals(harmfulSignals)}`);
  if (hasCaution && !hasHarmful) risks.push('需要避免用空泛安慰压掉家长担忧');
  for (const assessment of assessments) {
    if (assessment.status !== 'complete') {
      risks.push(`${getTaskTitle(assessment.id)}：${assessment.reason}`);
    }
  }
  if (irrelevant) risks.push('回复与当前家长沟通无关');
  return risks;
}

function evaluateLocally(payload) {
  const text = payload.playerReply.trim();
  const topic = payload.topics[0];
  const harmfulSignals = detectHarmfulSignals(text, topic);
  const hasHarmful = hasHarmfulSignal(harmfulSignals);
  const hasCaution = harmfulSignals.some((signal) => signal.severity === 'caution');
  const harmfulStreak = hasHarmful ? Number(payload.harmfulStreak || 0) + 1 : 0;
  const harmfulSignalHistory = hasHarmful
    ? [
      ...(payload.harmfulSignalHistory ?? []),
      ...harmfulSignals.filter((signal) => signal.severity === 'harmful').map((signal) => signal.id),
    ]
    : [];
  const topicText = payload.topics.map((topic) => `${topic.title} ${topic.childName} ${topic.goodReplyHints.join(' ')}`).join(' ');
  const validation = keywordHits(text, ['理解', '担心', '心疼', '不好意思', '抱歉', '谢谢', '能理解', '不放心']);
  const observable = keywordHits(text, ['看到', '当时', '具体', '记录', '小恐龙', '阳光', '树荫', '半阴', '架子', '位置', '身体', '肩膀', '挡住眼睛', '眯眼', '后退', '反复', '找', '问', '紧张', '着急']);
  const asdSupport = keywordHits(text, ['感官', '负荷', '安抚', '可预期', '选择', '过渡', '结构', '固定', '视觉', '自我调节', '梯度', '安全感', '确定']);
  const action = keywordHits(text, ['明天', '我们会', '先', '再', '继续', '贴', '标签', '观察', '复盘', '调整', '计划', '过渡区', '固定位置']);
  const partnership = keywordHits(text, ['家里', '您观察', '请您', '一起', '配合', '告诉我们', '您那边', '反馈', '周末']);
  const irrelevant = text.length < 4 || keywordHits(text, ['天气真好', '随便', '不知道', '哈哈', '测试测试']).length > 0;
  const topicSpecific = topicText
    .split(/[，。；、\s]+/)
    .filter((word) => word.length >= 2 && text.includes(word))
    .slice(0, 6);

  const taskAssessments = suppressHarmfulTaskCompletions(mergeHistoricalAssessments(
    buildTaskAssessments({
      text,
      validation,
      observable,
      asdSupport,
      action,
      partnership,
      hasHarmful,
      irrelevant,
      topic,
    }),
    payload.taskAssessments,
  ), hasHarmful);

  const completedTaskIds = completedIdsFromAssessments(taskAssessments);
  const missingTaskIds = missingRequiredIdsFromAssessments(taskAssessments);
  const score = calculateScore({
    assessments: taskAssessments,
    topicSpecific,
    hasHarmful,
    harmfulSignals,
    hasCaution,
    harmfulStreak,
    irrelevant,
  });
  const strengths = buildStrengths(taskAssessments);
  const risks = buildRisks({ assessments: taskAssessments, hasHarmful, harmfulSignals, hasCaution, irrelevant });

  const trustDelta = hasHarmful
    ? harmfulStreak >= 2 ? -25 : -18
    : score >= 85 ? 15 : score >= 70 ? 8 : score >= 50 ? 2 : score >= 30 ? -8 : -16;
  const nextTurnCount = payload.turnCount + 1;
  const nextTrust = clamp(payload.trust + trustDelta, 0, 100);
  const harmfulFailure = hasHarmful && harmfulStreak >= 2;
  const resolvedByTasks = missingTaskIds.length === 0 && !hasHarmful;
  const shouldEnd = irrelevant || nextTrust <= 0 || harmfulFailure || resolvedByTasks || nextTurnCount >= payload.maxTurns;
  const endReason = irrelevant
    ? 'irrelevant'
    : nextTrust <= 0 || harmfulFailure
      ? 'failed'
      : resolvedByTasks
        ? 'resolved'
        : nextTurnCount >= payload.maxTurns
          ? 'max_turns'
          : 'continue';
  const parentReply = hasHarmful
    ? buildHarmfulParentReply({
      topic,
      parentStyle: payload.parentStyle,
      signals: harmfulSignals,
      signalHistory: harmfulSignalHistory,
      harmfulStreak,
      willEnd: endReason === 'failed',
    })
    : buildLocalParentReply({
      topic,
      score,
      missingTaskIds,
      taskAssessments,
      playerReply: text,
      parentStyle: payload.parentStyle,
      shouldEnd,
      endReason,
    });

  return {
    score,
    trustDelta,
    parentMood: hasHarmful || score < 45 ? 'upset' : score >= 70 ? 'trusting' : 'uncertain',
    parentReply,
    coachFeedback: buildCoachFeedback(score, strengths, risks),
    strengths,
    risks,
    taskAssessments,
    completedTaskIds,
    missingTaskIds,
    shouldEnd,
    endReason,
    isIrrelevant: irrelevant,
    safetyFlag: hasHarmful ? 'harmful' : irrelevant ? 'irrelevant' : hasCaution ? 'caution' : 'none',
    harmfulStreak,
    harmfulSignalHistory,
  };
}

function buildLocalParentReply({ topic, score, missingTaskIds, taskAssessments = [], playerReply = '', parentStyle, shouldEnd, endReason }) {
  if (endReason === 'irrelevant') {
    return '老师，我现在是在认真问孩子的事。您这样回复，我会觉得我们没有被当回事。';
  }
  if (endReason === 'failed') {
    return '老师，听完我更不放心了。这个沟通让我感觉孩子的问题没有被认真看见。';
  }
  if (shouldEnd && missingTaskIds.length === 0) {
    if (topic.id === 'xiaoming_dinosaur') {
      return '这样我就清楚多了。至少我知道小恐龙明天不会被突然拿走，也知道照护所会用固定位置、标签和慢慢过渡来帮小明稳定。家里这边我也会观察他的固定摆放习惯，再跟您同步。';
    }
    if (topic.id === 'xiaoli_sunlight') {
      return '这样我就清楚多了。至少我知道明天会从树荫、半阴这些位置慢慢过渡，不会把小丽直接推到强光里；家里外出时我们也会先找能退回的阴影点，再把反应告诉您。';
    }
    return `这样我就清楚多了。至少我知道今天发生了什么，也知道接下来照护所和家里分别能怎么做。谢谢您认真看见${topic.childName}的状态。`;
  }
  if (shouldEnd) {
    return '我大概明白一些，但还是有点不踏实。今天先这样吧，我希望之后能听到更明确的反馈。';
  }
  const emotional = getAssessment('emotional_facts', taskAssessments);
  const professional = getAssessment('professional_reframe', taskAssessments);
  const action = getAssessment('action_partnership', taskAssessments);
  const styleId = parentStyle?.id ?? 'anxious';

  if (emotional?.status !== 'complete') {
    if (emotional?.status === 'partial' && playerReply.includes('今天')) {
      return `您刚才说到今天的情况，我有听到一些。但${topic.childName}回家后的反应挺明显的，我还想确认您理解我为什么会担心，也想再听到更具体的经过。`;
    }
    if (styleId === 'deferential') {
      return `老师，不好意思我还是想问清楚一点。${topic.childName}回家后的反应挺明显的，今天到底发生了什么？`;
    }
    return `我还是想先知道具体发生了什么。${topic.childName}回家后的反应挺明显的，我不想只听“还好”这种说法。`;
  }
  if (professional?.status !== 'complete') {
    if (topic.id === 'xiaoming_dinosaur') {
      if (professional?.status === 'partial') {
        return '您刚才提到小恐龙能让他安心，这一点我能理解一些了。但我还是想听清楚：给它固定位置，和让他越来越依赖，这中间的边界是什么？';
      }
      return '我理解您说了今天的情况，但我还是担心，给小恐龙固定位置到底是在帮他稳定，还是会让他更依赖？这个边界我还没听明白。';
    }
    if (topic.id === 'xiaoli_sunlight') {
      if (professional?.status === 'partial') {
        return '您说这不是不配合，我听到这个方向了。但我还想知道，为什么让她先退到阴影里不是迁就，而是帮助她下次能再尝试？';
      }
      return '我理解你们没有硬拉她，但如果一直让她退到阴影里，会不会越来越怕阳光？这到底是在迁就，还是一种过渡支持？';
    }
    return '我理解您说的处理方式，但我还是担心这是不是在迁就孩子。这样下去会不会更难适应规则？';
  }
  if (action?.status !== 'complete') {
    if (topic.id === 'xiaoming_dinosaur') {
      if (action?.status === 'partial') {
        return '您刚才说会做一些安排，我想再具体一点：明天小恐龙放哪里、怎么跟小明说，家里要不要也先保留一个固定位置？';
      }
      return '那明天小恐龙具体放哪里？照护所会怎么跟他说，家里又要不要也先保留一个固定位置？';
    }
    if (topic.id === 'xiaoli_sunlight') {
      if (action?.status === 'partial') {
        return '您说了大方向，但我还想知道明天具体怎么做。是先树荫、再半阴吗？我们周末出门遇到强光时，家里该怎么配合？';
      }
      return '那明天户外活动具体怎么安排？我们周末出门遇到强光时，家里要怎么配合？';
    }
    return '那接下来具体怎么做呢？照护所明天会怎么安排，我们家里又应该怎么配合？';
  }
  if (score >= 70) {
    return '您这么说我能理解一些了。那我们接下来怎么确认这个方法是真的帮到孩子？';
  }
  return '我听懂一部分，但还是觉得有些地方没说清楚。能不能再具体一点？';
}

function buildCoachFeedback(score, strengths, risks) {
  if (score >= 80) {
    return `这次回复能同时覆盖家长担忧的点、事件细节和专业支持逻辑。可以继续把计划说得更可观察，例如明天记录哪个信号、什么时候反馈。`;
  }
  if (score >= 55) {
    return `回复方向基本可用，但还像一般安抚。需要补足：${risks.slice(0, 2).join('；')}。`;
  }
  return `这条回复会削弱信任。主要问题是：${risks.slice(0, 3).join('；')}。`;
}

function buildPayload(playerReply) {
  return {
    week: 1,
    turnCount: state.turnCount,
    maxTurns: state.maxTurns,
    communicationTasks: COMMUNICATION_TASKS,
    completedTaskIds: [...state.completedTaskIds],
    taskAssessments: state.taskAssessments,
    missingRequiredTaskIds: getMissingRequiredTaskIds(),
    parentStyle: activeStyle(),
    harmfulStreak: state.harmfulStreak,
    harmfulSignalHistory: state.harmfulSignalHistory,
    topics: selectedTopics(),
    careStandards: CARE_STANDARDS,
    history: state.messages,
    trust: state.trust,
    playerReply,
  };
}

async function evaluateWithApi(payload) {
  const response = await fetch('/api/parent-turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? 'API request failed');
  }
  return data;
}

async function handleSubmit(event) {
  event.preventDefault();
  const playerReply = dom.playerReply.value.trim();
  if (!playerReply || state.conversationEnded) return;

  if (!state.useApi || !state.apiReady) {
    state.lastEvaluation = {
      score: 0,
      trustDelta: 0,
      parentReply: '',
      coachFeedback: '没有连接真实模型。本地页面只用于检查界面和事件资料，不进行专业判定。',
      strengths: [],
      risks: ['未运行三评估 agent 和汇总 agent'],
      taskAssessments: state.taskAssessments,
      completedTaskIds: [...state.completedTaskIds],
      missingTaskIds: getMissingRequiredTaskIds(),
      shouldEnd: false,
      endReason: 'continue',
      safetyFlag: 'none',
      harmfulStreak: state.harmfulStreak,
      harmfulSignalHistory: state.harmfulSignalHistory,
    };
    renderAll();
    return;
  }

  const payload = buildPayload(playerReply);
  addMessage('player', '玩家 / 照护老师', playerReply);
  dom.playerReply.value = '';
  dom.sendBtn.disabled = true;
  dom.sendBtn.textContent = '评分中...';

  try {
    const result = await evaluateWithApi(payload);

    state.lastEvaluation = normalizeResult(result);
    state.turnCount += 1;
    state.trust = clamp(state.trust + state.lastEvaluation.trustDelta, 0, 100);
    state.completedTaskIds = new Set(state.lastEvaluation.completedTaskIds);
    state.taskAssessments = state.lastEvaluation.taskAssessments ?? [];
    state.harmfulStreak = state.lastEvaluation.harmfulStreak ?? 0;
    state.harmfulSignalHistory = state.lastEvaluation.harmfulSignalHistory ?? [];
    addMessage('parent', parentName(), state.lastEvaluation.parentReply);

    const forcedEnd = state.turnCount >= state.maxTurns || state.trust <= 0;
    const resolved = getMissingRequiredTaskIds().length === 0;
    if (state.lastEvaluation.shouldEnd || forcedEnd || resolved) {
      state.conversationEnded = true;
      addMessage('system', '系统', buildEndMessage(state.lastEvaluation.endReason, resolved));
      dom.sendBtn.disabled = true;
    }
  } catch (error) {
    state.lastEvaluation = {
      score: 0,
      trustDelta: 0,
      parentReply: 'API 调用失败，已保留当前对话。可以切回本地 smoke test 继续检查交互流程。',
      coachFeedback: error.message,
      strengths: [],
      risks: ['API 调用失败'],
      taskAssessments: state.taskAssessments,
      completedTaskIds: [...state.completedTaskIds],
      missingTaskIds: getMissingRequiredTaskIds(),
      shouldEnd: false,
      endReason: 'continue',
      safetyFlag: 'none',
      harmfulStreak: state.harmfulStreak,
      harmfulSignalHistory: state.harmfulSignalHistory,
    };
  } finally {
    if (!state.conversationEnded) dom.sendBtn.disabled = false;
    dom.sendBtn.textContent = '发送并评分';
    renderAll();
  }
}

function buildEndMessage(endReason, resolved) {
  if (endReason === 'irrelevant') return `对话失败：回复偏离家长沟通主题。最终家长信任：${state.trust}。`;
  if (endReason === 'failed' && state.lastEvaluation?.safetyFlag === 'harmful') {
    return `对话失败：连续高风险表达导致家长中断沟通。最终家长信任：${state.trust}。`;
  }
  if (state.trust <= 0 || endReason === 'failed') return `对话失败：家长信任降到不可继续沟通。最终家长信任：${state.trust}。`;
  if (resolved || endReason === 'resolved') return `对话成功：关键沟通任务已完成。最终家长信任：${state.trust}。`;
  return `对话收束：已到最大回合数，按当前完成度结算。最终家长信任：${state.trust}。`;
}

function normalizeResult(result) {
  const validTaskIds = new Set(COMMUNICATION_TASKS.map((task) => task.id));
  const requiredTaskIds = COMMUNICATION_TASKS.filter((task) => task.required).map((task) => task.id);
  const safetyFlag = result.safetyFlag ?? 'none';
  const harmfulStreak = safetyFlag === 'harmful'
    ? Math.max(1, Number(result.harmfulStreak || state.harmfulStreak + 1))
    : 0;
  const rawAssessments = Array.isArray(result.taskAssessments)
    ? result.taskAssessments
      .filter((assessment) => validTaskIds.has(assessment.id))
      .map((assessment) => ({
        id: assessment.id,
        status: ['missing', 'partial', 'complete'].includes(assessment.status) ? assessment.status : 'missing',
        evidence: assessment.evidence ?? '',
        reason: assessment.reason ?? '',
      }))
    : [];
  const taskAssessments = suppressHarmfulTaskCompletions(mergeHistoricalAssessments(COMMUNICATION_TASKS.map((task) => {
    const returned = rawAssessments.find((assessment) => assessment.id === task.id);
    if (returned) return returned;
    return makeAssessment(
      task.id,
      state.completedTaskIds.has(task.id) ? 'complete' : 'missing',
      '',
      state.completedTaskIds.has(task.id) ? '此前已完成。' : '模型未返回逐任务判定。',
    );
  }), state.taskAssessments), safetyFlag === 'harmful');
  const completedTaskIds = completedIdsFromAssessments(taskAssessments)
    .filter((taskId) => safetyFlag !== 'harmful' || !['professional_reframe', 'action_partnership'].includes(taskId));
  const missingTaskIds = requiredTaskIds.filter((taskId) => !completedTaskIds.includes(taskId));
  const trustDelta = clamp(Number(result.trustDelta) || 0, -25, 25);
  const projectedTrust = clamp(state.trust + trustDelta, 0, 100);
  const forcedFailed = safetyFlag === 'harmful' && harmfulStreak >= 2;
  const forcedResolved = missingTaskIds.length === 0 && safetyFlag !== 'harmful';
  const forcedMaxTurns = state.turnCount + 1 >= state.maxTurns && !forcedResolved && !forcedFailed;
  const shouldEnd = Boolean(result.shouldEnd) || forcedFailed || forcedResolved || forcedMaxTurns || projectedTrust <= 0;
  const endReason = forcedFailed || projectedTrust <= 0
    ? 'failed'
    : forcedResolved
      ? 'resolved'
      : forcedMaxTurns
        ? 'max_turns'
        : result.endReason ?? 'continue';

  return {
    score: clamp(Number(result.score) || 0, 0, 100),
    trustDelta,
    parentMood: result.parentMood ?? 'uncertain',
    parentReply: result.parentReply ?? '家长暂时没有继续回复。',
    coachFeedback: result.coachFeedback ?? '没有反馈。',
    strengths: Array.isArray(result.strengths) ? result.strengths : [],
    risks: Array.isArray(result.risks) ? result.risks : [],
    taskAssessments,
    completedTaskIds,
    missingTaskIds,
    shouldEnd,
    endReason,
    isIrrelevant: Boolean(result.isIrrelevant),
    safetyFlag,
    harmfulStreak,
    harmfulSignalHistory: Array.isArray(result.harmfulSignalHistory)
      ? result.harmfulSignalHistory
      : safetyFlag === 'harmful'
        ? state.harmfulSignalHistory
        : [],
  };
}

async function checkApiStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    state.apiReady = Boolean(data.hasKey);
    state.apiModel = data.model ?? '';
    state.apiProvider = data.provider ?? 'AI';
    dom.useApi.disabled = !state.apiReady;
    if (state.apiReady) {
      state.useApi = true;
      dom.useApi.checked = true;
      dom.apiStatus.textContent = `${state.apiProvider} agent ensemble 已就绪，模型：${state.apiModel}`;
    } else {
      state.useApi = false;
      dom.apiStatus.textContent = `未检测到 ${state.apiProvider} API key。可以检查事件和界面，但不会生成评分或家长回复。`;
    }
  } catch {
    state.apiReady = false;
    state.apiProvider = 'AI';
    dom.useApi.disabled = true;
    dom.apiStatus.textContent = '未启动本地 Node 代理。可以检查事件和界面，但不会生成评分或家长回复。';
  }
}

function bindEvents() {
  dom.parentStyle.addEventListener('change', () => {
    state.parentStyleId = dom.parentStyle.value;
    dom.styleDescription.textContent = activeStyle().description;
    resetConversation();
  });

  dom.useApi.addEventListener('change', () => {
    state.useApi = dom.useApi.checked && state.apiReady;
    dom.apiStatus.textContent = state.useApi
      ? `${state.apiProvider} agent ensemble 开启，模型：${state.apiModel}`
      : state.apiReady
        ? `${state.apiProvider} agent ensemble 已就绪，模型：${state.apiModel}`
        : `未检测到 ${state.apiProvider} API key，不会运行本地关键词评分。`;
  });

  dom.resetBtn.addEventListener('click', resetConversation);
  dom.replyForm.addEventListener('submit', handleSubmit);
}

async function init() {
  renderEventToggles();
  renderParentStyles();
  renderSamples();
  renderStandards();
  bindEvents();
  await checkApiStatus();
  resetConversation();
}

init();
