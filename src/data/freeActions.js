export const FREE_ACTIONS = {
  activityRoom: [
    {
      id: 'observeChildren',
      label: '静静观察',
      cost: 1,
      effects: { 'attrs.professional': 2 },
      textKey: 'freeAction.activityRoom.observeChildren',
    },
    {
      id: 'interactGroup',
      label: '与孩子互动',
      cost: 2,
      effects: { 'attrs.communication': 2, 'group.trust': 5, 'group.stress': 2 },
      textKey: 'freeAction.activityRoom.interactGroup',
    },
    {
      id: 'sitAndSort',
      label: '沙发小憩',
      cost: 0,
      effects: { actionPoints: 1 },
      textKey: 'freeAction.activityRoom.sitAndSort',
    },
  ],

  toyRoom: [
    {
      id: 'observePreference',
      label: '静静观察',
      cost: 1,
      effects: { 'attrs.professional': 2 },
      textKey: 'freeAction.toyRoom.observePreference',
    },
    {
      id: 'tidyToys',
      label: '整理玩具',
      cost: 1,
      effects: { 'group.stress': -5 },
      textKey: 'freeAction.toyRoom.tidyToys',
    },
    {
      id: 'blocksPuzzle',
      label: '积木/玩具互动',
      cost: 2,
      effects: { 'attrs.communication': 2, 'group.trust': 2, 'group.stress': -2 },
      textKey: 'freeAction.toyRoom.blocksPuzzle',
    },
  ],

  diningRoom: [
    {
      id: 'meal',
      label: '用餐',
      buttonHint: '(\u91d1\u94b1 -50\uff0c\u884c\u52a8\u529b +1)',
      cost: 0,
      effects: { funds: -50, actionPoints: 1 },
      textKey: 'freeAction.diningRoom.meal',
      alreadyDoneLines: ['已经吃过员工餐了。'],
    },
    {
      id: 'observeMeal',
      label: '观察孩子用餐',
      cost: 1,
      effects: { 'attrs.professional': 2 },
      textKey: 'freeAction.diningRoom.observeMeal',
    },
  ],

  outdoorYard: [
    {
      id: 'observeLight',
      label: '自然观察',
      cost: 1,
      effects: { 'attrs.professional': 2 },
      textKey: 'freeAction.outdoorYard.observeLight',
    },
    {
      id: 'sandpit',
      label: '沙坑活动',
      cost: 2,
      effects: { 'group.stress': -5, 'group.trust': 2 },
      textKey: 'freeAction.outdoorYard.sandpit',
    },
    {
      id: 'physicalTraining',
      label: '自己体能训练',
      cost: 1,
      effects: { 'attrs.physicalExp': 5 },
      textKey: 'freeAction.outdoorYard.physicalTraining',
    },
  ],

  paintingRoom: [
    {
      id: 'observeDrawings',
      label: '观察孩子们的绘画',
      cost: 1,
      effects: { 'attrs.professional': 2 },
      textKey: 'freeAction.paintingRoom.observeDrawings',
    },
    {
      id: 'charityExhibition',
      label: '筹备公益展览/拍卖',
      cost: 2,
      effects: { funds: 300, 'attrs.communication': 2, 'group.trust': -8, reputation: 5, 'director.affection': -5 },
      textKey: 'freeAction.paintingRoom.charityExhibition',
    },
  ],

  library: [
    {
      id: 'readPictureBook',
      label: '绘本共读',
      cost: 2,
      effects: { 'group.trust': 5, 'attrs.communication': 2 },
      textKey: 'freeAction.library.readPictureBook',
    },
    {
      id: 'quietReadingObserve',
      label: '自由阅读',
      cost: 1,
      effects: { 'attrs.professional': 2 },
      textKey: 'freeAction.library.quietReadingObserve',
    },
  ],

  sensoryRoom: [
    {
      id: 'physicalTraining',
      label: '自己体能训练',
      cost: 1,
      effects: { 'attrs.physicalExp': 10 },
      textKey: 'freeAction.sensoryRoom.physicalTraining',
    },
    {
      id: 'structuredMovement',
      label: '结构化运动活动',
      cost: 2,
      effects: { 'group.stress': -10, 'group.trust': 2 },
      textKey: 'freeAction.sensoryRoom.structuredMovement',
    },
  ],
};

