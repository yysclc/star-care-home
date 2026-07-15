import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../../core/Constants.js';
import ResourceManager from '../../core/ResourceManager.js';

const THEME = {
  overlay: 0x6b4426,
  panel: 0xfff3d2,
  panelLight: 0xffffeb,
  stroke: 0x9a6a3a,
  strokeDark: 0x6b3f1f,
  text: '#5b3419',
  subText: '#7a4a25',
  cream: 0xfffbeb,
  button: 0xffe7aa,
  buttonHover: 0xffd980,
  displayArea: 0xfff8ee,
  mask: 0xfffdf5,
};

const SPRITE_KEY = 'toyRoomSprites';
const SPRITE_PATH = '/assets/minigames/toyroom/toys.png';

const GRID_COLS = 4;
const GRID_ROWS = 4;
const TOY_COUNT = GRID_COLS * GRID_ROWS;

const TOTAL_ROUNDS = 4;
const EARLY_BASE_TOY_COUNT = 4; // 第 1-2 轮：4 → 5
const LATE_BASE_TOY_COUNT = 5;  // 第 3-4 轮：5 → 6

const OBSERVE_DURATION = 3000;
const MASK_DURATION = 300;
const CLICK_TIMEOUT = 8000;

const TOY_DISPLAY_SIZE = 96;
const TOY_MIN_DISTANCE = 122;

const CORRECT_LINES = [
  '你注意到了新来的玩具——孩子正在看它。',
  '你跟上了孩子的目光，这就是共同注意的起点。',
  '你找到了孩子关注的东西，很好！',
  '先看见孩子在看什么，再从那里开始。',
  '孩子的注意力就是邀请，你接住了。',
];

const WRONG_LINES = [
  '没关系，继续观察孩子正在注意什么。',
  '这一次没有跟上，下一轮再试试。',
  '共同注意需要慢慢练习，先看见孩子看哪里。',
];

const TIMEOUT_LINES = [
  '时间到，看看下一轮。',
  '这次没有来得及发现新玩具，继续练习。',
  '慢慢来，先观察，再加入孩子的兴趣。',
];

