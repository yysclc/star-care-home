import Phaser from 'phaser';
import { normalizeState } from '../../core/GameState.js';
import { FREE_ACTIONS } from '../../data/freeActions.js';
import { preloadRoomBackground, setupRoom, addRoomButtons, shouldPlayWeek6RoomEntry, playWeek6RoomEntry } from './roomHelpers.js';
import AudioManager from '../../systems/AudioManager.js';

export default class ToyRoomScene extends Phaser.Scene {
  constructor() {
    super('ToyRoomScene');
  }

  init(data) {
    this.gs = normalizeState(data?.gs);
  }

  preload() {
    preloadRoomBackground(this, 'toyRoom');
  }

  create() {
    AudioManager.playBgm('daily_bgm');
    setupRoom(this, this.gs, '玩具室', 'toyRoom');
    if (shouldPlayWeek6RoomEntry(this.gs, 'toyRoom', this)) {
      playWeek6RoomEntry(this, this.gs, 'toyRoom', () => {
        addRoomButtons(this, this.gs, FREE_ACTIONS.toyRoom);
      });
      return;
    }

    addRoomButtons(this, this.gs, FREE_ACTIONS.toyRoom);
  }
}
