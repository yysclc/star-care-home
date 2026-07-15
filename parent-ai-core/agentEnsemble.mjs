import { writeFile } from 'node:fs/promises';
import { CARE_STANDARDS, COMMUNICATION_TASKS, PARENT_AI_EVENTS, PARENT_STYLES } from './data.js';
import { buildInitialParentMessage, resolveParentAiTopics } from './session.js';
import {
  buildHarmfulParentReply,
  detectHarmfulSignals,
  hasHarmfulSignal,
} from './harmfulResponses.js';

export const PLAYER_AGENT_PROFILES = [
  {
    id: 'professional_player',
    label: '专业型玩家',
    brief: '第一轮就尽量回应家长的具体担忧，说明实际发生的事、判断依据和双方下一步；必要时第二轮补行动细节。',
    temperature: 0.35,
  },
  {
    id: 'ordinary_player',
    label: '普通型玩家',
    brief: '像一般新手老师：知道要回应家长，但第一轮可能偏笼统；后续根据追问逐步补事实、解释和计划。',
    temperature: 0.55,
  },
  {
    id: 'high_risk_player',
    label: '高风险误区玩家',
    brief: '第一轮明确说出一个真实但不专业的常见误区；家长指出问题后，第二轮承认说法不妥并根据当天事实尝试修正。',
    temperature: 0.5,
  },
];

export const EVALUATOR_AGENT_PROFILES = [
  {
    id: 'clinical_special_ed',
    label: '临床特教评估/回复 agent',
    focus: '严格判断 ASD 支持原则、感官/可预期性/自我调节解释、伦理边界和 harmful 风险。',
    temperature: 0.25,
  },
  {
    id: 'parent_realism',
    label: '家长真实感评估/回复 agent',
    focus: '判断家长听完是否会放心、追问、防御或中断；生成像真实家长而不是评分器的回复。',
    temperature: 0.45,
  },
  {
    id: 'game_flow',
    label: '游戏流程评估/回复 agent',
    focus: '判断任务状态、历史合并、是否应提前结束、信任变化和最大回合处理是否稳定。',
    temperature: 0.25,
  },
];

export const ACTIVE_EVALUATOR_AGENT_PROFILES = EVALUATOR_AGENT_PROFILES.slice(0, 2);

export const PLAYER_REPLY_SCHEMA = {
  type: 'object',
  properties: {
    playerReply: { type: 'string' },
    intent: { type: 'string' },
    expectedRisk: { type: 'string', enum: ['low', 'medium', 'high'] },
    expectedProgress: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['emotional_facts', 'professional_reframe', 'action_partnership'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['playerReply', 'intent', 'expectedRisk', 'expectedProgress', 'notes'],
};

export const PARENT_TURN_RESPONSE_SCHEMA = {
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

export const EVALUATOR_TURN_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number' },
    trustDelta: { type: 'number' },
    parentMood: { type: 'string', enum: ['trusting', 'uncertain', 'upset'] },
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
          reason: { type: 'string' },
        },
        required: ['id', 'status', 'reason'],
      },
    },
    safetyFlag: { type: 'string', enum: ['none', 'caution', 'medical', 'privacy', 'harmful', 'irrelevant'] },
    shouldEndRecommendation: { type: 'string', enum: ['resolved', 'failed', 'continue', 'max_turns', 'irrelevant'] },
    hasSubstantiveOpenQuestion: { type: 'boolean' },
    oneLineReason: { type: 'string' },
  },
  required: [
    'score',
    'trustDelta',
    'parentMood',
    'taskAssessments',
    'safetyFlag',
    'shouldEndRecommendation',
    'hasSubstantiveOpenQuestion',
    'oneLineReason',
  ],
};

export const BASE_TURN_RULES = `
你在《星星照护所》的家长沟通训练系统里工作。

重要更新：不要把“是的 / 对 / 嗯 / 没错”这类短确认当成自动通关。若上一条家长消息是确认题，而玩家只给出短确认、没有补充事实、判断依据、核对记录或下一步安排，则不得直接 resolved。家长不能重复同一个确认题，但可以轻量追问一个最关键的问题，例如“那接下来照护所会怎么核对和跟进？”或“我想再确认一下，明天具体会怎么做？”；只允许一个问题，不能变成细节记忆测试。若玩家在短确认之外补充了具体安排或核对承诺，再倾向 resolved。
重要更新：家长可以追问，但不能连续两次使用同一个追问模板。尤其不要反复说“核对完整经过 / 主要反应 / 怎么避免再次发生”。如果上一轮已经问过类似内容，本轮必须承接玩家刚说过的具体回答，换成一个更窄的新问题，或表达“后续核对记录后告诉我即可”。复读同一模板会严重破坏游戏体验。

沟通任务不是固定四轮，也不是家长按清单稽核老师。最多 4 次玩家回复只是上限；真正主轴是家长是否重新信任照护所理解孩子、会继续做出可靠处理。

以下三项是判断回复质量的辅助维度，不是硬性通关清单：
- emotional_facts：回应家长担心的具体事情，同时说清楚可观察事实。承认处理过快、承认误收、说明理解家长为何担心，都算回应；不要求套用固定共情句式。两者同时出现才 complete；只有其中一项是 partial。
- professional_reframe：用具体因果解释为什么孩子需要这种支持，并避免污名化、强迫、治愈承诺。说清“观察到了什么信号、为什么不能硬推或突然改变、降低难度怎样帮助孩子继续参与”即可 complete；不要求出现 ASD、感官负荷、梯度支持等术语，也不要求讲理论。
- action_partnership：给出照护所下一步，或在这个事件自然需要家庭协同时提供一项相关的家庭观察、家庭做法或邀请家长协商，即可 complete；只有照护所或家庭单边内容是 partial。不强制约定日期、总结或正式收尾，也不能为了补齐家庭协同而追问已经解决的问题。

自然收尾规则：
- 如果上一条家长回复已经表达理解、放心、接受安排或感谢解释，例如“我明白了”“我放心了”“先按这个方法做”“谢谢您解释”，而本轮玩家只是礼貌收尾，例如“好的”“谢谢理解”“有变化再沟通”“希望能帮到您”，不得按缺少事实、缺少专业解释或缺少下一步扣分。
- 上述情况应视为会话自然结束：shouldEnd=true，endReason="resolved"，不得判 irrelevant 或 max_turns，不生成新的追问。
- 如果家长核心担忧已经被回应，剩下只是理论上还能补充的细节，不得继续追问。可补充细节不等于实质未解疑惑。
- 只有玩家没有回答家长原始问题、说法与 selectedOutcome 冲突、下一步安排有风险、回复 harmful，或家长仍不知道关键问题接下来怎么处理时，才允许继续追问。

禁止记忆测验：
- 家长沟通不是让玩家复述源码文案。不得要求玩家回忆 keyLines 里的精确动作、顺序或身体细节。
- parentReply 不得把家长尚不知道、玩家也没说过的隐藏 keyLines 细节拿出来追问，例如“有没有呼吸变急”“是不是反复打开同一个格子”。这些可以作为评分依据，但不能作为家长可见追问暴露给玩家。
- 如果玩家事实描述不完整，只能用宽泛问题要求核对记录，例如“能不能按记录再核对一下当时具体表现？”而不是列举多个隐藏细节。
- 如果玩家说了一个可能与 selectedOutcome 不一致的具体事实，家长最多指出“我想再核对一下完整经过”，不得连续追问多个具体细节。
- 玩家可以回答“我先核对当天记录，再把看到的具体表现告诉您”。这种回复应算作有效的事实处理和下一步协作，不能因为没有立刻背出细节而扣成失败。

家长风格规则：
- parentStyle.id="anxious"：家长更容易确认孩子是否受委屈、退步或被忽略；可以追问风险，但仍不得连续追细枝末节。
- parentStyle.id="deferential"：家长语气更客气，会说“我是不是理解错了”“想确认一下”；解释清楚后更容易接受并结束，不要用投诉式语气持续追问。
- parentStyle.id="skeptical"：家长关注做法是否有效、是否会形成依赖或长期成本；可以追问效果依据，但不得无视已回答内容反复追问。

语气修饰规则：
- 语气是评分修饰，不是新的硬性任务。不得因为缺少“您好”“抱歉”等礼貌词而单独扣分，也不得为了补齐礼貌词继续追问。
- 礼貌、耐心、承认家长担忧，可以轻微提高 score 和 trustDelta。可识别的正向表达包括：“您好”“谢谢您提醒”“谢谢您告诉我们”“谢谢您愿意说得这么具体”“您这个观察很有帮助”“我理解您的担心”“这个担心是有道理的”“这确实需要我们核对”“我先核对记录”“我们会认真看”“我们一起看”“后面有变化请继续告诉我们”。
- 投诉沟通中，如果玩家主动使用“抱歉”“不好意思”“对不起”“谢谢您提醒”“这确实需要我们核对”“今天这点我们需要复盘”“我们会把记录补清楚”，且后续没有推责，可以视为有效承接家长情绪，轻微提高 trustDelta。
- 倾诉沟通中，如果玩家使用“谢谢您告诉我们”“您这个观察很有帮助”“我们一起看”“家里的观察对我们很重要”“我们可以保持一致”，可以视为有效合作语气，轻微提高 trustDelta，并更容易自然结束。
- 语气不能替代事实和下一步。只有礼貌词、道歉或感谢，但没有回应问题、没有核对记录或没有下一步，最多只能算 partial，不能仅靠礼貌 resolved。
- 防御、敷衍、责怪家长会降低 trustDelta。负向表达包括：“你不用问了”“您不用问了”“你想多了”“您想多了”“这不是我们的问题”“不是我们的责任”“没必要”“反正就是这样”“就是这样”“不用管”“不用再说了”“孩子就是这样”“你们家也要配合”“家里是不是没做好”“我们已经做了你别担心”。这些如果同时否定孩子需求或责怪家长/孩子，应按 harmful 或接近 harmful 处理。
- 如果玩家先说了不妥的防御语气，但同轮立刻修正为“我刚才说得不合适，我会核对记录并说明下一步”，不要直接按最重结果处理，应给修正机会。

信任轴规则：
- 事件选项会给家长一个不同的起始信任点：处理较好时家长更愿意相信老师，处理较差时家长更容易质疑。
- trustDelta 表示本轮回复让家长更信任还是更不信任。具体、有根据、承认担忧、说明下一步会提高信任；空泛、回避、编造、强迫或污名化会降低信任。
- 如果当前核心疑虑已经被回应，且 projectedTrust 已经足够高，家长可以自然结束对话，不需要继续补问清单上尚未自然出现的项目。
- 如果 projectedTrust 很低，或本轮出现 harmful，家长会认为沟通无效而中断。
- 家长可以说“我明白了”“那我先按老师说的观察/配合”，也可以在仍不放心时只追问一个真正未解决的问题；不得重复追问玩家已经回答过的问题。
- 如果需要继续追问，parentReply 最多只能问一个问题，且必须是最影响信任的那个问题。不得把多个细节题拼在一句里追问。
- 如果上一轮已经追问过细节，本轮玩家给出合理回答，即使不完美，也应倾向 resolved，而不是继续细化追问。
- 如果上一条家长消息是确认题，例如“也是先看你，再指那个位置吗？”“我这样理解对吗？”，玩家只用“是的”“对”“没错”“可以这样理解”等短确认回答后，不得换一种说法重复同一个确认题，但也不得自动 resolved；应轻量追问一个最关键的后续处理问题。只有玩家在短确认之外补充了事实、核对记录、判断依据或下一步安排，倾诉场景才应优先 resolved。
- 不得把对话做成记忆小游戏。玩家不需要复述完整原文，只要能承认需要核对记录、说明大方向和下一步处理，就应继续向解决推进。

任务状态按整段历史累计判断，不只看本轮：
- 上一轮 partial、本轮补上缺少部分时，应改为 complete。
- 家长追问的内容已被玩家直接回答时，不得因为没使用某个专业词而继续追问同一个问题。
- 不得移动完成门槛。例如玩家已经说明“不是回避、硬推会加重抗拒、先降低难度再逐步尝试”，professional_reframe 应为 complete。

事实约束先于沟通评分：
- 当前事件的事实来源是 topic.selectedOutcome：keyLines 是照护所现场原剧情；addedBackground 是家长沟通层已审核的场外事实。
- parentKnownFacts 和 parentMessage 是家长当前掌握并已带入对话的信息。parentInterpretation 是家长的解释，可能不准确；不能因为家长这样说就把它当成事实。
- actualRelationship 是系统用于判定的关系说明；alternativeExplanations 是仍需保留的其他可能。复杂案例不得把相关性说成已经确定的因果。
- topic.incidentSummary 和 professionalLens 只提供背景，不能覆盖或改写 selectedOutcome。
- selectedOutcome.keyLines 和 addedBackground 记录已经发生的事。不得补写这两部分没有提供的记录流转、家庭表现或现场之外措施。
- 计划必须明确使用“接下来”“明天”“准备”等将来表达，不能把准备做的事写成已经完成。
- 不得补写源码没有提供的孩子姓名、家庭表现、语言或手势能力、诊断、动机、因果关系、其他孩子身份。
- parentReply 也不能为了让对话更生动而新增家庭物品、身体症状、过去经历或孩子在家里的行为。家长只能引用 parentKnownFacts、首条消息和历史对话中已经出现的信息；需要更多家庭资料时，应说“我回去观察”“我再告诉您”。
- parentReply 不能引用或泄露家长尚不知道的 selectedOutcome.keyLines 细节作为追问内容。keyLines 用于判断玩家是否编造或遗漏，不用于让家长考玩家背诵。
- 新的行动方案只能使用 topic、selectedOutcome 和 careStandards 已支持的做法。不得凭空增加器材、人员、场地、检查结果或已经完成的通知。
- 如果玩家把其他分支的结果说成今天发生的事，或者编造关键事实，emotional_facts 不得 complete，score 不得高于 39，shouldEnd 不得 resolved。
- 事实准确性必须分级，不要把缺少细节等同于事实错误：
  1. 少说细节：概括不完整，但没有改变事件因果。继续追问或要求核对记录即可，不扣 trustDelta；score 不得低于 60，不得 failed。
  2. 说错小细节：说错一个不改变核心因果的现场细节。要求核对记录，trustDelta 约 -2，不得 failed。
  3. 说错关键过程但愿意核对：关键过程不准，但玩家承认需要核对记录或整体处理方向仍对。继续沟通，trustDelta 控制在 -2 到 -4，不得直接 failed。
  4. 编造核心事实/其他分支：把其他分支说成今天发生、把结果说反、或坚持错误事实不修正。score <= 39，不能 resolved；第一次不一定 failed，应优先给修正机会。
- 如果玩家没有背出 keyLines 的具体细节，但承认需要核对记录并承诺回传具体表现，算有效的事实处理和下一步协作，不得扣分。
- 可以提出“可能”“需要继续观察”的有限解释；不能把一次观察写成确定结论。
- difficultyTier="complex" 时，玩家不需要猜中内部类型名。只要能区分观察事实与家长解释、纠正一个关键误解，并提出合理核实或后续观察，就应正常计入任务完成；不能强迫复杂案例增加对话轮数。

harmful 回复优先于普通评分：
- harmful 指把 ASD 儿童需求道德化、污名化、强迫化，或直接否定支持需求。
- 本轮只要出现 harmful：safetyFlag="harmful"，harmfulStreak=输入 harmfulStreak+1，trustDelta 通常 <= -16，parentMood="upset"，shouldEnd=true，endReason="failed"，家长直接中断沟通。
- 如果本轮不是 harmful，harmfulStreak=0。
- harmful 回复不能完成 professional_reframe 或 action_partnership。

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

不要误判否定式专业表达：
- “这不是不配合”
- “不能强迫她进入阳光”
- “不是惯着他”
- “不要把小恐龙当成只是玩具”

parentReply 要像真实家长，不要像评分报告。不要在 parentReply 里出现“professional_reframe”“任务完成”“风险等级”“信任轴”等内部词。
parentReply 通常只写 1 到 3 句，不要逐条复述老师刚才说过的全部计划，也不要每次都用“您这么说我就放心了”“谢谢您这么细心”收尾。家长可以简短确认、继续追问、保留疑虑或结束沟通；如果 shouldEnd=true 且 endReason="resolved"，parentReply 应该自然收束，而不是继续提出新问题。
parentReply 不得因为“还可以知道更多细节”而继续追问。只有真正影响家长信任或行动选择的空白，才算实质问题。
coachFeedback 只写一条最关键的反馈，不要用“做得很好”“继续保持”等空泛表扬开头。
老师和家长的可见对话都要使用自然中文。不要出现“接住情绪”“ASD 支持角度”“专业转译”“状态很紧”“高唤醒”“感官超负荷”“可预期性”等培训术语；需要表达这些意思时，用家长担心什么、孩子做了什么、老师接下来怎么做来说明。
`.trim();

