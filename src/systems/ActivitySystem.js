import { FIXED_ACTIVITIES } from '../data/fixedActivities.js';
import { spendActionPoints, applyEffects } from '../core/GameState.js';

function repeatIndexFor(countBefore) {
  if (countBefore <= 0) return 0;
  if (countBefore === 1) return 1;
  return 2;
}

// 小游戏评级加成表（叠加在固定行动基础结算上）
const MINIGAME_MODIFIERS = {
  success: { trust: 5,  stress: -2 },
  normal:  { trust: 2,  stress: -1 },
  fail:    { trust: 0,  stress:  0 },
};

export function canRunFixedActivity(gs, roomId) {
  return Boolean(gs.rooms?.[roomId] && FIXED_ACTIVITIES[roomId]);
}

export function performFixedActivity(gs, roomId, minigameRating = null) {
  const activity = FIXED_ACTIVITIES[roomId];
  if (!activity) {
    return { ok: false, reason: 'unknown_activity' };
  }
  if (!gs.rooms?.[roomId]) {
    return { ok: false, reason: 'locked' };
  }
  if (!spendActionPoints(gs, activity.actionCost)) {
    return { ok: false, reason: 'not_enough_action_points', cost: activity.actionCost };
  }

  gs.dayProgress ??= {};
gs.dayProgress.fixedActionCounts ??= {};
gs.dayProgress.fixedActionHistory ??= [];
gs.dayProgress.fixedActionsDone ??= 0;

const countBefore = gs.dayProgress.fixedActionHistory.filter((id) => id === roomId).length;
const resultIndex = repeatIndexFor(countBefore);
const effect = activity.results[resultIndex];

  const before = {
    actionPoints: gs.actionPoints + activity.actionCost,
    groupTrust: gs.group.trust,
    groupStress: gs.group.stress,
  };

  const changes = applyEffects(gs, {
    'group.trust': effect.trust,
    'group.stress': effect.stress,
  });

  // 小游戏评级加成（叠加，不影响行动点）
  const mod = MINIGAME_MODIFIERS[minigameRating] ?? null;
  if (mod && (mod.trust !== 0 || mod.stress !== 0)) {
    applyEffects(gs, {
      'group.trust': mod.trust,
      'group.stress': mod.stress,
    });
  }

  gs.dayProgress.fixedActionHistory = [
  ...gs.dayProgress.fixedActionHistory,
  roomId,
];

gs.dayProgress.fixedActionCounts = {
  ...gs.dayProgress.fixedActionCounts,
  [roomId]: countBefore + 1,
};

gs.dayProgress.fixedActionsDone += 1;

  return {
    ok: true,
    roomId,
    displayName: activity.displayName,
    actionCost: activity.actionCost,
    repeatCount: countBefore + 1,
    minigamePlaceholderKey: activity.minigamePlaceholderKey,
    dialogKey: effect.dialogKey,
    minigameRating: minigameRating ?? null,
    modTrust:  mod?.trust  ?? 0,
    modStress: mod?.stress ?? 0,
    deltas: {
      actionPoints: -activity.actionCost,
      groupTrust:   effect.trust  + (mod?.trust  ?? 0),
      groupStress:  effect.stress + (mod?.stress ?? 0),
    },
    before,
    after: {
      actionPoints: gs.actionPoints,
      groupTrust:   gs.group.trust,
      groupStress:  gs.group.stress,
    },
    changes,
  };
}
