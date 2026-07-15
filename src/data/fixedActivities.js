export const FIXED_ACTIVITIES = {
  activityRoom: {
    roomId: 'activityRoom',
    displayName: '活动室',
    actionCost: 2,
    minigamePlaceholderKey: 'minigame.activityStepPuzzleIntro',
    minigameSceneKey: 'ActivityStepPuzzleScene',
    results: [
      { trust: 4, stress: 3, dialogKey: 'fixedActivity.activityRoom.first' },
      { trust: 2, stress: 5, dialogKey: 'fixedActivity.activityRoom.repeat2' },
      { trust: 1, stress: 8, dialogKey: 'fixedActivity.activityRoom.repeat3' },
    ],
  },
  toyRoom: {
    roomId: 'toyRoom',
    displayName: '玩具室',
    actionCost: 1,
    minigamePlaceholderKey: 'minigame.toyRoomJointAttentionIntro',
    minigameSceneKey: 'ToyRoomJointAttentionScene',
    results: [
      { trust: 3, stress: 2, dialogKey: 'fixedActivity.toyRoom.first' },
      { trust: 1, stress: 4, dialogKey: 'fixedActivity.toyRoom.repeat2' },
      { trust: 0, stress: 7, dialogKey: 'fixedActivity.toyRoom.repeat3' },
    ],
  },
  outdoorYard: {
    roomId: 'outdoorYard',
    displayName: '户外小院',
    actionCost: 2,
    minigamePlaceholderKey: 'minigame.outdoorAACIntro',
    minigameSceneKey: 'OutdoorAACScene',
    results: [
      { trust: 2, stress: -3, dialogKey: 'fixedActivity.outdoorYard.first' },
      { trust: 0, stress: -1, dialogKey: 'fixedActivity.outdoorYard.repeat2' },
      { trust: 0, stress: 2, dialogKey: 'fixedActivity.outdoorYard.repeat3' },
    ],
  },
  paintingRoom: {
    roomId: 'paintingRoom',
    displayName: '绘画室',
    actionCost: 2,
    minigamePlaceholderKey: 'minigame.paintingSensoryIntro',
    minigameSceneKey: 'PaintingSensoryScene',
    results: [
      { trust: 3, stress: -4, dialogKey: 'fixedActivity.paintingRoom.first' },
      { trust: 1, stress: -2, dialogKey: 'fixedActivity.paintingRoom.repeat2' },
      { trust: 1, stress: 1, dialogKey: 'fixedActivity.paintingRoom.repeat3' },
    ],
  },
  library: {
    roomId: 'library',
    displayName: '图书室',
    actionCost: 1,
    minigamePlaceholderKey: 'minigame.libraryOddWordIntro',
    minigameSceneKey: 'LibraryOddWordScene',
    results: [
      { trust: 3, stress: -1, dialogKey: 'fixedActivity.library.first' },
      { trust: 1, stress: 1, dialogKey: 'fixedActivity.library.repeat2' },
      { trust: 1, stress: 4, dialogKey: 'fixedActivity.library.repeat3' },
    ],
  },
  sensoryRoom: {
    roomId: 'sensoryRoom',
    displayName: '感统室',
    actionCost: 2,
    minigamePlaceholderKey: 'minigame.sensoryBalanceIntro',
    minigameSceneKey: 'SensoryBalanceScene',
    results: [
      { trust: 2, stress: -5, dialogKey: 'fixedActivity.sensoryRoom.first' },
      { trust: 0, stress: -3, dialogKey: 'fixedActivity.sensoryRoom.repeat2' },
      { trust: 0, stress: 0, dialogKey: 'fixedActivity.sensoryRoom.repeat3' },
    ],
  },
};
