import Phaser from 'phaser';
import { ASSET_KEYS, FONT_FAMILY, GAME_H, GAME_W } from '../core/Constants.js';
import ResourceManager from '../core/ResourceManager.js';
import { INITIAL_PACKS } from '../data/resourcePacks.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // 第一步：只加载 startBg，加载完再搭 UI
    ResourceManager.queueImage(this, ASSET_KEYS.startBg, '/assets/start_bg_with_title.png');

    // startBg 加载完（或已存在）后，搭建含背景图的 UI，再加载其余资源
    this.load.once('complete', () => {
      this._setupLoadingUI();
      this._loadRemainingAssets();
    });
  }

  create() {
    // 跳转由 _loadRemainingAssets 的 complete 事件负责；
    // 若 startBg 已缓存、remaining 也全部已缓存，则此处保底跳转。
    if (!this._pctText) {
      const splash = document.getElementById('boot-splash');
      if (splash) {
        splash.classList.add('fade-out');
        splash.addEventListener('transitionend', () => splash.remove(), { once: true });
      }
      void this._startInitialScene();
    }
  }

  // ─── 私有：搭建加载 UI ───────────────────────────────────

  _setupLoadingUI() {
    // 淡出并移除 DOM 启动占位画面
    const splash = document.getElementById('boot-splash');
    if (splash) {
      splash.classList.add('fade-out');
      splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    }

    // 铺 startBg 背景图（等比缩放覆盖画布，与 StartScene 保持一致）
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, ASSET_KEYS.startBg);
    const scale = Math.max(GAME_W / bg.width, GAME_H / bg.height);
    bg.setScale(scale);

    const BAR_W = 480;
    const BAR_H = 18;
    const BAR_X = GAME_W / 2 - BAR_W / 2;
    const BAR_Y = GAME_H * 0.82;

    // 进度条背景
    this._barBg = this.add.graphics();
    this._barBg.fillStyle(0x000000, 0.45);
    this._barBg.fillRoundedRect(BAR_X - 4, BAR_Y - 4, BAR_W + 8, BAR_H + 8, (BAR_H + 8) / 2);
    this._barBg.fillStyle(0x334155, 1);
    this._barBg.fillRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, BAR_H / 2);

    // 进度条填充
    this._barFill = this.add.graphics();

    // 百分比文字
    this._pctText = this.add.text(GAME_W / 2, BAR_Y + BAR_H + 14, '0%', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this._barW = BAR_W;
    this._barH = BAR_H;
    this._barX = BAR_X;
    this._barY = BAR_Y;
  }

  _loadRemainingAssets() {
    // 用 ResourceManager 依序加载 INITIAL_PACKS（common → prologue）
    const loadNext = (index) => {
      if (index >= INITIAL_PACKS.length) {
        this._updateProgress(1);
        ResourceManager.loadPack(this, 'bgm', { silent: true });
        this.time.delayedCall(200, () => void this._startInitialScene());
        return;
      }
      const packName = INITIAL_PACKS[index];
      ResourceManager.loadPack(this, packName, {
        onProgress: (v) => {
          // 将各包进度映射到整体进度区间
          const base = index / INITIAL_PACKS.length;
          const span = 1 / INITIAL_PACKS.length;
          this._updateProgress(base + v * span);
        },
        onComplete: () => loadNext(index + 1),
      });
    };

    loadNext(0);
  }

  async _startInitialScene() {
    if (this._initialSceneStarted) return;
    this._initialSceneStarted = true;

    const params = new URLSearchParams(window.location.search);
    if (import.meta.env.DEV && params.has('parentAiTest')) {
      try {
        const { createParentAiIntegrationFixture, DEFAULT_PARENT_AI_TEST_OUTCOME_ID } = await import(
          '../debug/parentAiIntegrationFixture.js'
        );
        const outcomeId = params.get('parentAiTest') || DEFAULT_PARENT_AI_TEST_OUTCOME_ID;
        const gs = createParentAiIntegrationFixture(outcomeId);
        this.scene.start('OfficeScene', { gs });
        return;
      } catch (error) {
        console.error('Unable to start Parent AI integration fixture.', error);
      }
    }

    this.scene.start('StartScene');
  }

  _updateProgress(value) {
    const filled = Math.floor(this._barW * value);
    this._barFill.clear();
    if (filled > 0) {
      this._barFill.fillStyle(0xfbbf24, 1);
      this._barFill.fillRoundedRect(
        this._barX, this._barY,
        filled, this._barH,
        this._barH / 2
      );
    }
    this._pctText.setText(`${Math.round(value * 100)}%`);
  }
}
