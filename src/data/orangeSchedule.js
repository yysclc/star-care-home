// src/data/orangeSchedule.js
// 橙橙每周所在房间及前台按钮标签名称配置
export const orangeWeeklyLocation = {
  1: { roomId: "activityRoom", label: "橙橙" },
  2: { roomId: "paintingRoom", label: "橙橙" },
  3: { roomId: "paintingRoom", label: "橙橙" },
  4: { roomId: "paintingRoom", label: "橙橙" },
  5: { roomId: "activityRoom", label: "橙橙" },
  6: null,
  7: { roomId: "activityRoom", label: "橙橙" }
};

export function getOrangeLocation(week) {
  return orangeWeeklyLocation[week] ?? null;
}

export function isOrangeInRoom(week, roomId) {
  const location = getOrangeLocation(week);
  return Boolean(location && location.roomId === roomId);
}
