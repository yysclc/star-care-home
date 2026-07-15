export const CONSTRUCTION_PROJECTS = [
  {
    roomId: 'paintingRoom',
    displayName: '绘画室',
    price: 600,
    description: '安静的绘画空间。第一版用于验证修建后房间立刻开放。',
    successDialogKey: 'computer.build.paintingRoomSuccess',
  },
  {
    roomId: 'library',
    displayName: '图书室',
    price: 500,
    description: '低刺激的共读空间。第一版用于验证房间解锁与自由行动按钮。',
    successDialogKey: 'computer.build.librarySuccess',
  },
  {
    roomId: 'sensoryRoom',
    displayName: '感统室',
    price: 700,
    description: '用于感官调节和体能活动。第一版用于验证高消耗活动按钮。',
    successDialogKey: 'computer.build.sensoryRoomSuccess',
  },
];

export const CONSTRUCTION_BY_ROOM_ID = Object.fromEntries(
  CONSTRUCTION_PROJECTS.map((project) => [project.roomId, project]),
);
