import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../../core/Constants.js';

const THEME = {
  overlay:     0x6b4426,
  panel:       0xfff3d2,
  panelLight:  0xffffeb,
  stroke:      0x9a6a3a,
  strokeDark:  0x6b3f1f,
  text:        '#5b3419',
  subText:     '#7a4a25',
  button:      0xffe7aa,
  buttonHover: 0xffd980,
  cardBg:      0xfffbeb,
  cardStroke:  0xc8914a,
  cardCorrect: 0x4caf50,
  cardWrong:   0xe53935,
};

// ─── 词库 ────────────────────────────────────────────────────────────────────
const WORD_BANKS = [
  {
    label: '图书室里的东西',
    prompt: '这一组大多是图书室里的东西，找出不一样的词。',
    same: ['书本', '绘本', '书架', '书签', '书袋', '卡片', '书柜', '椅子', '书桌', '图卡'],
    odd:  ['牙刷', '饭盒', '拖鞋', '雨伞', '锅铲', '枕头', '球拍', '肥皂'],
  },
  {
    label: '图书室里会做的动作',
    prompt: '这一组大多是图书室里会做的动作，找出不一样的词。',
    same: ['选书', '看书', '翻页', '坐下', '放回', '读书', '借书', '阅读', '轻声', '排队', '归还'],
    odd:  ['奔跑', '尖叫', '抢夺', '乱扔', '推人', '打闹', '跳床', '拍球'],
  },
  {
    label: '安静舒服的状态',
    prompt: '这一组大多是安静舒服的状态，找出不一样的词。',
    same: ['安静', '轻柔', '放松', '舒服', '稳定', '缓慢', '平稳', '柔和', '专心', '安心', '温和'],
    odd:  ['吵闹', '刺眼', '混乱', '拥挤', '急促', '紧张', '突然', '刺耳'],
  },
  {
    label: '可以帮助孩子的东西',
    prompt: '这一组大多是可以帮助孩子的物品和事情，找出不一样的词。',
    same: ['休息卡', '图卡', '日程表', '选择卡', '坐垫', '安静角', '提示卡', '书签', '耳罩', '靠垫', '老师', '书架'],
    odd:  ['催促', '责备', '惩罚', '命令', '忽略', '抢走', '大喊', '逼迫'],
  },
];
const TOTAL_ROUNDS  = 5;
const ROUND_TIME    = 6;

const CARD_W = 92;
const CARD_H = 42;

