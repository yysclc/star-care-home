import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../../core/Constants.js';
import ResourceManager from '../../core/ResourceManager.js';

const THEME = {
  overlay:    0x6b4426,
  panel:      0xfff3d2,
  panelLight: 0xffffeb,
  stroke:     0x9a6a3a,
  strokeDark: 0x6b3f1f,
  text:       '#5b3419',
  subText:    '#7a4a25',
  cream:      0xfffbeb,
  button:     0xffe7aa,
  buttonHover:0xffd980,
  cardBg:     0xfffbeb,
  cardShadow: 0xe8c98a,
  cardStroke: 0xc8914a,
};

const TOTAL_TIME = 20;

const ALL_CARDS = [
  { id: 'water', icon: '🫙', iconKey: 'aac_water', iconPath: '/assets/minigames/outdoor_aac/aac_water.png', label: '喝水', color: '#3a7fd5' },
  { id: 'loud',  icon: '📢', iconKey: 'aac_loud',  iconPath: '/assets/minigames/outdoor_aac/aac_loud.png',  label: '太吵', color: '#c0392b' },
  { id: 'rest',  icon: '⛺', iconKey: 'aac_rest',  iconPath: '/assets/minigames/outdoor_aac/aac_rest.png',  label: '休息', color: '#27ae60' },
  { id: 'help',  icon: '✋', iconKey: 'aac_help',  iconPath: '/assets/minigames/outdoor_aac/aac_help.png',  label: '帮忙', color: '#8e44ad' },
];