const RESULT_TEXT = {
  success: {
    title: '做得很好！',
    body: '你有 {n} 次准确跟上了孩子的目光。\n\n共同注意不是把孩子的脸转向你，\n而是先发现孩子正在关注什么，\n再顺着那个东西，轻轻加入他的世界。',
  },
  normal: {
    title: '还不错',
    body: '你有 {n} 次跟上了孩子的目光。\n\n有些时候你已经能发现孩子关注的物件。\n继续练习"先看见，再加入"，孩子会更容易回应。',
  },
  fail: {
    title: '继续练习',
    body: '这次只有 {n} 次跟上了孩子的目光。\n\n没关系——共同注意需要慢慢培养感觉。\n关键是：先看见孩子正在关注什么，\n再从那里开始，而不是强迫孩子看你。',
  },
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default class ToyRoomJointAttentionScene extends Phaser.Scene {
  constructor() {
    super('ToyRoomJointAttentionScene');
  }

  init(data = {}) {
    this.roomId = data.roomId ?? 'toyRoom';
    this.returnSceneKey = data.returnSceneKey ?? 'FixedActionScene';

    this.correctCount = 0;
    this.currentRound = 0;

    this._baseIndices = [];
    this._newToyIndex = null;

    this._timers = [];
    this.overlay = null;
    this.ui = null;
    this._framesReady = false;
  }

  preload() {
    ResourceManager.loadPack(this, 'minigameToyRoom', { silent: true });
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    this.overlay = this.add.container(0, 0).setDepth(1000);

    const blocker = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, THEME.overlay, 0.42)
      .setInteractive();

    blocker.on('pointerdown', (_p, _lx, _ly, event) => {
      event?.stopPropagation?.();
    });

    this.overlay.add(blocker);

    this.panelW = Math.min(720, GAME_W - 72);
    this.panelH = 580;
    this.panelX = (GAME_W - this.panelW) / 2;
    this.panelY = (GAME_H - this.panelH) / 2;

    const panel = this.add.graphics();
    panel.fillStyle(THEME.panel, 1);
    panel.fillRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 24);
    panel.lineStyle(4, THEME.stroke, 1);
    panel.strokeRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 24);
    panel.fillStyle(THEME.panelLight, 0.55);
    panel.fillRoundedRect(this.panelX + 16, this.panelY + 16, this.panelW - 32, 58, 18);
    this.overlay.add(panel);

    this.ui = this.add.container(0, 0);
    this.overlay.add(this.ui);

    this.events.once('shutdown', this._cleanup, this);

    this._framesReady = this._ensureFrames();
    this.showIntro();
  }

  _ensureFrames() {
    const tex = this.textures.get(SPRITE_KEY);
    if (!tex) return false;

    const src = tex.getSourceImage?.();
    if (!src?.width || !src?.height) return false;

    const frameW = Math.floor(src.width / GRID_COLS);
    const frameH = Math.floor(src.height / GRID_ROWS);

    if (frameW <= 0 || frameH <= 0) return false;

    for (let i = 0; i < TOY_COUNT; i += 1) {
      const frameName = `toy_${i}`;

      if (typeof tex.has === 'function' && tex.has(frameName)) continue;
      if (tex.frames?.[frameName]) continue;

      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);

      tex.add(frameName, 0, col * frameW, row * frameH, frameW, frameH);
    }

    return true;
  }

  _cleanup() {
    this._clearTimers();

    if (this.overlay) {
      this.overlay.destroy(true);
      this.overlay = null;
    }

    this.ui = null;
  }

  _clearUi() {
    if (this.ui) {
      this.ui.removeAll(true);
    }
  }

  _addTimer(timer) {
    if (timer) this._timers.push(timer);
    return timer;
  }

  _clearTimers() {
    this._timers.forEach((timer) => {
      if (timer) timer.remove(false);
    });
    this._timers = [];
  }

  // ─── 简介页 ────────────────────────────────────────────
  showIntro() {
    this._clearTimers();
    this._clearUi();

    this._addTitle('玩具室：共同注意·找变化');

    const body = this._framesReady
  ? '共同注意：当孩子和照护者一起注意到同一个玩具、动作或变化时，互动就更容易开始。\n照护者不是要强迫孩子看自己，而是先看见孩子正在关注什么，再顺着那个兴趣点轻轻加入互动。\n\n规则：每轮先观察一组玩具。遮挡之后会出现一个新玩具，请点击“新出现的玩具”。'
  : '玩具素材没有成功加载。\n\n请检查：\npublic/assets/minigames/toyroom/toys.png';
    this._addText(GAME_W / 2, this.panelY + 130, body, {
      fontSize: '20px',
      align: 'center',
      origin: [0.5, 0],
      wordWrap: this.panelW - 140,
      lineSpacing: 8,
    });

    const label = this._framesReady ? '开始' : '完成';

    const btn = this._makeButton(GAME_W / 2, this.panelY + 490, 200, 52, label, () => {
      if (!this._framesReady) {
        this._complete('fail');
        return;
      }
      this._startRound();
    });

    this.ui.add(btn);
  }

  // ─── 轮次：观察阶段 ────────────────────────────────────
  _startRound() {
    this.currentRound += 1;
    this._clearTimers();
    this._clearUi();

    const allIndices = Phaser.Utils.Array.Shuffle(
      Array.from({ length: TOY_COUNT }, (_, i) => i)
    );

    const baseToyCount = this.currentRound <= 2
  ? EARLY_BASE_TOY_COUNT
  : LATE_BASE_TOY_COUNT;

this._baseIndices = allIndices.slice(0, baseToyCount);
this._newToyIndex = allIndices[baseToyCount];

    this._drawRoundHeader(`第 ${this.currentRound} / ${TOTAL_ROUNDS} 轮  —  仔细观察`);
    this._drawDisplayArea(this._baseIndices, null);

    const observeSeconds = Math.floor(OBSERVE_DURATION / 1000);

    const timerText = this._addText(
      GAME_W / 2,
      this.panelY + this.panelH - 52,
      `${observeSeconds} 秒后变化`,
      { fontSize: '17px', align: 'center', origin: 0.5, color: THEME.subText }
    );

    let elapsed = 0;

    this._addTimer(this.time.addEvent({
      delay: 1000,
      repeat: observeSeconds - 1,
      callback: () => {
        elapsed += 1;
        const left = observeSeconds - elapsed;
        if (timerText?.active) {
          timerText.setText(left > 0 ? `${left} 秒后变化` : '注意看……');
        }
      },
    }));

    this._addTimer(this.time.delayedCall(OBSERVE_DURATION, () => {
      this._clearTimers();
      this._showMask();
    }));
  }

  // ─── 遮罩 ──────────────────────────────────────────────
  _showMask() {
    this._clearUi();

    this._drawRoundHeader(`第 ${this.currentRound} / ${TOTAL_ROUNDS} 轮`);

    const { areaX, areaY, areaW, areaH } = this._areaRect();

    const maskRect = this.add.graphics();
    maskRect.fillStyle(THEME.mask, 1);
    maskRect.fillRoundedRect(areaX, areaY, areaW, areaH, 16);
    maskRect.lineStyle(2, THEME.stroke, 0.4);
    maskRect.strokeRoundedRect(areaX, areaY, areaW, areaH, 16);
    this.ui.add(maskRect);

    this._addTimer(this.time.delayedCall(MASK_DURATION, () => {
      this._clearTimers();
      this._showChangedRound();
    }));
  }

  // ─── 变化后阶段（可点击） ──────────────────────────────
  _showChangedRound() {
    this._clearTimers();
    this._clearUi();

    this._drawRoundHeader(`第 ${this.currentRound} / ${TOTAL_ROUNDS} 轮  —  哪个玩具是新来的？`);

    const allShown = [...this._baseIndices, this._newToyIndex];

    this._drawDisplayArea(allShown, this._newToyIndex, (clickedIndex) => {
      this._clearTimers();
      if (clickedIndex === this._newToyIndex) {
        this._onCorrect();
      } else {
        this._onWrong();
      }
    });

    this._addTimer(this.time.delayedCall(CLICK_TIMEOUT, () => {
      this._clearTimers();
      this._onTimeout();
    }));

    const timeoutSec = Math.floor(CLICK_TIMEOUT / 1000);

    const timerLabel = this._addText(
      GAME_W / 2,
      this.panelY + this.panelH - 52,
      `${timeoutSec} 秒内点击新出现的玩具`,
      { fontSize: '17px', align: 'center', origin: 0.5, color: THEME.subText }
    );

    let elapsed = 0;

    this._addTimer(this.time.addEvent({
      delay: 1000,
      repeat: timeoutSec - 1,
      callback: () => {
        elapsed += 1;
        const left = timeoutSec - elapsed;
        if (timerLabel?.active) {
          timerLabel.setText(left > 0 ? `${left} 秒内点击新出现的玩具` : '');
        }
      },
    }));
  }

  // ─── 点对 ──────────────────────────────────────────────
  _onCorrect() {
    this.correctCount += 1;
    this._clearUi();

    this._drawRoundHeader(`第 ${this.currentRound} / ${TOTAL_ROUNDS} 轮  —  答对了！`);

    this._addText(GAME_W / 2, this.panelY + this.panelH / 2, pick(CORRECT_LINES), {
      fontSize: '21px',
      align: 'center',
      origin: 0.5,
      wordWrap: this.panelW - 120,
      lineSpacing: 8,
    });

    this._addTimer(this.time.delayedCall(1500, () => {
      this._clearTimers();
      this._nextRoundOrEnd();
    }));
  }

  // ─── 点错 ──────────────────────────────────────────────
  _onWrong() {
    this._clearUi();

    this._drawRoundHeader(`第 ${this.currentRound} / ${TOTAL_ROUNDS} 轮  —  没有找到`);

    this._addText(GAME_W / 2, this.panelY + this.panelH / 2, pick(WRONG_LINES), {
      fontSize: '21px',
      align: 'center',
      origin: 0.5,
      wordWrap: this.panelW - 120,
      lineSpacing: 8,
    });

    this._addTimer(this.time.delayedCall(1200, () => {
      this._clearTimers();
      this._nextRoundOrEnd();
    }));
  }

  // ─── 超时 ──────────────────────────────────────────────
  _onTimeout() {
    this._clearUi();

    this._drawRoundHeader(`第 ${this.currentRound} / ${TOTAL_ROUNDS} 轮  —  时间到`);

    this._addText(GAME_W / 2, this.panelY + this.panelH / 2, pick(TIMEOUT_LINES), {
      fontSize: '21px',
      align: 'center',
      origin: 0.5,
      wordWrap: this.panelW - 120,
      lineSpacing: 8,
    });

    this._addTimer(this.time.delayedCall(1200, () => {
      this._clearTimers();
      this._nextRoundOrEnd();
    }));
  }

  // ─── 轮次推进 ──────────────────────────────────────────
  _nextRoundOrEnd() {
    if (this.currentRound >= TOTAL_ROUNDS) {
      this._showResult();
      return;
    }
    this._startRound();
  }

  // ─── 结算页 ────────────────────────────────────────────
  _showResult() {
    this._clearTimers();
    this._clearUi();

    const n = this.correctCount;

    let rating = 'fail';
    if (n >= 3) {
      rating = 'success';
    } else if (n === 2) {
      rating = 'normal';
    }

    const { title, body } = RESULT_TEXT[rating];
    const bodyText = body.replace('{n}', String(n));

    this._addTitle('共同注意·结算');

    this._addText(GAME_W / 2, this.panelY + 110, title, {
      fontSize: '28px',
      align: 'center',
      origin: 0.5,
    });

    this._addText(GAME_W / 2, this.panelY + 170, bodyText, {
      fontSize: '19px',
      align: 'center',
      origin: [0.5, 0],
      wordWrap: this.panelW - 120,
      lineSpacing: 10,
    });

    const dotY = this.panelY + 390;

    for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
      const x = GAME_W / 2 - ((TOTAL_ROUNDS - 1) / 2) * 48 + i * 48;
      const filled = i < n;

      const dot = this.add.graphics();
      dot.fillStyle(filled ? 0xf5a623 : 0xd9c9a8, 1);
      dot.fillCircle(x, dotY, 14);
      dot.lineStyle(2, THEME.stroke, 1);
      dot.strokeCircle(x, dotY, 14);
      this.ui.add(dot);
    }

    const btn = this._makeButton(
      GAME_W / 2,
      this.panelY + this.panelH - 60,
      200,
      52,
      '完成',
      () => this._complete(rating)
    );

    this.ui.add(btn);
  }

  // ─── 完成 → 返回 ───────────────────────────────────────
  _complete(rating = 'normal') {
    const payload = {
      roomId: this.roomId,
      minigameId: 'toyRoomJointAttention',
      rating,
      correctCount: this.correctCount,
      totalRounds: TOTAL_ROUNDS,
    };

    const returnScene = this.scene.get(this.returnSceneKey);

    if (returnScene?.events) {
      returnScene.events.emit('minigame:complete', payload);
    }

    this.scene.stop();
  }

  // ─── 绘制辅助 ──────────────────────────────────────────
  _areaRect() {
    const areaX = this.panelX + 40;
    const areaY = this.panelY + 90;
    const areaW = this.panelW - 80;
    const areaH = 360;
    return { areaX, areaY, areaW, areaH };
  }

  _drawRoundHeader(label) {
    this._addText(GAME_W / 2, this.panelY + 46, label, {
      fontSize: '22px',
      align: 'center',
      origin: 0.5,
    });
  }

  _addTitle(label) {
    this._addText(GAME_W / 2, this.panelY + 46, label, {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });
  }

  _drawDisplayArea(indices, newToyIndex, onClickToy = null) {
    const { areaX, areaY, areaW, areaH } = this._areaRect();

    const areaBg = this.add.graphics();
    areaBg.fillStyle(THEME.displayArea, 1);
    areaBg.fillRoundedRect(areaX, areaY, areaW, areaH, 16);
    areaBg.lineStyle(2, THEME.stroke, 0.6);
    areaBg.strokeRoundedRect(areaX, areaY, areaW, areaH, 16);
    this.ui.add(areaBg);

    const toySize = TOY_DISPLAY_SIZE;
    const positions = this._generateToyPositions(indices.length, {
      areaX,
      areaY,
      areaW,
      areaH,
      toySize,
    });

    indices.forEach((frameIdx, i) => {
      const pos = positions[i];
      if (!pos) return;

      const img = this.add
        .image(pos.x, pos.y, SPRITE_KEY, `toy_${frameIdx}`)
        .setOrigin(0.5)
        .setDisplaySize(toySize, toySize);

      if (onClickToy) {
        img.setInteractive({ useHandCursor: true });

        img.on('pointerdown', (_p, _lx, _ly, event) => {
          event?.stopPropagation?.();
          onClickToy(frameIdx);
        });

        img.on('pointerover', () => {
          img.setTint(0xffe8c0);
        });

        img.on('pointerout', () => {
          img.clearTint();
        });
      }

      this.ui.add(img);
    });
  }

  _generateToyPositions(count, { areaX, areaY, areaW, areaH, toySize }) {
    const margin = toySize / 2 + 22;
    const minDistance = TOY_MIN_DISTANCE;

    const minX = areaX + margin;
    const maxX = areaX + areaW - margin;
    const minY = areaY + margin;
    const maxY = areaY + areaH - margin;

    const positions = [];

    for (let i = 0; i < count; i += 1) {
      let chosen = null;

      for (let attempt = 0; attempt < 120; attempt += 1) {
        const candidate = {
          x: Phaser.Math.Between(Math.round(minX), Math.round(maxX)),
          y: Phaser.Math.Between(Math.round(minY), Math.round(maxY)),
        };

        const ok = positions.every((p) => {
          const dx = p.x - candidate.x;
          const dy = p.y - candidate.y;
          return Math.sqrt(dx * dx + dy * dy) >= minDistance;
        });

        if (ok) {
          chosen = candidate;
          break;
        }
      }

      if (!chosen) {
        const fallback = this._fallbackToySlots({ areaX, areaY, areaW, areaH, toySize });
        chosen = fallback[i % fallback.length];
      }

      positions.push(chosen);
    }

    return positions;
  }

  _fallbackToySlots({ areaX, areaY, areaW, areaH, toySize }) {
    const cols = 4;
    const rows = 3;
    const margin = toySize / 2 + 22;
    const usableW = areaW - margin * 2;
    const usableH = areaH - margin * 2;

    const slots = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        slots.push({
          x: areaX + margin + (usableW * (col + 0.5)) / cols + Phaser.Math.Between(-28, 28),
          y: areaY + margin + (usableH * (row + 0.5)) / rows + Phaser.Math.Between(-24, 24),
        });
      }
    }

    return Phaser.Utils.Array.Shuffle(slots);
  }

  _addText(x, y, text, opts = {}) {
    const origin = opts.origin ?? 0.5;
    const originX = Array.isArray(origin) ? origin[0] : origin;
    const originY = Array.isArray(origin) ? origin[1] : origin;

    const t = this.add
      .text(x, y, text, {
        fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
        fontSize: opts.fontSize ?? '20px',
        color: opts.color ?? THEME.text,
        align: opts.align ?? 'left',
        lineSpacing: opts.lineSpacing ?? 0,
        wordWrap: opts.wordWrap ? { width: opts.wordWrap, useAdvancedWrap: true } : undefined,
      })
      .setOrigin(originX, originY);

    this.ui.add(t);
    return t;
  }

  _makeButton(x, y, w, h, label, onClick, opts = {}) {
    const container = this.add.container(0, 0);

    const bg = this.add.graphics();

    const text = this.add
      .text(x, y, label, {
        fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
        fontSize: opts.fontSize ?? '18px',
        color: THEME.text,
        align: 'center',
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(x, y, w, h)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const draw = (fill) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
      bg.lineStyle(3, THEME.stroke, 1);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    };

    draw(THEME.button);

    zone.on('pointerover', () => draw(THEME.buttonHover));
    zone.on('pointerout', () => draw(THEME.button));
    zone.on('pointerdown', (_p, _lx, _ly, event) => {
      event?.stopPropagation?.();
      onClick?.();
    });

    container.add([bg, text, zone]);
    return container;
  }
}
