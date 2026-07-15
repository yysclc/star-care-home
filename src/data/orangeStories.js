import { WEEK1_ORANGE_STORY } from './week1OrangeStory.js';
import { WEEK2_ORANGE_STORY } from './week2OrangeStory.js';
import { WEEK3_ORANGE_STORY } from './week3OrangeStory.js';
import { WEEK4_ORANGE_STORY } from './week4OrangeStory.js';
import { WEEK5_ORANGE_STORY } from './week5OrangeStory.js';
import { WEEK7_ORANGE_STORY } from './week7OrangeStory.js';

export const WEEKLY_ORANGE_STORIES = {
  1: {
    interactions: {
      activityRoom: WEEK1_ORANGE_STORY.activityRoomIntro,
      paintingRoom: WEEK1_ORANGE_STORY.paintingRoomFollowup,
    },
    result: {
      successLines: WEEK1_ORANGE_STORY.endCheck.successLines,
      failLines: WEEK1_ORANGE_STORY.endCheck.failLines,
    },
  },
  2: {
    interactions: {
      paintingRoom: WEEK2_ORANGE_STORY.noiseEvent,
      paintingRoomHeadphones: WEEK2_ORANGE_STORY.headphonesFollowup,
    },
    result: {
      successLines: WEEK2_ORANGE_STORY.result.successLines,
      failLines: WEEK2_ORANGE_STORY.result.failLines,
    },
  },
  3: {
    interactions: {
      paintingRoom: WEEK3_ORANGE_STORY.paperChoice,
      library: WEEK3_ORANGE_STORY.bookChoice,
      paintingRoomFinal: WEEK3_ORANGE_STORY.finalPainting,
    },
    result: {
      successLines: WEEK3_ORANGE_STORY.result.successLines,
      failLines: WEEK3_ORANGE_STORY.result.failLines,
    },
  },
  4: {
    interactions: {
      paintingRoom: WEEK4_ORANGE_STORY.displayConsent,
      activityRoom: WEEK4_ORANGE_STORY.coveredPainting,
      paintingRoomConsent: WEEK4_ORANGE_STORY.consentCards,
    },
    result: {
      successLines: WEEK4_ORANGE_STORY.result.successLines,
      failLines: WEEK4_ORANGE_STORY.result.failLines,
    },
  },
  5: {
    interactions: {
      activityRoom: WEEK5_ORANGE_STORY.fatherObservation,
    },
    result: {
      successLines: WEEK5_ORANGE_STORY.result.successLines,
      failLines: WEEK5_ORANGE_STORY.result.failLines,
    },
  },
  6: {
    interactions: {},
    result: { lines: ['第6周橙橙结算剧情占位文本'] },
  },
  7: {
    interactions: {
      activityRoom: WEEK7_ORANGE_STORY.node1,
    },
    result: {
      successLines: [
        ...WEEK7_ORANGE_STORY.node6.introLines,
        ...WEEK7_ORANGE_STORY.node6.successLines,
      ],
      failLines: [
        ...WEEK7_ORANGE_STORY.node6.introLines,
        ...WEEK7_ORANGE_STORY.node6.failLines,
      ],
    },
  },
};

export function getWeeklyOrangeInteraction(week, roomId) {
  return WEEKLY_ORANGE_STORIES[Number(week)]?.interactions?.[roomId] ?? null;
}

export function getWeeklyOrangeResultStory(week) {
  return WEEKLY_ORANGE_STORIES[Number(week)]?.result ?? null;
}
