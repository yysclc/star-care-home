import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../../core/Constants.js';
import { ACTIVITY_STEP_CARDS } from '../../data/activityStepCards.js';
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
  emptyFill: 0xf0e4c8,
  button: 0xffe7aa,
  buttonHover: 0xffd980,
};

const GRID = 3;
const TILE_COUNT = GRID * GRID;
const PIECE_COUNT = TILE_COUNT - 1;
const BLANK_ID = PIECE_COUNT;
const TIME_LIMIT = 45;
const SHUFFLE_STEPS = 50;
const SLIDE_MS = 150;

const FEEDBACK_TEXT = {
  success: '步骤卡恢复清楚了，孩子更容易看见活动从开始到结束的过程。',
  normal: '步骤流程大致清楚，但仍有几处需要照护者补充提醒。',
  fail: '步骤卡仍然混乱，孩子可能还是不知道接下来会发生什么。',
};

function buildNeighbours() {
  const nb = [];

  for (let i = 0; i < TILE_COUNT; i += 1) {
    const row = Math.floor(i / GRID);
    const col = i % GRID;
    const adj = [];

    if (row > 0) adj.push(i - GRID);
    if (row < GRID - 1) adj.push(i + GRID);
    if (col > 0) adj.push(i - 1);
    if (col < GRID - 1) adj.push(i + 1);

    nb.push(adj);
  }

  return nb;
}

const NEIGHBOURS = buildNeighbours();

export default class ActivityStepPuzzleScene extends Phaser.Scene {
  constructor() {
    super('ActivityStepPuzzleScene');
  }

  init(data = {}) {
    this.roomId = data.roomId ?? 'activityRoom';
    this.returnSceneKey = data.returnSceneKey ?? 'FixedActionScene';

    this.selectedCard = null;
    this.availableCards = [];

    this.timeLeft = TIME_LIMIT;
    this.correctCount = 0;
    this.moveCount = 0;
    this.finalRating = 'normal';
    this.isGameEnded = false;
    this.isAnimating = false;

    this.board = [];
    this.blankSlot = BLANK_ID;

    this.sprites = [];

    this.timerEvent = null;

    this.overlay = null;
    this.ui = null;
    this.puzzleContainer = null;

    this.timeText = null;
    this.correctText = null;
    this.moveText = null;

    this.boardLeft = 0;
    this.boardTop = 0;
    this.tileSize = 0;
    this.gap = 4;

    this.emptyCell = null;
    this.srcInfo = null;
  }

  preload() {
    ResourceManager.loadPack(this, 'minigameActivityStep', { silent: true });
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

    this.availableCards = ACTIVITY_STEP_CARDS.filter((card) => this.textures.exists(card.key));

    this.showIntro();
  }

  _cleanup() {
    this._stopTimer();

    if (this.tweens) {
      this.tweens.killAll();
    }

    this.sprites = [];
    this.emptyCell = null;
    this.timeText = null;
    this.correctText = null;
    this.moveText = null;
    this.puzzleContainer = null;

    if (this.overlay) {
      this.overlay.destroy(true);
      this.overlay = null;
    }

    this.ui = null;
  }