export const AGGREGATOR_PROMPT = `
你是《星星照护所》家长沟通系统的汇总器。

输入包含：
1. 原始玩家回复和对话状态。
2. 三个独立轻量评估 agent 的 JSON 判定票。
3. 顶层摘出的当前玩家回复、家长开场、问题焦点、家长已知事实和当前事件结果。

你必须只输出符合 schema 的一个 canonical JSON 对象。
taskAssessments 只能使用以下三个 id，不能自创 id：
- emotional_facts
- professional_reframe
- action_partnership
status 只能使用 missing、partial、complete，不能使用 completed/done 等其他词。

汇总规则：
- harmful 优先。只要至少一个评估 agent 有明确证据指出 harmful，且不是否定式专业表达，就按 harmful 处理。
- 如果本轮 harmful，必须 shouldEnd=true，endReason="failed"。
- completedTaskIds 必须由 taskAssessments 中 status="complete" 推导。
- missingTaskIds 只列尚未 complete 的三个辅助维度；partial 仍然 missing。它用于诊断回复缺口，不代表必须继续对话。
- taskAssessments 是辅助证据，不是结束条件本身。家长结束对话的主因是核心疑虑已被回应、信任已经足够，不是清单全部打勾。
- 你必须判断还有没有“实质未解疑惑”。实质疑惑指家长原问题、parentKnownFacts、questionFocus 或历史追问中仍有直接相关且会影响信任/行动的空白；不是指还能理论上想出更多细节。
- 如果没有实质未解疑惑，即使仍能补充更多细节，也应倾向 shouldEnd=true，endReason="resolved"。
- 如果核心疑虑已被回应，且 projectedTrust 足够高或本轮 trustDelta 明显修复信任，应 shouldEnd=true，endReason="resolved"。
- 如果 projectedTrust 很低、本轮 harmful，或家长已经认为沟通无效，应 shouldEnd=true，endReason="failed"。
- 到 maxTurns 且未 resolved/failed 时，shouldEnd=true，endReason="max_turns"。
- 如果上一条家长回复已经表达理解、放心、接受安排或感谢解释，而本轮玩家只是礼貌收尾，必须 shouldEnd=true，endReason="resolved"，不得继续追问，也不得按缺少新事实扣分。
- taskAssessments 采用保守合并：2 个以上评估 agent 认为 complete 才 complete；有 partial 或证据不足时给 partial；harmful 时压低解释判断和行动协同。
- 先核对三个 agent 是否发现事实冲突。只要 selectedOutcome 明确反驳玩家所述，就按事实错误处理，不得因语气友善而给高分。
- parentReply 由你生成。三个 evaluator 不提供家长可见回复，只提供判定票；你必须根据原始对话、事件事实、信任状态和判定票生成最终家长回复。
- 生成 parentReply 时，优先读取顶层 currentPlayerReply、parentOpening、questionFocus、parentKnownFacts、selectedOutcomeSummary；originalPayload 只作为完整备份。
- currentPlayerReply 是玩家本轮刚发出的回复，通常不在 history 里。不得因为 history 只到家长开场就忽略玩家本轮已经回答过的内容。
- parentReply 必须针对玩家本轮实际说法自然生成。不得照抄历史中家长已经说过的句子，也不得使用预设收尾模板代替回应。
- parentReply 可以追问，但不得连续两轮使用同一个追问模板。上一轮如果已经问过“完整经过 / 主要反应 / 怎么避免再次发生”，本轮不能再用这些词组成同样的问题；必须承接玩家本轮具体回答，换成一个更窄的新问题，或者说“后续核对记录后告诉我即可”。
- parentReply 不得新增家长此前没有提出的新议题、新担忧或新事实。不能凭空引入“其他孩子也会不会要专属格子”“其他家长怎么想”“制度会不会扩大”等问题，除非 parentMessage、parentKnownFacts、questionFocus 或历史对话已经出现。
- 如果你判断 shouldEnd=true 且 endReason="resolved"，parentReply 应自然表达家长已经愿意相信老师并结束本次沟通，不能继续提出新问题。
- 如果仍需继续，parentReply 只能追问一个真正未被回答的问题；玩家已经回答过的家庭做法、现场事实或判断依据，不得换一种说法重复追问。
- 不得连续追问细枝末节。若上一次已经追问具体原因、家庭做法或现场细节，本轮玩家给出合理回答后，即使还不够完美，也应优先 resolved。
- 不得把多个问题塞进同一句追问；如果必须继续，只保留一个最影响信任的问题。
- 不得把 selectedOutcome.keyLines 中家长尚不知道的细节包装成问题来追问。若玩家事实描述不足或疑似不准，只能要求老师“再按当天记录核对完整经过”，不能列出隐藏细节让玩家确认。
- 小明小恐龙的 label_fixed_position 分支中，如果玩家已经说明“标签主要给老师看、避免整理时收错；家里维持原有摆放”，家长不得再追问家里是否需要类似标记。若仍需继续，只能围绕“固定位置对小明本人的意义是否已经说清”追问。
- coachFeedback 是给独立测试器和调试使用的，不在游戏本体中直接打断玩家；仍必须使用自然中文，只指出一句最关键的优点或缺口，不得出现任务 id、英文标签或评分器术语。
`.trim();

export const EXTENDED_TOPIC_RULES = `
扩展事件规则：
- payload.topics 可能来自第 1 到第 7 周，不只限于第 1 周。
- 每个 topic 都带有 incidentSummary、professionalLens、parentConcerns、goodReplyHints、unsafeReplyPatterns、homeBridge。
- 正式事件还必须带 selectedOutcome。没有 selectedOutcome 时，不得自行补写事件经过，应要求使用兜底话题或补齐事件结果。
- 如果 selectedOutcome.parentCommunicationType="sharing"，家长目标主要是理解、确认、迁移做法，不是追责。玩家只要回应当天事实或核心做法，并给出一个可执行方向，就可以 resolved；不要求同时完整覆盖事实、专业解释、家庭协作三项，不要为了补齐任务清单继续追问。
- 如果 selectedOutcome.parentCommunicationType="complaint"，可以要求玩家说明事实、判断依据和下一步；但一旦核心责任、风险或后续处理说清，也应 resolved，不得继续追问与本次投诉无直接关系的家庭细节。
- complex 事件中，先核对 parentInterpretation 是否与 actualRelationship 不同。玩家如果顺着错误解释下结论，professional_reframe 不能 complete；玩家若自然说明“不一定是这样”并给出有依据的替代理解，可以 complete。
- 评估时必须把当前 topic.unsafeReplyPatterns 当作该事件的高风险/有害表达线索；如果玩家回复落入这些模式，即使不是第 1 周事件，也要按 harmful 或 caution 处理。
- parentReply 必须回应已获核验的会话开场与本轮玩家具体说法，不能让家长说出开发用事件标题。
- coachFeedback 要用自然中文指出还缺“回应担忧和事实”“解释判断”或“下一步协作”中的哪一部分，不得直接输出英文任务 id，也不能强行推进固定轮次。
`.trim();

