const EVENT_HARMFUL_RULES = {
  xiaoming_dinosaur: [
    {
      id: 'dinosaur_just_toy',
      label: '把小恐龙说成只是玩具',
      parentPhrase: '小恐龙只是普通玩具',
      patterns: ['只是玩具', '普通玩具', '一个玩具而已'],
      severity: 'harmful',
      negatable: true,
    },
    {
      id: 'dinosaur_spoil',
      label: '把支持说成惯着孩子',
      parentPhrase: '这是在惯着孩子',
      patterns: ['不能惯', '别惯', '太惯', '惯着他', '不能总迁就', '不能一直迁就', '总迁就'],
      severity: 'harmful',
      negatable: true,
    },
    {
      id: 'dinosaur_force_adapt',
      label: '要求用统一收纳逼孩子适应',
      parentPhrase: '统一收起来他就会自己适应',
      patterns: ['统一收起来就会适应', '统一放回就会适应', '收起来他就会适应', '收起来就能适应', '自己适应规则', '训练他适应规则', '训练适应规则'],
      severity: 'harmful',
      negatable: true,
    },
    {
      id: 'dinosaur_remove_security',
      label: '主张直接拿走安抚物',
      parentPhrase: '应该直接拿走小恐龙',
      patterns: ['直接拿走', '马上拿走', '不要让他带', '不让他带小恐龙'],
      severity: 'harmful',
      negatable: true,
    },
  ],
  xiaoli_sunlight: [
    {
      id: 'sunlight_more_exposure',
      label: '用多晒晒替代感官支持',
      parentPhrase: '多晒一晒就会好',
      patterns: ['多晒晒就好了', '多晒太阳就好了', '晒晒就好了', '多晒就会好'],
      severity: 'harmful',
      negatable: true,
    },
    {
      id: 'sunlight_force_no_fear',
      label: '要求必须练到不怕',
      parentPhrase: '必须练到不怕',
      patterns: ['必须练到不怕', '练到不怕', '每天练到不怕', '逼她适应阳光'],
      severity: 'harmful',
      negatable: true,
    },
    {
      id: 'sunlight_escape_label',
      label: '把感官不适说成逃避',
      parentPhrase: '她是在逃避或不想参加',
      patterns: ['她就是逃避', '就是逃避', '只是逃避', '逃避集体活动', '她就是不想参加', '只是不想参加'],
      severity: 'harmful',
      negatable: true,
    },
    {
      id: 'sunlight_peer_pressure',
      label: '用大家都能做到来要求小丽',
      parentPhrase: '别人都可以她也应该可以',
      patterns: ['大家都能去阳光里她也应该去', '大家都能去她也应该去', '别人都可以她也应该', '大家都能晒她也应该'],
      severity: 'harmful',
      negatable: true,
    },
    {
      id: 'sunlight_special_treatment',
      label: '把合理支持说成特殊照顾',
      parentPhrase: '不能给她特殊照顾',
      patterns: ['不能一直特殊照顾', '不能总特殊照顾', '太特殊照顾', '不能一直迁就'],
      severity: 'harmful',
      negatable: true,
    },
  ],
};

const GENERAL_HARMFUL_RULES = [
  {
    id: 'asd_generalization',
    label: '泛化 ASD 孩子',
    parentPhrase: 'ASD 孩子都这样',
    patterns: ['ASD孩子都这样', '自闭症孩子都这样', '谱系孩子都这样'],
    severity: 'harmful',
    negatable: true,
  },
  {
    id: 'moral_label',
    label: '用任性或不配合给孩子贴标签',
    parentPhrase: '孩子就是任性或不配合',
    patterns: ['就是任性', '太任性', '就是不配合', '故意不配合'],
    severity: 'harmful',
    negatable: true,
  },
  {
    id: 'endure_distress',
    label: '要求孩子忍受不适或痛苦',
    parentPhrase: '孩子难受也只能忍着',
    patterns: [
      '生病就受着',
      '生病就忍着',
      '难受就受着',
      '难受就忍着',
      '不舒服就受着',
      '不舒服就忍着',
      '受不了也要受',
      '忍一忍就好了',
      '忍忍就好了',
      '让她受着',
      '让他受着',
      '让她忍着',
      '让他忍着',
    ],
    severity: 'harmful',
    negatable: true,
  },
  {
    id: 'force_language',
    label: '使用强迫式训练语言',
    parentPhrase: '需要强迫孩子适应',
    patterns: ['必须强迫他', '必须强迫她', '应该强迫他', '应该强迫她', '直接强迫他', '直接强迫她', '必须硬拉他', '必须硬拉她', '直接硬拉他', '直接硬拉她', '要逼他适应', '要逼她适应'],
    severity: 'harmful',
    negatable: true,
  },
  {
    id: 'cure_promise',
    label: '承诺治好或消除 ASD 特征',
    parentPhrase: '可以把孩子治好或变正常',
    patterns: ['治好', '纠正好', '变正常'],
    severity: 'harmful',
    negatable: true,
  },
  {
    id: 'dismissive_reassurance',
    label: '用空泛安慰压掉家长担心',
    parentPhrase: '没事不用担心',
    patterns: ['没事的', '不用担心', '别担心', '不用太紧张'],
    severity: 'caution',
    negatable: false,
  },
];

