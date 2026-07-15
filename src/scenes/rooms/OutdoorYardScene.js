import Phaser from 'phaser';
import { normalizeState } from '../../core/GameState.js';
import { FREE_ACTIONS } from '../../data/freeActions.js';
import { preloadRoomBackground, setupRoom, addRoomButtons, shouldPlayWeek6RoomEntry, playWeek6RoomEntry } from './roomHelpers.js';
import AudioManager from '../../systems/AudioManager.js';

export default class OutdoorYardScene extends Phaser.Scene {
  constructor() {
    super('OutdoorYardScene');
  }

  init(data) {
    this.gs = normalizeState(data?.gs);
  }

  preload() {
    preloadRoomBackground(this, 'outdoorYard');
  }

  create() {
    AudioManager.playBgm('daily_bgm');
    setupRoom(this, this.gs, '户外小院', 'outdoorYard');
    if (shouldPlayWeek6RoomEntry(this.gs, 'outdoorYard', this)) {
      playWeek6RoomEntry(this, this.gs, 'outdoorYard', () => {
        addRoomButtons(this, this.gs, FREE_ACTIONS.outdoorYard);
      });
      return;
    }

    addRoomButtons(this, this.gs, FREE_ACTIONS.outdoorYard);
  }
}
