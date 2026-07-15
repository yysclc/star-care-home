export function setPhase(gs, phase) {
  gs.dayProgress.phase = phase;
}

export function resetFixedActionProgress(gs) {
  gs.dayProgress.fixedActionsDone = 0;
  gs.dayProgress.fixedActionCounts = {};
}

export function fixedActionsComplete(gs) {
  return gs.dayProgress.fixedActionsDone >= 3;
}

export function enterFreePhase(gs) {
  gs.dayProgress.phase = 'free';
}

export function finishDayOne(gs) {
  gs.dayProgress.phase = 'result';
}

export function resetDayProgress(gs, phase = 'office') {
  gs.dayProgress = {
    fixedActionsDone: 0,
    fixedActionCounts: {},
    fixedActionHistory: [],
    freeActionDone: {},
    orangeInteractionDone: {},
    phase,
  };
}

export function retryCurrentDay(gs) {
  gs.actionPoints = gs.maxActionPoints;
  resetDayProgress(gs, 'office');
}

export function advanceToNextWeek(gs) {
  return {
    ...gs,
    day: gs.day + 1,
    actionPoints: gs.maxActionPoints,
    dayProgress: {
      fixedActionsDone: 0,
      fixedActionCounts: {},
      fixedActionHistory: [],
      freeActionDone: {},
      orangeInteractionDone: {},
      phase: 'weekIntro',
    },
  };
}
