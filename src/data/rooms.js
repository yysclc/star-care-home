export const ROOMS = [
  {
    id: 'activityRoom',
    displayName: '活动室',
    sceneKey: 'ActivityRoomScene',
    initialUnlocked: true,
    description: '基础集体活动空间。',
  },
  {
    id: 'toyRoom',
    displayName: '玩具室',
    sceneKey: 'ToyRoomScene',
    initialUnlocked: true,
    description: '玩具、积木和拼图。',
  },
  {
    id: 'outdoorYard',
    displayName: '户外小院',
    sceneKey: 'OutdoorYardScene',
    initialUnlocked: true,
    description: '阳光、草地与沙坑。',
  },
  {
    id: 'diningRoom',
    displayName: '食堂',
    sceneKey: 'DiningRoomScene',
    initialUnlocked: true,
    description: '用餐与日常照护空间。',
  },
  {
    id: 'paintingRoom',
    displayName: '绘画室',
    sceneKey: 'PaintingRoomScene',
    initialUnlocked: false,
    description: '尚未修建。',
  },
  {
    id: 'library',
    displayName: '图书室',
    sceneKey: 'LibraryScene',
    initialUnlocked: false,
    description: '尚未修建。',
  },
  {
    id: 'sensoryRoom',
    displayName: '感统室',
    sceneKey: 'SensoryRoomScene',
    initialUnlocked: false,
    description: '尚未修建。',
  },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((room) => [room.id, room]));
