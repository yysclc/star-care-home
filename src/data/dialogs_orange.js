export const DIALOGS_ORANGE = {
  day1: {
    activityRoom: {
      firstInteraction: {
        minAffection: 0,
        requiredFlags: [],
        lines: [
          '[橙橙 Day 1 活动室第一次互动 - 待写]',
        ],
        choices: [
          {
            id: 'observe',
            label: '先站远一点观察',
            resultKey: 'observeResult',
            affectionDelta: 2,
          },
          {
            id: 'approach',
            label: '直接走近询问',
            resultKey: 'approachResult',
            affectionDelta: -1,
          },
        ],
        results: {
          observeResult: [
            '[橙橙互动结果：观察 - 待写]',
          ],
          approachResult: [
            '[橙橙互动结果：靠近 - 待写]',
          ],
        },
      },
    },
  },
};