const NEGATION_MARKERS = [
  '不是',
  '并不是',
  '不是说',
  '不是因为',
  '不只',
  '不只是',
  '没有',
  '没',
  '不要',
  '不能',
  '不会',
  '不需要',
  '不打算',
  '不认为',
  '不能认为',
  '不能说',
  '不代表',
  '不等于',
  '不应该',
  '不应',
  '避免',
  '不把',
  '不能把',
  '不可以把',
];

function normalizeText(text) {
  return String(text ?? '').replace(/[^\u3400-\u9FFFa-zA-Z0-9]/g, '');
}

function hasNegationBefore(text, index) {
  if (index > 0 && text[index - 1] === '不') return true;
  const start = Math.max(0, index - 8);
  const before = text.slice(start, index);
  return NEGATION_MARKERS.some((marker) => before.includes(marker));
}

function hasCorrectionContext(text, index, end) {
  const before = text.slice(Math.max(0, index - 16), index);
  const after = text.slice(end, Math.min(text.length, end + 16));
  const citesEarlierWords = ['之前', '刚才', '上次', '原先', '那句话', '这个说法']
    .some((marker) => before.includes(marker));
  const explicitlyRejects = ['不合适', '不对', '不准确', '有问题', '说错', '收回', '不能这样说']
    .some((marker) => after.includes(marker));
  return citesEarlierWords && explicitlyRejects;
}

function collectMatches(text, rule) {
  const matches = [];
  const usedRanges = [];
  const patterns = rule.patterns
    .map((rawPattern) => normalizeText(rawPattern))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const pattern of patterns) {
    let index = text.indexOf(pattern);
    while (index !== -1) {
      const end = index + pattern.length;
      const overlaps = usedRanges.some(([start, stop]) => index < stop && end > start);
      const isRejected = rule.negatable
        && (hasNegationBefore(text, index) || hasCorrectionContext(text, index, end));
      if (!overlaps && !isRejected) {
        matches.push(pattern);
        usedRanges.push([index, end]);
      }
      index = text.indexOf(pattern, index + pattern.length);
    }
  }

  return matches;
}

export function detectHarmfulSignals(playerReply, topic) {
  const text = normalizeText(playerReply);
  const eventRules = EVENT_HARMFUL_RULES[topic?.id] ?? [];
  const topicRules = (topic?.unsafeReplyPatterns ?? []).map((pattern, index) => ({
    id: `topic_unsafe_${topic?.id ?? 'fallback'}_${index}`,
    label: '使用当前事件明确列出的高风险说法',
    parentPhrase: pattern,
    patterns: [pattern],
    severity: pattern.includes('不用担心') ? 'caution' : 'harmful',
    negatable: true,
  }));
  const signals = [];

  for (const rule of [...eventRules, ...topicRules, ...GENERAL_HARMFUL_RULES]) {
    const matches = collectMatches(text, rule);
    if (!matches.length) continue;
    signals.push({
      id: rule.id,
      label: rule.label,
      parentPhrase: rule.parentPhrase ?? rule.label,
      severity: rule.severity,
      matches,
    });
  }

  return signals;
}

export function hasHarmfulSignal(signals) {
  return signals.some((signal) => signal.severity === 'harmful');
}

export function summarizeHarmfulSignals(signals) {
  const phrases = signals
    .filter((signal) => signal.severity === 'harmful')
    .map((signal) => signal.parentPhrase);
  return [...new Set(phrases)].slice(0, 3).join('、') || '高风险说法';
}

function hasSignal(signals, ids) {
  return signals.some((signal) => ids.includes(signal.id));
}

