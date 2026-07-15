import Phaser from 'phaser';
import { ASSET_KEYS, ASSET_PATHS, GAME_W, GAME_H, TEXT_STYLE } from '../core/Constants.js';
import { normalizeState, syncActionCapacity } from '../core/GameState.js';
import { DIALOGS_FIXED } from '../data/dialogs_fixed.js';
import DialogBox from '../ui/DialogBox.js';
import ChoicePanel from '../ui/ChoicePanel.js';
import StoryPlayer from '../ui/StoryPlayer.js';
import StoryPortraitController from '../ui/StoryPortraitController.js';
import { makeCoverBackground, makeButton, makeLabel } from '../ui/widgets.js';
import ResourceManager from '../core/ResourceManager.js';
import AudioManager from '../systems/AudioManager.js';

// ─── 序章常量 ───────────────────────────────────────────
const TOTAL_ATTR_POINTS = 50;
const ATTR_STEP = 10;

export default class PrologueScene extends Phaser.Scene {
  constructor() {
    super('PrologueScene');
  }

  init(data) {
    this.gs = normalizeState(data?.gs);
    // 序章临时状态
    this._allocAttrs = { professional: 0, communication: 0, physical: 0 };
    this._bgImage = null;
    this._attrElems = [];
    this._attrConfirmBtn = null;
  }

  preload() {
    ResourceManager.queueImage(this, ASSET_KEYS.bedroom, ASSET_PATHS.bedroom);
    ResourceManager.queueImage(this, ASSET_KEYS.bedroom2, ASSET_PATHS.bedroom2);
  }

  create() {
    AudioManager.playBgm('story_soft_bgm');
    this._bgImage = makeCoverBackground(this, ASSET_KEYS.bedroom, 0.04);
    this.dialog = new DialogBox(this);
    this.choice = new ChoicePanel(this);
    this.story = new StoryPlayer(this, this.dialog);
    this.storyPortrait = new StoryPortraitController(this, this.gs);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.storyPortrait?.destroy?.();
    });
    // 后台静默预加载 week1，不阻塞序章流程
    ResourceManager.preloadNextPack(this, 'prologue');
    this.step0_intro();
  }

  playStoryLines(lines, onDone, opts = {}) {
    this.story.play([{ type: 'dialog', lines, opts }], onDone);
  }

  // ─── 工具：切换背景图 ────────────────────────────────────
  _switchBg(key, alpha = 0.04) {
    if (this._bgImage) {
      this._bgImage.destroy();
    }
    this._bgImage = makeCoverBackground(this, key, alpha);
  }

  // ─── Step 0：卧室旁白 ────────────────────────────────────
step0_intro() {
  this.story.play([
    { type: 'dialog', lines: DIALOGS_FIXED.prologue.intro },
    { type: 'action', run: () => this._switchBg(ASSET_KEYS.bedroom2, 0.06) },
    { type: 'dialog', lines: DIALOGS_FIXED.prologue.pigeonArrival },
  ], () => this.step1_showEnvelopeButton());
}

// ─── Step 1：切换 bedroom2，鸽子（信封）飞入 ─────────────
step1_pigeonArrive() {
  this._switchBg(ASSET_KEYS.bedroom2, 0.06);
  this.playStoryLines(DIALOGS_FIXED.prologue.pigeonArrival, () => {
    this.step1_showEnvelopeButton();
  });
  return;

  this.playStoryLines([
    '直到那天早上，一只鸽子从窗户飞了进来。',
    '它停了下来，只把一封信留在书桌上。',
    '牛皮纸信封，手写地址，字迹工整得像用尺子比着写的。',
    '信封上贴着一枚橙色印章，有一颗星星。'
  ], () => {
    this.step1_showEnvelopeButton();
  });
}

