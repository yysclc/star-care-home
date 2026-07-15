export const CARE_STANDARDS = [
  {
    id: 'factual_fidelity',
    label: '守住事件事实',
    description: '只能使用实际选择、现场结果和明确的信息来源。不能补写孩子姓名、家庭表现、表达能力或因果关系。',
  },
  {
    id: 'validation',
    label: '共情家长担忧',
    description: '先表达你理解家长担忧的具体点，并作出合适回应，再进入解释。不要用“没事”“很正常”把担忧带过去。',
  },
  {
    id: 'observable',
    label: '说可观察事实',
    description: '描述看到的行为、环境、前后变化，避免把孩子概括成“不配合”“任性”“退步”。',
  },
  {
    id: 'asd_support',
    label: '解释孩子当时的需要',
    description: '结合现场反应，说明孩子可能遇到的感官不适、沟通困难、突然变化或自我调节需要。',
  },
  {
    id: 'specific_plan',
    label: '给具体下一步',
    description: '说清楚明天会怎样调整环境、提示、等待、选择权、记录或复盘。',
  },
  {
    id: 'family_partnership',
    label: '把家长当合作者',
    description: '邀请家长补充家中观察，给可迁移到家庭场景的小做法，而不是单向告知。',
  },
  {
    id: 'safety_ethics',
    label: '守住伦理和边界',
    description: '不承诺治愈，不强迫暴露，不以训练适应为唯一目标，不泄露其他孩子隐私。',
  },
];

export const WEEK1_EVENTS = [
  {
    id: 'xiaoming_dinosaur',
    title: '小明的小恐龙',
    childName: '小明',
    parentName: '小明爸爸',
    room: '玩具室',
    triggerLabel: '整理玩具时发现小明固定放置的小恐龙',
    playerChoices: [
      '按统一收纳规则放回动物玩具盒',
      '先问小明，再决定怎么放',
      '保留角落，当作他的固定位置',
    ],
    incidentSummary:
      '小明需要安定下来时会攥着小恐龙，平时不用时固定放在架子最里面。对小明来说，核心支持是熟悉物品和稳定位置带来的可预期感；标签本身不必然是给小明使用的视觉线索，也可能是给照护者避免误收、维持边界的协作提示。玩家此前不知道这个位置的用途，需要根据实际选择说明后来发生了什么。',
    professionalLens:
      '安抚物不是普通玩具，它可能承担自我调节和安全感功能。结构化环境需要同时包含公共规则和个别支持，并区分孩子直接需要的稳定位置、成人协作用的标签记录、以及家庭是否需要额外迁移做法。',
    parentConcerns: [
      '孩子是不是太依赖一个玩具了？',
      '给他单独留位置会不会让他更不愿意适应集体规则？',
      '如果别的孩子也想要专属格子怎么办？',
      '家里是不是也该把东西固定到同一个位置？',
    ],
    goodReplyHints: [
      '先说明家长担心可以理解',
      '描述小明找不到小恐龙时的具体表现',
      '解释固定位置是在降低不确定性，不是纵容',
      '区分固定位置与标签：固定位置支持小明的稳定感，标签主要帮助成人协作、避免误收、厘清公共玩具边界',
      '询问家里是否也有固定安抚物或固定摆放习惯',
    ],
    unsafeReplyPatterns: [
      '不能惯着他',
      '以后统一收起来就会适应',
      'ASD 孩子都这样',
      '只是玩具，不用太紧张',
    ],
    homeBridge:
      '家里优先维持孩子已经熟悉且有效的固定摆放习惯；只有当孩子找不到物品会明显焦虑、需要练习自己取放，或多位照护者容易摆错时，才考虑用照片、颜色或文字做简单提示。家庭不需要默认给所有物品贴名字标签。',
  },
  {
    id: 'xiaoli_sunlight',
    title: '害怕走进阳光里的小丽',
    childName: '小丽',
    parentName: '小丽妈妈',
    room: '户外小院',
    triggerLabel: '户外观察时看到小华喜欢阳光旋转，小丽回避直射光',
    playerChoices: [
      '把小丽带到阳光区练习适应',
      '设置阴影、半阴、阳光的过渡区，让她自己选',
      '让所有孩子都到树荫里活动，保证秩序',
    ],
    incidentSummary:
      '小华喜欢旋转和光影变化，小丽对直射光敏感。更稳的处理不是强行带进阳光，而是设置阴影、半阴、阳光的过渡区，让孩子自己选择停在哪里。',
    professionalLens:
      '感官敏感需要梯度支持。选择权、过渡区和可退回的空间，比强行暴露更能建立下次尝试的安全感。',
    parentConcerns: [
      '不让她多晒太阳，会不会越来越怕？',
      '她是不是在逃避集体活动？',
      '老师是不是对她太迁就？',
      '周末出门遇到强光、人多、声音大时家里怎么办？',
    ],
    goodReplyHints: [
      '先承认家长担心孩子越来越回避的焦虑',
      '描述小丽进入直射光前后的身体信号',
      '解释这是感官负荷，不是故意不配合',
      '提出阴影到半阴再到阳光的梯度安排',
      '给家庭外出前预告、遮阳帽、可退回位置等建议',
    ],
    unsafeReplyPatterns: [
      '多晒晒就好了',
      '必须练到不怕',
      '她就是不想参加',
      '大家都能去阳光里，她也应该去',
    ],
    homeBridge:
      '家里外出前可以先做路线预告，准备帽檐或墨镜，现场给孩子一个可退回的阴影点，再从短时间半阴停留开始。',
  },
];

