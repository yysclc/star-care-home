import Phaser from 'phaser';
import { normalizeState } from '../../core/GameState.js';
import { FREE_ACTIONS } from '../../data/freeActions.js';
import { preloadRoomBackground, setupRoom, addRoomButtons, addMapButton, shouldPlayWeek6RoomEntry, playWeek6RoomEntry } from './roomHelpers.js';
import { GAME_W } from '../../core/Constants.js';
import { makeLabel } from '../../ui/widgets.js';
import { WEEK7_ORANGE_STORY } from '../../data/week7OrangeStory.js';
import ResourceManager from '../../core/ResourceManager.js';
import AudioManager from '../../systems/AudioManager.js';

export default class SensoryRoomScene extends Phaser.Scene {
  constructor() {
    super('SensoryRoomScene');
  }

  init(data) {
    this.gs = normalizeState(data?.gs);
  }

  preload() {
    preloadRoomBackground(this, 'sensoryRoom');
    ResourceManager.queueImage(this, 'sensory_cg', '/assets/collections/cg/sensory_cg.png');
  }

  create() {
    AudioManager.playBgm('daily_bgm');
    setupRoom(this, this.gs, '感统室', 'sensoryRoom');

    if (!this.gs.rooms.sensoryRoom) {
      this.showLocked();
      return;
    }

    if (this.shouldPlayWeek7SensoryNode()) {
      this.playWeek7SensoryNode();
      return;
    }

    if (shouldPlayWeek6RoomEntry(this.gs, 'sensoryRoom', this)) {
      playWeek6RoomEntry(this, this.gs, 'sensoryRoom', () => {
        addRoomButtons(this, this.gs, FREE_ACTIONS.sensoryRoom);
      });
      return;
    }

    addRoomButtons(this, this.gs, FREE_ACTIONS.sensoryRoom);
  }

  shouldPlayWeek7SensoryNode() {
    return this.gs.day === 7
      && this.gs.orange?.flags?.week7_library_first_done
      && !this.gs.orange?.flags?.week7_sensory_room_done;
  }

  playWeek7SensoryNode() {
    this.story.play([{ type: 'dialog', lines: WEEK7_ORANGE_STORY.node4.lines }], () => {
      this.gs.orange.flags.week7_sensory_room_done = true;
      this.hud.update(this.gs);
      addRoomButtons(this, this.gs, FREE_ACTIONS.sensoryRoom);
    });
  }

  showLocked() {
    makeLabel(this, GAME_W / 2, 245, '尚未开放：请先回办公室，用电脑修建感统室。', {
      fontSize: '22px', align: 'center', color: '#ffffff', wordWrap: { width: 650 },
    }).setOrigin(0.5).setShadow(0, 2, '#000000', 4, true, true);

    addMapButton(this, this.gs);
  }
}
