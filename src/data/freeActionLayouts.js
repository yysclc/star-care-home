// src/data/freeActionLayouts.js
// 自由行动在不同房间中的按钮（热点）场景位置布局配置
import { contentX } from '../core/Constants.js';

export const freeActionLayouts = {
  activityRoom: {
    observeChildren:   { x: contentX(780), y: 160, w: 140, h: 58 },
    interactGroup:     { x: contentX(300), y: 430, w: 140, h: 58 },
    sitAndSort:        { x: contentX(200), y: 250, w: 140, h: 58 },
    orangeInteraction: { x: contentX(500), y: 200, w: 120, h: 58 } // 橙橙按钮坐标
  },

  toyRoom: {
    observePreference: { x: contentX(700), y: 160, w: 140, h: 58 },
    tidyToys:          { x: contentX(780), y: 430, w: 140, h: 58 },
    blocksPuzzle:      { x: contentX(300), y: 380, w: 130, h: 58 }
  },

  diningRoom: {
    meal:        { x: contentX(265), y: 200, w: 150, h: 58 },
    observeMeal: { x: contentX(690), y: 350, w: 180, h: 58 }
  },

  outdoorYard: {
    observeLight:     { x: contentX(180), y: 160, w: 150, h: 58 },
    sandpit:          { x: contentX(260), y: 430, w: 150, h: 58 },
    physicalTraining: { x: contentX(780), y: 400, w: 150, h: 58 },
    orangeInteraction: { x: contentX(220), y: 560, w: 130, h: 58 } // 橙橙按钮坐标（第5周在户外小院）
  },

  paintingRoom: {
    observeDrawings:   { x: contentX(260), y: 200, w: 170, h: 58 },
    charityExhibition: { x: contentX(780), y: 350, w: 170, h: 58 },
    orangeInteraction: { x: contentX(350), y: 450, w: 130, h: 58 } // 橙橙按钮坐标（第2-4周在绘画室）
  },

  library: {
    readPictureBook:     { x: contentX(260), y: 360, w: 170, h: 58 },
    quietReadingObserve: { x: contentX(520), y: 500, w: 170, h: 58 }
  },

  sensoryRoom: {
    physicalTraining:   { x: contentX(260), y: 360, w: 170, h: 58 },
    structuredMovement: { x: contentX(780), y: 430, w: 170, h: 58 }
  }
};