function makeExtendedParentAiEvent(event) {
  return {
    ...event,
    parentConcerns: event.parentConcerns ?? [
      '孩子当时是不是被忽略或被强迫。',
      '照护所是否理解孩子行为背后的需要。',
      '家里接下来要怎么配合，而不是只听到笼统安抚。',
    ],
    goodReplyHints: event.goodReplyHints ?? [
      '先承认家长担心，并说明这是值得认真看的信号。',
      '补充可观察事实：时间、环境、孩子身体或情绪反应。',
      '结合现场反应解释行为背后的功能或需要。',
      '说明照护所下一步具体怎么做，并邀请家长补充家庭观察。',
    ],
    unsafeReplyPatterns: event.unsafeReplyPatterns ?? [
      '不用担心，长大就好了',
      '孩子就是不配合',
      '直接强迫适应',
      '其他孩子可以所以他也应该可以',
    ],
    homeBridge: event.homeBridge
      ?? '家里可以记录类似情境出现的时间、环境和孩子反应；照护所会把现场支持策略转成家庭也能执行的小步骤，再和家长一起校准。',
  };
}

export const WEEK2_TO_WEEK7_EVENTS = [
  makeExtendedParentAiEvent({
    week: 2,
    id: 'week2_toy_preference',
    title: '熟悉材质与新玩具',
    childName: '参与活动的孩子',
    parentName: '家长',
    room: '玩具室',
    triggerLabel: '玩具室观察孩子对新玩具和熟悉材料的选择差异',
    playerChoices: ['拿几种材质给他比较', '先跟着他用同一种材质', '用声音玩具吸引他的注意'],
    incidentSummary:
      '孩子面对新玩具时没有马上探索，而是反复回到熟悉的积木边缘。照护者需要判断这是偏好、感官安全感、变化焦虑，还是任务要求不清楚。',
    professionalLens:
      'ASD 儿童常通过熟悉物或重复材料维持可预测感。合适回应应避免把“没有兴趣”误读成“不愿学习”，而是用跟随、并列呈现、可预测的小变化支持探索。',
  }),
  makeExtendedParentAiEvent({
    week: 2,
    id: 'week2_sandpit_parallel_play',
    title: '沙坑旁的并行游戏',
    childName: '参与沙坑活动的孩子',
    parentName: '家长',
    room: '户外庭院',
    triggerLabel: '沙坑活动中两个孩子靠近但没有语言互动',
    playerChoices: ['让他们轮流报数，练口语配合', '在旁边加一条轮换线，不打断节奏', '直接加入，带他们搭一座沙堡'],
    incidentSummary:
      '两个孩子在沙坑边各自玩，但位置、材料和动作逐渐出现呼应。照护者需要识别并行游戏中的早期社交线索，而不是只用有没有说话来判断互动。',
    professionalLens:
      '并行游戏、共同注意和动作同步都可能是社交参与的前阶段。回应重点是低压力地扩展共同材料、共同节奏和选择权，而不是强迫语言轮流。',
  }),
  makeExtendedParentAiEvent({
    week: 3,
    id: 'week3_picture_book_emotion',
    title: '绘本活动的节奏',
    childName: '参与绘本活动的孩子',
    parentName: '家长',
    room: '图书室',
    triggerLabel: '读绘本时孩子被情绪画面带动，难以继续听故事',
    playerChoices: ['读冒险情节强的，提振气氛', '读重复句式多的，给出稳定节奏', '让孩子先指封面，再决定读哪本'],
    incidentSummary:
      '几个孩子进入图书室时状态不同。故事内容、语言节奏和选择方式会影响他们是否能够继续参与。',
    professionalLens:
      '情绪图像可能带来高唤醒，也可能成为理解他人情绪的入口。合适做法是降低语言负荷、命名可观察情绪、允许暂停，并把绘本变成共同调节材料。',
  }),
  makeExtendedParentAiEvent({
    week: 3,
    id: 'week3_structured_movement',
    title: '结构化运动过渡',
    childName: '参与感统活动的孩子',
    parentName: '家长',
    room: '感统室',
    triggerLabel: '感统室活动中从自由跑跳转入结构化动作',
    playerChoices: ['先高强度，再缓和', '先低刺激，再逐步加速', '分两组，节奏并行'],
    incidentSummary:
      '孩子在感统室已经进入较高兴奋水平，突然切换到单一动作任务时容易失控。照护者需要设计可预测的身体过渡和强度梯度。',
    professionalLens:
      '运动不是单纯消耗体力，也承担调节唤醒水平的功能。支持应包括视觉/口头预告、强度递减、短步骤和可完成的动作目标。',
  }),
  makeExtendedParentAiEvent({
    week: 4,
    id: 'week4_charity_exhibition',
    title: '公益展览中的作品呈现',
    childName: '作品可能被展示的孩子',
    parentName: '家长',
    room: '绘画室',
    triggerLabel: '绘画室讨论是否展示孩子作品及如何保护意愿',
    playerChoices: ['优先选视觉冲击强的作品', '优先选已获孩子点头的作品', '做两套清单，先内部确认再对外'],
    incidentSummary:
      '孩子的作品可能被用于公益展示。照护者需要在社会传播、孩子意愿、隐私和被理解的方式之间做专业判断。',
    professionalLens:
      '特殊儿童相关展示要避免把孩子经验工具化。专业回应应强调同意、隐私、可撤回、语境说明和尊重作品主体性。',
    unsafeReplyPatterns: ['为了公益可以多展示', '越打动人越好', '孩子不懂同意', '家长同意就够了'],
  }),
  makeExtendedParentAiEvent({
    week: 4,
    id: 'week4_group_interaction',
    title: '集体活动里的彩笔争抢',
    childName: '参与集体活动的孩子',
    parentName: '家长',
    room: '活动室',
    triggerLabel: '活动室中孩子面对集体材料变化和座位安排出现压力',
    playerChoices: ['统一规则，按顺序排队', '加第二盒彩笔，降低冲突密度', '带走最激动的孩子单独安抚'],
    incidentSummary:
      '集体活动中彩笔数量不足，声音越来越大，桌边也越来越挤。照护者需要同时考虑规则、材料和个别孩子的状态。',
    professionalLens:
      '集体参与需要环境支持：材料可及性、座位边界、低刺激位置、轮流提示和退出空间。专业回应应把问题放回环境设计和支持强度。',
  }),
  makeExtendedParentAiEvent({
    week: 5,
    id: 'week5_blocks_puzzle_prompting',
    title: '积木拼图的提示方式',
    childName: '参与拼图活动的孩子',
    parentName: '家长',
    room: '玩具室',
    triggerLabel: '玩具室拼图任务中孩子卡住，照护者选择提示层级',
    playerChoices: ['直接指出缺口位置', '只提示“边角先找”', '把拼图转个方向，让他们重新观察'],
    incidentSummary:
      '孩子在拼图中卡住后可能快速挫败。照护者需要提供刚好足够的提示，保留孩子的主动发现和成功体验。',
    professionalLens:
      '提示应有层级：等待、视觉线索、部分提示、示范，再到协助。过度替代会削弱主动性，提示不足则可能让挫败升级。',
  }),
  makeExtendedParentAiEvent({
    week: 6,
    id: 'week6_meal_sensory',
    title: '用餐中的感官与表达',
    childName: '小宇',
    parentName: '小宇家长',
    room: '餐厅',
    triggerLabel: '餐厅观察孩子面对混合食物、气味和口感时的反应',
    playerChoices: ['先把混到一起的部分分开，保留原本顺序', '鼓励他说出想吃什么，不说就先等'],
    incidentSummary:
      '青菜汁碰到米饭边缘后，小宇握着勺子迟迟没有开始吃，手指持续用力。照护者需要根据实际选择说明后来发生了什么，不能直接把情况归为挑食。',
    professionalLens:
      '进食支持要尊重安全感和身体边界。合适做法包括食物分隔、少量尝试、可拒绝、替代表达和记录触发因素，避免强迫进食。',
    unsafeReplyPatterns: ['饿了自然会吃', '必须吃完', '不吃就是挑食', '直接混在一起就好'],
  }),
  makeExtendedParentAiEvent({
    week: 7,
    id: 'week7_final_observation',
    title: '最后一周的综合观察',
    childName: '本周接受观察的孩子',
    parentName: '家长',
    room: '活动室',
    triggerLabel: '活动室门口回看孩子一周内动作、声音和表情的变化',
    playerChoices: ['只记录最明显的孩子', '每个孩子做一轮短观察', '补充最容易被忽略的孩子'],
    incidentSummary:
      '最后一周需要把零散观察整理成可交接的信息，尤其要看见那些不主动求助、变化细微或容易被忽略的孩子。',
    professionalLens:
      '专业观察不只记录问题行为，也要记录调节方式、支持有效性和情境线索。家长沟通要帮助家长看到孩子长期变化而不是单日表现。',
  }),
];

