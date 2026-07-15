import Phaser from 'phaser';
import { applyEffects, normalizeState } from '../../core/GameState.js';
import { FREE_ACTIONS } from '../../data/freeActions.js';
import { preloadRoomBackground, setupRoom, addRoomButtons, addMapButton, shouldPlayWeek6RoomEntry, playWeek6RoomEntry } from './roomHelpers.js';
import { GAME_W } from '../../core/Constants.js';
import { makeLabel } from '../../ui/widgets.js';
import { WEEK3_ORANGE_STORY } from '../../data/week3OrangeStory.js';
import { WEEK7_ORANGE_STORY } from '../../data/week7OrangeStory.js';
import { unlockGlobalCollection } from '../../data/collections.js';
import ResourceManager from '../../core/ResourceManager.js';
import AudioManager from '../../systems/AudioManager.js';

export default class LibraryScene extends Phaser.Scene {
  constructor() {
    super('LibraryScene');
  }

  init(data) {
    this.gs = normalizeState(data?.gs);
  }

  preload() {
    preloadRoomBackground(this, 'library');
    ResourceManager.queueImage(this, 'door_person_boy_art', '/assets/collections/artwork/week7_boy_art.png');
    ResourceManager.queueImage(this, 'door_person_girl_art', '/assets/collections/artwork/week7_girl_art.png');
  }

  create() {
    AudioManager.playBgm('daily_bgm');
    setupRoom(this, this.gs, '图书室', 'library');

    if (!this.gs.rooms.library) {
      this.showLocked();
      return;
    }

    if (this.shouldPlayWeek3BookChoice()) {
      this.playWeek3BookChoice();
      return;
    }

    if (this.shouldPlayWeek7LibraryFirstNode()) {
      this.playWeek7LibraryFirstNode();
      return;
    }

    if (this.shouldPlayWeek7LibraryFinalNode()) {
      this.playWeek7LibraryFinalNode();
      return;
    }

    if (shouldPlayWeek6RoomEntry(this.gs, 'library', this)) {
      playWeek6RoomEntry(this, this.gs, 'library', () => {
        addRoomButtons(this, this.gs, FREE_ACTIONS.library);
      });
      return;
    }

    addRoomButtons(this, this.gs, FREE_ACTIONS.library);
  }

  shouldPlayWeek3BookChoice() {
    return this.gs.day === 3
      && this.gs.orange?.flags?.week3_paper_choice === 'limited_choice'
      && !this.gs.orange?.flags?.week3_book_choice_done;
  }

  playWeek3BookChoice() {
    const story = WEEK3_ORANGE_STORY.bookChoice;
    this.story.play([{ type: 'dialog', lines: story.lines }], () => {
      this.choice.showVNChoice(
        ['你现在要怎么做？'],
        story.choices.map((choice) => ({
          label: choice.label,
          action: () => this.resolveWeek3BookChoice(choice),
        })),
        {
          choiceWidth: 760,
          choiceHeight: 48,
          choiceGap: 14,
          choiceStartY: 260,
          choiceFontSize: '17px',
        }
      );
    });
  }

  resolveWeek3BookChoice(choice) {
    const changes = applyEffects(this.gs, { 'orange.affection': choice.affectionDelta ?? 0 });
    this.gs.orange.flags.week3_book_choice_done = true;
    this.gs.orange.flags.week3_book_choice = choice.id;
    this.hud.update(this.gs);

    const changeLines = changes
      .filter((change) => change.delta !== 0)
      .map((change) => `橙橙好感值 ${change.delta > 0 ? '+' : ''}${change.delta}`);

    const afterChoiceLines = WEEK3_ORANGE_STORY.bookChoice.afterChoiceLines ?? [];
    this.story.play([{ type: 'dialog', lines: [...choice.resultLines, ...changeLines, ...afterChoiceLines] }], () => {
      addRoomButtons(this, this.gs, FREE_ACTIONS.library);
    });
  }

  shouldPlayWeek7LibraryFirstNode() {
    return this.gs.day === 7
      && this.gs.orange?.flags?.week7_painting_room_done
      && !this.gs.orange?.flags?.week7_library_first_done;
  }

  playWeek7LibraryFirstNode() {
    this.story.play([{ type: 'dialog', lines: WEEK7_ORANGE_STORY.node3.lines }], () => {
      this.gs.orange.flags.week7_library_first_done = true;
      this.hud.update(this.gs);
      addRoomButtons(this, this.gs, FREE_ACTIONS.library);
    });
  }

  shouldPlayWeek7LibraryFinalNode() {
    return this.gs.day === 7
      && this.gs.orange?.flags?.week7_sensory_room_done
      && !this.gs.orange?.flags?.week7_library_final_done;
  }

  playWeek7LibraryFinalNode() {
    const isMale = this.gs.player?.gender === 'male';
    const artId = isMale ? 'door_person_boy_art' : 'door_person_girl_art';
    const otherArtId = isMale ? 'door_person_girl_art' : 'door_person_boy_art';
    const variantLines = isMale
      ? WEEK7_ORANGE_STORY.node5.maleLines
      : WEEK7_ORANGE_STORY.node5.femaleLines;

    this.story.play([{ type: 'dialog', lines: [
      ...WEEK7_ORANGE_STORY.node5.lines,
      `__BG:${artId}__`,
      ...variantLines,
      '获得孩子画作：《门边的人》（可在收集系统查看）。',
      '另一种主角版本的《门边的人》也已同步收录，不需要重新游玩。',
      `__COLLECT:${artId}__`,
      `__COLLECT:${otherArtId}__`,
      '__BG:bgLibrary__',
    ] }], () => {
      this.gs.orange.flags.week7_library_final_done = true;
      this.gs.orange.flags.week7_door_person_art_obtained = true;
      this.gs.orange.flags.week7_door_person_art_variant = isMale ? 'male' : 'female';
      this.gs.collections.items[artId] = true;
      this.gs.collections.items[otherArtId] = true;
      unlockGlobalCollection(artId);
      unlockGlobalCollection(otherArtId);
      this.hud.update(this.gs);
      addRoomButtons(this, this.gs, FREE_ACTIONS.library);
    });
  }

  showLocked() {
    makeLabel(this, GAME_W / 2, 245, '尚未开放：请先回办公室，用电脑修建图书室。', {
      fontSize: '22px', align: 'center', color: '#ffffff', wordWrap: { width: 650 },
    }).setOrigin(0.5).setShadow(0, 2, '#000000', 4, true, true);

    addMapButton(this, this.gs);
  }
}
