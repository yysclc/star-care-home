import Phaser from 'phaser';
import { ASSET_KEYS, ASSET_PATHS, CONTENT_CENTER_X, CONTENT_W, FONT_FAMILY, GAME_W, GAME_H, contentX } from '../core/Constants.js';
import { normalizeState } from '../core/GameState.js';
import { MAP_LOCATIONS } from '../data/mapLocations.js';
import HUD from '../ui/HUD.js';
import ChoicePanel from '../ui/ChoicePanel.js';
import { makeButton, makeContainBackground, makeCoverBackground, makeLabel } from '../ui/widgets.js';
import ResourceManager from '../core/ResourceManager.js';
import AudioManager from '../systems/AudioManager.js';

export default class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  init(data) {
  this.gs = normalizeState(data?.gs);
  this.fromScene = data?.fromScene;
}

  preload() {
    ResourceManager.queueImage(this, ASSET_KEYS.activityPlaceholder, ASSET_PATHS.activityPlaceholder);
    ResourceManager.queueImage(this, ASSET_KEYS.map, ASSET_PATHS.map);
  }

  create() {
    AudioManager.playBgm('daily_bgm');
    // 半透明黑色遮罩，同时吃掉点击，避免点穿到下层场景按钮。
    const blocker = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.7)
      .setDepth(10)
      .setInteractive();

    blocker.on('pointerdown', (_pointer, _localX, _localY, event) => {
      event?.stopPropagation?.();
    });
    
    // 透明 PNG 地图
    if (this.textures.exists(ASSET_KEYS.map)) {
      const mapImage = this.add.image(CONTENT_CENTER_X, GAME_H / 2, ASSET_KEYS.map).setDepth(20);
      // 适当缩放，保持原图比例，不超过屏幕
      const scale = Math.min(CONTENT_W / mapImage.width, GAME_H / mapImage.height) * 0.8;
      mapImage.setScale(scale);
    } else {
      makeLabel(this, GAME_W / 2, 92, '地图图片未找到：请确认 /assets/map.png 存在', {
        fontSize: '22px',
        align: 'center',
        color: '#ffffff',
      }).setOrigin(0.5).setShadow(0, 2, '#000000', 4, true, true).setDepth(30);
    }

    
    this.hud = new HUD(this, this.gs);
    this.choice = new ChoicePanel(this);
    this.drawMapMarkers();
  }

  isUnlocked(location) {
    if (location.alwaysUnlocked) return true;
    return Boolean(this.gs.rooms[location.id]);
  }

  drawMapMarkers() {
    MAP_LOCATIONS.forEach((location) => {
      const unlocked = this.isUnlocked(location);
      if (unlocked) {
        this.makeStarMarker(location);
      } else {
        this.makeLockedMarker(location);
      }
    });

    makeButton(this, contentX(812), 590, 210, 42, '结束这一周', () => {
      const endDay = () => {
        this.gs.dayProgress.phase = 'result';

        if (this.fromScene && this.scene.isActive(this.fromScene)) {
          this.scene.stop(this.fromScene);
        }

        this.scene.start('ResultScene', { gs: this.gs });
      };

      this.choice.show(
        ['确认要结束这一周吗？'],
        [
          { label: '确认结束', action: () => endDay() },
          { label: '再想想', action: () => {} },
        ],
        { y: 350, maxHeight: 420 }
      );
    }, { fontSize: '17px', fill: 0xfffbeb, hover: 0xfef3c7 }).setDepth(60);
  }

  makeStarMarker(location) {
    const star = this.add.text(location.x, location.y, '⭐', {
      fontFamily: FONT_FAMILY,
      fontSize: '32px',
      color: '#ffd166',
      align: 'center',
    }).setOrigin(0.5).setDepth(30);
    star.setShadow(0, 2, '#7c2d12', 4, true, true);

    const label = this.add.text(location.x, location.y + 35, location.displayName, {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#5b3419',
      backgroundColor: 'rgba(255,251,235,0.86)',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(29).setVisible(false);

    const zone = this.add.zone(location.x, location.y, 72, 72).setInteractive({ useHandCursor: true }).setDepth(31);
    zone.on('pointerover', () => {
      label.setVisible(true);
      this.tweens.add({ targets: star, scaleX: 1.18, scaleY: 1.18, duration: 120, ease: 'Sine.easeOut' });
    });
    zone.on('pointerout', () => {
      label.setVisible(false);
      this.tweens.add({ targets: star, scaleX: 1, scaleY: 1, duration: 120, ease: 'Sine.easeOut' });
    });
    zone.on('pointerdown', () => {
  AudioManager.playSfx('sfx_dialog_next', { volume: 0.8 });
  if (location.id === 'office') this.gs.dayProgress.phase = 'free';

  // 如果点的是当前所在场景，只关闭地图浮层
  if (this.fromScene === location.sceneKey) {
    const week6Done = this.gs.dayProgress?.week6RoomEntryDone ?? {};
    if (Number(this.gs.day) === 6 && !week6Done[location.id]) {
      this.scene.stop(location.sceneKey);
      this.scene.start(location.sceneKey, { gs: this.gs });
      return;
    }
    this.scene.stop();
    return;
  }

  // 先停掉打开地图前的底层场景，避免它盖住新场景
  if (this.fromScene && this.scene.isActive(this.fromScene)) {
    this.scene.stop(this.fromScene);
  }

  this.scene.start(location.sceneKey, { gs: this.gs });
});
  }

  makeLockedMarker(location) {
    const bg = this.add.graphics().setDepth(28);
    bg.fillStyle(0x111827, 0.72);
    bg.fillRoundedRect(location.x - 42, location.y - 17, 84, 34, 9);
    bg.lineStyle(1, 0xfff7d6, 0.8);
    bg.strokeRoundedRect(location.x - 42, location.y - 17, 84, 34, 9);

    this.add.text(location.x, location.y, '未解锁', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#fff7d6',
      align: 'center',
    }).setOrigin(0.5).setDepth(29);
  }
}
