import Phaser from 'phaser';
import { ASSET_KEYS, ASSET_PATHS, GAME_H, GAME_W, SAVE_SLOT_COUNT, SAVE_SLOT_KEYS, contentX } from '../core/Constants.js';
import { createFreshState, getCurrentWeek, loadState, resolveResumeScene } from '../core/GameState.js';
import { makeCoverBackground, makeStartButton } from '../ui/widgets.js';
import SaveSlotPanel from '../ui/SaveSlotPanel.js';
import ResourceManager from '../core/ResourceManager.js';
import AudioManager from '../systems/AudioManager.js';

// ── 轻量摘要读取（不调用 loadState，无副作用） ──────────────────────
function readSlotSummary(slot) {
  try {
    const raw = localStorage.getItem(SAVE_SLOT_KEYS[slot]);
    if (!raw) return { slot, empty: true };
    const parsed = JSON.parse(raw);
    const meta  = parsed?.meta  ?? {};
    const state = parsed?.state ?? parsed ?? {};
    return {
      slot,
      empty: false,
      week: getCurrentWeek(state, Number(meta.week) || undefined),
      savedAt: meta.savedAt ?? null,
    };
  } catch {
    return { slot, empty: true };
  }
}

function buildSlots() {
  const result = [];
  for (let i = 1; i <= SAVE_SLOT_COUNT; i++) result.push(readSlotSummary(i));
  return result;
}