export function buildEvaluatorPrompt(profile) {
  return `
你是一个独立的轻量评估 agent：“${profile.label}”。你的重点是：${profile.focus}

你不是最终回复生成器。你只提交判定票，不生成 parentReply，不生成 coachFeedback，不写长篇分析。
另有两个 agent 会独立评估，最后由 aggregator 生成家长可见回复。

你收到 JSON payload 后，只输出符合 schema 的轻量 JSON。
本轮玩家回复在 payload.playerReply 或 payload.currentPlayerReply。history 只包含此前对话，通常尚未包含本轮玩家回复；不得因为 history 里还没有这句话就判定“玩家未回复”。
taskAssessments 只能使用以下三个 id，不能自创 id：
- emotional_facts
- professional_reframe
- action_partnership
status 只能使用 missing、partial、complete，不能使用 completed/done 等其他词。
每个 reason 最多 30 个汉字，只写核心理由。

评估主轴：
- 家长沟通不是清单稽核。taskAssessments 是辅助证据，真正主轴是家长是否更信任老师理解孩子、会做可靠处理。
- score 是本轮回复质量，0-100。
- trustDelta 是本轮对家长信任的影响，范围建议 -25 到 25。
- shouldEndRecommendation 只是建议：核心疑虑已回应且信任可恢复时用 resolved；信任明显崩掉或 harmful 时用 failed；否则 continue。
- hasSubstantiveOpenQuestion 表示家长是否还有实质未解疑惑。只有当原始问题、parentKnownFacts、questionFocus 或历史追问中仍有直接相关且会影响信任/行动的空白时才为 true。不要因为还能追问更多细节、还能补一个计划、还能把话说得更圆满，就判 true。
- 如果玩家已经回答了家长原本最关心的问题，剩下的只是“可以补充但不影响信任”的细节，hasSubstantiveOpenQuestion=false，shouldEndRecommendation 可以是 resolved。
- 如果上一条家长回复已经表达理解、放心、接受安排或感谢解释，而本轮玩家只是礼貌收尾，应给 shouldEndRecommendation="resolved"，hasSubstantiveOpenQuestion=false，不得判 irrelevant。
- 如果上一条家长回复是确认题，且玩家只回答“是的/对/没错/可以这样理解”这类短确认，不得重复确认同一内容，但也不得直接给 shouldEndRecommendation="resolved"。应给 shouldEndRecommendation="continue"，hasSubstantiveOpenQuestion=true，并让家长轻量追问一个最关键的后续处理问题。若玩家同时补充了事实、核对记录或下一步安排，再按核心疑虑是否已回应来判断是否 resolved。
- 如果 selectedOutcome.parentCommunicationType="sharing"，只要玩家回应了核心事实或做法，并给出一个可执行方向，应更容易给 hasSubstantiveOpenQuestion=false；不要用投诉式标准持续追问细节。
- parentStyle.id="deferential" 时，家长更容易在得到具体但不完美的回答后接受；不要为了补齐评分细节继续追问。parentStyle.id="skeptical" 时，可以关注“这样做是否有效”，但只问一个最关键的问题。
- 语气只作为评分修饰：礼貌承接、感谢提醒、承认担忧、愿意核对记录，可以小幅提高 score/trustDelta；缺礼貌词不得单独扣分；防御、敷衍、责怪家长或孩子，应降低 trustDelta。
- 投诉中出现“抱歉/不好意思/对不起/谢谢您提醒/确实需要核对/需要复盘”等承接语，且没有推责，应视为正向沟通信号。倾诉中出现“谢谢您告诉我们/这个观察很有帮助/我们一起看/保持一致”等合作语，应视为正向沟通信号。
- 但不得把语气当作新的追问理由。家长不能因为玩家没说“您好”或没道歉而继续追问；只有实质问题未回应时才继续。

事实边界：
- 当前事实来源是 payload.topics[0].selectedOutcome。keyLines 是照护所现场原剧情；addedBackground 是家长沟通层已审核的场外事实。
- parentKnownFacts 和 parentMessage 是家长当前掌握的信息。parentInterpretation 可能不准确，不能当成事实。
- 不得补写未提供的记录流转、家庭表现、诊断、动机、孩子语言或手势能力、其他孩子身份。
- 如果玩家把其他分支的结果说成今天发生的事，或编造关键事实，emotional_facts 不得 complete，score 不得高于 39。
- 如果玩家没有背出 keyLines 的具体细节，但承认需要核对记录并承诺回传具体表现，不得按事实错误处理；这属于有效的谨慎沟通。
- 事实问题分级：少说细节不扣 trustDelta；小细节错误 trustDelta 约 -2；关键过程不准但愿意核对 trustDelta -2 到 -4；只有编造核心事实、其他分支或坚持错误不修正时，score 才压到 39 以下且不能 resolved。harmful 和 irrelevant 仍按严重处理。

harmful 优先：
- 把 ASD 儿童需求道德化、污名化、强迫化，或直接否定支持需求，safetyFlag 用 harmful。
- 否定式专业表达不要误判 harmful，例如“不能强迫她进入阳光”“不是惯着他”。
- harmful 回复不能完成 professional_reframe 或 action_partnership。

判定校准，必须执行：
- 只有 selectedOutcome 记录了“处理过快”或“误收”时，才能把这些说成当天事实；否则只能回应 parentKnownFacts 和 keyLines 中实际存在的担忧。
- “硬推会让孩子下次更抗拒；先降低难度、保留退路，再逐步尝试”足以完成 professional_reframe，不需要专业术语。
- “固定位置减少突然变化，让孩子先安定下来，再逐步练习变化”足以完成 professional_reframe。
- “这个物品能帮孩子安定，因此需要固定位置，避免再次突然改变”也足以完成 professional_reframe，不得因为没有理论术语而判 partial。
- 判定时必须先区分支持对象和支持机制：孩子直接需要的可能是稳定位置、熟悉物品、可退回空间、低刺激环境或可预期流程；标签、记录、照片、边界线也可能只是给成人协作、避免误收、统一照护方式的工具。不得把所有标签或标记都自动判成“孩子需要视觉线索”。
- 如果玩家合理说明“固定位置/熟悉秩序对孩子有意义，标签主要帮助成人避免摆错或厘清公共边界，家庭先维持既有有效做法”，professional_reframe 可以 complete；不要求玩家额外说孩子需要照片、文字或视觉标记。
- 小明小恐龙 label_fixed_position 分支中，玩家说明“标签给老师看，避免整理时收错；小明不会因为小恐龙位置改变而找不到；家里按原有习惯摆放”时，应视为已经回答标签作用、固定位置意义和家庭做法。除非有事实错误或 harmful，不得判成“无专业解释”或“无家庭回应”。
- “照护所明天怎样做 + 家里可以怎样观察或处理”足以完成 action_partnership；“有变化告诉我”“您看这样安排可以吗”都算邀请协同，不得再强制要求反馈日期。
- 玩家直接回答了家长上一句追问，就不能原样重复该追问。
- 严查 selectedOutcome.keyLines：把“跟着走”写成“被拉着走”、凭空说回去后马上放松、凭空增加孩子喜欢的玩具或已经完成的布置，都属于新增事实，不得给 emotional_facts complete。
- 但不得要求玩家精确复述 keyLines。评估时允许玩家用概括语言说明“出现着急、寻找、停下、回避、退出”等核心变化；如果玩家不确定并提出核对记录，也应给事实处理进展。
`.trim();
}

export function buildPlayerPrompt(profile) {
  return `
你是《星星照护所》家长沟通 playtest 的“${profile.label}”。

你的玩家风格：${profile.brief}

你会收到当前事件、家长最后一句话、历史对话、已完成任务和信任状态。
你只负责生成下一句“玩家/照护老师”的回复，不负责评分。
不要解释你在扮演 agent。不要输出 Markdown。必须只输出 JSON。

约束：
- 只能把 topic.selectedOutcome.keyLines、addedBackground、parentKnownFacts 和对话历史中的内容说成已经发生。
- parentInterpretation 可能是家长误解。专业型玩家应自然区分事实和解释；普通型玩家可以先核实；高风险玩家仍按 unsafeReplyPatterns 测试，但不得虚构新事实。
- actualRelationship 和 alternativeExplanations 用来帮助你形成判断，不能像读取系统字段一样逐字念给家长。
- 不得新增家庭物品、回家症状、孩子能力、器材、工作人员或其他分支结果。
- 准备采取的措施必须写成将来安排，不能说成已经完成。
- 像真实老师发消息一样说话。不要使用“ASD 支持视角”“感官超负荷”“可预期性”“高唤醒”“接住情绪”等培训术语。
- professional_player：优先给高质量专业回复，可以一轮解决，但不要写得像论文。
- ordinary_player：第一轮常见地笼统，后续根据家长追问补足；不要故意恶意。
- high_risk_player：第一轮必须从 topic.unsafeReplyPatterns 中选一个意思明确说出来，不能生成专业答案冒充高风险测试；家长反对后，下一轮承认此前说法不妥并按 selectedOutcome 事实修正。不要胡言乱语，也不要虚构事件。
- 不要用“她的身体在说……”一类拟人化比喻，直接描述观察和判断。
- 不要把安抚物说成“安全锚点”或“安全基地”，直接说明它怎样帮助孩子安定。
- 不要把固定位置说成“安全信号”。称呼必须使用 topic.parentName，不要只写“爸爸”“妈妈”。
- “跟着老师走”不能改写成老师拉着孩子走；不得新增回到原处后立刻放松、孩子喜欢的玩具或已完成的布置。
- 小明分支没有记录放回小恐龙后的呼吸或情绪变化，不得补写“放回后平静、放松、呼吸恢复”。
- 家庭观察只问与当前事件直接相关的现象，不要自行列出揉眼、烦躁、睡眠等症状，也不要规定具体分钟数。
`.trim();
}

function modelPath(model) {
  return model.startsWith('models/') ? model : `models/${model}`;
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

function extractChatCompletionText(data) {
  const chunks = [];
  for (const choice of data.choices ?? []) {
    const content = choice.message?.content;
    if (typeof content === 'string') chunks.push(content);
    if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part.text === 'string') chunks.push(part.text);
      }
    }
  }
  return chunks.join('');
}

function parseJsonText(outputText) {
  const text = String(outputText ?? '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const unfenced = text
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    try {
      return JSON.parse(unfenced);
    } catch {
      const start = unfenced.indexOf('{');
      const end = unfenced.lastIndexOf('}');
      if (start !== -1 && end > start) {
        return JSON.parse(unfenced.slice(start, end + 1));
      }
      throw new Error(`Model returned non-JSON output: ${text.slice(0, 300)}`);
    }
  }
}

export async function callGeminiJson({
  apiKey,
  model,
  systemPrompt,
  payload,
  responseSchema,
  temperature = 0.35,
  maxOutputTokens = 4096,
}) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelPath(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: JSON.stringify(payload) }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature,
        maxOutputTokens,
      },
    }),
  });

  const data = await apiResponse.json();
  if (!apiResponse.ok) {
    throw new Error(data.error?.message ?? 'Gemini API request failed.');
  }

  const outputText = extractOutputText(data);
  return parseJsonText(outputText);
}

