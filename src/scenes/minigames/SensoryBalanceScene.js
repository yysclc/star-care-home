import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../../core/Constants.js';
import ResourceManager from '../../core/ResourceManager.js';

const THEME = {
  overlay:     0x6b4426,
  panel:       0xfff3d2,
  panelLight:  0xffffeb,
  stroke:      0x9a6a3a,
  strokeDark:  0x6b3f1f,
  text:        '#5b3419',
  subText:     '#7a4a25',
  cream:       0xfffbeb,
  button:      0xffe7aa,
  buttonHover: 0xffd980,
  green:       0x9fca7a,
  yellow:      0xffdc83,
  red:         0xf3aa94,
  beamColor:   0xc89a5a,
  personColor: 0x8b5a2b,
  personHead:  0xf5d5a0,
  armColor:    0x8b5a2b,
};

const DURATION         = 18;
const WARN_THRESHOLD   = 24;
const DANGER_THRESHOLD = 50;
const DANGER_LIMIT     = 0.85;
const MAX_FALL_COUNT   = 4;

// 双频漂移：有晃动，但不会突然被甩飞
const DRIFT_SPEED_A    = 0.38;
const DRIFT_SPEED_B    = 0.86;
const DRIFT_AMP_A      = 22;
const DRIFT_AMP_B      = 12;

// 偶发扰动：保留不稳定感，但力度降下来
const PERTURB_INTERVAL_MIN  = 1100;
const PERTURB_INTERVAL_MAX  = 2200;
const PERTURB_STRENGTH      = 16;
const PERTURB_PUSH_STRENGTH = 5.5;
const PERTURB_PUSH_DURATION = 0.28;

// 玩家修正
const CORRECT_IMPULSE  = 9.5;
const VELOCITY_DECAY   = 0.90;

const MAX_BALANCE_VELOCITY = 105;

// 持续侧向力：身体会被某一侧慢慢带走，必须持续修正
const SIDE_FORCE_INTERVAL_MIN = 1200;
const SIDE_FORCE_INTERVAL_MAX = 2400;
const SIDE_FORCE_MIN = 2.0;
const SIDE_FORCE_MAX = 5.5;

const INTRO_TEXTS = [
'感统支持：帮助孩子在合适的节奏里感知身体、调整姿势，让身体状态更稳定，也更容易平静参与活动。\n平衡木活动不是越快、越刺激越好。重点是让孩子在可承受的强度里保持稳定，而不是挑战更难的动作。\n\n规则：用左右方向键或 A / D 调整平衡，让孩子尽量保持在中间的稳定区域，不要偏得太远。\n键盘：← / A 左调　　→ / D 右调',
];


