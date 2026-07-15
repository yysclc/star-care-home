import Phaser from 'phaser';
import './style.css';
import { GAME_H, GAME_W } from './core/Constants.js';
import { installPhaserTextLocalization, refreshSceneLanguage } from './i18n/language.js';

import PreloadScene from './scenes/PreloadScene.js';
import StartScene from './scenes/StartScene.js';
import SocialValueIntroScene from './scenes/SocialValueIntroScene.js';
import PrologueScene from './scenes/PrologueScene.js';
import OfficeScene from './scenes/OfficeScene.js';
import FixedActionScene from './scenes/FixedActionScene.js';
import PaintingSensoryScene from './scenes/minigames/PaintingSensoryScene.js';
import ActivityStepPuzzleScene from './scenes/minigames/ActivityStepPuzzleScene.js';
import ToyRoomJointAttentionScene from './scenes/minigames/ToyRoomJointAttentionScene.js';
import OutdoorAACScene from './scenes/minigames/OutdoorAACScene.js';
import LibraryOddWordScene from './scenes/minigames/LibraryOddWordScene.js';
import SensoryBalanceScene from './scenes/minigames/SensoryBalanceScene.js';
import MapScene from './scenes/MapScene.js';
import ResultScene from './scenes/ResultScene.js';
import ASDMuseumScene from './scenes/ASDMuseumScene.js';

import ActivityRoomScene from './scenes/rooms/ActivityRoomScene.js';
import ToyRoomScene from './scenes/rooms/ToyRoomScene.js';
import DiningRoomScene from './scenes/rooms/DiningRoomScene.js';
import OutdoorYardScene from './scenes/rooms/OutdoorYardScene.js';
import PaintingRoomScene from './scenes/rooms/PaintingRoomScene.js';
import LibraryScene from './scenes/rooms/LibraryScene.js';
import SensoryRoomScene from './scenes/rooms/SensoryRoomScene.js';
import CollectionScene from './scenes/CollectionScene.js';
import AudioManager from './systems/AudioManager.js';

installPhaserTextLocalization(Phaser);

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#020816',
  parent: 'game-container',
  dom: {
    createContainer: true,
  },
  audio: {
    disableWebAudio: false,
    noAudio: false,
  },
  scene: [
    PreloadScene,
    StartScene,
    SocialValueIntroScene,
    PrologueScene,
    OfficeScene,
    FixedActionScene,
    PaintingSensoryScene,
    ActivityStepPuzzleScene,
    ToyRoomJointAttentionScene,
    OutdoorAACScene,
    LibraryOddWordScene,
    SensoryBalanceScene,
    MapScene,
    ActivityRoomScene,
    ToyRoomScene,
    DiningRoomScene,
    OutdoorYardScene,
    PaintingRoomScene,
    LibraryScene,
    SensoryRoomScene,
    CollectionScene,
    ASDMuseumScene,
    ResultScene,
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

function waitForBootClick() {
  const splash = document.getElementById('boot-splash');
  if (!splash) return Promise.resolve();

  return new Promise((resolve) => {
    const enter = (event) => {
      if (event?.target?.closest?.('#boot-language-toggle')) return;
      splash.removeEventListener('pointerdown', enter);
      window.removeEventListener('keydown', enter);
      splash.classList.add('fade-out');
      window.setTimeout(() => splash.remove(), 520);
      resolve();
    };
    splash.addEventListener('pointerdown', enter);
    window.addEventListener('keydown', enter);
  });
}

async function startGame() {
  await document.fonts.load('24px "MaokenZhuyuan"');
  await document.fonts.ready;
  AudioManager.init();
  await waitForBootClick();
  AudioManager.playBgm('title_bgm', { fadeMs: 800 });
  const game = new Phaser.Game(config);
  AudioManager.init(game);
  window.addEventListener('starcare:language-change', () => {
    game.scene.scenes.forEach((scene) => refreshSceneLanguage(scene));
  });
}

startGame();