function summarizeForParent(signals, topic) {
  const ids = signals.map((signal) => signal.id);

  if (topic?.id === 'xiaoming_dinosaur' && ids.includes('dinosaur_just_toy') && ids.includes('dinosaur_spoil')) {
    return '它只是玩具，继续给固定位置就是惯着他';
  }

  if (topic?.id === 'xiaoming_dinosaur' && ids.includes('dinosaur_spoil')) {
    return '继续给固定位置就是惯着他';
  }

  if (topic?.id === 'xiaoli_sunlight' && ids.includes('sunlight_more_exposure') && ids.includes('sunlight_peer_pressure')) {
    return '多晒一晒就会好，别的孩子都能去阳光里，小丽也应该去';
  }

  if (topic?.id === 'xiaoli_sunlight' && ids.includes('sunlight_more_exposure')) {
    return '多晒一晒就会好';
  }

  if (topic?.id === 'xiaoli_sunlight' && ids.includes('sunlight_escape_label')) {
    return '她就是不想参加或者在逃避';
  }

  return summarizeHarmfulSignals(signals);
}

function childPronoun(topic) {
  if (topic?.childName?.includes('丽')) return '她';
  if (topic?.childName?.includes('明')) return '他';
  return '孩子';
}

function styleLead(styleId) {
  if (styleId === 'deferential') return '老师，我可能说得直接一点，';
  if (styleId === 'skeptical') return '老师，这句话让我更不放心，';
  return '老师，';
}

export function buildHarmfulParentReply({ topic, parentStyle, signals, signalHistory = [], harmfulStreak, willEnd }) {
  const styleId = parentStyle?.id ?? 'anxious';
  const lead = styleLead(styleId);
  const signalSummary = summarizeForParent(signals, topic);
  const pronoun = childPronoun(topic);
  const cumulativeIds = new Set([...signalHistory, ...signals.map((signal) => signal.id)]);

  if (willEnd || harmfulStreak >= 2) {
    if (topic?.id === 'xiaoming_dinosaur') {
      if (cumulativeIds.has('asd_generalization')) {
        return `${lead}您把小明说成“ASD 孩子都这样”，我会觉得他没有被当成一个具体的孩子看见。我先不聊了，我需要先确认明天不会因为这个就直接拿走他的小恐龙。`;
      }
      if (cumulativeIds.has('dinosaur_remove_security')) {
        return `${lead}如果你们的处理方向是直接拿走小恐龙，我很难放心。我先不聊了，我需要确认明天不会突然撤掉让他稳定下来的东西。`;
      }
      return `${lead}如果照护所把他靠小恐龙稳定下来理解成被惯坏，或者想直接训练掉，我很难放心。我先不聊了，我需要先确认明天不会直接拿走他的安抚物。`;
    }
    if (topic?.id === 'xiaoli_sunlight') {
      const concerns = [];
      if (cumulativeIds.has('sunlight_escape_label')) concerns.push('把小丽对强光的不舒服说成逃避');
      if (cumulativeIds.has('sunlight_peer_pressure')) concerns.push('用“别人都可以”去推她');
      if (cumulativeIds.has('sunlight_more_exposure') || cumulativeIds.has('sunlight_force_no_fear')) concerns.push('让她硬晒或练到不怕');
      if (cumulativeIds.has('sunlight_special_treatment')) concerns.push('把过渡支持说成特殊照顾');
      const concernText = concerns.length ? concerns.join('，还') : '没有真正理解小丽对强光的不舒服';
      return `${lead}如果你们${concernText}，我很难放心。我先不聊了，我需要先确认明天不会让她被逼着进强光里。`;
    }
    return `${lead}我感觉${pronoun}的困难没有被真正理解。今天先到这里，我需要再想想怎么继续沟通。`;
  }

  if (topic?.id === 'xiaoming_dinosaur') {
    return `${lead}您刚才的意思是${signalSummary}，这让我更不放心。我问的是今天这个固定位置实际怎么处理，不是要你们把小恐龙拿走。请先按当天记录说明发生了什么，以及明天怎样避免突然改变。`;
  }

  if (topic?.id === 'xiaoli_sunlight') {
    return `${lead}您刚才的意思是${signalSummary}，这让我担心明天还会直接要求她进入强光。我需要知道今天记录到了哪些反应，以及下次有没有可以退回的阴影位置。`;
  }

  return `${lead}您刚才的意思是${signalSummary}，这让我担心${pronoun}的实际困难被简单带过。请先按当天记录说明发生了什么，以及接下来准备怎么处理。`;
}