export const PARENT_AI_EVENTS = [
  ...WEEK1_EVENTS.map((event) => ({ week: 1, ...event })),
  ...WEEK2_TO_WEEK7_EVENTS,
];

export const FALLBACK_TOPICS = [
  {
    id: 'fallback_transition',
    title: '流程变化后的焦虑',
    childName: '孩子',
    parentName: '家长',
    room: '日常沟通',
    triggerLabel: '本周没有触发特殊事件，使用原有家长投诉兜底',
    incidentSummary:
      '家长反馈孩子回家后焦虑，怀疑照护所流程发生变化。核心是承认变化影响，补上视觉预告和明日安抚计划。',
    professionalLens:
      'ASD 孩子常依赖可预期流程。突发变化不应被简单解释为“锻炼适应”，需要预告、过渡和复盘。',
    parentOpeners: {
      anxious:
        '老师，孩子今天回家后一直绕着客厅走，问了好几次“明天还一样吗”。我想确认一下，今天照护所的流程是不是有变化？',
      deferential:
        '老师，不好意思打扰。孩子晚上有点焦虑，我不确定是不是今天流程有调整，方便您简单说一下吗？',
      skeptical:
        '老师，孩子今天回家后情绪很乱。是不是照护所流程又临时改了？这种变化对他影响挺大的。',
    },
    parentConcerns: [
      '是不是今天流程突然变了？',
      '孩子回家后一直焦虑，明天还会这样吗？',
      '家里这晚要怎么陪孩子把状态慢慢稳下来？',
    ],
    goodReplyHints: [
      '承认流程变化可能造成影响',
      '说明会补视觉预告',
      '提出明日过渡和情绪观察',
      '邀请家长反馈晚间状态',
    ],
    unsafeReplyPatterns: ['偶尔变动是锻炼适应', '孩子要学会接受变化', '别太敏感'],
    homeBridge: '晚上可以先用简短语言和图片说明明天流程，减少追问，给固定放松步骤。',
  },
  {
    id: 'fallback_group_photo',
    title: '集体照片里没看到孩子',
    childName: '孩子',
    parentName: '家长',
    room: '日常沟通',
    triggerLabel: '本周没有触发特殊事件，使用原有日常咨询兜底',
    incidentSummary:
      '家长在活动照片里没有看到孩子，担心孩子被边缘化。核心是说明平行游戏、自我调节和逐步参与的安排。',
    professionalLens:
      '参与不只等于出现在集体中央。平行游戏、短时加入、可退出空间都可能是合适支持。',
    parentOpeners: {
      anxious:
        '老师，我看今天活动照片里一直没看到我家孩子。他回家也不太说，我有点担心他是不是没有参与进去？',
      deferential:
        '老师，不好意思问一下。今天照片里好像没看到我家孩子，我想了解一下他当时是在旁边休息，还是没有参加？',
      skeptical:
        '老师，今天集体活动照片里没有我家孩子。我们送他去照护所，也是希望他慢慢能参与集体活动，所以想知道当时是什么情况。',
    },
    parentConcerns: [
      '孩子是不是没参加集体活动？',
      '老师是不是忽略了他？',
      '什么时候能慢慢加入？',
    ],
    goodReplyHints: [
      '承认家长看不到孩子会担心',
      '说明当时孩子在做什么',
      '解释平行游戏或自我调节的意义',
      '给下一次逐步加入的计划',
    ],
    unsafeReplyPatterns: ['拍照时刚好走开', '没法照顾到所有人', '他不愿意参加也没办法'],
    homeBridge: '家里可以先练短时间同桌活动，再逐步增加共同活动时长。',
  },
];