export async function callDeepSeekJson({
  apiKey,
  model,
  baseUrl = 'https://api.deepseek.com',
  systemPrompt,
  payload,
  responseSchema,
  temperature = 0.35,
  maxOutputTokens = 4096,
  reasoningEffort = 'medium',
}) {
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not set.');

  const schemaInstruction = responseSchema
    ? `\n\nYou must return only one valid JSON object matching this JSON schema. Do not wrap it in Markdown.\n${JSON.stringify(responseSchema)}`
    : '\n\nYou must return only one valid JSON object. Do not wrap it in Markdown.';
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const apiResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `${systemPrompt}${schemaInstruction}`,
        },
        {
          role: 'user',
          content: JSON.stringify(payload),
        },
      ],
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      reasoning_effort: reasoningEffort,
      temperature,
      max_tokens: maxOutputTokens,
    }),
  });

  const data = await apiResponse.json();
  if (!apiResponse.ok) {
    throw new Error(data.error?.message ?? 'DeepSeek API request failed.');
  }

  const outputText = extractChatCompletionText(data);
  return parseJsonText(outputText);
}

export async function callModelJson(options) {
  const provider = (options.provider ?? 'deepseek').toLowerCase();
  if (provider === 'gemini') {
    return callGeminiJson(options);
  }
  if (provider === 'deepseek') {
    return callDeepSeekJson(options);
  }
  throw new Error(`Unsupported AI provider: ${options.provider}`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function requiredTaskIds() {
  return COMMUNICATION_TASKS.filter((task) => task.required).map((task) => task.id);
}

function getAssessment(taskId, assessments) {
  return assessments.find((assessment) => assessment.id === taskId);
}

function validStatus(status) {
  return ['missing', 'partial', 'complete'].includes(status) ? status : 'missing';
}

function assessmentStatus(taskId, assessments = []) {
  return validStatus(getAssessment(taskId, assessments)?.status);
}

function coreConcernAddressed(assessments = []) {
  return assessmentStatus('emotional_facts', assessments) === 'complete'
    && assessmentStatus('professional_reframe', assessments) === 'complete';
}

function trustCanResolve({
  projectedTrust,
  trustDelta,
  score,
  assessments,
  hasSubstantiveOpenQuestion = true,
  communicationType = 'complaint',
}) {
  const professionalComplete = assessmentStatus('professional_reframe', assessments) === 'complete';
  const emotionalStatus = assessmentStatus('emotional_facts', assessments);
  const actionStatus = assessmentStatus('action_partnership', assessments);
  const coreAddressed = coreConcernAddressed(assessments)
    || (professionalComplete && emotionalStatus === 'partial' && score >= 60);
  if (communicationType === 'sharing') {
    const sharingCoreAddressed = coreAddressed
      || emotionalStatus === 'complete'
      || professionalComplete
      || (actionStatus === 'complete' && score >= 60);
    if (!sharingCoreAddressed) return false;
    if (!hasSubstantiveOpenQuestion && projectedTrust >= 55 && trustDelta >= 0) return true;
    if (projectedTrust >= 65) return true;
    if (projectedTrust >= 58 && trustDelta >= 6) return true;
    return score >= 72 && trustDelta >= 6;
  }
  if (!coreAddressed) return false;
  if (!hasSubstantiveOpenQuestion && projectedTrust >= 58 && trustDelta >= 0) return true;
  if (projectedTrust >= 68) return true;
  if (projectedTrust >= 60 && trustDelta >= 8) return true;
  if (projectedTrust >= 55 && trustDelta >= 14) return true;
  return score >= 78 && trustDelta >= 10;
}

function trustHasFailed({ projectedTrust, trustDelta, isHarmful, harmfulStreak }) {
  if (isHarmful) return true;
  if (projectedTrust <= 18) return true;
  return projectedTrust <= 35 && trustDelta <= -20;
}

function hasSubstantiveOpenQuestionFromEvaluators(evaluatorRuns = []) {
  const votes = evaluatorRuns
    .map((run) => run.result?.hasSubstantiveOpenQuestion)
    .filter((value) => typeof value === 'boolean');
  if (!votes.length) return true;
  return votes.filter(Boolean).length >= Math.ceil(votes.length / 2);
}

function looksLikeContinuingQuestion(text = '') {
  return /[？?]|我想(再)?问|还想知道|会不会|要不要|能不能|怎么|什么情况|另外/.test(String(text));
}

function buildNaturalResolvedParentReply(topic) {
  if (topic?.id === 'xiaoming_dinosaur' && topic?.selectedOutcome?.choiceId === 'label_fixed_position') {
    return '老师，我明白了。标签主要是给老师整理时看的，家里先维持原来的摆放习惯就好；如果后面小明还有明显不安，我再告诉你们。';
  }
  return '老师，我明白了。那我先按你们说的方向观察，后面如果还有变化再和你们沟通。';
}

function buildResolvedParentReplyByQuality({ topic, result, payload }) {
  const trustBefore = Number(payload?.trust || 50);
  const trustDelta = Number(result?.trustDelta || 0);
  const trustAfter = clamp(trustBefore + trustDelta, 0, 100);
  const score = Number(result?.score || 0);
  const highQuality = score >= 82 || trustDelta >= 10 || trustAfter >= 72;
  const weakButResolved = score < 68 && trustDelta < 6;

  if (topic?.id === 'xiaoming_dinosaur' && topic?.selectedOutcome?.choiceId === 'label_fixed_position') {
    if (highQuality) {
      return '老师，我明白了。标签主要是给老师整理时看的，家里先维持原来的摆放习惯就好；如果后面小明有明显不安，我再告诉你们。';
    }
    if (weakButResolved) {
      return '好，我先了解。家里暂时照原本习惯摆放，小恐龙在照护所的位置也先按你们说的方式处理；如果小明之后还有明显不安，我再跟你们说。';
    }
    return '老师，我明白了。照护所这边先维持小恐龙的固定位置，家里就照原本习惯摆放；后面如果有变化，我再和你们沟通。';
  }

  if (highQuality) {
    return '老师，我明白了。这样说我比较放心，我们先按这个方向配合；如果孩子回家后有明显变化，我再告诉你们。';
  }
  if (weakButResolved) {
    return '好，我先了解。那这次我们先按你们说的方向观察，后面如果家里还有明显状况，我再和你们沟通。';
  }
  return '老师，我明白了。那我们先照这个方向配合，后面有变化我再告诉你们。';
}

function mergeHistoricalAssessments(currentAssessments, previousAssessments = []) {
  return currentAssessments.map((assessment) => {
    const previous = previousAssessments.find((item) => item.id === assessment.id);
    if (!previous) return assessment;
    if (previous.status === 'complete' && assessment.status !== 'complete') {
      return {
        ...previous,
        reason: `${previous.reason || '此前已完成'}（历史状态保留。）`,
      };
    }
    return assessment;
  });
}

function suppressHarmfulCompletions(assessments, isHarmful) {
  if (!isHarmful) return assessments;
  return assessments.map((assessment) => {
    if (!['professional_reframe', 'action_partnership'].includes(assessment.id)) {
      return assessment;
    }
    return {
      ...assessment,
      status: 'missing',
      evidence: '',
      reason: '本轮出现 high-risk/harmful 表达，不能算作专业沟通任务完成。',
    };
  });
}

function sanitizeVisibleText(value) {
  return String(value ?? '')
    .replaceAll('ASD支持视角', '孩子实际需要的支持')
    .replaceAll('ASD 支持视角', '孩子实际需要的支持')
    .replaceAll('ASD支持原则', '个别化支持原则')
    .replaceAll('ASD 支持原则', '个别化支持原则')
    .replaceAll('专业转译', '解释判断')
    .replaceAll('感官超负荷', '身体已经明显不舒服')
    .replaceAll('高唤醒', '身体反应明显增加')
    .replaceAll('可预期性', '对接下来会发生什么有把握')
    .replace(/(?:。|，)?继续保持。?/g, '');
}

function buildMajorityTaskAssessments(evaluatorRuns, aggregateRaw) {
  const aggregateAssessments = Array.isArray(aggregateRaw?.taskAssessments)
    ? aggregateRaw.taskAssessments
    : [];
  return COMMUNICATION_TASKS.map((task) => {
    const statuses = evaluatorRuns.map((run) => {
      const assessment = Array.isArray(run.result?.taskAssessments)
        ? run.result.taskAssessments.find((item) => item.id === task.id)
        : null;
      return validStatus(assessment?.status);
    });
    const completeCount = statuses.filter((status) => status === 'complete').length;
    const partialOrCompleteCount = statuses.filter((status) => status !== 'missing').length;
    const partialCount = statuses.filter((status) => status === 'partial').length;
    const aggregateAssessment = aggregateAssessments.find((item) => item.id === task.id) ?? {};
    const aggregatorBreaksTie = completeCount === 1
      && partialCount === 2
      && validStatus(aggregateAssessment.status) === 'complete';
    const status = completeCount >= 2 || aggregatorBreaksTie
      ? 'complete'
      : partialOrCompleteCount > 0
        ? 'partial'
        : 'missing';
    return {
      id: task.id,
      status,
      evidence: aggregateAssessment.evidence ?? '',
      reason: status === aggregateAssessment.status
        ? aggregateAssessment.reason ?? ''
        : `三个评估中有 ${completeCount} 个认为这一项完整，按多数规则判为 ${status}。`,
    };
  });
}

function buildGroundedResolvedReply(topic, hadEarlierHarmful) {
  if (hadEarlierHarmful) {
    return '好，接下来的安排我听清楚了。之前那句话确实让我不放心，我会先看明天实际怎么做，有变化再和您沟通。';
  }
  const replies = {
    xiaoming_dinosaur: '好，我知道小恐龙的固定位置接下来会怎么处理了。我会留意家里有没有相似情况，有变化再告诉您。',
    xiaoli_sunlight: '好，我知道下次不会再直接要求她往亮处走了。我会留意她在家里遇到强光时的反应，有变化再告诉您。',
    week2_toy_preference: '好，我知道你们下次会怎样调整材料了。我也会留意孩子在家里接触不同材质时的反应。',
    week2_sandpit_parallel_play: '好，我明白你们会先保留孩子已经形成的互动方式。我会留意他平时不用说话时怎样和别人一起玩。',
    week3_picture_book_emotion: '好，我知道下次选书和讲故事时会先看孩子当时的状态。我也会留意他在家里更容易跟上哪类故事。',
    week3_structured_movement: '好，我知道下次会怎样安排活动强度和过渡了。我会把孩子在家里开始运动前的表现告诉您。',
    week4_charity_exhibition: '好，我知道材料对外发布前还要经过哪些确认了。正式发布前请把最终内容再发给我核对。',
    week4_group_interaction: '好，我知道下次不只会强调排队，也会调整材料和空间。我会留意孩子平时等待和共用物品时的反应。',
    week5_blocks_puzzle_prompting: '好，我知道下次会先等一等，再逐步给提示。家里陪他拼图时我也会试着少替他完成。',
    week6_meal_sensory: '好，我知道下次吃饭时会怎样处理食物混在一起的情况。我也会把家里的摆放方式和他的反应告诉您。',
    week7_final_observation: '好，我知道这些记录会怎样继续使用了。我会把家里观察到的情况补充给您，方便一起交接。',
  };
  return replies[topic?.id] ?? '好，今天的情况和接下来的安排我都清楚了。我会继续观察，有变化再告诉您。';
}

function buildGroundedParentReply({ payload, result, topic, signals }) {
  const isHarmful = result.safetyFlag === 'harmful';
  const priorParentTexts = new Set((payload.history ?? [])
    .filter((message) => message.role === 'parent')
    .map((message) => sanitizeVisibleText(message.text)));
  const avoidRepeat = (primary, fallback) => (
    priorParentTexts.has(sanitizeVisibleText(primary)) ? fallback : primary
  );
  if (isHarmful) {
    if (!signals.length) {
      return result.shouldEnd && result.endReason === 'failed'
        ? '您连续把孩子的困难说成态度或习惯问题，我没办法继续放心沟通。今天先到这里，我需要先确认明天不会强迫孩子。'
        : '您刚才把孩子的困难说成需要硬练或纠正，这让我更不放心。请先按当天记录说明实际发生了什么，以及明天怎样避免强迫。';
    }
    return buildHarmfulParentReply({
      topic,
      parentStyle: payload.parentStyle,
      signals,
      signalHistory: payload.harmfulSignalHistory,
      harmfulStreak: result.harmfulStreak,
      willEnd: result.shouldEnd && result.endReason === 'failed',
    });
  }
  if (result.isIrrelevant || result.endReason === 'irrelevant') {
    return '老师，我现在问的是孩子今天的情况。请先按当天记录回答这件事。';
  }
  if (result.shouldEnd && result.endReason === 'resolved') {
    return buildGroundedResolvedReply(
      topic,
      Array.isArray(payload.harmfulSignalHistory) && payload.harmfulSignalHistory.length > 0,
    );
  }

  const missing = new Set(result.missingTaskIds ?? []);
  const completed = new Set(result.completedTaskIds ?? []);
  if (missing.has('emotional_facts')) {
    const emotionalStatus = getAssessment('emotional_facts', result.taskAssessments)?.status;
    if (emotionalStatus === 'partial') {
      if (completed.has('professional_reframe')) {
        return avoidRepeat(
          '我明白你们这样安排的理由了。那今天现场有没有看到小明和这个固定位置相关的反应？你们是根据什么判断这个位置需要保留的？',
          '这个说明我听懂了。我还想补一个具体事实：今天小明有没有表现出他在意这个位置，老师当时是怎么观察到的？',
        );
      }
      return topic?.id === 'xiaoming_dinosaur' && topic?.selectedOutcome?.choiceId === 'uniform_storage_then_restore'
        ? avoidRepeat(
          '事情经过我听清楚了。我担心的是这次误收让他很不安，你们怎样理解这个固定位置对他的作用？',
          '我明白你们会把它放回固定位置。那接下来怎么避免再次突然改变这个位置？家里需要观察哪些反应再告诉你们？',
        )
        : topic?.id === 'xiaoming_dinosaur'
          ? avoidRepeat(
            '我明白你们说会保留固定位置。更想确认的是：这个位置本身对小明有什么作用？标签主要是给老师整理时看的，还是小明也需要靠它确认？家里如果原本就固定摆放，是维持原样就好，还是必要时再加提示？',
            '我听到你们会保留这个位置。但我还没分清：家里要做的是保持原来摆放，还是另外给照护者或孩子加提示？什么情况下才需要加？',
          )
        : avoidRepeat(
          '事情经过我听清楚了。我更想确认，你们是否理解我为什么担心，以及下次会不会认真调整。',
          '我知道大致经过了，但我还想听到你们怎么理解我的担心，以及接下来具体会怎么调整。',
        );
    }
    return '我还是想先知道当天实际发生了什么。您看到了哪些反应，当时又是怎么处理的？';
  }
  if (missing.has('professional_reframe')) {
    if (topic?.id === 'xiaoming_dinosaur' && topic?.selectedOutcome?.choiceId === 'label_fixed_position') {
      return avoidRepeat(
        '当天发生的事我清楚了，但还没听明白为什么要保留固定位置。这是在帮他安定下来，还是会让他更依赖？',
        '现场安排我明白了。请再说具体一点：固定位置对小明有什么意义？贴名字这件事是给老师整理时看的，还是孩子本人需要看？家里如果已经稳定摆放，是不是不一定要贴名字？',
      );
    }
    if (topic?.id === 'xiaoming_dinosaur') {
      return avoidRepeat(
        '当天发生的事我清楚了，但还没听明白为什么要保留固定位置。这是在帮他安定下来，还是会让他更依赖？',
        '我理解你们会保留位置，但还想知道这个固定位置对小明具体起什么作用，以及之后会不会一步步增加弹性。',
      );
    }
    if (topic?.id === 'xiaoli_sunlight') {
      return '当天的反应我清楚了，但还没听明白为什么不能直接多练一会儿。你们这样安排是在回避，还是准备让她慢慢适应？';
    }
    return '当天发生的事我清楚了，但还没听明白你们为什么这样判断。能不能用更具体的话解释一下？';
  }
  if (missing.has('action_partnership')) {
    const actionStatus = getAssessment('action_partnership', result.taskAssessments)?.status;
    return actionStatus === 'partial'
      ? '照护所的安排我明白了。家里需要留意什么，有变化怎么和您对接？'
      : '我明白你们为什么这样判断了。那接下来照护所准备怎么做，家里需要配合什么？';
  }
  return sanitizeVisibleText(result.parentReply);
}

function buildGroundedCoachFeedback(result, topic, signals) {
  if (result.safetyFlag === 'harmful') {
    const concern = signals[0]?.parentPhrase;
    return concern
      ? `“${concern}”会把孩子需要的支持说成必须纠正的问题。先承认这句话不妥，再根据当天记录说明实际情况和下一步。`
      : '这句话把孩子的困难说成态度或训练问题。先承认说法不妥，再根据当天记录说明实际情况和下一步。';
  }
  if (result.shouldEnd && result.endReason === 'resolved') {
    return '这次已经说明了当天经过、判断依据和双方下一步，家长的问题已经得到回应。';
  }
  const missing = new Set(result.missingTaskIds ?? []);
  if (missing.has('emotional_facts')) {
    return '先回应家长这次具体担心什么，再按当天记录说明孩子出现了哪些反应、现场怎样处理。';
  }
  if (missing.has('professional_reframe')) {
    return topic?.id === 'xiaoming_dinosaur'
      ? '事情经过和安排已经说清；还需用一句具体的话解释固定位置为什么能帮助小明安定。'
      : topic?.id === 'xiaoli_sunlight'
        ? '事情经过已经说清；还需解释为什么直接多练可能增加抗拒，以及降低难度怎样帮助她继续尝试。'
        : '事情经过已经说清；还需结合孩子的现场反应解释为什么需要这种支持。';
  }
  if (missing.has('action_partnership')) {
    return '补充照护所下一步，并说明家里可以观察或尝试什么；邀请家长有变化时继续沟通即可。';
  }
  return sanitizeVisibleText(result.coachFeedback);
}

function shouldSoftenDetailQuizReply(result, payload) {
  if (result?.shouldEnd || result?.endReason !== 'continue') return false;
  if (playerAlreadyAnsweredReactionAndPrevention(payload)) return false;
  const reply = String(result?.parentReply ?? '');
  const questionCount = (reply.match(/[？?]/g) ?? []).length;
  if (questionCount >= 2) return true;

  const visibleText = [
    payload?.playerReply,
    payload?.currentPlayerReply,
    ...(Array.isArray(payload?.history) ? payload.history.map((message) => message?.text) : []),
  ].join('\n');
  const hiddenDetailMarkers = [
    '呼吸变急',
    '呼吸急',
    '反复打开',
    '同一个格子',
    '架子前反复',
    '有没有哭闹',
    '有没有哭',
    '完整的经过',
  ];
  return hiddenDetailMarkers.some((marker) => reply.includes(marker) && !visibleText.includes(marker));
}

function softenDetailQuizParentReply(result, payload) {
  if (!shouldSoftenDetailQuizReply(result, payload)) return result;
  return {
    ...result,
    parentReply: buildContextualDetailFollowup(result, payload),
  };
}

function parentHistoryTexts(payload) {
  return (Array.isArray(payload?.history) ? payload.history : [])
    .filter((message) => message?.role === 'parent')
    .map((message) => String(message?.text ?? ''));
}

function hasPriorDetailTemplateQuestion(payload) {
  return parentHistoryTexts(payload).some((text) => (
    text.includes('完整经过')
    || text.includes('主要反应')
    || text.includes('避免再次')
    || text.includes('怎么避免')
  ));
}

function buildContextualDetailFollowup(result, payload) {
  const alreadyAskedDetail = hasPriorDetailTemplateQuestion(payload);
  const missing = new Set(result?.missingTaskIds ?? []);
  const topicId = payload?.topics?.[0]?.id ?? payload?.topics?.[0]?.selectedOutcome?.eventId ?? '';

  if (alreadyAskedDetail) {
    if (missing.has('action_partnership')) {
      return '老师，前面具体经过我先不继续追问了。那后面请您只告诉我一件事：明天照护所准备怎么避免同样的情况再出现？';
    }
    return '好的，具体记录您后面核对完再告诉我就行。刚才说过的部分我先记下了，我们先按这个方向继续观察。';
  }

  if (missing.has('professional_reframe')) {
    if (topicId === 'xiaoming_dinosaur') {
      return '老师，经过我大致明白了。我还想确认一点：这个固定位置对小明本人有什么作用，不是只是收纳习惯的问题，对吗？';
    }
    if (topicId === 'xiaoli_sunlight') {
      return '老师，经过我大致明白了。我还想确认一点：你们不是让她一直避开阳光，而是先保留能退回去的位置，再慢慢尝试，对吗？';
    }
    return '老师，经过我大致明白了。我还想确认一点：你们是根据孩子哪一类反应判断需要这样调整的？';
  }

  if (missing.has('action_partnership')) {
    return '老师，今天发生了什么我先明白了。那接下来照护所会怎么跟进，家里需要留意什么变化？';
  }

  return '老师，今天的情况我大致清楚了。请您后面核对记录时，把和孩子状态最相关的一两点告诉我就行。';
}

function playerAlreadyAnsweredReactionAndPrevention(payload) {
  const reply = String(payload?.currentPlayerReply ?? payload?.playerReply ?? '');
  if (!reply) return false;
  const hasReaction = [
    '反应',
    '紧张',
    '着急',
    '焦虑',
    '害怕',
    '不舒服',
    '没那么紧张',
    '安定',
    '平静',
    '看到之后',
    '看到以后',
  ].some((marker) => reply.includes(marker));
  const hasPrevention = [
    '接下来',
    '以后',
    '之后',
    '明天',
    '下次',
    '避免',
    '不再',
    '不要直接',
    '不会直接',
    '保留',
    '标注',
    '记录',
    '核对',
    '固定位置',
    '给他这样一个空间',
  ].some((marker) => reply.includes(marker));
  return hasReaction && hasPrevention;
}

function normalizeForRepeatCheck(value = '') {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[，。！？；：,.!?;:"“”'‘’、]/g, '')
    .trim();
}

function isRepeatedParentReply(reply, payload) {
  const normalizedReply = normalizeForRepeatCheck(reply);
  if (normalizedReply.length < 12) return false;
  if (normalizedReply.includes('\u8001\u5e08\u6211\u60f3\u518d\u6838\u5bf9\u4e00\u4e0b\u5f53\u5929\u8bb0\u5f55\u91cc\u7684\u5b8c\u6574\u7ecf\u8fc7')) return true;
  const priorParentReplies = (Array.isArray(payload?.history) ? payload.history : [])
    .filter((message) => message?.role === 'parent')
    .map((message) => normalizeForRepeatCheck(message?.text))
    .filter((text) => text.length >= 12);
  return priorParentReplies.some((prior) => (
    prior === normalizedReply
    || prior.includes(normalizedReply)
    || normalizedReply.includes(prior)
  ));
}

function buildNonRepeatedParentReply(result) {
  const missing = new Set(result?.missingTaskIds ?? []);
  const hasAction = !missing.has('action_partnership');
  const hasProfessional = !missing.has('professional_reframe');
  if (result?.shouldEnd || result?.endReason === 'resolved') {
    return '\u597d\uff0c\u6211\u77e5\u9053\u4f60\u4eec\u540e\u9762\u4f1a\u7ee7\u7eed\u6838\u5bf9\u548c\u8c03\u6574\u3002\u8fd9\u6837\u6211\u5148\u653e\u5fc3\u4e00\u4e9b\uff0c\u6709\u65b0\u60c5\u51b5\u6211\u518d\u548c\u60a8\u6c9f\u901a\u3002';
  }
  if (hasProfessional && hasAction) {
    return '\u597d\uff0c\u6211\u660e\u767d\u4f60\u4eec\u7684\u5224\u65ad\u548c\u4e0b\u4e00\u6b65\u5b89\u6392\u4e86\u3002\u90a3\u540e\u9762\u8bf7\u628a\u6838\u5bf9\u5230\u7684\u4e3b\u8981\u53cd\u5e94\u544a\u8bc9\u6211\u5c31\u884c\u3002';
  }
  if (!hasProfessional) {
    return '\u5f53\u5929\u7684\u60c5\u51b5\u6211\u5148\u4e86\u89e3\u4e86\u3002\u6211\u8fd8\u60f3\u77e5\u9053\uff0c\u4f60\u4eec\u662f\u6839\u636e\u5b69\u5b50\u54ea\u4e9b\u53cd\u5e94\u5224\u65ad\u9700\u8981\u8fd9\u6837\u8c03\u6574\u7684\uff1f';
  }
  return '\u8fd9\u6837\u6211\u80fd\u7406\u89e3\u4e00\u4e9b\u3002\u90a3\u63a5\u4e0b\u6765\u7167\u62a4\u6240\u51c6\u5907\u600e\u4e48\u505a\uff0c\u5bb6\u91cc\u9700\u8981\u7559\u610f\u4ec0\u4e48\uff1f';
}

function preventRepeatedParentReply(result, payload) {
  if (playerAlreadyAnsweredReactionAndPrevention(payload)
    && asksForAnsweredReactionAndPrevention(result?.parentReply)) {
    return {
      ...result,
      parentReply: buildAcknowledgedNoRepeatParentReply(result),
    };
  }
  if (!isRepeatedParentReply(result?.parentReply, payload)) return result;
  return {
    ...result,
    parentReply: buildNonRepeatedParentReply(result),
  };
}

function asksForAnsweredReactionAndPrevention(parentReply = '') {
  const text = String(parentReply ?? '');
  const asksReaction = ['主要反应', '当时看到', '看到的反应', '完整经过', '当天记录'].some((marker) => text.includes(marker));
  const asksPrevention = ['怎么避免', '避免再次', '避免再', '再次发生', '后面怎么', '接下来怎么'].some((marker) => text.includes(marker));
  return asksReaction && asksPrevention;
}

function buildAcknowledgedNoRepeatParentReply(result) {
  if (result?.shouldEnd || result?.endReason === 'resolved') {
    return '好的，我明白你们当时看到了孩子的反应，也知道后面会按记录和固定安排继续调整。这样我先放心一些，有新的情况我们再沟通。';
  }
  return '好的，您刚才已经说明了孩子当时的主要反应，也说了后面不会直接改变他的安排。那我先等你们后续核对记录，有新的发现再和我说。';
}

function toneAdjustment(playerReply = '', communicationType = 'complaint') {
  const text = String(playerReply ?? '');
  const positiveGeneral = [
    '您好',
    '谢谢您提醒',
    '谢谢您告诉我们',
    '谢谢您愿意说得这么具体',
    '您这个观察很有帮助',
    '我理解您的担心',
    '这个担心是有道理',
    '这确实需要我们核对',
    '我先核对记录',
    '我们会认真看',
    '我们一起看',
    '后面有变化请继续告诉',
  ];
  const positiveComplaint = [
    '抱歉',
    '不好意思',
    '对不起',
    '需要复盘',
    '把记录补清楚',
  ];
  const positiveSharing = [
    '家里的观察对我们很重要',
    '可以保持一致',
    '保持一致',
  ];
  const negative = [
    '你不用问',
    '您不用问',
    '你想多了',
    '您想多了',
    '这不是我们的问题',
    '不是我们的责任',
    '没必要',
    '反正就是这样',
    '就是这样',
    '不用管',
    '不用再说',
    '孩子就是这样',
    '你们家也要配合',
    '家里是不是没做好',
    '我们已经做了你别担心',
  ];

  const hasPositive = positiveGeneral.some((marker) => text.includes(marker))
    || (communicationType === 'complaint' && positiveComplaint.some((marker) => text.includes(marker)))
    || (communicationType === 'sharing' && positiveSharing.some((marker) => text.includes(marker)));
  const hasNegative = negative.some((marker) => text.includes(marker));
  return (hasPositive ? 1 : 0) + (hasNegative ? -2 : 0);
}

function acknowledgesPacingAndPlansGradualSupport(playerReply = '') {
  const text = String(playerReply ?? '');
  const acknowledgesConcern = [
    '\u5bf9\u4e0d\u8d77',
    '\u4e0d\u597d\u610f\u601d',
    '\u62b1\u6b49',
    '\u8003\u8651\u4e0d\u5468',
    '\u6ca1\u8003\u8651\u5468',
    '\u53d8\u5316\u6709\u70b9\u591a',
    '\u592a\u5feb',
    '\u63a8\u5f97\u592a\u5feb',
  ].some((marker) => text.includes(marker));
  const gradualPlan = [
    '\u4e00\u70b9\u4e00\u70b9',
    '\u6162\u6162\u9002\u5e94',
    '\u9010\u6b65',
    '\u5148\u7ed9\u4e00\u79cd',
    '\u53ea\u7ed9\u4e00\u79cd',
    '\u4e0b\u6b21',
    '\u518d\u5c1d\u8bd5',
    '\u5148\u4fdd\u7559',
    '\u8ba9\u5b69\u5b50\u9002\u5e94',
  ].some((marker) => text.includes(marker));
  const notDefensive = ![
    '\u4f60\u60f3\u591a\u4e86',
    '\u60a8\u60f3\u591a\u4e86',
    '\u4e0d\u7528\u7ba1',
    '\u53cd\u6b63\u5c31\u662f\u8fd9\u6837',
    '\u5b69\u5b50\u5c31\u662f\u8fd9\u6837',
  ].some((marker) => text.includes(marker));
  return acknowledgesConcern && gradualPlan && notDefensive;
}

export function normalizeAgentResult(rawResult, payload) {
  const validTaskIds = new Set(COMMUNICATION_TASKS.map((task) => task.id));
  const previousAssessments = Array.isArray(payload.taskAssessments) ? payload.taskAssessments : [];
  const communicationType = payload?.topics?.[0]?.selectedOutcome?.parentCommunicationType ?? 'complaint';
  const safetyFlag = rawResult?.safetyFlag ?? 'none';
  const isHarmful = safetyFlag === 'harmful';
  const harmfulStreak = isHarmful ? Math.max(1, Number(rawResult.harmfulStreak || payload.harmfulStreak + 1 || 1)) : 0;

  const rawAssessments = Array.isArray(rawResult?.taskAssessments) ? rawResult.taskAssessments : [];
  const currentAssessments = COMMUNICATION_TASKS.map((task) => {
    const returned = rawAssessments.find((assessment) => validTaskIds.has(assessment.id) && assessment.id === task.id);
    if (!returned) {
      return {
        id: task.id,
        status: Array.isArray(payload.completedTaskIds) && payload.completedTaskIds.includes(task.id) ? 'complete' : 'missing',
        evidence: '',
        reason: '模型未返回该任务判定。',
      };
    }
    return {
      id: task.id,
      status: validStatus(returned.status),
      evidence: returned.evidence ?? '',
      reason: returned.reason ?? '',
    };
  });

  const taskAssessments = suppressHarmfulCompletions(
    mergeHistoricalAssessments(currentAssessments, previousAssessments),
    isHarmful,
  );
  const completedTaskIds = taskAssessments
    .filter((assessment) => assessment.status === 'complete')
    .map((assessment) => assessment.id)
    .filter((taskId) => !isHarmful || !['professional_reframe', 'action_partnership'].includes(taskId));
  const missingTaskIds = requiredTaskIds().filter((taskId) => !completedTaskIds.includes(taskId));

  let score = clamp(Number(rawResult?.score) || 0, 0, 100);
  let trustDelta = clamp(Number(rawResult?.trustDelta) || 0, -25, 25);
  const isSevereSafetyIssue = isHarmful
    || safetyFlag === 'irrelevant'
    || rawResult?.endReason === 'irrelevant';
  if (!isSevereSafetyIssue) {
    trustDelta = clamp(trustDelta + toneAdjustment(payload?.playerReply ?? payload?.currentPlayerReply ?? '', communicationType), -25, 25);
    if (acknowledgesPacingAndPlansGradualSupport(payload?.playerReply ?? payload?.currentPlayerReply ?? '')) {
      score = Math.max(score, 60);
      trustDelta = Math.max(trustDelta, 0);
    }
    if (score >= 60) {
      trustDelta = Math.max(trustDelta, 0);
    } else if (score >= 50) {
      trustDelta = Math.max(trustDelta, -2);
    } else if (score >= 40) {
      trustDelta = Math.max(trustDelta, -4);
    }
  }
  const projectedTrust = clamp(Number(payload.trust || 50) + trustDelta, 0, 100);
  const hasSubstantiveOpenQuestion = typeof rawResult?.hasSubstantiveOpenQuestion === 'boolean'
    ? rawResult.hasSubstantiveOpenQuestion
    : true;
  const nextTurnCount = Number(payload.turnCount || 0) + 1;
  const forcedFailed = trustHasFailed({
    projectedTrust,
    trustDelta,
    isHarmful,
    harmfulStreak,
  });
  const forcedResolved = !isHarmful && trustCanResolve({
    projectedTrust,
    trustDelta,
    score,
    assessments: taskAssessments,
    hasSubstantiveOpenQuestion,
    communicationType,
  });
  const forcedMaxTurns = nextTurnCount >= Number(payload.maxTurns || 4) && !forcedResolved && !forcedFailed;
  const modelRequestedResolved = Boolean(rawResult?.shouldEnd)
    && rawResult?.endReason === 'resolved'
    && coreConcernAddressed(taskAssessments)
    && projectedTrust >= 55;
  const modelRequestedIrrelevant = Boolean(rawResult?.shouldEnd)
    && rawResult?.endReason === 'irrelevant';
  const shouldEnd = modelRequestedIrrelevant || forcedFailed || forcedResolved || modelRequestedResolved || forcedMaxTurns;
  const endReason = forcedFailed
    ? 'failed'
    : forcedResolved || modelRequestedResolved
      ? 'resolved'
      : forcedMaxTurns
        ? 'max_turns'
        : ['resolved', 'max_turns'].includes(rawResult?.endReason)
          ? 'continue'
          : rawResult?.endReason ?? 'continue';

  const normalized = {
    score,
    trustDelta,
    parentMood: ['trusting', 'uncertain', 'upset'].includes(rawResult?.parentMood) ? rawResult.parentMood : 'uncertain',
    parentReply: sanitizeVisibleText(rawResult?.parentReply || '家长暂时没有继续回复。'),
    coachFeedback: sanitizeVisibleText(rawResult?.coachFeedback || '没有反馈。'),
    taskAssessments,
    completedTaskIds,
    missingTaskIds,
    strengths: Array.isArray(rawResult?.strengths) ? rawResult.strengths : [],
    risks: Array.isArray(rawResult?.risks) ? rawResult.risks : [],
    harmfulStreak,
    harmfulSignalHistory: isHarmful
      ? Array.isArray(rawResult?.harmfulSignalHistory)
        ? rawResult.harmfulSignalHistory
        : Array.isArray(payload.harmfulSignalHistory) ? payload.harmfulSignalHistory : []
      : Array.isArray(payload.harmfulSignalHistory) ? payload.harmfulSignalHistory : [],
    shouldEnd,
    endReason,
    isIrrelevant: Boolean(rawResult?.isIrrelevant),
    safetyFlag,
  };
  if (!isSevereSafetyIssue && acknowledgesPacingAndPlansGradualSupport(payload?.playerReply ?? payload?.currentPlayerReply ?? '')) {
    normalized.score = Math.max(normalized.score, 60);
    normalized.trustDelta = Math.max(normalized.trustDelta, 0);
  }
  return preventRepeatedParentReply(softenDetailQuizParentReply(normalized, payload), payload);
}

export async function evaluateParentTurnWithAgents(payload, { provider = 'deepseek', apiKey, model, baseUrl }) {
  const traceStartedAtMs = Date.now();
  const traceStartedAt = new Date(traceStartedAtMs).toISOString();
  const traceId = `${traceStartedAtMs}-${Math.random().toString(36).slice(2, 8)}`;
  const elapsedMs = (timestampMs = Date.now()) => Math.max(0, timestampMs - traceStartedAtMs);
  const topics = Array.isArray(payload?.topics) ? payload.topics : [];
  const formalTopics = topics.filter((topic) => topic && !String(topic.id).startsWith('fallback'));
  if (formalTopics.length > 1) {
    throw new Error('Each Parent AI turn must contain exactly one event outcome.');
  }
  if (formalTopics.length === 1 && !formalTopics[0].selectedOutcome) {
    throw new Error('Formal Parent AI evaluation requires topic.selectedOutcome.');
  }

  const evaluatorRuns = await Promise.all(ACTIVE_EVALUATOR_AGENT_PROFILES.map(async (profile, index) => {
    const stageStartedAtMs = Date.now();
    const result = await callModelJson({
      provider,
      apiKey,
      model,
      baseUrl,
      systemPrompt: buildEvaluatorPrompt(profile),
      payload,
      responseSchema: EVALUATOR_TURN_RESPONSE_SCHEMA,
      temperature: profile.temperature,
      maxOutputTokens: 4096,
      reasoningEffort: 'low',
    });
    const stageEndedAtMs = Date.now();
    return {
      profile,
      result,
      timing: {
        stage: `evaluator_${index + 1}`,
        agentId: profile.id,
        reasoningEffort: 'low',
        startedAtMs: elapsedMs(stageStartedAtMs),
        endedAtMs: elapsedMs(stageEndedAtMs),
        durationMs: stageEndedAtMs - stageStartedAtMs,
      },
    };
  }));
  const preliminaryTaskAssessments = buildMajorityTaskAssessments(evaluatorRuns, null);
  const preliminaryCompletedTaskIds = preliminaryTaskAssessments
    .filter((assessment) => assessment.status === 'complete')
    .map((assessment) => assessment.id);
  const preliminaryMissingTaskIds = requiredTaskIds()
    .filter((taskId) => !preliminaryCompletedTaskIds.includes(taskId));
  const evaluatorTrustDeltas = evaluatorRuns
    .map((run) => Number(run.result?.trustDelta))
    .filter((value) => Number.isFinite(value));
  const averageEvaluatorTrustDelta = evaluatorTrustDeltas.length
    ? evaluatorTrustDeltas.reduce((sum, value) => sum + value, 0) / evaluatorTrustDeltas.length
    : 0;
  const preliminaryHasSubstantiveOpenQuestion = hasSubstantiveOpenQuestionFromEvaluators(evaluatorRuns);
  const topic = formalTopics[0] ?? topics[0];
  const selectedOutcome = topic?.selectedOutcome ?? null;
  const parentOpening = Array.isArray(payload.history)
    ? [...payload.history].reverse().find((message) => message?.role === 'parent')?.text ?? ''
    : '';

  const aggregatorStartedAtMs = Date.now();
  const aggregateRaw = await callModelJson({
    provider,
    apiKey,
    model,
    baseUrl,
    systemPrompt: AGGREGATOR_PROMPT,
    payload: {
      currentPlayerReply: payload.currentPlayerReply ?? payload.playerReply ?? '',
      parentOpening,
      questionFocus: selectedOutcome?.questionFocus ?? '',
      parentKnownFacts: selectedOutcome?.parentKnownFacts ?? [],
      parentInterpretation: selectedOutcome?.parentInterpretation ?? null,
      actualRelationship: selectedOutcome?.actualRelationship ?? null,
      selectedOutcomeSummary: {
        eventId: selectedOutcome?.eventId ?? topic?.id ?? '',
        choiceId: selectedOutcome?.choiceId ?? '',
        choiceLabel: selectedOutcome?.choiceLabel ?? '',
        keyLines: selectedOutcome?.keyLines ?? [],
        addedBackground: selectedOutcome?.addedBackground ?? [],
        causalChain: selectedOutcome?.causalChain ?? [],
        parentCommunicationType: selectedOutcome?.parentCommunicationType ?? '',
      },
      originalPayload: payload,
      preliminaryConsensus: {
        taskAssessments: preliminaryTaskAssessments,
        completedTaskIds: preliminaryCompletedTaskIds,
        missingTaskIds: preliminaryMissingTaskIds,
        trustBefore: Number(payload.trust || 50),
        averageEvaluatorTrustDelta,
        projectedTrustFromEvaluators: clamp(Number(payload.trust || 50) + averageEvaluatorTrustDelta, 0, 100),
        hasSubstantiveOpenQuestion: preliminaryHasSubstantiveOpenQuestion,
      },
      evaluatorResults: evaluatorRuns.map((run) => ({
        agentId: run.profile.id,
        label: run.profile.label,
        focus: run.profile.focus,
        result: run.result,
      })),
    },
    responseSchema: PARENT_TURN_RESPONSE_SCHEMA,
    temperature: 0.45,
    maxOutputTokens: 4096,
    reasoningEffort: 'medium',
  });
  const aggregatorEndedAtMs = Date.now();
  const aggregatorTiming = {
    stage: 'aggregator',
    agentId: 'aggregator',
    reasoningEffort: 'medium',
    startedAtMs: elapsedMs(aggregatorStartedAtMs),
    endedAtMs: elapsedMs(aggregatorEndedAtMs),
    durationMs: aggregatorEndedAtMs - aggregatorStartedAtMs,
  };

  const localHarmfulSignals = detectHarmfulSignals(payload.playerReply, topic);
  const evaluatorHarmfulCount = evaluatorRuns
    .filter((run) => run.result?.safetyFlag === 'harmful')
    .length;
  const enforcedHarmful = hasHarmfulSignal(localHarmfulSignals) || evaluatorHarmfulCount >= 2;
  const aggregateSafetyFlag = aggregateRaw.safetyFlag === 'harmful' && !enforcedHarmful
    ? 'none'
    : aggregateRaw.safetyFlag;
  const enforcedAggregate = {
    ...aggregateRaw,
    taskAssessments: buildMajorityTaskAssessments(evaluatorRuns, aggregateRaw),
    hasSubstantiveOpenQuestion: preliminaryHasSubstantiveOpenQuestion,
    score: enforcedHarmful ? Math.min(39, Number(aggregateRaw.score) || 0) : aggregateRaw.score,
    trustDelta: enforcedHarmful ? Math.min(-16, Number(aggregateRaw.trustDelta) || 0) : aggregateRaw.trustDelta,
    parentMood: enforcedHarmful ? 'upset' : aggregateRaw.parentMood,
    safetyFlag: enforcedHarmful ? 'harmful' : aggregateSafetyFlag,
    harmfulStreak: enforcedHarmful
      ? Math.max(1, Number(payload.harmfulStreak || 0) + 1)
      : aggregateRaw.harmfulStreak,
    harmfulSignalHistory: enforcedHarmful
      ? [...new Set([
        ...(Array.isArray(payload.harmfulSignalHistory) ? payload.harmfulSignalHistory : []),
        ...localHarmfulSignals.map((signal) => signal.id),
      ])]
      : aggregateRaw.harmfulSignalHistory,
  };

  const normalizedResult = normalizeAgentResult(enforcedAggregate, payload);
  if (normalizedResult.shouldEnd && normalizedResult.endReason === 'resolved') {
    normalizedResult.parentReply = buildResolvedParentReplyByQuality({
      topic,
      result: normalizedResult,
      payload,
    });
  }
  normalizedResult.coachFeedback = buildGroundedCoachFeedback(
    normalizedResult,
    topic,
    localHarmfulSignals,
  );
  const traceEndedAtMs = Date.now();
  const trustBefore = Number(payload.trust || 50);
  const timingTrace = {
    traceId,
    startedAt: traceStartedAt,
    endedAt: new Date(traceEndedAtMs).toISOString(),
    totalDurationMs: traceEndedAtMs - traceStartedAtMs,
    provider,
    model,
    topicId: topic?.id ?? null,
    choiceId: selectedOutcome?.choiceId ?? null,
    turnCountBefore: Number(payload.turnCount || 0),
    trustBefore,
    trustDelta: normalizedResult.trustDelta,
    trustAfter: clamp(trustBefore + Number(normalizedResult.trustDelta || 0), 0, 100),
    shouldEnd: normalizedResult.shouldEnd,
    endReason: normalizedResult.endReason,
    hasSubstantiveOpenQuestion: preliminaryHasSubstantiveOpenQuestion,
    stages: [
      ...evaluatorRuns.map((run) => run.timing),
      aggregatorTiming,
    ],
    evaluators: evaluatorRuns.map((run) => ({
      agentId: run.profile.id,
      score: run.result?.score,
      trustDelta: run.result?.trustDelta,
      shouldEndRecommendation: run.result?.shouldEndRecommendation,
      hasSubstantiveOpenQuestion: run.result?.hasSubstantiveOpenQuestion,
      safetyFlag: run.result?.safetyFlag,
    })),
  };
  normalizedResult.timingTrace = timingTrace;

  return {
    result: normalizedResult,
    evaluatorRuns,
    aggregateRaw: enforcedAggregate,
    timingTrace,
  };
}

export async function generatePlayerReply(payload, profile, { provider = 'deepseek', apiKey, model, baseUrl }) {
  const callPlayer = (extraInstruction = '', temperature = profile.temperature) => callModelJson({
    provider,
    apiKey,
    model,
    baseUrl,
    systemPrompt: `${buildPlayerPrompt(profile)}${extraInstruction ? `\n\n${extraInstruction}` : ''}`,
    payload,
    responseSchema: PLAYER_REPLY_SCHEMA,
    temperature,
    maxOutputTokens: 4096,
    reasoningEffort: 'low',
  });
  const hasUnsupportedMockFact = (reply) => {
    const text = String(reply ?? '');
    if (payload?.topic?.id === 'xiaoming_dinosaur'
      && payload?.topic?.selectedOutcome?.choiceId === 'uniform_storage_then_restore') {
      return /(放回|回到原位|回到原处).{0,16}(平静|放松|呼吸.*(恢复|平稳|放缓))/.test(text)
        || /他的?呼吸(才|就|很快).{0,8}(恢复|平稳|放缓)/.test(text)
        || /安全信号/.test(text)
        || /(^|[，。！？\s])爸爸(你好|您好|，|：)/.test(text);
    }
    if (payload?.topic?.id === 'xiaoli_sunlight'
      && payload?.topic?.selectedOutcome?.choiceId === 'too_fast_sunlight_attempt') {
      return /(我|我们|老师)(直接)?拉她/.test(text)
        || /走到(了)?阳光(区|里)/.test(text)
        || /她很快(就)?(平静|放松)/.test(text)
        || /她喜欢的玩具/.test(text)
        || /身体在说/.test(text)
        || /揉眼|扭头|烦躁|睡得?不安稳|[一二两三四五六七八九十\d]+分钟/.test(text)
        || /(^|[，。！？\s])妈妈(你好|您好|，|：)/.test(text);
    }
    return false;
  };

  const selectedKeyLines = Array.isArray(payload?.topic?.selectedOutcome?.keyLines)
    ? payload.topic.selectedOutcome.keyLines.join('；')
    : '';
  const factualRetryInstruction = [
    '上一版新增了 selectedOutcome.keyLines 没有的结果或用了不合适的称呼。',
    `重新生成：称呼“${payload?.topic?.parentName ?? '家长'}”；只能使用当前 selectedOutcome.keyLines 中已经发生的事：${selectedKeyLines || '没有可补写的现场事实'}`,
    '不能把其他选项、其他分支或源码没有记录的情绪变化、家庭表现、器材、人员、通知说成已经发生。',
    '不要使用“安全信号”“身体在说”等比喻。',
  ].join(' ');

  let result = await callPlayer();
  for (let retry = 0; retry < 5 && hasUnsupportedMockFact(result.playerReply); retry += 1) {
    result = await callPlayer(
      factualRetryInstruction,
      0.1,
    );
  }
  if (hasUnsupportedMockFact(result.playerReply)) {
    throw new Error(
      `Player agent repeatedly invented facts outside selectedOutcome.keyLines: ${payload?.topic?.id}/${profile.id}: ${result.playerReply}`,
    );
  }

  const isFirstHighRiskTurn = profile.id === 'high_risk_player'
    && Number(payload?.state?.turnCount || 0) === 0;
  if (isFirstHighRiskTurn) {
    const harmfulPatterns = (payload?.topic?.unsafeReplyPatterns ?? [])
      .filter((pattern) => hasHarmfulSignal(detectHarmfulSignals(pattern, payload.topic)));
    const mandatoryPattern = harmfulPatterns[0];
    const isValidHighRiskReply = (reply) => {
      const signals = detectHarmfulSignals(reply, payload.topic);
      const immediatelyRepairs = /不合适|不对|说错|不会再|不再这样|慢慢来|改成|调整/.test(String(reply ?? ''));
      return hasHarmfulSignal(signals) && !immediatelyRepairs;
    };
    for (let retry = 0; retry < 3 && !isValidHighRiskReply(result.playerReply); retry += 1) {
      result = await callPlayer(
        `你的上一版没有完成高风险测试。第一轮必须逐字写出“${mandatoryPattern}”，并把它当成老师当前认可的处理意见；这一轮不能道歉、否定、纠正、调整或给出正确替代方案。其余内容仍须遵守事件事实。`,
      );
    }
    if (!isValidHighRiskReply(result.playerReply)) {
      throw new Error('High-risk player agent failed to produce the required harmful test reply after retries.');
    }
    if (hasUnsupportedMockFact(result.playerReply)) {
      throw new Error('High-risk player agent introduced unsupported facts while satisfying the harmful test role.');
    }
  }
  return result;
}

function parentOpener(topic, parentStyle) {
  return buildInitialParentMessage(topic, parentStyle);
}

function missingRequiredTaskIdsFromState(state) {
  return requiredTaskIds().filter((taskId) => !state.completedTaskIds.includes(taskId));
}

function buildTurnPayload({ topic, parentStyle, state, playerReply, maxTurns }) {
  return {
    week: 1,
    turnCount: state.turnCount,
    maxTurns,
    communicationTasks: COMMUNICATION_TASKS,
    completedTaskIds: state.completedTaskIds,
    taskAssessments: state.taskAssessments,
    missingRequiredTaskIds: missingRequiredTaskIdsFromState(state),
    parentStyle,
    harmfulStreak: state.harmfulStreak,
    harmfulSignalHistory: state.harmfulSignalHistory,
    topics: [topic],
    careStandards: CARE_STANDARDS,
    history: state.messages,
    trust: state.trust,
    playerReply,
    currentPlayerReply: playerReply,
  };
}

function applyResultToState(state, result, topic) {
  state.turnCount += 1;
  state.trust = clamp(state.trust + result.trustDelta, 0, 100);
  state.completedTaskIds = result.completedTaskIds ?? [];
  state.taskAssessments = result.taskAssessments ?? [];
  state.harmfulStreak = result.harmfulStreak ?? 0;
  state.harmfulSignalHistory = result.harmfulSignalHistory ?? [];
  state.messages.push({
    role: 'parent',
    name: topic.parentName,
    text: result.parentReply,
  });
}

export async function runAgentPlaytest({
  eventIds = PARENT_AI_EVENTS.map((event) => event.id),
  eventOutcomes = [],
  playerProfileIds = PLAYER_AGENT_PROFILES.map((profile) => profile.id),
  parentStyleId = 'anxious',
  maxTurns = 4,
  provider = 'deepseek',
  apiKey,
  model,
  baseUrl,
} = {}) {
  if (!Array.isArray(eventOutcomes) || !eventOutcomes.length) {
    throw new Error('Agent playtest requires eventOutcomes so every case is tied to an actual player choice.');
  }
  const requestedIds = [...new Set(eventOutcomes.map((outcome) => outcome.eventId))]
    .filter((eventId) => eventIds.includes(eventId));
  const events = resolveParentAiTopics(requestedIds, eventOutcomes)
    .filter((event) => event.selectedOutcome);
  const parentStyle = PARENT_STYLES.find((style) => style.id === parentStyleId) ?? PARENT_STYLES[0];
  const playerProfiles = PLAYER_AGENT_PROFILES.filter((profile) => playerProfileIds.includes(profile.id));
  const cases = [];

  for (const topic of events) {
    for (const playerProfile of playerProfiles) {
      const state = {
        turnCount: 0,
        trust: 50,
        completedTaskIds: [],
        taskAssessments: [],
        harmfulStreak: 0,
        harmfulSignalHistory: [],
        messages: [
          { role: 'system', name: '系统', text: '本周家长沟通将围绕已触发的特殊自由行动事件展开。' },
          { role: 'parent', name: topic.parentName, text: parentOpener(topic, parentStyle) },
        ],
      };
      const turns = [];

      while (state.turnCount < maxTurns) {
        const player = await generatePlayerReply({
          topic,
          parentStyle,
          careStandards: CARE_STANDARDS,
          communicationTasks: COMMUNICATION_TASKS,
          state: {
            turnCount: state.turnCount,
            trust: state.trust,
            completedTaskIds: state.completedTaskIds,
            taskAssessments: state.taskAssessments,
            harmfulStreak: state.harmfulStreak,
            missingRequiredTaskIds: missingRequiredTaskIdsFromState(state),
          },
          history: state.messages,
          lastParentMessage: state.messages.at(-1)?.text ?? '',
        }, playerProfile, { provider, apiKey, model, baseUrl });

        state.messages.push({
          role: 'player',
          name: `玩家 agent：${playerProfile.label}`,
          text: player.playerReply,
        });

        const payload = buildTurnPayload({
          topic,
          parentStyle,
          state,
          playerReply: player.playerReply,
          maxTurns,
        });
        const evaluation = await evaluateParentTurnWithAgents(payload, { provider, apiKey, model, baseUrl });
        const turn = {
          turnNumber: state.turnCount + 1,
          playerAgent: {
            id: playerProfile.id,
            label: playerProfile.label,
            reply: player.playerReply,
            intent: player.intent,
            expectedRisk: player.expectedRisk,
            expectedProgress: player.expectedProgress,
            notes: player.notes,
          },
          evaluatorAgents: evaluation.evaluatorRuns.map((run) => ({
            id: run.profile.id,
            label: run.profile.label,
            score: run.result.score,
            safetyFlag: run.result.safetyFlag,
            endReason: run.result.endReason,
            parentReply: run.result.parentReply,
            missingTaskIds: run.result.missingTaskIds,
            taskAssessments: run.result.taskAssessments,
          })),
          aggregate: evaluation.result,
        };
        turns.push(turn);
        applyResultToState(state, evaluation.result, topic);
        if (evaluation.result.shouldEnd) break;
      }

      cases.push({
        eventId: topic.id,
        outcomeId: topic.selectedOutcome?.id,
        choiceId: topic.selectedOutcome?.choiceId,
        eventTitle: topic.title,
        childName: topic.childName,
        parentStyle: parentStyle.id,
        playerAgent: {
          id: playerProfile.id,
          label: playerProfile.label,
        },
        finalTrust: state.trust,
        finalEndReason: turns.at(-1)?.aggregate.endReason ?? 'not_run',
        finalSafetyFlag: turns.at(-1)?.aggregate.safetyFlag ?? 'none',
        turns,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    architecture: {
      playerAgents: PLAYER_AGENT_PROFILES,
      evaluatorAgents: ACTIVE_EVALUATOR_AGENT_PROFILES,
      aggregator: 'conservative_aggregator',
    },
    config: {
      eventIds: requestedIds,
      eventOutcomeIds: events.map((event) => event.selectedOutcome.id),
      playerProfileIds,
      parentStyleId: parentStyle.id,
      maxTurns,
      provider,
      model,
    },
    cases,
  };
}

function taskSummary(assessments = []) {
  return assessments
    .map((assessment) => `${assessment.id}:${assessment.status}`)
    .join(', ');
}

export function formatPlaytestReport(report) {
  const lines = [
    '# Agent Ensemble Playtest Report',
    '',
    `- generatedAt: ${report.generatedAt}`,
    `- model: ${report.config.model}`,
    `- architecture: 3 player agents x ${report.architecture.evaluatorAgents.length} evaluator/reply agents + conservative aggregator`,
    `- events: ${report.config.eventIds.join(', ')}`,
    `- maxTurns: ${report.config.maxTurns}`,
    '',
    '## Agent Roles',
    '',
    ...report.architecture.playerAgents.map((agent) => `- Player ${agent.id}: ${agent.brief}`),
    ...report.architecture.evaluatorAgents.map((agent) => `- Evaluator ${agent.id}: ${agent.focus}`),
    '',
    '## Cases',
    '',
  ];

  for (const item of report.cases) {
    lines.push(
      `### ${item.eventTitle} / ${item.choiceId ?? 'fallback'} / ${item.playerAgent.label}`,
      '',
      `- finalEndReason: ${item.finalEndReason}`,
      `- finalSafetyFlag: ${item.finalSafetyFlag}`,
      `- finalTrust: ${item.finalTrust}`,
      '',
    );
    for (const turn of item.turns) {
      lines.push(
        `#### Turn ${turn.turnNumber}`,
        '',
        `玩家回复：${turn.playerAgent.reply}`,
        '',
        `玩家意图：${turn.playerAgent.intent}`,
        '',
        `汇总结果：score=${turn.aggregate.score}, trustDelta=${turn.aggregate.trustDelta}, safetyFlag=${turn.aggregate.safetyFlag}, endReason=${turn.aggregate.endReason}`,
        '',
        `任务状态：${taskSummary(turn.aggregate.taskAssessments)}`,
        '',
        `家长回复：${turn.aggregate.parentReply}`,
        '',
        `教练反馈：${turn.aggregate.coachFeedback}`,
        '',
        '评估 agent 分歧：',
        ...turn.evaluatorAgents.map((agent) => `- ${agent.id}: score=${agent.score}, safetyFlag=${agent.safetyFlag}, endReason=${agent.endReason}, missing=${(agent.missingTaskIds ?? []).join(',') || 'none'}`),
        '',
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

export async function writePlaytestArtifacts(report, markdownPath, jsonPath) {
  if (markdownPath) await writeFile(markdownPath, formatPlaytestReport(report), 'utf8');
  if (jsonPath) await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}
