import Phaser from 'phaser';
import { normalizeState } from '../../core/GameState.js';
import { FREE_ACTIONS } from '../../data/freeActions.js';
import { preloadRoomBackground, setupRoom, addRoomButtons } from './roomHelpers.js';
import AudioManager from '../../systems/AudioManager.js';

export default class DiningRoomScene extends Phaser.Scene {
  constructor() {
    super('DiningRoomScene');
  }

  init(data) {
    this.gs = normalizeState(data?.gs);
  }

  preload() {
    preloadRoomBackground(this, 'diningRoom');
  }

  create() {
    AudioManager.playBgm('daily_bgm');
    setupRoom(this, this.gs, '食堂', 'diningRoom');
    addRoomButtons(this, this.gs, FREE_ACTIONS.diningRoom);
  }
}