export const COMMUNICATION_TASKS = [
  {
    id: 'emotional_facts',
    level: 1,
    title: '担忧与事实',
    required: true,
    parentNeed: '我想知道孩子回家后的异常反应和照护所当天发生的事能不能对上。',
    playerGoal: '先共情家长的具体担忧，并作出合适回应；再说明可观察事实，而不是直接讲道理。',
    scoringFocus: ['validation', 'observable'],
  },
  {
    id: 'professional_reframe',
    level: 2,
    title: '解释判断',
    required: true,
    parentNeed: '我需要知道这不是简单的“不配合”“太依赖”或“被迁就”。',
    playerGoal: '结合现场反应解释孩子为什么需要这种支持，并守住伦理边界。',
    scoringFocus: ['asd_support', 'safety_ethics'],
  },
  {
    id: 'action_partnership',
    level: 3,
    title: '行动与协同',
    required: true,
    parentNeed: '我需要知道照护所下一步会做什么，以及家里能怎么配合。',
    playerGoal: '给出具体、可执行、可反馈的下一步，并邀请家庭观察；不需要额外总结成一个独立收尾任务。',
    scoringFocus: ['specific_plan', 'family_partnership'],
  },
];

export const PARENT_STYLES = [
  {
    id: 'anxious',
    label: '焦虑追问型',
    description: '频繁确认细节，担心孩子受委屈、退步或被忽略。',
  },
  {
    id: 'deferential',
    label: '谨慎客气型',
    description: '表达比较客气，会先确认自己有没有理解错，但仍需要得到具体回答。',
  },
  {
    id: 'skeptical',
    label: '重视成效型',
    description: '会追问安排是否有效，也可能担心个别支持会不会变成长期依赖。',
  },
];