// ── StartScene ────────────────────────────────────────────────────────
export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
  }

  preload() {
    ResourceManager.queueImage(this, ASSET_KEYS.startBg, ASSET_PATHS.startBg);
    this.load.video(ASSET_KEYS.startBgVideo, ASSET_PATHS.startBgVideo, 'loadeddata', false, true);
    this.load.video(ASSET_KEYS.promoVideo, ASSET_PATHS.promoVideo, 'loadeddata', false, true);
    ResourceManager.loadPack(this, 'bgm', { silent: true });
  }

  create() {
    AudioManager.playBgm('title_bgm');
    makeCoverBackground(this, ASSET_KEYS.startBg, 0.02);
    this._makeCoverVideo();

    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x020816, 0x020816, 0x020816, 0x020816, 0.20, 0.02, 0.30, 0.08);
    vignette.fillRect(0, 0, GAME_W, GAME_H);

    if (this.registry.get('promoPromptSeen')) {
      this._showStartMenu();
      return;
    }

    this.registry.set('promoPromptSeen', true);
    this._showPromoPrompt();
  }

  _showStartMenu() {
    const startX = contentX(188);
    const firstButtonY = 332;
    const buttonGap = 66;

    const showTip = (message) => {
      const tip = this.add.text(GAME_W / 2, firstButtonY + buttonGap * 4 + 16, message, {
        fontSize: '20px',
        color: '#fff5d6',
        align: 'center',
      }).setOrigin(0.5).setDepth(30);
      this.time.delayedCall(1800, () => { tip.destroy(); });
    };

    // ── 开始游戏：直接新开，完全不碰 localStorage ─────────────
    makeStartButton(this, startX, firstButtonY, 255, 58, '开始游戏', () => {
      const gs = createFreshState(); // 纯内存新档，不写任何 slot
      this.scene.start('SocialValueIntroScene', { gs });
    }, { primary: true });

    // ── 读取存档：弹三档选择面板 ──────────────────────────────
    makeStartButton(this, startX, firstButtonY + buttonGap, 255, 58, '读取存档', () => {
      this._openLoadPanel(showTip);
    }, { primary: true });

    // ── 收集图鉴：打开收集场景 ──────────────────────────────
    makeStartButton(this, startX, firstButtonY + buttonGap * 2, 255, 58, '收集图鉴', () => {
      this.scene.launch('CollectionScene', { gs: null, fromScene: 'StartScene', theme: 'start' });
      this.scene.bringToTop('CollectionScene');
    }, { primary: true });

    makeStartButton(this, startX, firstButtonY + buttonGap * 3, 255, 58, 'ASD 资料馆', () => {
      this.scene.start('ASDMuseumScene', { fromScene: 'StartScene', theme: 'start' });
    }, { primary: true });
  }

  _showPromoPrompt() {
    const prompt = this.add.container(0, 0).setDepth(20);

    const title = this.add.text(GAME_W / 2, 322, '是否播放宣传视频？', {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '31px',
      color: '#fff3c7',
      align: 'center',
    }).setOrigin(0.5);
    title.setShadow(0, 2, '#2a1604', 6, true, true);

    const note = this.add.text(GAME_W / 2, 362, '视频可能需要加载一会儿；手机端如无法播放，可直接跳过', {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '19px',
      color: '#fff5d6',
      align: 'center',
    }).setOrigin(0.5);
    note.setShadow(0, 2, '#1b1020', 4, true, true);

    const playButton = makeStartButton(this, GAME_W / 2 - 150, 430, 220, 58, '播放视频', () => {
      prompt.destroy();
      this._playPromoVideo();
    }, { primary: true });

    const skipButton = makeStartButton(this, GAME_W / 2 + 150, 430, 220, 58, '跳过', () => {
      prompt.destroy();
      this._showStartMenu();
    }, { primary: true });

    prompt.add([title, note, playButton, skipButton]);
  }

  _playPromoVideo() {
    if (typeof document !== 'undefined') {
      this._playPromoVideoDom();
      return;
    }

    if (!this.cache.video.exists(ASSET_KEYS.promoVideo)) {
      const loadingText = this.add.text(GAME_W / 2, 410, '视频加载中，请稍候...', {
        fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
        fontSize: '22px',
        color: '#fff5d6',
        align: 'center',
      }).setOrigin(0.5).setDepth(100);
      loadingText.setShadow(0, 2, '#1b1020', 4, true, true);

      this.load.video(ASSET_KEYS.promoVideo, ASSET_PATHS.promoVideo, 'loadeddata', false, true);
      this.load.once('complete', () => {
        loadingText.destroy();
        if (this.cache.video.exists(ASSET_KEYS.promoVideo)) {
          this._showPromoPrompt();
        } else {
          this._showStartMenu();
        }
      });
      this.load.once(`loaderror-${ASSET_KEYS.promoVideo}`, () => {
        loadingText.destroy();
        this._showStartMenu();
      });
      this.load.start();
      return;
    }

    AudioManager.stopBgm({ fadeMs: 180 });

    const layer = this.add.container(0, 0).setDepth(100);
    const shade = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 1)
      .setInteractive();
    const video = this.add.video(GAME_W / 2, GAME_H / 2, ASSET_KEYS.promoVideo).setOrigin(0.5);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      video.stop();
      layer.destroy();
      AudioManager.playBgm('title_bgm');
      this._showStartMenu();
    };

    const fitVideo = () => {
      const source = video.video;
      const sourceW = source?.videoWidth || video.width || GAME_W;
      const sourceH = source?.videoHeight || video.height || GAME_H;
      const scale = Math.min(GAME_W / sourceW, GAME_H / sourceH);
      video.setScale(scale);
    };

    const skipButton = makeStartButton(this, GAME_W - 94, GAME_H - 48, 140, 46, '跳过', finish, {
      primary: true,
      fontSize: '20px',
    });

    layer.add([shade, video, skipButton]);

    fitVideo();
    const source = video.video;
    if (source) {
      source.playsInline = true;
      source.setAttribute('playsinline', '');
      source.setAttribute('webkit-playsinline', '');
      source.setAttribute('x5-playsinline', '');
    }
    video.setLoop(false);
    video.setMute(false);
    video.once('play', fitVideo);
    video.once('complete', finish);
    video.once('error', finish);
    this.time.delayedCall(1600, () => {
      if (finished) return;
      const activeSource = video.video;
      if (activeSource && activeSource.paused && activeSource.currentTime <= 0.05) finish();
    });
    try {
      video.play(false);
    } catch {
      finish();
    }
  }

  _getCanvasRect() {
    const canvas = this.game?.canvas;
    const rect = canvas?.getBoundingClientRect?.();
    if (rect?.width && rect?.height) return rect;

    const container = document.getElementById('game-container');
    const containerRect = container?.getBoundingClientRect?.();
    if (containerRect?.width && containerRect?.height) return containerRect;

    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  _playPromoVideoDom() {
    AudioManager.stopBgm({ fadeMs: 180 });

    const rect = this._getCanvasRect();
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.zIndex = '100000';
    overlay.style.background = '#000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.overflow = 'hidden';
    overlay.style.touchAction = 'none';

    const video = document.createElement('video');
    video.src = ASSET_PATHS.promoVideo;
    video.preload = 'auto';
    video.controls = false;
    video.autoplay = false;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x5-playsinline', '');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.background = '#000';

    const makeButton = (label) => {
      const button = document.createElement('button');
      button.textContent = label;
      button.style.border = '2px solid #d3a269';
      button.style.borderRadius = '999px';
      button.style.background = 'rgba(255, 246, 224, 0.94)';
      button.style.color = '#6b3f1d';
      button.style.fontFamily = '"MaokenZhuyuan", "Microsoft YaHei", sans-serif';
      button.style.cursor = 'pointer';
      return button;
    };

    const skip = makeButton('跳过');
    skip.style.position = 'absolute';
    skip.style.right = '18px';
    skip.style.bottom = '18px';
    skip.style.minWidth = '96px';
    skip.style.height = '42px';
    skip.style.fontSize = '20px';

    const replay = makeButton('点击播放');
    replay.style.position = 'absolute';
    replay.style.left = '50%';
    replay.style.top = '50%';
    replay.style.transform = 'translate(-50%, -50%)';
    replay.style.minWidth = '150px';
    replay.style.height = '52px';
    replay.style.fontSize = '22px';
    replay.style.display = 'none';

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {
        // Ignore browser video cleanup failures.
      }
      overlay.remove();
      AudioManager.playBgm('title_bgm');
      this._showStartMenu();
    };

    const tryPlay = () => {
      replay.style.display = 'none';
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {
          if (!finished) replay.style.display = 'block';
        });
      }
    };

    skip.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      finish();
    });
    replay.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      tryPlay();
    });
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    window.addEventListener('resize', finish, { once: true });
    window.addEventListener('orientationchange', finish, { once: true });

    overlay.append(video, skip, replay);
    document.body.appendChild(overlay);
    tryPlay();
  }

  _makeCoverVideo() {
    if (!this.cache.video.exists(ASSET_KEYS.startBgVideo)) return null;

    const video = this.add.video(GAME_W / 2, GAME_H / 2, ASSET_KEYS.startBgVideo)
      .setOrigin(0.5)
      .setDepth(0);

    const fitVideo = () => {
      const source = video.video;
      const sourceW = source?.videoWidth || video.width || GAME_W;
      const sourceH = source?.videoHeight || video.height || GAME_H;
      const scale = Math.max(GAME_W / sourceW, GAME_H / sourceH);
      video.setScale(scale);
    };

    fitVideo();
    const source = video.video;
    if (source) {
      source.playsInline = true;
      source.setAttribute('playsinline', '');
      source.setAttribute('webkit-playsinline', '');
      source.setAttribute('x5-playsinline', '');
    }
    video.setMute(true);
    video.setLoop(true);
    try {
      video.play(true);
    } catch {
      video.destroy();
      return null;
    }
    video.once('play', fitVideo);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      video.stop();
    });

    return video;
  }

  // ── 读取存档：弹槽位选择 ──────────────────────────────────────────
  _showLoadOverlay(text = '正在进入照护所...') {
  const w = this.scale.width;
  const h = this.scale.height;

  this._loadOverlay?.destroy();

  const c = this.add.container(0, 0).setDepth(9999);

  const shade = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.25);

  const panel = this.add.rectangle(w / 2, h / 2, 360, 86, 0x1f2937, 0.82)
    .setStrokeStyle(2, 0xffffff, 0.35);

  const label = this.add.text(w / 2, h / 2, text, {
    fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
    fontSize: '20px',
    color: '#ffffff',
  }).setOrigin(0.5);

  c.add([shade, panel, label]);
  this._loadOverlay = c;
  return c;
}

