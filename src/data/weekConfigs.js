const makeCheck = (path, compare, target) => {
  const getter = (gs) => {
    if (path === 'group.trust') return gs?.group?.trust;
    if (path === 'group.stress') return gs?.group?.stress;
    if (path === 'director.affection') return gs?.director?.affection;
    if (path === 'reputation') return gs?.reputation;
    if (path === 'funds') return gs?.funds;
    return undefined;
  };

  return (gs) => {
    const current = getter(gs);
    if (typeof current !== 'number') return false;

    if (compare === '>') return current > target;
    if (compare === '<') return current < target;
    if (compare === '>=') return current >= target;
    if (compare === '<=') return current <= target;
    if (compare === '===') return current === target;
    return false;
  };
};

const goal = (trustTarget, stressTarget) => [
  `\u5b69\u5b50\u4fe1\u4efb\u5ea6 \u2265 ${trustTarget}`,
  `\u5b69\u5b50\u538b\u529b\u503c < ${stressTarget}`,
];

export const WEEK_CONFIGS = {
  1: {
    week: 1,
    title: '\u7b2c1\u5468\uff1a\u5efa\u7acb\u521d\u59cb\u8fde\u63a5',
    goals: goal(55, 30),
    checks: [makeCheck('group.trust', '>=', 55), makeCheck('group.stress', '<', 30)],
  },
  2: {
    week: 2,
    title: '\u7b2c2\u5468\uff1a\u7a33\u5b9a\u4e92\u52a8\u5173\u7cfb',
    goals: goal(70, 20),
    checks: [makeCheck('group.trust', '>=', 70), makeCheck('group.stress', '<', 20)],
  },
  3: {
    week: 3,
    title: '\u7b2c3\u5468\uff1a\u63d0\u5347\u534f\u4f5c\u6c1b\u56f4',
    goals: ['\u5b69\u5b50\u4fe1\u4efb\u5ea6 \u2265 90', '\u5b69\u5b50\u538b\u529b\u503c < 10', '\u6240\u957f\u597d\u611f\u5ea6 \u2265 5'],
    checks: [makeCheck('group.trust', '>=', 90), makeCheck('group.stress', '<', 10), makeCheck('director.affection', '>=', 5)],
  },
  4: {
    week: 4,
    title: '\u7b2c4\u5468\uff1a\u5f3a\u5316\u5b89\u5168\u611f',
    goals: ['\u5b69\u5b50\u4fe1\u4efb\u5ea6 \u2265 100', '\u5b69\u5b50\u538b\u529b\u503c = 0', '\u6240\u957f\u597d\u611f\u5ea6 \u2265 5', '\u540d\u671b \u2265 30'],
    checks: [makeCheck('group.trust', '>=', 100), makeCheck('group.stress', '===', 0), makeCheck('director.affection', '>=', 5), makeCheck('reputation', '>=', 30)],
  },
  5: {
    week: 5,
    title: '\u7b2c5\u5468\uff1a\u63a8\u8fdb\u96c6\u4f53\u9002\u5e94',
    goals: ['\u5b69\u5b50\u4fe1\u4efb\u5ea6 \u2265 100', '\u5b69\u5b50\u538b\u529b\u503c = 0', '\u6240\u957f\u597d\u611f\u5ea6 \u2265 10', '\u540d\u671b \u2265 30'],
    checks: [makeCheck('group.trust', '>=', 100), makeCheck('group.stress', '===', 0), makeCheck('director.affection', '>=', 10), makeCheck('reputation', '>=', 30)],
  },
  6: {
    week: 6,
    title: '\u7b2c6\u5468\uff1a\u5de9\u56fa\u6539\u5584\u6210\u679c',
    goals: ['\u5b69\u5b50\u4fe1\u4efb\u5ea6 \u2265 100', '\u5b69\u5b50\u538b\u529b\u503c = 0', '\u6240\u957f\u597d\u611f\u5ea6 \u2265 10', '\u540d\u671b \u2265 65'],
    checks: [makeCheck('group.trust', '>=', 100), makeCheck('group.stress', '===', 0), makeCheck('director.affection', '>=', 10), makeCheck('reputation', '>=', 65)],
  },
  7: {
    week: 7,
    title: '\u7b2c7\u5468\uff1a\u9636\u6bb5\u6536\u675f',
    goals: ['\u5b69\u5b50\u4fe1\u4efb\u5ea6 \u2265 100', '\u5b69\u5b50\u538b\u529b\u503c = 0', '\u6240\u957f\u597d\u611f\u5ea6 \u2265 15', '\u540d\u671b \u2265 75', '\u8d44\u91d1 \u2265 1000'],
    checks: [makeCheck('group.trust', '>=', 100), makeCheck('group.stress', '===', 0), makeCheck('director.affection', '>=', 15), makeCheck('reputation', '>=', 75), makeCheck('funds', '>=', 1000)],
  },
};

export function getWeekConfig(week) {
  if (typeof week !== 'number') return null;
  return WEEK_CONFIGS[week] ?? null;
}

export function isWeekGoalMet(gs) {
  const week = gs?.day;
  const config = getWeekConfig(week);
  if (!config) return false;

  return config.checks.every((check) => typeof check === 'function' && check(gs));
}