step1_showEnvelopeButton() {
  const hint = makeLabel(this, GAME_W / 2, GAME_H / 2 - 20,
    '——桌上多了一封信——', {
      fontSize: '24px',
      color: '#f6d48a',
      align: 'center',
    }
  ).setOrigin(0.5).setAlpha(0).setDepth(20);

  this.tweens.add({ targets: hint, alpha: 1, duration: 800, ease: 'Sine.easeIn' });

  let envelopeBtn = null;

  envelopeBtn = makeButton(
    this, GAME_W / 2, GAME_H / 2 - 70,
    100, 42, '打开信件',
    () => {
      hint.destroy();

      if (envelopeBtn) {
        envelopeBtn.destroy();
        envelopeBtn = null;
      }

      this.time.delayedCall(50, () => this.step2_letter());
    },
    { fill: 0xfff7df, hover: 0xffe7aa, stroke: 0xa46b36, textColor: '#5b3419', fontSize: '20px', radius: 16 }
  );

  envelopeBtn.setAlpha(0).setDepth(20);
  

  this.tweens.add({ targets: envelopeBtn, alpha: 1, duration: 600, delay: 400, ease: 'Sine.easeIn' });
}
  // ─── Step 2：展开信件 ─────────────────────────────────────
  step2_letter() {
  this.dialog.open = false;

  const elems = [];

  // 半透明遮罩
  const mask = this.add.rectangle(
    GAME_W / 2,
    GAME_H / 2,
    GAME_W,
    GAME_H,
    0x000000,
    0.28
  ).setDepth(80);
  elems.push(mask);

  // 信纸阴影
  const shadow = this.add.graphics().setDepth(81);
  shadow.fillStyle(0x3b2414, 0.25);
  shadow.fillRoundedRect(GAME_W / 2 - 350 + 8, GAME_H / 2 - 210 + 10, 700, 420, 22);
  elems.push(shadow);

  // 信纸主体
  const paper = this.add.graphics().setDepth(82);
  paper.fillStyle(0xfff5d8, 0.98);
  paper.fillRoundedRect(GAME_W / 2 - 350, GAME_H / 2 - 210, 700, 420, 22);
  paper.lineStyle(3, 0xa46b36, 0.9);
  paper.strokeRoundedRect(GAME_W / 2 - 350, GAME_H / 2 - 210, 700, 420, 22);

  // 内侧细边
  paper.lineStyle(1.5, 0xe6bf7a, 0.9);
  paper.strokeRoundedRect(GAME_W / 2 - 328, GAME_H / 2 - 188, 656, 376, 16);
  elems.push(paper);

  // 标题
  const title = this.add.text(GAME_W / 2, GAME_H / 2 - 165, '来自星星照护所的信', {
    ...TEXT_STYLE,
    fontSize: '24px',
    color: '#5b3419',
    align: 'center',
  }).setOrigin(0.5).setDepth(83);
  elems.push(title);

  // 信件正文
  const body = this.add.text(GAME_W / 2 - 285, GAME_H / 2 - 125, this._getLetterText(), {
    ...TEXT_STYLE,
    fontSize: '19px',
    color: '#4c2d18',
    lineSpacing: 8,
    wordWrap: { width: 570 },
  }).setOrigin(0, 0).setDepth(83);
  elems.push(body);

  // 印章 / 落款装饰
  const stamp = this.add.text(GAME_W / 2 + 205, GAME_H / 2 + 105, '✦', {
    fontSize: '34px',
    color: '#c96f34',
  }).setOrigin(0.5).setDepth(83);
  elems.push(stamp);

  // 折叠按钮
  let closeBtn = null;
  closeBtn = makeButton(
    this,
    GAME_W / 2 + 235,
    GAME_H / 2 + 165,
    120,
    42,
    '折叠',
    () => {
      elems.forEach(e => e.destroy());
      if (closeBtn) {
        closeBtn.destroy();
        closeBtn = null;
      }
      this.step3_letterReact();
    },
    {
      fill: 0xffe7aa,
      hover: 0xffd98a,
      stroke: 0xa46b36,
      textColor: '#5b3419',
      fontSize: '18px',
      radius: 14,
    }
  );
  closeBtn.setDepth(84);
}
_getLetterText() {
  const lines = DIALOGS_FIXED.prologue.letter || [];

  if (Array.isArray(lines)) {
    return lines.join('\n');
  }

  return String(lines || '');
}

  // ─── Step 3：对信件的反应 ─────────────────────────────────
  step3_letterReact() {
    this.choice.showVNChoice(
      ['你会怎么回应？'],
      [
        {
          label: '「去看看也无妨。」',
          action: () => {
            this.gs.player.prologueLetterReaction = 'normal';
            this.step5_gender();
          },
        },
        {
          label: '「这封信正是我需要的，尤其是星星印章很可爱。」',
          action: () => {
            this.gs.player.prologueLetterReaction = 'curious';
            this.step5_gender();
          },
        },
      ],
      { title: '你把信折回原来的样子。心里觉得这个所长可真是个怪人。', hudSafeTop: 0, choiceStartY: 200, choiceWidth: 620 }
    );
  }

  // ─── Step 5：选择性别 ─────────────────────────────────────
  step5_gender() {
    this.choice.showVNChoice(
      ['你的性别是？(仅影响后续画面和立绘呈现)'],
      [
        { label: '女性', action: () => { this.gs.player.gender = 'female'; this.step6_attrs(); } },
        { label: '男性', action: () => { this.gs.player.gender = 'male'; this.step6_attrs(); } },
      ]
    );
  }

  // ─── Step 6：50 点属性分配 UI ─────────────────────────────
  step6_attrs() {
  this._clearAttrElems();

  const alloc = this._allocAttrs;
    alloc.professional = 20;
    alloc.communication = 20;
    alloc.physical = 10;

    const ROWS = [
      { key: 'professional', label: '专业理解' },
      { key: 'communication', label: '沟通能力' },
      { key: 'physical', label: '体能经验' },
    ];

    const panelW = 560;
    const rowH = 52;
    const panelH = 60 + ROWS.length * rowH + 70;
    const panelX = GAME_W / 2 - panelW / 2;
    const panelY = GAME_H / 2 - panelH / 2;
    const elems = this._attrElems;

    const addAttrElem = (obj) => {
      if (!obj) return obj;
      elems.push(obj);
      if (this._attrLayer) {
        this._attrLayer.add(obj);
      }
      return obj;
    };

    // 面板
    const shadow = this.add.graphics();
    shadow.fillStyle(0x3b2414, 0.25);
    shadow.fillRoundedRect(panelX + 5, panelY + 7, panelW, panelH, 20);
    addAttrElem(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0xfff7df, 0.97);
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 20);
    bg.lineStyle(2.5, 0xa46b36, 0.95);
    bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 20);
    bg.lineStyle(1, 0xffe9bd, 0.9);
    bg.strokeRoundedRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 15);
    addAttrElem(bg);

    // 标题
    const title = this.add.text(GAME_W / 2, panelY + 28, `你希望从哪里出发？（共 ${TOTAL_ATTR_POINTS} 点）`, {
      ...TEXT_STYLE, fontSize: '19px', color: '#5b3419', align: 'center',
    }).setOrigin(0.5);
    addAttrElem(title);

    // 剩余点数文字（引用，后续更新）
    const remainLabel = this.add.text(
      panelX + panelW - 28, panelY + panelH - 52,
      `剩余：0`, {
        ...TEXT_STYLE, fontSize: '16px', color: '#7c4a1e', align: 'right',
      }
    ).setOrigin(1, 0.5);
    addAttrElem(remainLabel);

    // 数值显示文字（每行一个，后续更新）
    const valTexts = {};
    let confirmBtn = null;

    const updateRemain = () => {
      const used = alloc.professional + alloc.communication + alloc.physical;
      const remaining = TOTAL_ATTR_POINTS - used;
      remainLabel.setText(`剩余：${remaining}`);
      ROWS.forEach(r => valTexts[r.key]?.setText(String(alloc[r.key])));

      // 确认按钮状态
      const done = used === TOTAL_ATTR_POINTS;
      if (confirmBtn) {
        confirmBtn.setAlpha(done ? 1 : 0.4);
        confirmBtn.disableInteractive();
        if (done) confirmBtn.setInteractive({ useHandCursor: true });
      }
    };

    // 每行：标签 [-] 数值 [+]
    ROWS.forEach((row, i) => {
      const rowY = panelY + 80 + i * rowH;
      const labelX = panelX + 48;
      const minusBtnX = panelX + 230;
      const valX = panelX + 310;
      const plusBtnX = panelX + 390;

      const rowLabel = this.add.text(labelX, rowY, row.label, {
        ...TEXT_STYLE, fontSize: '18px', color: '#5b3419',
      }).setOrigin(0, 0.5);
      addAttrElem(rowLabel);

      const valTxt = this.add.text(valX, rowY, String(alloc[row.key]), {
        ...TEXT_STYLE, fontSize: '20px', color: '#3b1f0c', align: 'center',
      }).setOrigin(0.5);
      addAttrElem(valTxt);
      valTexts[row.key] = valTxt;

      const minusBtn = makeButton(this, minusBtnX, rowY, 42, 36, '－',
        () => {
          if (alloc[row.key] <= 0) return;
          alloc[row.key] -= ATTR_STEP;
          updateRemain();
        },
        { fill: 0xffeecf, hover: 0xffd999, stroke: 0xa46b36, textColor: '#5b3419', fontSize: '18px', radius: 10 }
      );
      addAttrElem(minusBtn);

      const plusBtn = makeButton(this, plusBtnX, rowY, 42, 36, '＋',
        () => {
          const used = alloc.professional + alloc.communication + alloc.physical;
          if (used >= TOTAL_ATTR_POINTS) return;
          alloc[row.key] += ATTR_STEP;
          updateRemain();
        },
        { fill: 0xffeecf, hover: 0xffd999, stroke: 0xa46b36, textColor: '#5b3419', fontSize: '18px', radius: 10 }
      );
      addAttrElem(plusBtn);
    });

    // 确认按钮
    confirmBtn = makeButton(
      this, GAME_W / 2, panelY + panelH - 28, 180, 40, '确认分配',
      () => {
        const used = alloc.professional + alloc.communication + alloc.physical;
        if (used !== TOTAL_ATTR_POINTS) return;

        // 写入 gs.attrs（主字段，供 HUD 和后续系统读取）
        // 同步写 gs.player.attrs 保留序章分配原始值
        this.gs.attrs.professional = alloc.professional;
        this.gs.attrs.communication = alloc.communication;
        this.gs.attrs.physicalExp = alloc.physical;
        syncActionCapacity(this.gs);
        this.gs.actionPoints = this.gs.maxActionPoints;
        this.gs.player.attrs.professional = alloc.professional;
        this.gs.player.attrs.communication = alloc.communication;
        this.gs.player.attrs.physical = alloc.physical;

confirmBtn.setVisible?.(false);
confirmBtn.disableInteractive?.();
this._attrConfirmBtn = null;

this._clearAttrElems();

this.time.delayedCall(50, () => {
  this.step7_decideToGo();
});
      },
      { fill: 0xfff3d2, hover: 0xffe7aa, stroke: 0xa46b36, textColor: '#5b3419', fontSize: '17px', radius: 14 }
    );
    this._attrConfirmBtn = confirmBtn;
    addAttrElem(confirmBtn);

    updateRemain();
  }

  _clearAttrElems() {
  if (this._attrConfirmBtn) {
    try {
      this._attrConfirmBtn.setVisible?.(false);
      this._attrConfirmBtn.disableInteractive?.();
      this._attrConfirmBtn.destroy?.(true);
    } catch (e) {
      // ignore cleanup error
    }
    this._attrConfirmBtn = null;
  }

  this._attrElems.forEach(e => {
    try {
      e?.setVisible?.(false);
      e?.disableInteractive?.();
      e?.destroy?.(true);
    } catch (err) {
      // ignore cleanup error
    }
  });

  this._attrElems = [];
}

  // ─── Step 7：决定出发旁白 ─────────────────────────────────
  step7_decideToGo() {
    this.playStoryLines(DIALOGS_FIXED.prologue.decideToGo, () => this._endPrologue());
  }

 // ─── 序章结束 ─────────────────────────────────────────────
 _endPrologue() {
  this._clearAttrElems();

  this.gs.dayProgress.phase = 'office';

  this.cameras.main.fadeOut(600, 0, 0, 0);
  this.cameras.main.once('camerafadeoutcomplete', () => {
    this.scene.start('OfficeScene', { gs: this.gs });
  });
}
}
