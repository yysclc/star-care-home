export const RESOURCE_PACKS = {
  common: {
    next: null,
    images: [
      { key: 'mapBg', path: '/assets/map.png' },
      { key: 'activityPlaceholder', path: '/assets/activityroom.png' },
      { key: 'fixedPhaseBg', path: '/assets/fixed_phase_bg.png' },
      { key: 'resultBg', path: '/assets/daily_result_bg.png' },

      { key: 'bgActivityRoom', path: '/assets/activityroom.png' },
      { key: 'bgActivityRoomWithOrange', path: '/assets/activityroom2.png' },
      { key: 'bgToyRoom', path: '/assets/toyroom.png' },
      { key: 'bgOutdoorYard', path: '/assets/outdoor_yard.png' },
      { key: 'bgOutdoorYardWithOrange', path: '/assets/outdoor_yard2.png' },
      { key: 'bgPaintingRoom', path: '/assets/painting_room.png' },
      { key: 'bgPaintingRoomWithOrange', path: '/assets/painting_room2.png' },
      { key: 'bgLibrary', path: '/assets/library.png' },
      { key: 'bgSensoryRoom', path: '/assets/sensory_room.png' },

      { key: 'portrait_chenlan', path: '/assets/images/characters/chenlan.png' },
      { key: 'portrait_chengcheng', path: '/assets/images/characters/chengcheng.png' },
      { key: 'portrait_chengchengdad', path: '/assets/images/characters/chengchengdad.png' },
      { key: 'portrait_zhoujianing', path: '/assets/images/characters/zhoujianing.png' },
      { key: 'portrait_player_female', path: '/assets/images/characters/player_female.png' },
      { key: 'portrait_player_male', path: '/assets/images/characters/player_male.png' },
    ],
    audio: [
      { key: 'sfx_click', path: '/audio/se/click_final.mp3' },
      { key: 'sfx_dialog_next', path: '/audio/se/dialog_next3.mp3' },
      { key: 'sfx_success', path: '/audio/se/success.mp3' },
      { key: 'sfx_neutral', path: '/audio/se/neutral.mp3' },
      { key: 'sfx_fail', path: '/audio/se/Fail.mp3' },
      { key: 'sfx_construction', path: '/audio/se/construction.mp3' },
    ],
    music: [],
  },

  bgm: {
    images: [],
    audio: [],
    music: [
      { key: 'title_bgm', path: '/audio/bgm/title_bgm.mp3' },
      { key: 'daily_bgm', path: '/audio/bgm/daily_bgm.mp3' },
      { key: 'story_soft_bgm', path: '/audio/bgm/story_soft_bgm.mp3' },
      { key: 'pressure_bgm', path: '/audio/bgm/pressure_bgm.mp3' },
      { key: 'minigame_bgm', path: '/audio/bgm/minigame_bgm.mp3' },
      { key: 'ending_bgm', path: '/audio/bgm/ending_bgm.mp3' },
      { key: 'orange_theme', path: '/audio/bgm/orange_theme.mp3' },
      { key: 'intimate_trust', path: '/audio/bgm/intimate_trust.mp3' },
      { key: 'sensory_storm', path: '/audio/bgm/sensory_room.mp3' },
      { key: 'late_night_decision', path: '/audio/bgm/late_night_decision.mp3' },
      { key: 'first_understanding', path: '/audio/bgm/first_understanding.mp3' },
    ],
  },

  minigameActivityStep: {
    images: [
      { key: 'step_card_01', path: '/assets/minigames/activity_step_cards/step_card_01.png' },
      { key: 'step_card_02', path: '/assets/minigames/activity_step_cards/step_card_02.png' },
      { key: 'step_card_03', path: '/assets/minigames/activity_step_cards/step_card_03.png' },
      { key: 'step_card_04', path: '/assets/minigames/activity_step_cards/step_card_04.png' },
    ],
    audio: [],
    music: [],
  },

  minigameOutdoorAac: {
    images: [
      { key: 'aac_water', path: '/assets/minigames/outdoor_aac/aac_water.png' },
      { key: 'aac_loud', path: '/assets/minigames/outdoor_aac/aac_loud.png' },
      { key: 'aac_rest', path: '/assets/minigames/outdoor_aac/aac_rest.png' },
      { key: 'aac_help', path: '/assets/minigames/outdoor_aac/aac_help.png' },
    ],
    audio: [],
    music: [],
  },

  minigameToyRoom: {
    images: [
      { key: 'toyRoomSprites', path: '/assets/minigames/toyroom/toys.png' },
    ],
    audio: [],
    music: [],
  },

  minigameSensoryBalance: {
    images: [
      { key: 'sensoryChildBalance', path: '/assets/minigames/sensoryroom/child_balance.png' },
      { key: 'sensoryBeamTop', path: '/assets/minigames/sensoryroom/balance_beam_top.png' },
      { key: 'sensoryBeamBase', path: '/assets/minigames/sensoryroom/balance_beam_base.png' },
    ],
    audio: [],
    music: [],
  },

  prologue: {
    next: 'week1',
    images: [
      { key: 'startBg', path: '/assets/start_bg_with_title.png' },
      { key: 'bedroom', path: '/assets/bedroom.png' },
      { key: 'bedroom2', path: '/assets/bedroom2.png' },
    ],
    audio: [],
    music: [],
  },

  week1: {
    next: 'week2',
    images: [
      { key: 'officeBg', path: '/assets/office2.png' },
      { key: 'chapter1_office_corridor', path: '/assets/images/chapter1/office_corridor.png' },
      { key: 'chapter1_activity_room', path: '/assets/images/chapter1/activity_room.png' },
      { key: 'chapter1_office', path: '/assets/office.png' },
      { key: 'table_art', path: '/assets/collections/artwork/table_art.png' },
      { key: 'chenlan_old_photo', path: '/assets/collections/cg/chenlan_old_photo.png' },
    ],
    audio: [],
    music: [],
  },

  week2: {
    next: 'week3',
    images: [
      { key: 'no_sound_art', path: '/assets/collections/artwork/no_sound_art.png' },
    ],
    audio: [],
    music: [],
  },

  week3: {
    next: 'week4',
    images: [
      { key: 'chengcheng_effort_cg', path: '/assets/collections/cg/chengcheng_cg.png' },
      { key: 'two_colors_art', path: '/assets/collections/artwork/two_colors_art.png' },
    ],
    audio: [],
    music: [],
  },

  week4: {
    next: 'week5',
    images: [
      { key: 'back_art', path: '/assets/collections/artwork/back_art.png' },
    ],
    audio: [],
    music: [],
  },

  week5: {
    next: 'week6',
    images: [
      { key: 'two_chairs_art', path: '/assets/collections/artwork/two_chairs_art.png' },
      { key: 'parent_cg', path: '/assets/collections/cg/parent_cg.png' },
    ],
    audio: [],
    music: [],
  },

  week6: {
    next: 'week7',
    images: [
      { key: 'sensory_cg', path: '/assets/collections/cg/sensory_cg.png' },
    ],
    audio: [],
    music: [],
  },
  week7: {
    next: 'ending',
    images: [
      { key: 'door_person_boy_art', path: '/assets/collections/artwork/week7_boy_art.png' },
      { key: 'door_person_girl_art', path: '/assets/collections/artwork/week7_girl_art.png' },
      { key: 'second_person_art', path: '/assets/collections/artwork/second_person_art.png' },
    ],
    audio: [],
    music: [],
  },

  ending: {
    next: null,
    images: [
      { key: 'result_empty', path: '/assets/ending/result_empty.png' },
      { key: 'activityroom_empty', path: '/assets/ending/activityroom_empty.png' },
      { key: 'result_badend', path: '/assets/ending/result_badend.png' },
      { key: 'corridor_new', path: '/assets/ending/corridor_new.png' },
      { key: 'reputation_end_cg', path: '/assets/collections/cg/reputation_end.png' },
      { key: 'communication_end_cg', path: '/assets/collections/cg/communication_end.png' },
      { key: 'chengcheng_end_cg', path: '/assets/collections/cg/chengchengend.png' },
      { key: 'last_end_cg', path: '/assets/collections/cg/last_end.png' },
    ],
    audio: [],
    music: [],
  },
};

export const INITIAL_PACKS = ['common', 'prologue'];
