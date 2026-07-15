/**
 * 根据团队状态计算家长信任度变化
 * @param {Object} gs GameState
 * @returns {number} delta
 */
export function getParentTrustDeltaFromGroup(gs) {
  const diff = gs.group.trust - gs.group.stress;
  if (diff >= 20) return 6;
  if (diff >= 10) return 4;
  if (diff >= 0) return 2;
  if (diff >= -10) return -3;
  return -6;
}

export function getParentTrustReasonFromGroup(gs) {
  const diff = gs.group.trust - gs.group.stress;
  if (diff >= 20) {
    return '孩子们信任明显高过压力，家长很放心。';
  }
  if (diff >= 10) {
    return '孩子们信任高过压力，家长能感觉到照护所的状态在变稳。';
  }
  if (diff >= 0) {
    return '孩子们大体还能接住安排，家长信任小幅上升。';
  }
  if (diff >= -10) {
    return '孩子们压力略高过信任，家长担心照护所能不能接住他们。';
  }
  return '孩子们压力明显高过信任，家长的不安增加了。';
}

/**
 * 根据信任度获取消息数量分配
 * @param {number} parentTrust 
 * @returns {Object} { dailyTalk, complaints }
 */
export function getParentMessageCounts(parentTrust) {
  if (parentTrust >= 75) return { dailyTalk: 3, complaints: 0 };
  if (parentTrust >= 50) return { dailyTalk: 2, complaints: 1 };
  if (parentTrust >= 25) return { dailyTalk: 1, complaints: 2 };
  return { dailyTalk: 0, complaints: 3 };
}

export function getParentAiTriggeredCommunicationCount(gs, week = Number(gs?.day) || 1) {
  const outcomes = Array.isArray(gs?.dayProgress?.parentAiTriggeredOutcomes)
    ? gs.dayProgress.parentAiTriggeredOutcomes
    : [];
  const outcomeIds = outcomes
    .filter((outcome) => Number(outcome?.week) === Number(week))
    .map((outcome) => outcome?.id ?? `${outcome?.eventId ?? ''}:${outcome?.choiceId ?? ''}`)
    .filter(Boolean);
  if (outcomeIds.length) return new Set(outcomeIds).size;

  const eventIds = Array.isArray(gs?.dayProgress?.parentAiTriggeredEvents)
    ? gs.dayProgress.parentAiTriggeredEvents
    : [];
  return new Set(eventIds.filter(Boolean)).size;
}

export function getEffectiveParentMessageCounts(parentTrust, eventCommunicationCount = 0) {
  void eventCommunicationCount;
  return getParentMessageCounts(parentTrust);
}

/**
 * 限制信任度范围
 * @param {number} value 
 * @returns {number}
 */
export function clampParentTrust(value) {
  return Math.max(0, value);
}

/**
 * 随机抽取消息（尽量不重复）
 * @param {Array} pool 
 * @param {number} count 
 * @returns {Array}
 */
export function pickRandomMessages(pool, count) {
  if (!pool || pool.length === 0) return [];
  
  // 复制池子进行打乱
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const results = [];

  if (count <= pool.length) {
    // 不够就直接取前 count 个
    return shuffled.slice(0, count);
  } else {
    // 超过长度则先取全部，再允许重复补足
    results.push(...shuffled);
    for (let i = 0; i < count - pool.length; i++) {
      results.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return results;
  }
}