const FINAL_TEXTS = {
  success: '你把混乱的信息整理清楚了。孩子进入图书室前，更容易知道这里有什么、可以做什么，以及什么时候结束。',
  normal:  '你找出了大部分不合适的词卡。图书室预告已经比较清楚，但仍有一些信息需要照护者再整理。',
  fail:    '词卡里还混着不少不合适的信息。孩子可能仍然分不清接下来会发生什么，需要更清楚、更一致的情境预告。',
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleN(arr, n) {
  return shuffle(arr).slice(0, n);
}

// 在给定矩形区域内随机放置 n 张不重叠词卡
function generatePositions(n, areaX, areaY, areaW, areaH, cardW, cardH, padding) {
  const positions = [];
  const maxTries  = 200;

  for (let i = 0; i < n; i++) {
    let placed = false;
    for (let t = 0; t < maxTries; t++) {
      const x = areaX + padding + Math.random() * (areaW - cardW - padding * 2);
      const y = areaY + padding + Math.random() * (areaH - cardH - padding * 2);

      let overlap = false;
      for (const p of positions) {
        if (
          Math.abs(p.x - x) < cardW + 8 &&
          Math.abs(p.y - y) < cardH + 8
        ) {
          overlap = true;
          break;
        }
      }
      if (!overlap) {
        positions.push({ x, y });
        placed = true;
        break;
      }
    }
    // fallback：均匀网格
    if (!placed) {
      const cols = 5;
      const row  = Math.floor(i / cols);
      const col  = i % cols;
      positions.push({
        x: areaX + padding + col * (cardW + 10),
        y: areaY + padding + row * (cardH + 10),
      });
    }
  }
  return positions;
}

// ─── Scene ───────────────────────────────────────────────────────────────────
export default class LibraryOddWordScene extends Phaser.Scene {
  constructor() {
    super('LibraryOddWordScene');
  }

  init(data = {}) {
    this.roomId          = data.roomId         ?? 'library';
    this.returnSceneKey  = data.returnSceneKey  ?? 'FixedActionScene';

    this.correctCount    = 0;
    this.wrongCount      = 0;
    this._round          = 0;
    this._timeLeft       = ROUND_TIME;
    this._timerEvent     = null;
    this._gameActive     = false;
    this._answering      = false;

    this.overlay = null;
    this.ui      = null;

    // 面板尺寸（在 create 里计算）
    this.panelX = 0;
    this.panelY = 0;
    this.panelW = 0;
    this.panelH = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    this.overlay = this.add.container(0, 0).setDepth(1000);

    // 半透明遮罩
    const blocker = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, THEME.overlay, 0.42)
      .setInteractive();
    blocker.on('pointerdown', (_p, _lx, _ly, event) => event?.stopPropagation?.());
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
    if (this.overlay) {
      this.overlay.destroy(true);
      this.overlay = null;
    }
    this.ui = null;
  }

  _clearUi() {
    if (this.ui) this.ui.removeAll(true);
    this._timeText    = null;
    this._roundText   = null;
    this._correctText = null;
    this._wrongText   = null;
  }

  _stopTimer() {
    if (this._timerEvent) {
      this._timerEvent.remove(false);
      this._timerEvent = null;
    }
  }

  // ─── 说明页 ───────────────────────────────────────────────────────────────

  _showIntro() {
    this._clearUi();
    this._gameActive = false;

    this._addText(GAME_W / 2, this.panelY + 46, '图书室：预告词卡找异类', {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });

const body = [
  '情境预告：在进入新场景前，先把环境、流程和可能发生的事说清楚，帮助孩子提前有心理准备。',
  '',
  '比如图书室里有什么、接下来会做什么、需要安静时怎么办、不舒服时可以怎么表达、活动什么时候结束。',
  '',
  '规则：观察这一组词卡，点击那个“不属于这一组”的词。',
].join('\n');
    this._addText(GAME_W / 2, this.panelY + 150, body, {
      fontSize: '20px',
      align: 'center',
      origin: [0.5, 0],
      wordWrap: this.panelW - 140,
      lineSpacing: 10,
    });

    const startBtn = this._makeButton(
      GAME_W / 2, this.panelY + 490, 200, 52,
      '开始',
      () => this._startGame()
    );
    this.ui.add(startBtn);
  }

  // ─── 游戏页 ───────────────────────────────────────────────────────────────

  _startGame() {
    this.correctCount = 0;
    this.wrongCount   = 0;
    this._round       = 0;
    this._gameActive  = true;
    this._nextRound();
  }

  _nextRound() {
    if (this._round >= TOTAL_ROUNDS) {
      this._endGame();
      return;
    }

    this._round++;
    this._timeLeft  = ROUND_TIME;
    this._answering = false;

    this._buildRoundUi();
    this._startRoundTimer();
  }

  _buildRoundUi() {
    this._clearUi();

    // ── 标题 ──
    this._addText(GAME_W / 2, this.panelY + 46, '图书室：预告词卡找异类', {
      fontSize: '22px',
      align: 'center',
      origin: 0.5,
    });

    // ── 状态行 ──
    this._roundText = this._addText(
      this.panelX + 52, this.panelY + 100,
      `第 ${this._round} / ${TOTAL_ROUNDS} 轮`,
      { fontSize: '19px', origin: [0, 0.5] }
    );
    this._timeText = this._addText(
      GAME_W / 2, this.panelY + 100,
      `时间：${this._timeLeft}s`,
      { fontSize: '19px', align: 'center', origin: [0.5, 0.5] }
    );
    this._correctText = this._addText(
      this.panelX + this.panelW - 52, this.panelY + 100,
      `找对：${this.correctCount}`,
      { fontSize: '19px', origin: [1, 0.5] }
    );

    // 词库
const bank = pick(WORD_BANKS);

// ── 提示文字 ──
this._addText(GAME_W / 2, this.panelY + 138, bank.prompt, {
  fontSize: '18px',
  align: 'center',
  origin: 0.5,
  color: THEME.subText,
  wordWrap: this.panelW - 120,
});

// ── 词卡板 ──
const boardX = this.panelX + 24;
const boardY = this.panelY + 162;
const boardW = this.panelW - 48;
const boardH = 340;

const sameArr = sampleN(bank.same, 9);
const oddWord = pick(bank.odd);

    const words = shuffle([...sameArr.map(w => ({ word: w, isOdd: false })), { word: oddWord, isOdd: true }]);

    const positions = generatePositions(10, boardX, boardY, boardW, boardH, CARD_W, CARD_H, 6);

    words.forEach((item, idx) => {
      const { x, y }  = positions[idx];
      const cx = x + CARD_W / 2;
      const cy = y + CARD_H / 2;

      const cardContainer = this.add.container(cx, cy);

      const bg = this.add.graphics();
      bg.fillStyle(THEME.cardBg, 1);
      bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
      bg.lineStyle(2, THEME.cardStroke, 1);
      bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);

      const label = this.add.text(0, 0, item.word, {
        fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
        fontSize: '18px',
        color: THEME.text,
        align: 'center',
      }).setOrigin(0.5);

      const zone = this.add
        .zone(0, 0, CARD_W, CARD_H)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerover', () => {
        if (!this._answering) {
          bg.clear();
          bg.fillStyle(0xfff0c0, 1);
          bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
          bg.lineStyle(2, THEME.cardStroke, 1);
          bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
        }
      });
      zone.on('pointerout', () => {
        if (!this._answering) {
          bg.clear();
          bg.fillStyle(THEME.cardBg, 1);
          bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
          bg.lineStyle(2, THEME.cardStroke, 1);
          bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
        }
      });

      zone.on('pointerdown', (_p, _lx, _ly, event) => {
        event?.stopPropagation?.();
        if (!this._gameActive || this._answering) return;
        this._onCardClick(item.isOdd, bg);
      });

      cardContainer.add([bg, label, zone]);
      this.ui.add(cardContainer);
    });
  }

  _onCardClick(isOdd, bg) {
    this._answering = true;
    this._stopTimer();

    if (isOdd) {
      this.correctCount++;
      if (this._correctText) this._correctText.setText(`找对：${this.correctCount}`);
      // 绿边反馈
      bg.clear();
      bg.fillStyle(0xd4f5d4, 1);
      bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
      bg.lineStyle(3, THEME.cardCorrect, 1);
      bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
    } else {
      this.wrongCount++;
      if (this._wrongText) this._wrongText.setText(`错误：${this.wrongCount}`);
      // 红边反馈
      bg.clear();
      bg.fillStyle(0xfde8e8, 1);
      bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
      bg.lineStyle(3, THEME.cardWrong, 1);
      bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
    }

    this.time.delayedCall(320, () => {
      if (this._gameActive) this._nextRound();
    });
  }

  _startRoundTimer() {
    this._stopTimer();
    this._timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: ROUND_TIME - 1,
      callback: () => {
        this._timeLeft = Math.max(0, this._timeLeft - 1);
        if (this._timeText) this._timeText.setText(`时间：${this._timeLeft}s`);

        if (this._timeLeft <= 0 && !this._answering) {
          this._answering = true;
          this.wrongCount++;
          if (this._wrongText) this._wrongText.setText(`错误：${this.wrongCount}`);
          this.time.delayedCall(200, () => {
            if (this._gameActive) this._nextRound();
          });
        }
      },
    });
  }

  // ─── 结算 ─────────────────────────────────────────────────────────────────

  _endGame() {
    this._stopTimer();
    this._gameActive = false;
    this._showFinal();
  }

  _getRating() {
  if (this.correctCount >= 4) return 'success';
  if (this.correctCount >= 2) return 'normal';
  return 'fail';
}

  _showFinal() {
    this._clearUi();

    const rating      = this._getRating();
    const ratingLabel = rating === 'success' ? '成功' : rating === 'normal' ? '普通' : '失误';

    this._addText(GAME_W / 2, this.panelY + 54, '图书室：预告词卡找异类', {
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

    this._addText(
      GAME_W / 2, this.panelY + 182,
      `找对：${this.correctCount}　　错误：${this.wrongCount}`,
      { fontSize: '22px', align: 'center', origin: 0.5, color: THEME.subText }
    );

    this._addText(GAME_W / 2, this.panelY + 315, FINAL_TEXTS[rating], {
      fontSize: '20px',
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
      roomId:       this.roomId,
      minigameId:   'libraryOddWord',
      rating,
      correctCount: this.correctCount,
      wrongCount:   this.wrongCount,
    };

    const returnScene = this.scene.get(this.returnSceneKey);
    if (returnScene?.events) {
      returnScene.events.emit('minigame:complete', payload);
    }

    this.scene.stop();
  }

  // ─── 工具方法 ──────────────────────────────────────────────────────────────

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

    zone.on('pointerover',  () => draw(THEME.buttonHover));
    zone.on('pointerout',   () => draw(THEME.button));
    zone.on('pointerdown',  (_p, _lx, _ly, event) => {
      event?.stopPropagation?.();
      onClick?.();
    });

    container.add([bg, text, zone]);
    return container;
  }
}
