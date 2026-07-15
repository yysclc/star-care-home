export const GAME_W = 1138;
export const GAME_H = 640;
export const CONTENT_W = 960;
export const CONTENT_H = 640;
export const CONTENT_OFFSET_X = Math.round((GAME_W - CONTENT_W) / 2);
export const CONTENT_CENTER_X = CONTENT_OFFSET_X + CONTENT_W / 2;

export function contentX(x) {
  return CONTENT_OFFSET_X + x;
}

export const LEGACY_SAVE_KEY = 'star_care_day1_vslice';
export const ACTIVE_SLOT_KEY = 'star_care_active_slot';
export const SAVE_SLOT_COUNT = 5;
export const SAVE_SLOT_KEYS = {
  1: 'star_care_save_slot_1',
  2: 'star_care_save_slot_2',
  3: 'star_care_save_slot_3',
  4: 'star_care_save_slot_4',
  5: 'star_care_save_slot_5',
};



export const COLORS = {
  bg: 0xf7f7f2,
  ink: 0x111111,
  paper: 0xffffff,
  panel: 0xf0f0e8,
  button: 0xffffff,
  buttonHover: 0xe8eefc,
  disabled: 0xd1d5db,
  line: 0x333333,
  modalBg: 0x111827,
  modalLine: 0x9ca3af,
  good: 0x2f855a,
  warn: 0xc05621,
  bad: 0xc53030,
};

export const FONT_FAMILY = '"MaokenZhuyuan", "Microsoft YaHei", "PingFang SC", sans-serif';

export const TEXT_STYLE = {
  fontFamily: FONT_FAMILY,
  color: '#111111',
};

export const ASSET_KEYS = {
  startBg: 'startBg',
  startBgVideo: 'startBgVideo',
  promoVideo: 'promoVideo',
  bedroom: 'bedroom',
  bedroom2: 'bedroom2',
  office: 'officeBg',
  map: 'mapBg',
    activityPlaceholder: 'activityPlaceholder',
    fixedPhaseBg: 'fixedPhaseBg',
    resultBg: 'resultBg',
    orangeResultStoryBg: 'chapter1_office',
    roomBgs: {

    activityRoom: 'bgActivityRoom',
    toyRoom: 'bgToyRoom',
    diningRoom: 'bgDiningRoom',
    outdoorYard: 'bgOutdoorYard',
    paintingRoom: 'bgPaintingRoom',
    library: 'bgLibrary',
    sensoryRoom: 'bgSensoryRoom',
  },
  roomBgsWithOrange: {
    activityRoom: 'bgActivityRoomWithOrange',
    outdoorYard: 'bgOutdoorYardWithOrange',
    paintingRoom: 'bgPaintingRoomWithOrange',
  },
};

export const ASSET_PATHS = {
  startBg: '/assets/start_bg_with_title.png',
  startBgVideo: '/assets/title/cover_loop.mp4',
  promoVideo: '/assets/title/xuanchuanlittle.mp4',
  bedroom: '/assets/bedroom.png',
  bedroom2: '/assets/bedroom2.png',
  office: '/assets/office2.png',
  map: '/assets/map.png',

  // Fallback / legacy placeholder. Keep it because older local projects already have it.
  activityPlaceholder: '/assets/activityroom.png',
  fixedPhaseBg: '/assets/fixed_phase_bg.png',

  // Day-end / weekly result background.
  resultBg: '/assets/daily_result_bg.png',
  orangeResultStoryBg: '/assets/office.png',

  // Room-specific BGs. If your local filenames differ, change only these paths.
  roomBgs: {
    activityRoom: '/assets/activityroom.png',
    toyRoom: '/assets/toyroom.png',
    diningRoom: '/assets/canteen.png',
    outdoorYard: '/assets/outdoor_yard.png',
    paintingRoom: '/assets/painting_room.png',
    library: '/assets/library.png',
    sensoryRoom: '/assets/sensory_room.png',
  },
  roomBgsWithOrange: {
    activityRoom: '/assets/activityroom2.png',
    outdoorYard: '/assets/outdoor_yard2.png',
    paintingRoom: '/assets/painting_room2.png',
  },
};