_hideLoadOverlay() {
  this._loadOverlay?.destroy();
  this._loadOverlay = null;
}
  _openLoadPanel(showTip) {
    const panel = new SaveSlotPanel(this);
    const slots = buildSlots();

    panel.show({
      title: '选择读档位',
      slots,
      mode: 'load',
      theme: 'start',
      onClose: () => {},
      onSelect: (slotInfo) => {
        if (slotInfo.empty) {
          showTip('这个档位还没有存档。');
          return;
        }
        const gs = loadState(slotInfo.slot); // 设置 activeSlot 并读取
if (!gs) {
  showTip('读取失败，存档可能已损坏。');
  return;
}

const targetScene = resolveResumeScene(gs);

if (targetScene === 'PrologueScene') {
  this.scene.start(targetScene, { gs });
  return;
}

const week =
  getCurrentWeek(gs);

const packName = ResourceManager.getPackNameForWeek
  ? ResourceManager.getPackNameForWeek(week)
  : `week${week}`;

this._showLoadOverlay('正在进入照护所...');

ResourceManager.loadPack(this, packName, { silent: true })
  .catch(() => {
    // 加载失败也继续进入，后面由 StoryBackgroundController 占位兜底
  })
  .finally(() => {
    this._hideLoadOverlay();
    this.scene.start(targetScene, { gs });
  });
      },
    });
  }
}