function sampleN(arr, n) {
  const copy = arr.slice();
  const result = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const INTRO_TEXTS = [
  [
    'AAC，即辅助与替代沟通。孩子不一定只靠说话表达需求，也可以用图卡、手势或符号告诉你：我想要什么、我不舒服、我需要帮助。',
    '',
    '规则：看清沟通卡表达的意思，',
    '在左右两个回应中选出正确的一边。',
    '点击对应按钮，或按 F / J 尽快回应。',
    '',
    '键盘：F ← 左侧回应　J → 右侧回应',
  ],
];

const FINAL_TEXTS = {
  success: '你快速读懂了孩子递出的沟通卡。孩子发现自己的表达能被理解，户外活动中的不安减少了。',
  normal:  '你读懂了大部分沟通卡，但有几次回应不够及时。孩子基本得到了支持，不过仍有些紧张。',
  fail:    '你多次误读或错过了孩子的表达。孩子已经尝试用图卡沟通，但没有被稳定理解，压力上升了。',
};

// 卡牌尺寸
const CARD_W = 190;
const CARD_H = 220;
// 叠放时每张后置卡的偏移量（营造一摞感觉）
const STACK_OFFSET_X = 5;
const STACK_OFFSET_Y = 6;
const STACK_COUNT = 3; // 叠在下面的阴影层数

export default class OutdoorAACScene extends Phaser.Scene {
  constructor() {
    super('OutdoorAACScene');
  }

  preload() {
    ResourceManager.loadPack(this, 'minigameOutdoorAac', { silent: true });
  }

  init(data = {}) {
    this.roomId        = data.roomId        ?? 'outdoorYard';
    this.returnSceneKey = data.returnSceneKey ?? 'FixedActionScene';

    this.score        = 0;
    this.wrongCount   = 0;
    this.timeLeft     = TOTAL_TIME;
    this._timerEvent  = null;
    this._gameActive  = false;
    this._isTransitioning = false;
    this._pairCards   = [];
    this._currentCard = null;
    this._keyF        = null;
    this._keyJ        = null;

    this.overlay = null;
    this.ui      = null;
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
    this.panelH = 560;
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

  _cleanup() {
    this._stopTimer();
    this._removeKeys();
    if (this.overlay) {
      this.overlay.destroy(true);
      this.overlay = null;
    }
    this.ui = null;
  }

  _clearUi() {
    if (this.ui) this.ui.removeAll(true);
    this._timeText  = null;
    this._scoreText = null;
    this._wrongText = null;
    this._cardStack = null;
  }

  _stopTimer() {
    if (this._timerEvent) {
      this._timerEvent.remove(false);
      this._timerEvent = null;
    }
  }

  _removeKeys() {
    if (this._keyF) { this._keyF.destroy(); this._keyF = null; }
    if (this._keyJ) { this._keyJ.destroy(); this._keyJ = null; }
  }

  // ─── 说明页 ──────────────────────────────────────────────────────────────

  _showIntro() {
    this._clearUi();
    this._gameActive = false;

    this._addText(GAME_W / 2, this.panelY + 46, '户外小院：AAC 沟通卡快反', {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });

    const body = pick(INTRO_TEXTS).join('\n');
    this._addText(GAME_W / 2, this.panelY + 148, body, {
      fontSize: '19px',
      align: 'center',
      origin: [0.5, 0],
      wordWrap: this.panelW - 140,
      lineSpacing: 10,
    });

    const startBtn = this._makeButton(
      GAME_W / 2, this.panelY + 488, 200, 52,
      '开始',
      () => this._startGame()
    );
    this.ui.add(startBtn);
  }

  // ─── 游戏页 ──────────────────────────────────────────────────────────────

  _startGame() {
    this._pairCards   = sampleN(ALL_CARDS, 2);
    this.score        = 0;
    this.wrongCount   = 0;
    this.timeLeft     = TOTAL_TIME;
    this._gameActive  = true;

    this._buildGameUi();
    this._drawStack();
    this._startTimer();
    this._bindKeys();
  }

  _buildGameUi() {
    this._clearUi();

    // ── 标题 ──
    this._addText(GAME_W / 2, this.panelY + 46, '户外小院：沟通卡快反', {
      fontSize: '24px',
      align: 'center',
      origin: 0.5,
    });

    // ── 状态行 ──
    this._timeText = this._addText(
      this.panelX + 52, this.panelY + 100,
      `时间：${this.timeLeft}s`,
      { fontSize: '20px', origin: [0, 0.5] }
    );
    this._scoreText = this._addText(
      GAME_W / 2, this.panelY + 100,
      `得分：${this.score}`,
      { fontSize: '20px', align: 'center', origin: [0.5, 0.5] }
    );
    this._wrongText = this._addText(
      this.panelX + this.panelW - 52, this.panelY + 100,
      `错误：${this.wrongCount}`,
      { fontSize: '20px', origin: [1, 0.5] }
    );

    // ── 卡牌叠放容器（中央区域） ──
    // 卡组中心 Y：给顶部状态行和底部按钮留足空间
    const stackCX = GAME_W / 2;
    const stackCY = this.panelY + 290;
    this._stackCX = stackCX;
    this._stackCY = stackCY;

    this._cardStack = this.add.container(stackCX, stackCY);
    this.ui.add(this._cardStack);

    // ── 左下 / 右下 按钮 ──
    const btnY  = this.panelY + this.panelH - 54;
    const btnW  = 190;
    const btnH  = 58;
    const leftX  = this.panelX + btnW / 2 + 28;
    const rightX = this.panelX + this.panelW - btnW / 2 - 28;

    const leftCard  = this._pairCards[0];
    const rightCard = this._pairCards[1];

    const leftBtn = this._makeButton(
      leftX, btnY, btnW, btnH,
      `[F]  ${leftCard.label}`,
      () => this._onAnswer(leftCard.id),
      { fontSize: '20px' }
    );
    const rightBtn = this._makeButton(
      rightX, btnY, btnW, btnH,
      `${rightCard.label}  [J]`,
      () => this._onAnswer(rightCard.id),
      { fontSize: '20px' }
    );

    this.ui.add(leftBtn);
    this.ui.add(rightBtn);
  }

  // 绘制"一摞卡牌"：底层若干阴影 + 最上层当前卡
  _drawStack() {
    if (!this._cardStack) return;
    this._cardStack.removeAll(true);

    this._currentCard = pick(this._pairCards);
    const card = this._currentCard;

    // 底层阴影（从最下层到次顶层）
    for (let i = STACK_COUNT; i >= 1; i--) {
      const ox = i * STACK_OFFSET_X;
      const oy = i * STACK_OFFSET_Y;
      const alpha = 0.25 + (STACK_COUNT - i) * 0.15; // 越近越深

      const shadow = this.add.graphics();
      shadow.fillStyle(THEME.cardShadow, alpha);
      shadow.fillRoundedRect(
        ox - CARD_W / 2, oy - CARD_H / 2,
        CARD_W, CARD_H, 18
      );
      shadow.lineStyle(2, THEME.cardStroke, alpha * 0.6);
      shadow.strokeRoundedRect(
        ox - CARD_W / 2, oy - CARD_H / 2,
        CARD_W, CARD_H, 18
      );
      this._cardStack.add(shadow);
    }

    // 最上层当前卡
    const topBg = this.add.graphics();
    topBg.fillStyle(THEME.cardBg, 1);
    topBg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 18);
    topBg.lineStyle(3, THEME.cardStroke, 1);
    topBg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 18);

    // 优先显示 PNG 图标，fallback 到 emoji
    let iconObj;
    if (this.textures.exists(card.iconKey)) {
      const img = this.add.image(0, -30, card.iconKey).setOrigin(0.5);
      // 限制最大尺寸为 80px，等比缩放
      const maxSize = 80;
      const tw = img.width;
      const th = img.height;
      if (tw > 0 && th > 0) {
        const scale = Math.min(maxSize / tw, maxSize / th);
        img.setScale(scale);
      }
      iconObj = img;
    } else {
      iconObj = this.add.text(0, -32, card.icon, {
        fontSize: '68px',
        align: 'center',
      }).setOrigin(0.5);
    }

    const labelText = this.add.text(0, 60, card.label, {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '30px',
      color: card.color,
      align: 'center',
    }).setOrigin(0.5);

    this._cardStack.add([topBg, iconObj, labelText]);
  }

  _bindKeys() {
    this._removeKeys();
    this._keyF = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this._keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);

    this._keyF.on('down', () => {
      if (this._gameActive) this._onAnswer(this._pairCards[0].id);
    });
    this._keyJ.on('down', () => {
      if (this._gameActive) this._onAnswer(this._pairCards[1].id);
    });
  }

  _startTimer() {
    this._stopTimer();
    this._timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: TOTAL_TIME - 1,
      callback: () => {
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        if (this._timeText) {
          this._timeText.setText(`时间：${this.timeLeft}s`);
        }
        if (this.timeLeft <= 0) {
          this._endGame();
        }
      },
    });
  }

    _slideCardAndNext(direction) {
    if (!this._cardStack || !this._gameActive) {
      this._drawStack();
      return;
    }

    this._isTransitioning = true;

    const startX = this._stackCX;
    const startY = this._stackCY;
    const targetX = startX + direction * 260;

    this.tweens.add({
      targets: this._cardStack,
      x: targetX,
      y: startY + 12,
      alpha: 0,
      angle: direction * 8,
      duration: 150,
      ease: 'Quad.easeIn',
      onComplete: () => {
        if (!this._gameActive) return;

        this._cardStack.x = startX;
        this._cardStack.y = startY;
        this._cardStack.alpha = 1;
        this._cardStack.angle = 0;

        this._drawStack();
        this._isTransitioning = false;
      },
    });
  }

    _onAnswer(cardId) {
    if (!this._gameActive || this.timeLeft <= 0 || this._isTransitioning) return;

    const correct = this._currentCard && this._currentCard.id === cardId;

    const direction = cardId === this._pairCards[0].id ? -1 : 1;

    if (correct) {
      this.score += 1;
      if (this._scoreText) this._scoreText.setText(`得分：${this.score}`);

      this._slideCardAndNext(direction);
      return;
    }

    this.wrongCount += 1;
    if (this._wrongText) this._wrongText.setText(`错误：${this.wrongCount}`);

    this.timeLeft = Math.max(0, this.timeLeft - 2);
    if (this._timeText) this._timeText.setText(`时间：${this.timeLeft}s`);

    if (this.timeLeft <= 0) {
      this._endGame();
      return;
    }

    this._slideCardAndNext(direction);
  }

  // ─── 结算 ────────────────────────────────────────────────────────────────

  _endGame() {
    this._stopTimer();
    this._gameActive = false;
    this._removeKeys();
    this._showFinal();
  }

    _getRating() {
    if (this.score >= 20) return 'success';
    if (this.score >= 10) return 'normal';
    return 'fail';
  }

  _showFinal() {
    this._clearUi();

    const rating      = this._getRating();
    const ratingLabel = rating === 'success' ? '成功' : rating === 'normal' ? '普通' : '失误';

    this._addText(GAME_W / 2, this.panelY + 54, '户外小院：沟通卡快反', {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });

    this._addText(GAME_W / 2, this.panelY + 120, `总评：${ratingLabel}`, {
      fontSize: '28px',
      align: 'center',
      origin: 0.5,
      color: THEME.subText,
    });

    this._addText(GAME_W / 2, this.panelY + 180, `答对：${this.score}　　答错：${this.wrongCount}`, {
      fontSize: '22px',
      align: 'center',
      origin: 0.5,
      color: THEME.subText,
    });

    this._addText(GAME_W / 2, this.panelY + 310, FINAL_TEXTS[rating], {
      fontSize: '21px',
      align: 'center',
      origin: 0.5,
      wordWrap: this.panelW - 120,
      lineSpacing: 9,
    });

    const doneBtn = this._makeButton(
      GAME_W / 2, this.panelY + 490, 180, 50,
      '完成',
      () => this._completeMinigame(rating),
      { fontSize: '20px' }
    );
    this.ui.add(doneBtn);
  }

  _completeMinigame(rating) {
    const payload = {
      roomId:     this.roomId,
      minigameId: 'outdoorAAC',
      rating,
      score:      this.score,
      wrongCount: this.wrongCount,
    };

    const returnScene = this.scene.get(this.returnSceneKey);
    if (returnScene?.events) {
      returnScene.events.emit('minigame:complete', payload);
    }

    this.scene.stop();
  }

  // ─── 工具方法 ─────────────────────────────────────────────────────────────

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