function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default class SensoryBalanceScene extends Phaser.Scene {
  constructor() {
    super('SensoryBalanceScene');
  }

  preload() {
    ResourceManager.loadPack(this, 'minigameSensoryBalance', { silent: true });
  }

  init(data = {}) {
    this.roomId         = data.roomId         ?? 'sensoryRoom';
    this.returnSceneKey = data.returnSceneKey ?? 'FixedActionScene';

    // 核心状态
    this.balance         = 0;
    this.balanceVelocity = 0;
    this.dangerTime      = 0;
    this.fallCount       = 0;
    this.elapsedTime     = 0;
    this._gameActive      = false;
    this._sinTime         = 0;
    this._nextPerturb     = 0;
    // 持续推力状态
    this._pushDir         = 0;   // -1 / 0 / +1
    this._pushTimeLeft    = 0;   // 剩余持续时间（秒）
    this._sideForce = 0;
this._nextSideForce = 0;
    // UI refs
    this.overlay = null;
    this.ui      = null;

    // 图片层句柄
    this._beamBaseImage   = null;
    this._balanceGroup    = null;
    this._beamTopImage    = null;
    this._childImage      = null;
    // UI graphics 句柄
    this._balanceBar      = null;
    this._balanceIndicator= null;
    this._progressBar     = null;
    this._fallText        = null;
    this._statusText      = null;
    this._shakeTween      = null;

    // 键盘
    this._keyLeft  = null;
    this._keyRight = null;
    this._keyA     = null;
    this._keyD     = null;

    // 按钮状态（支持按住）
    this._leftHeld  = false;
    this._rightHeld = false;
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

    this._showIntro();
  }

  // ── 清理 ─────────────────────────────────────────────────────────────────

  _cleanup() {
    this._gameActive = false;
    this._removeKeys();
    if (this.overlay) {
      this.overlay.destroy(true);
      this.overlay = null;
    }
    this.ui = null;
  }

  _clearUi() {
    if (this.ui) this.ui.removeAll(true);
    this._beamBaseImage    = null;
    this._balanceGroup     = null;
    this._beamTopImage     = null;
    this._childImage       = null;
    this._balanceBar       = null;
    this._balanceIndicator = null;
    this._progressBar      = null;
    this._fallText         = null;
    this._statusText       = null;
    this._shakeTween       = null;
  }

  _removeKeys() {
    [this._keyLeft, this._keyRight, this._keyA, this._keyD].forEach((k) => {
      if (k) k.destroy();
    });
    this._keyLeft = this._keyRight = this._keyA = this._keyD = null;
  }

  // ── 说明页 ────────────────────────────────────────────────────────────────

  _showIntro() {
    this._clearUi();
    this._gameActive = false;

    this._addText(GAME_W / 2, this.panelY + 46, '感统室：平衡木舒适步伐', {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });

    this._addText(GAME_W / 2, this.panelY + 148, pick(INTRO_TEXTS), {
      fontSize: '19px',
      align: 'center',
      origin: [0.5, 0],
      wordWrap: this.panelW - 140,
      lineSpacing: 10,
    });

    const startBtn = this._makeButton(
      GAME_W / 2, this.panelY + 500, 200, 52,
      '开始',
      () => this._startGame()
    );
    this.ui.add(startBtn);
  }

  // ── 游戏页 ────────────────────────────────────────────────────────────────

  _startGame() {
    // 重置核心数值
    this.balance         = 0;
    this.balanceVelocity = 0;
    this.dangerTime      = 0;
    this.fallCount       = 0;
    this.elapsedTime     = 0;
    this._sinTime        = 0;
    this._nextPerturb    = Phaser.Math.Between(PERTURB_INTERVAL_MIN, PERTURB_INTERVAL_MAX);
    this._pushDir        = 0;
    this._pushTimeLeft   = 0;
    this._sideForce = this._randomSideForce();
this._nextSideForce = Phaser.Math.Between(SIDE_FORCE_INTERVAL_MIN, SIDE_FORCE_INTERVAL_MAX);
    this._gameActive     = true;
    this._leftHeld       = false;
    this._rightHeld      = false;

    this._clearUi();
    this._buildGameUi();
    this._bindKeys();
  }

  _randomSideForce() {
  const sign = Math.random() < 0.5 ? -1 : 1;
  const strength = Phaser.Math.FloatBetween(SIDE_FORCE_MIN, SIDE_FORCE_MAX);
  return sign * strength;
}

  _buildGameUi() {
    const cx = GAME_W / 2;

    // ── 标题 ──
    this._addText(cx, this.panelY + 30, '感统室：平衡木舒适步伐', {
      fontSize: '22px',
      align: 'center',
      origin: [0.5, 0],
    });

    // ── 顶部进度条 ──
    const progressBgH   = 14;
    const progressBgY   = this.panelY + 68;
    const progressBgX   = this.panelX + 60;
    const progressBgW   = this.panelW - 120;

    // 进度条背景
    const progressBg = this.add.graphics();
    progressBg.fillStyle(THEME.cream, 1);
    progressBg.fillRoundedRect(progressBgX, progressBgY, progressBgW, progressBgH, 7);
    progressBg.lineStyle(2, THEME.stroke, 0.7);
    progressBg.strokeRoundedRect(progressBgX, progressBgY, progressBgW, progressBgH, 7);
    this.ui.add(progressBg);

    // 进度条前景（动态更新）
    this._progressBar = this.add.graphics();
    this.ui.add(this._progressBar);
    this._progressBarConfig = { x: progressBgX, y: progressBgY, w: progressBgW, h: progressBgH };

    // ── 失衡次数 ──
    this._fallText = this._addText(
      this.panelX + 60, this.panelY + 92,
      `失衡次数：${this.fallCount}`,
      { fontSize: '18px', origin: [0, 0.5], color: THEME.subText }
    );

    // ── 平衡木区域 ──
    this._beamCX = cx;
this._beamCY = this.panelY + 330;
this._beamW  = this.panelW * 0.84;
this._beamH  = 18;

    // 底座图（不旋转）
    this._beamBaseImage = this.add.image(this._beamCX, this._beamCY-10, 'sensoryBeamBase')
      .setOrigin(0.5, 0.15)
      .setDisplaySize(90, 90);
    this.ui.add(this._beamBaseImage);

    // 旋转容器（横梁 + 小孩一起转）
    this._balanceGroup = this.add.container(this._beamCX, this._beamCY);

    this._beamTopImage = this.add.image(0, 0, 'sensoryBeamTop')
  .setOrigin(0.5, 0.5)
  .setDisplaySize(this._beamW, 66);

this._childImage = this.add.image(0, 12, 'sensoryChildBalance')
  .setOrigin(0.5, 1)
  .setDisplaySize(170, 230);

    this._balanceGroup.add([this._beamTopImage, this._childImage]);
    this.ui.add(this._balanceGroup);

    // ── 平衡提示条 ──
    const barY   = this.panelY + 405;
    const barW   = this.panelW - 180;
    const barH   = 20;
    const barX   = cx - barW / 2;

    this._addText(barX - 8, barY + barH / 2, '左倾', {
      fontSize: '16px',
      origin: [1, 0.5],
      color: THEME.subText,
    });
    this._addText(barX + barW + 8, barY + barH / 2, '右倾', {
      fontSize: '16px',
      origin: [0, 0.5],
      color: THEME.subText,
    });
    this._addText(cx, barY - 14, '← 稳定区 →', {
      fontSize: '15px',
      align: 'center',
      origin: 0.5,
      color: THEME.subText,
    });

    // 提示条背景
    this._balanceBar = this.add.graphics();
    this.ui.add(this._balanceBar);
    this._balanceBarConfig = { x: barX, y: barY, w: barW, h: barH };

    // 指针
    this._balanceIndicator = this.add.graphics();
    this.ui.add(this._balanceIndicator);

    // ── 左调 / 右调 按钮 ──
    const btnY  = this.panelY + this.panelH - 54;
    const btnW  = 160;
    const btnH  = 52;
    const leftX  = cx - btnW / 2 - 40;
    const rightX = cx + btnW / 2 + 40;

    const leftBtn = this._makeButton(leftX, btnY, btnW, btnH, '[A] ◀ 左调', null);
const rightBtn = this._makeButton(rightX, btnY, btnW, btnH, '右调 ▶ [D]', null);

    // 按住逻辑
    const leftZone  = leftBtn.getAt(2);
    const rightZone = rightBtn.getAt(2);

    leftZone.on('pointerdown',  () => { this._leftHeld  = true;  });
    leftZone.on('pointerup',    () => { this._leftHeld  = false; });
    leftZone.on('pointerout',   () => { this._leftHeld  = false; });
    rightZone.on('pointerdown', () => { this._rightHeld = true;  });
    rightZone.on('pointerup',   () => { this._rightHeld = false; });
    rightZone.on('pointerout',  () => { this._rightHeld = false; });

    this.ui.add(leftBtn);
    this.ui.add(rightBtn);

    // 初始绘制
    this._drawBeamAndPerson();
    this._drawBalanceBar();
    this._drawProgressBar();
  }

  _bindKeys() {
    this._removeKeys();
    const { LEFT, RIGHT, A, D } = Phaser.Input.Keyboard.KeyCodes;
    this._keyLeft  = this.input.keyboard.addKey(LEFT);
    this._keyRight = this.input.keyboard.addKey(RIGHT);
    this._keyA     = this.input.keyboard.addKey(A);
    this._keyD     = this.input.keyboard.addKey(D);
  }

  // ── 主更新循环 ────────────────────────────────────────────────────────────

  update(time, delta) {
    if (!this._gameActive) return;

    const dt = delta / 1000; // 秒

    this.elapsedTime += dt;
    this._sinTime    += dt;

    // ── 双频叠加漂移（两个不成整数比的正弦，消除周期规律感）──
    const drift =
      Math.sin(this._sinTime * DRIFT_SPEED_A * Math.PI * 2) * DRIFT_AMP_A * dt +
      Math.sin(this._sinTime * DRIFT_SPEED_B * Math.PI * 2) * DRIFT_AMP_B * dt;
     // ── 持续侧向力：一段时间内身体会慢慢往某一侧偏 ──
this._nextSideForce -= delta;

if (this._nextSideForce <= 0) {
  this._sideForce = this._randomSideForce();
  this._nextSideForce = Phaser.Math.Between(SIDE_FORCE_INTERVAL_MIN, SIDE_FORCE_INTERVAL_MAX);
}

this.balanceVelocity += this._sideForce * dt * 60;
    // ── 持续推力（扰动后保持一段时间向某侧施力）──
    if (this._pushTimeLeft > 0) {
      this._pushTimeLeft -= dt;
      this.balanceVelocity += this._pushDir * PERTURB_PUSH_STRENGTH * dt * 60;
    }

    // ── 偶发扰动 ──
    this._nextPerturb -= delta;
    if (this._nextPerturb <= 0) {
      // 偏向当前 balance 反方向，但保留随机性（2/3 概率往偏斜方向加剧）
      const biasSign = Math.random() < 0.35 ? -Math.sign(this.balance) : Math.sign(this.balance) || 1;
      this.balanceVelocity += biasSign * PERTURB_STRENGTH;
      // 给一段持续推力
      this._pushDir      = biasSign;
      this._pushTimeLeft = PERTURB_PUSH_DURATION;
      this._nextPerturb  = Phaser.Math.Between(PERTURB_INTERVAL_MIN, PERTURB_INTERVAL_MAX);
    }

    // ── 按键修正（每帧检测按住）──
    const holdLeft  = this._leftHeld  || this._keyLeft?.isDown  || this._keyA?.isDown;
    const holdRight = this._rightHeld || this._keyRight?.isDown || this._keyD?.isDown;

    if (holdLeft  && !holdRight) this.balanceVelocity -= CORRECT_IMPULSE * dt * 60;
    if (holdRight && !holdLeft)  this.balanceVelocity += CORRECT_IMPULSE * dt * 60;

    // ── 速度衰减 ──
    this.balanceVelocity *= Math.pow(VELOCITY_DECAY, delta / 16.67);
    this.balanceVelocity = Phaser.Math.Clamp(
  this.balanceVelocity,
  -MAX_BALANCE_VELOCITY,
  MAX_BALANCE_VELOCITY
);

    // ── balance 更新 ──
    this.balance += drift + this.balanceVelocity * dt;
    this.balance  = Phaser.Math.Clamp(this.balance, -100, 100);

    // ── 状态判断 ──
    const absB = Math.abs(this.balance);
    let state = 'safe';
    if (absB > DANGER_THRESHOLD) state = 'danger';
    else if (absB > WARN_THRESHOLD) state = 'warn';

    // ── 危险累计 ──
    if (state === 'danger') {
      this.dangerTime += dt;
      if (this.dangerTime >= DANGER_LIMIT) {
        this.fallCount += 1;
        this.dangerTime = 0;
        this.balance *= 0.45;
        this.balanceVelocity = 0;

        if (this._fallText) {
          this._fallText.setText(`失衡次数：${this.fallCount}`);
        }

        if (this.fallCount >= MAX_FALL_COUNT) {
          this._endGame('fail');
          return;
        }

        this._doShake();
      }
    } else {
      this.dangerTime = 0;
    }

    // ── 时间完成 ──
    if (this.elapsedTime >= DURATION) {
      this._endGame(this._getRating());
      return;
    }

    // ── 更新画面 ──
    this._drawBeamAndPerson(state);
    this._drawBalanceBar(state);
    this._drawProgressBar();
  }

  // ── 绘制：平衡木 + 小人 ──────────────────────────────────────────────────

  _drawBeamAndPerson(state = 'safe') {
  if (!this._balanceGroup || !this._beamBaseImage || !this._beamTopImage || !this._childImage) return;

  const floatY = Math.sin(this.elapsedTime * 2.2) * 3;

  // balance = 100 时大约 14 度，视觉上明显但不夸张
  const angle = Phaser.Math.DegToRad(this.balance * 0.14);

  // 横梁 + 小孩一起转
  this._balanceGroup.setPosition(this._beamCX, this._beamCY + floatY);
  this._balanceGroup.setRotation(angle);

  // 底座固定不转，只轻微跟随浮动
  this._beamBaseImage.setPosition(this._beamCX, this._beamCY-10);
  this._beamBaseImage.setRotation(0);

  // 状态反馈：只 tint 小孩，不 tint 横梁
  if (state === 'danger') {
    this._childImage.setTint(0xf3aa94);
  } else if (state === 'warn') {
    this._childImage.setTint(0xffdc83);
  } else {
    this._childImage.clearTint();
  }

  this._beamTopImage.clearTint();
}

  // ── 绘制：平衡提示条 ──────────────────────────────────────────────────────

  _drawBalanceBar(state = 'safe') {
    if (!this._balanceBar || !this._balanceIndicator) return;

    const { x, y, w, h } = this._balanceBarConfig;

    // 底部横条（红 + 绿渐变区域）
    const g = this._balanceBar;
    g.clear();

    // 红色底层
    g.fillStyle(THEME.red, 0.6);
    g.fillRoundedRect(x, y, w, h, 10);

    // 中间绿色安全区：balance 范围是 -100～100，
// 所以 [-WARN, +WARN] 的宽度比例是 WARN_THRESHOLD / 100。
const safeW = w * (WARN_THRESHOLD / 100);
const safeX = x + (w - safeW) / 2;

// 黄色警告区：[-DANGER, +DANGER] 的宽度比例是 DANGER_THRESHOLD / 100。
const warnW = w * (DANGER_THRESHOLD / 100);
const warnX = x + (w - warnW) / 2;

g.fillStyle(THEME.yellow, 0.75);
g.fillRoundedRect(warnX, y, warnW, h, 10);

g.fillStyle(THEME.green, 0.85);
g.fillRoundedRect(safeX, y, safeW, h, 10);

    g.lineStyle(2, THEME.strokeDark, 0.5);
    g.strokeRoundedRect(x, y, w, h, 10);

    // 指针（代表当前 balance）
    const ip = this._balanceIndicator;
    ip.clear();

    // balance -100 → x，balance +100 → x+w，balance 0 → x+w/2
    const indicatorX = x + w / 2 + (this.balance / 100) * (w / 2);

    const iColor = state === 'danger' ? 0xc0392b
      : state === 'warn'   ? 0xe67e22
      : THEME.strokeDark;

    ip.fillStyle(iColor, 1);
    ip.fillTriangle(indicatorX, y - 3, indicatorX - 8, y - 16, indicatorX + 8, y - 16);
    ip.fillCircle(indicatorX, y + h / 2, 7);
    ip.lineStyle(2, THEME.cream, 0.9);
    ip.strokeCircle(indicatorX, y + h / 2, 7);
  }

  // ── 绘制：进度条 ──────────────────────────────────────────────────────────

  _drawProgressBar() {
    if (!this._progressBar) return;

    const { x, y, w, h } = this._progressBarConfig;
    const ratio = Phaser.Math.Clamp(this.elapsedTime / DURATION, 0, 1);

    const pg = this._progressBar;
    pg.clear();
    pg.fillStyle(THEME.green, 0.9);
    pg.fillRoundedRect(x, y, w * ratio, h, 7);
  }

  // ── 抖动效果 ──────────────────────────────────────────────────────────────

  _doShake() {
    if (this._shakeTween) {
      this._shakeTween.stop();
      this._shakeTween = null;
    }

    if (!this.ui) return;

    const origX = this.ui.x;
    const origY = this.ui.y;

    this._shakeTween = this.tweens.add({
      targets: this.ui,
      x: { from: origX - 5, to: origX + 5 },
      y: { from: origY - 3, to: origY + 3 },
      duration: 60,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.ui) {
          this.ui.x = origX;
          this.ui.y = origY;
        }
        this._shakeTween = null;
      },
    });
  }

  // ── 结算 ──────────────────────────────────────────────────────────────────

  _getRating() {
    if (this.fallCount <= 1) return 'success';
    if (this.fallCount <= 3) return 'normal';
    return 'fail';
  }

  _endGame(rating) {
    this._gameActive = false;
    this._removeKeys();
    this._leftHeld  = false;
    this._rightHeld = false;

    this.time.delayedCall(200, () => {
      this._showResult(rating);
    });
  }

  _showResult(rating) {
    this._clearUi();

    const ratingLabel = rating === 'success' ? '成功'
      : rating === 'normal' ? '普通' : '失误';

    const FINAL_TEXTS = {
      success: '你帮助孩子用稳定的节奏完成了平衡木活动。身体慢慢找到平衡，更容易进入下一步活动。',
      normal:  '孩子完成了平衡木，但中间有几次晃动较大。活动基本有帮助，不过仍需要继续观察和支持。',
      fail:    '身体晃动过大，孩子变得紧张。现在更适合先停下来休息，而不是继续增加难度。',
    };

    this._addText(GAME_W / 2, this.panelY + 54, '感统室：平衡木舒适步伐', {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });

    this._addText(GAME_W / 2, this.panelY + 118, `总评：${ratingLabel}`, {
      fontSize: '28px',
      align: 'center',
      origin: 0.5,
      color: THEME.subText,
    });

    this._addText(GAME_W / 2, this.panelY + 174, `失衡次数：${this.fallCount}`, {
      fontSize: '22px',
      align: 'center',
      origin: 0.5,
      color: THEME.subText,
    });

    this._addText(GAME_W / 2, this.panelY + 300, FINAL_TEXTS[rating], {
      fontSize: '21px',
      align: 'center',
      origin: 0.5,
      wordWrap: this.panelW - 120,
      lineSpacing: 9,
    });

    const doneBtn = this._makeButton(
      GAME_W / 2, this.panelY + 500, 180, 50,
      '完成',
      () => this._completeMinigame(rating),
      { fontSize: '20px' }
    );
    this.ui.add(doneBtn);
  }

  _completeMinigame(rating) {
    const payload = {
      roomId:      this.roomId,
      minigameId:  'sensoryBalance',
      rating,
      fallCount:   this.fallCount,
    };

    const returnScene = this.scene.get(this.returnSceneKey);
    if (returnScene?.events) {
      returnScene.events.emit('minigame:complete', payload);
    }

    this.scene.stop();
  }

  // ── 工具方法 ──────────────────────────────────────────────────────────────

  _addText(x, y, text, opts = {}) {
    const origin  = opts.origin ?? 0.5;
    const originX = Array.isArray(origin) ? origin[0] : origin;
    const originY = Array.isArray(origin) ? origin[1] : origin;

    const t = this.add
      .text(x, y, text, {
        fontFamily:  '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
        fontSize:    opts.fontSize ?? '20px',
        color:       opts.color ?? THEME.text,
        align:       opts.align ?? 'left',
        lineSpacing: opts.lineSpacing ?? 0,
        wordWrap:    opts.wordWrap ? { width: opts.wordWrap, useAdvancedWrap: true } : undefined,
      })
      .setOrigin(originX, originY);

    this.ui.add(t);
    return t;
  }

  _makeButton(x, y, w, h, label, onClick, opts = {}) {
    const container = this.add.container(0, 0);

    const bg   = this.add.graphics();
    const text = this.add
      .text(x, y, label, {
        fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
        fontSize:   opts.fontSize ?? '18px',
        color:      THEME.text,
        align:      'center',
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
    zone.on('pointerout',  () => draw(THEME.button));
    zone.on('pointerdown', (_p, _lx, _ly, event) => {
      event?.stopPropagation?.();
      onClick?.();
    });

    container.add([bg, text, zone]);
    return container;
  }
}
