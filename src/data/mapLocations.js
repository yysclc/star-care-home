import { contentX } from '../core/Constants.js';

// Coordinates are authored against the legacy 960x640 content area.
// The current map image is drawn with contain-fit, so the whole board is visible.
// If the map illustration changes, only tune these x/y positions.
export const MAP_LOCATIONS = [
  {
    id: 'office',
    displayName: '办公室',
    sceneKey: 'OfficeScene',
    alwaysUnlocked: true,
    x: contentX(260),
    y: 170,
  },
  {
    id: 'activityRoom',
    displayName: '活动室',
    sceneKey: 'ActivityRoomScene',
    x: contentX(490),
    y: 170,
  },
  {
    id: 'toyRoom',
    displayName: '玩具室',
    sceneKey: 'ToyRoomScene',
    x: contentX(710),
    y: 170,
  },
  {
    id: 'outdoorYard',
    displayName: '户外小院',
    sceneKey: 'OutdoorYardScene',
    x: contentX(510),
    y: 290,
  },
  {
    id: 'diningRoom',
    displayName: '食堂',
    sceneKey: 'DiningRoomScene',
    alwaysUnlocked: true,
    x: contentX(265),
    y: 290,
  },
  {
    id: 'paintingRoom',
    displayName: '绘画室',
    sceneKey: 'PaintingRoomScene',
    x: contentX(260),
    y: 420,
  },
  {
    id: 'library',
    displayName: '图书室',
    sceneKey: 'LibraryScene',
    x: contentX(520),
    y: 430,
  },
  {
    id: 'sensoryRoom',
    displayName: '感统室',
    sceneKey: 'SensoryRoomScene',
    x: contentX(710),
    y: 420,
  },
];