  _stopTimer() {
    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = null;
    }
  }

  _clearUi() {
    this._stopTimer();

    this.sprites = [];
    this.emptyCell = null;
    this.timeText = null;
    this.correctText = null;
    this.moveText = null;
    this.puzzleContainer = null;

    if (this.ui) {
      this.ui.removeAll(true);
    }
  }

  showIntro() {
    this._clearUi();

    this.addText(GAME_W / 2, this.panelY + 46, '活动室：步骤卡拼图', {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });

    this.addText(
  GAME_W / 2,
  this.panelY + 130,
  '视觉支持：把活动流程变成孩子可以看见、反复确认的步骤卡，帮助孩子知道现在做什么、接下来做什么、什么时候结束。\n\n规则：点击步骤卡进行移动，把被打乱的活动流程拼回正确顺序。',
  {
    fontSize: '20px',
    align: 'center',
    origin: [0.5, 0],
    wordWrap: this.panelW - 140,
    lineSpacing: 12,
  }
);

    const btn = this.makeButton(
      GAME_W / 2,
      this.panelY + 470,
      200,
      52,
      '开始拼图',
      () => this.startPuzzle()
    );

    this.ui.add(btn);
  }

  startPuzzle() {
    if (!this.availableCards.length) {
      this.showAssetMissing();
      return;
    }

    this.timeLeft = TIME_LIMIT;
    this.moveCount = 0;
    this.isGameEnded = false;
    this.isAnimating = false;

    const idx = Math.floor(Math.random() * this.availableCards.length);
    this.selectedCard = this.availableCards[idx];

    if (!this._buildSrcInfo()) {
      this.showAssetMissing();
      return;
    }

    if (!this._ensurePieceFrames()) {
      this.showAssetMissing();
      return;
    }

    this._buildBoard();
    this.showPuzzle();
    this._startTimer();
  }

  _buildSrcInfo() {
    const tex = this.textures.get(this.selectedCard.key);
    const src = tex?.getSourceImage();

    if (!src?.width || !src?.height) return false;

    const sourceSize = Math.min(src.width, src.height);
    const sourceX = Math.floor((src.width - sourceSize) / 2);
    const sourceY = Math.floor((src.height - sourceSize) / 2);
    const cropSize = Math.floor(sourceSize / GRID);

    this.srcInfo = {
      sourceX,
      sourceY,
      sourceSize,
      cropSize,
    };

    return true;
  }

  _pieceFrameName(pieceId) {
    return `${this.selectedCard.key}_piece_${pieceId}`;
  }

    _previewFrameName() {
    return `${this.selectedCard.key}_preview_full`;
  }

  _ensurePreviewFrame() {
    const tex = this.textures.get(this.selectedCard.key);

    if (!tex || !this.srcInfo) return false;

    const frameName = this._previewFrameName();

    if (typeof tex.has === 'function' && tex.has(frameName)) return true;
    if (tex.frames?.[frameName]) return true;

    const { sourceX, sourceY, sourceSize } = this.srcInfo;

    tex.add(
      frameName,
      0,
      Math.round(sourceX),
      Math.round(sourceY),
      Math.round(sourceSize),
      Math.round(sourceSize)
    );

    return true;
  }

  _ensurePieceFrames() {
    const tex = this.textures.get(this.selectedCard.key);

    if (!tex || !this.srcInfo) return false;

    const { sourceX, sourceY, cropSize } = this.srcInfo;

    for (let pieceId = 0; pieceId < PIECE_COUNT; pieceId += 1) {
      const frameName = this._pieceFrameName(pieceId);

      if (typeof tex.has === 'function' && tex.has(frameName)) continue;
      if (tex.frames?.[frameName]) continue;

      const col = pieceId % GRID;
      const row = Math.floor(pieceId / GRID);
      const frameX = Math.round(sourceX + col * cropSize);
      const frameY = Math.round(sourceY + row * cropSize);

      tex.add(frameName, 0, frameX, frameY, cropSize, cropSize);
    }

    return true;
  }

  _buildBoard() {
    this.board = Array.from({ length: TILE_COUNT }, (_, i) => i);
    this.blankSlot = BLANK_ID;
    this._shuffle();
    this._recalcCorrect();
  }

  _shuffle() {
    let lastSlot = -1;

    for (let s = 0; s < SHUFFLE_STEPS; s += 1) {
      const adj = NEIGHBOURS[this.blankSlot].filter((n) => n !== lastSlot);
      const nextSlot = adj[Math.floor(Math.random() * adj.length)];

      this.board[this.blankSlot] = this.board[nextSlot];
      this.board[nextSlot] = BLANK_ID;

      lastSlot = this.blankSlot;
      this.blankSlot = nextSlot;
    }

    if (this.correctCount >= PIECE_COUNT) {
      this._shuffle();
    }
  }

  showPuzzle() {
    this._clearUi();

    this.addText(GAME_W / 2, this.panelY + 46, '活动室：步骤卡拼图', {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });

    this.timeText = this.addText(this.panelX + 36, this.panelY + 96, `时间：${this.timeLeft} 秒`, {
      fontSize: '20px',
      align: 'left',
      origin: [0, 0.5],
    });

    this.correctText = this.addText(GAME_W / 2, this.panelY + 96, `正确：${this.correctCount}/8`, {
      fontSize: '20px',
      align: 'center',
      origin: [0.5, 0.5],
    });

    this.moveText = this.addText(this.panelX + this.panelW - 36, this.panelY + 96, `步数：${this.moveCount}`, {
      fontSize: '20px',
      align: 'right',
      origin: [1, 0.5],
    });

    this.addText(GAME_W / 2, this.panelY + this.panelH - 52, '点击与空格相邻的碎片将其滑入。', {
      fontSize: '18px',
      align: 'center',
      origin: 0.5,
      color: THEME.subText,
    });

    const puzzleSize = Math.min(this.panelW - 180, this.panelH - 220);
    this.gap = 4;
    this.tileSize = Math.floor((puzzleSize - this.gap * (GRID - 1)) / GRID);

    const realSize = this.tileSize * GRID + this.gap * (GRID - 1);

    this.boardLeft = Math.round((GAME_W - realSize) / 2);
    this.boardTop = Math.round(this.panelY + 118);

    this.puzzleContainer = this.add.container(0, 0);
    this.ui.add(this.puzzleContainer);

    const bg = this.add.graphics();
    bg.fillStyle(THEME.emptyFill, 1);
    bg.fillRoundedRect(this.boardLeft - 8, this.boardTop - 8, realSize + 16, realSize + 16, 14);
    bg.lineStyle(2, THEME.strokeDark, 0.5);
    bg.strokeRoundedRect(this.boardLeft - 8, this.boardTop - 8, realSize + 16, realSize + 16, 14);
    this.puzzleContainer.add(bg);

    this.emptyCell = this.add.graphics();
    this._drawEmptyCell();
    this.puzzleContainer.add(this.emptyCell);

    this.sprites = [];

    for (let pieceId = 0; pieceId < PIECE_COUNT; pieceId += 1) {
      const slotIndex = this.board.indexOf(pieceId);
      const pos = this._slotPos(slotIndex);
      const frameName = this._pieceFrameName(pieceId);

      const img = this.add
        .image(pos.x, pos.y, this.selectedCard.key, frameName)
        .setOrigin(0, 0)
        .setDisplaySize(this.tileSize, this.tileSize);

      img.setInteractive({ useHandCursor: true });

      this.sprites[pieceId] = {
        img,
        slotIndex,
      };

      this.puzzleContainer.add(img);
    }

    this._rebindInteraction();
  }

  _rebindInteraction() {
    for (let pieceId = 0; pieceId < PIECE_COUNT; pieceId += 1) {
      const entry = this.sprites[pieceId];
      if (!entry) continue;

      entry.img.removeAllListeners('pointerdown');

      const capturedPieceId = pieceId;

      entry.img.on('pointerdown', (_p, _lx, _ly, event) => {
        event?.stopPropagation?.();
        this._onPieceClick(this.sprites[capturedPieceId].slotIndex);
      });
    }
  }

  _drawEmptyCell() {
    if (!this.emptyCell) return;

    const pos = this._slotPos(this.blankSlot);
    const sz = this.tileSize;

    this.emptyCell.clear();
    this.emptyCell.fillStyle(THEME.emptyFill, 1);
    this.emptyCell.fillRoundedRect(pos.x, pos.y, sz, sz, 6);
    this.emptyCell.lineStyle(1.5, THEME.strokeDark, 0.28);
    this.emptyCell.strokeRoundedRect(pos.x, pos.y, sz, sz, 6);
  }

  _onPieceClick(slotIndex) {
    if (this.isGameEnded || this.isAnimating) return;

    if (!NEIGHBOURS[this.blankSlot].includes(slotIndex)) {
      return;
    }

    this._slidePiece(slotIndex);
  }

  _slidePiece(pieceSlot) {
    const pieceId = this.board[pieceSlot];

    if (pieceId === BLANK_ID) return;

    const entry = this.sprites[pieceId];
    if (!entry) return;

    const targetPos = this._slotPos(this.blankSlot);

    this.isAnimating = true;

    this.tweens.add({
      targets: entry.img,
      x: targetPos.x,
      y: targetPos.y,
      duration: SLIDE_MS,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.board[this.blankSlot] = pieceId;
        this.board[pieceSlot] = BLANK_ID;

        entry.slotIndex = this.blankSlot;
        this.blankSlot = pieceSlot;

        this.moveCount += 1;

        this._drawEmptyCell();
        this._recalcCorrect();
        this._updateHUD();

        this.isAnimating = false;

        if (this.correctCount >= PIECE_COUNT) {
  this.showSolvedPreview();
}
      },
    });
  }

  _recalcCorrect() {
    let count = 0;

    for (let slot = 0; slot < PIECE_COUNT; slot += 1) {
      if (this.board[slot] === slot) count += 1;
    }

    this.correctCount = count;
  }

  _updateHUD() {
    if (this.correctText) this.correctText.setText(`正确：${this.correctCount}/8`);
    if (this.moveText) this.moveText.setText(`步数：${this.moveCount}`);
  }

  _startTimer() {
    this._stopTimer();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.isGameEnded) return;

        this.timeLeft -= 1;

        if (this.timeText) {
          this.timeText.setText(`时间：${Math.max(this.timeLeft, 0)} 秒`);
        }

        if (this.timeLeft <= 0) {
          this.finishPuzzle();
        }
      },
    });
  }

  showSolvedPreview() {
    this.finishPuzzle();
  }

  finishPuzzle() {
    if (this.isGameEnded) return;

    this.isGameEnded = true;
    this._stopTimer();

    const rating = this._getRating(this.correctCount);
    this.finalRating = rating;
    this.showResult(rating);
  }

  _getRating(correctCount) {
    if (correctCount >= PIECE_COUNT) return 'success';
    if (correctCount >= 5) return 'normal';
    return 'fail';
  }

  showResult(rating) {
    this._clearUi();

    const ratingLabel = {
      success: '成功',
      normal: '普通',
      fail: '失误',
    }[rating];

    this.addText(GAME_W / 2, this.panelY + 54, '活动室：步骤卡拼图', {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });

    this.addText(GAME_W / 2, this.panelY + 130, `总评：${ratingLabel}`, {
      fontSize: '28px',
      align: 'center',
      origin: 0.5,
      color: THEME.subText,
    });

    this.addText(GAME_W / 2, this.panelY + 188, `正确块数：${this.correctCount}/8`, {
      fontSize: '21px',
      align: 'center',
      origin: 0.5,
    });

    this.addText(GAME_W / 2, this.panelY + 232, `完成步数：${this.moveCount}`, {
      fontSize: '21px',
      align: 'center',
      origin: 0.5,
      color: THEME.subText,
    });

    this.addText(GAME_W / 2, this.panelY + 320, FEEDBACK_TEXT[rating], {
      fontSize: '20px',
      align: 'center',
      origin: 0.5,
      wordWrap: this.panelW - 140,
      lineSpacing: 8,
    });

    const doneBtn = this.makeButton(
      GAME_W / 2,
      this.panelY + 492,
      160,
      52,
      '完成',
      () => this.completeMinigame(rating, this.correctCount)
    );

    this.ui.add(doneBtn);
  }

  showAssetMissing() {
    this._clearUi();

    this.correctCount = 0;
    this.finalRating = 'fail';

    this.addText(GAME_W / 2, this.panelY + 54, '活动室：步骤卡拼图', {
      fontSize: '26px',
      align: 'center',
      origin: 0.5,
    });

    this.addText(GAME_W / 2, GAME_H / 2, '步骤卡图片未加载，请检查资源路径。', {
      fontSize: '22px',
      align: 'center',
      origin: 0.5,
      wordWrap: this.panelW - 140,
      lineSpacing: 8,
    });

    const btn = this.makeButton(
      GAME_W / 2,
      this.panelY + 492,
      160,
      52,
      '完成',
      () => this.completeMinigame('fail', 0)
    );

    this.ui.add(btn);
  }

  completeMinigame(rating, correctCount) {
    const payload = {
      roomId: this.roomId,
      minigameId: 'activityStepPuzzle',
      rating,
      correctCount,
      moveCount: this.moveCount,
      cardKey: this.selectedCard?.key ?? null,
    };

    const returnScene = this.scene.get(this.returnSceneKey);

    if (returnScene?.events) {
      returnScene.events.emit('minigame:complete', payload);
    }

    this.scene.stop();
  }

  _slotPos(slotIndex) {
    const col = slotIndex % GRID;
    const row = Math.floor(slotIndex / GRID);

    return {
      x: this.boardLeft + col * (this.tileSize + this.gap),
      y: this.boardTop + row * (this.tileSize + this.gap),
    };
  }

  addText(x, y, text, opts = {}) {
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

  makeButton(x, y, w, h, label, onClick, opts = {}) {
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
