import { COLORS, GAME_W, SAVE_SLOT_COUNT, SAVE_SLOT_KEYS } from '../core/Constants.js';
import { getCurrentWeek, loadState, resolveResumeScene, saveState, setResumeScene, syncActionCapacity } from '../core/GameState.js';
import { makeButton, makeLabel } from './widgets.js';
import ChoicePanel from './ChoicePanel.js';
import SaveSlotPanel from './SaveSlotPanel.js';
import AudioManager from '../systems/AudioManager.js';
import { getWeekConfig } from '../data/weekConfigs.js';
import { getLanguageLabel, refreshSceneLanguage, toggleLanguage } from '../i18n/language.js';
import { ROOMS } from '../data/rooms.js';
import { COLLECTIONS_DATA, unlockGlobalCollection } from '../data/collections.js';
import { REFERENCE_GUIDE_TEXT } from '../data/referenceGuide.js';

// ── 轻量摘要读取（与 StartScene 保持一致，不调用 loadState） ─────────
function _readSlotSummary(slot) {
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

function _buildSlots() {
  const result = [];
  for (let i = 1; i <= SAVE_SLOT_COUNT; i++) result.push(_readSlotSummary(i));
  return result;
}

const HUD_Y = 10;       // 顶部 HUD 条的顶边 y
const HUD_H = 42;       // HUD 条高度
const DEPTH = 50;
const HUD_THEME = {
  fill: 0xfff7df,
  hover: 0xffe7aa,
  stroke: 0xa46b36,
  innerStroke: 0xffe9bd,
  shadow: 0x3b2414,
  text: '#5b3419',
  headerText: '#5b3419',
};

// 顶部八个入口的布局参数 [label_id, 初始文字, x中心, 宽]
const SLOTS = [
  { id: 'week',       text: '第 - 周',      cx: 62,   w: 96 },
  { id: 'funds',      text: '金钱：0',      cx: 180,  w: 120 },
  { id: 'rep',        text: '名望：0',      cx: 310,  w: 120 },
  { id: 'ap',         text: '行动力：0/0',  cx: 450,  w: 140 },
  { id: 'attrs',      text: '个人属性 ▼',   cx: 590,  w: 120 },
  { id: 'social',     text: '人际属性 ▼',   cx: 720,  w: 120 },
  { id: 'task',       text: '任务 ▼',       cx: 840,  w: 100 },
  { id: 'collection', text: '收集图鉴',     cx: 962,  w: 104 },
  { id: 'setting',    text: '设置 ▼',       cx: 1080, w: 96 },
];

// 面板宽 / 行高
const PANEL_W   = 220;
const PANEL_ROW = 26;
const PANEL_PAD = 12;
const ATTRS_PANEL_W = 170;
const SOCIAL_PANEL_W = 180;
const STATS_PANEL_ROW = 23;
const STATS_PANEL_PAD_Y = 9;
const TASK_PANEL_MIN_W = 200;
const TASK_PANEL_MAX_W = 340;
const TASK_PANEL_CHAR_W = 14;
const TASK_PANEL_EXTRA_W = 64;

export default class HUD {
  constructor(scene, gs) {
    this.scene = scene;
    this.gs    = gs;

    // 当前展开的面板：null | 'attrs' | 'social' | 'task'
    this._openPanel = null;

    // 各 slot 的 Graphics + Text 引用
    this._slots = {};
    // 面板对象
    this._panels = { attrs: null, social: null, task: null, setting: null };
    // 面板内 Text 对象，供 update() 刷新
    this._panelTexts = { attrs: [], social: [], task: [], setting: [] };

    this.choice = new ChoicePanel(scene);
    this._slotPanel = null;
    this._devPanel = null;
    this._guideOverlay = null;
    this.scene.events.once('shutdown', () => this._closeReferenceGuidePanel());

    this._buildBar();
    this.update(gs);
  }

  // ─── 顶部条 ───────────────────────────────────────────────
  _buildBar() {
    const s = this.scene;

    SLOTS.forEach(slot => {
      const x0 = slot.cx - slot.w / 2;

      // 背景格子
      const g = s.add.graphics().setDepth(DEPTH);
      g.fillStyle(HUD_THEME.fill, 0.96);
g.fillRoundedRect(x0, HUD_Y, slot.w, HUD_H, 10);
g.lineStyle(2, HUD_THEME.stroke, 0.95);
g.strokeRoundedRect(x0, HUD_Y, slot.w, HUD_H, 10);
g.lineStyle(1, HUD_THEME.innerStroke, 0.9);
g.strokeRoundedRect(x0 + 4, HUD_Y + 4, slot.w - 8, HUD_H - 8, 7);

      // 文字
      const t = makeLabel(s, slot.cx, HUD_Y + HUD_H / 2, slot.text, {
  fontSize: '16px',
  color: HUD_THEME.text,
})
        .setOrigin(0.5)
        .setDepth(DEPTH + 1);

      this._slots[slot.id] = { g, t, slot };

      // attrs / social / task / collection / setting 格子需要点击交互
      if (slot.id === 'attrs' || slot.id === 'social' || slot.id === 'task' || slot.id === 'collection' || slot.id === 'setting') {
        const zone = s.add.zone(slot.cx, HUD_Y + HUD_H / 2, slot.w, HUD_H)
          .setInteractive({ useHandCursor: true })
          .setDepth(DEPTH + 2);

        zone.on('pointerover', () => {
          g.clear();
          g.fillStyle(HUD_THEME.hover, 1);
g.fillRoundedRect(x0, HUD_Y, slot.w, HUD_H, 10);
g.lineStyle(2, HUD_THEME.stroke, 1);
g.strokeRoundedRect(x0, HUD_Y, slot.w, HUD_H, 10);
g.lineStyle(1, HUD_THEME.innerStroke, 0.95);
g.strokeRoundedRect(x0 + 4, HUD_Y + 4, slot.w - 8, HUD_H - 8, 7);
        });
        zone.on('pointerout', () => {
          g.clear();
         g.fillStyle(HUD_THEME.fill, 0.96);
g.fillRoundedRect(x0, HUD_Y, slot.w, HUD_H, 10);
g.lineStyle(2, HUD_THEME.stroke, 0.95);
g.strokeRoundedRect(x0, HUD_Y, slot.w, HUD_H, 10);
g.lineStyle(1, HUD_THEME.innerStroke, 0.9);
g.strokeRoundedRect(x0 + 4, HUD_Y + 4, slot.w - 8, HUD_H - 8, 7);
        });
        zone.on('pointerdown', () => {
          if (slot.id === 'collection') {
            this._openCollection();
            return;
          }
          this._togglePanel(slot.id);
        });
      }
    });
  }

  _openCollection() {
    if (this._openPanel) {
      this._closePanel(this._openPanel);
      this._openPanel = null;
    }
    this.scene.scene.launch('CollectionScene', { gs: this.gs, fromScene: this.scene.sys.settings.key });
    this.scene.scene.bringToTop('CollectionScene');
  }

  // ─── 面板切换 ─────────────────────────────────────────────
  _togglePanel(which) {
    if (this._openPanel === which) {
      // 再次点击：关闭
      this._closePanel(which);
      this._openPanel = null;
    } else {
      // 关闭其他
      if (this._openPanel) this._closePanel(this._openPanel);
      this._openPanel = which;
      this._openPanelFor(which);
    }
  }

  _closePanel(which) {
    if (!this._panels[which]) return;
    this._panels[which].forEach(obj => obj.destroy());
    this._panels[which] = null;
    this._panelTexts[which] = [];
  }

  _openPanelFor(which) {
    const gs = this.gs;
    const s = this.scene;
    const slot = SLOTS.find((sl) => sl.id === which);
    let panelW = PANEL_W;
    let panelRow = PANEL_ROW;
    let panelPadY = PANEL_PAD;
    if (which === 'attrs') {
      panelW = ATTRS_PANEL_W;
      panelRow = STATS_PANEL_ROW;
      panelPadY = STATS_PANEL_PAD_Y;
    } else if (which === 'social') {
      panelW = SOCIAL_PANEL_W;
      panelRow = STATS_PANEL_ROW;
      panelPadY = STATS_PANEL_PAD_Y;
    }
    let px = Math.min(slot.cx - panelW / 2, GAME_W - panelW - 8);
    const py = HUD_Y + HUD_H + 4;

    if (which === 'setting') {
      this._openSettingPanel(px, py);
      return;
    }

    // 构造行数据
    let rows;
    if (which === 'attrs') {
      rows = [
        { label: '专业理解：', key: 'attrs.professional' },
        { label: '沟通能力：', key: 'attrs.communication' },
        { label: '体能经验：', key: 'attrs.physicalExp' },
      ];
    } else if (which === 'social') {
      rows = [
        { label: '橙橙好感度：', key: 'orange.affection' },
        { label: '所长好感度：', key: 'director.affection' },
        { label: '孩子信任度：', key: 'group.trust' },
        { label: '孩子压力值：', key: 'group.stress' },
      ];
    } else {
      // 任务系统
      const weekConfig = getWeekConfig(Number(gs?.day));
      const goals = weekConfig?.goals?.length ? weekConfig.goals : ['孩子信任度 > 40', '孩子压力值 < 30'];
      panelW = Math.min(
        TASK_PANEL_MAX_W,
        Math.max(TASK_PANEL_MIN_W, ...goals.map((goal) => String(goal).length * TASK_PANEL_CHAR_W + TASK_PANEL_EXTRA_W))
      );
      px = Math.min(Math.max(slot.cx - panelW / 2, 8), GAME_W - panelW - 8);
      rows = [
        { label: '本周任务', key: null },
        ...goals.map((goal, index) => ({
          label: String(goal),
          check: weekConfig?.checks?.[index],
        })),
      ];
    }

    const panelH = panelPadY * 2 + (which === 'task' ? 1 * panelRow + (rows.length - 1) * panelRow * 1.25 : rows.length * panelRow);

    const bg = s.add.graphics().setDepth(DEPTH + 5);
    bg.fillStyle(HUD_THEME.fill, 0.97);
    bg.fillRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(2, HUD_THEME.stroke, 0.95);
    bg.strokeRoundedRect(px, py, panelW, panelH, 12);
    bg.lineStyle(1, HUD_THEME.innerStroke, 0.9);
    bg.strokeRoundedRect(px + 5, py + 5, panelW - 10, panelH - 10, 9);

    const objs = [bg];
    const texts = [];

    let currentY = py + panelPadY;
    rows.forEach((row, i) => {
      let line = row.label;
      if (row.key) {
        const val = this._getVal(gs, row.key);
        if (which === 'task') {
          const ok = row.cond(val);
          line = `${row.label}${val} [${ok ? '✓ 已完成' : '○ 未完成'}]`;
        } else {
          line = `${row.label}${val}`;
        }
      } else if (which === 'task' && typeof row.check === 'function') {
        line = `${row.label} [${row.check(gs) ? '已完成' : '未完成'}]`;
      }

      const isCenteredPanel = which === 'attrs' || which === 'social' || which === 'task';
      const textX = Math.round(isCenteredPanel ? px + panelW / 2 : px + PANEL_PAD);
      const textY = Math.round(currentY);
      const t = makeLabel(s, textX, textY, line, {
        fontSize: which === 'attrs' || which === 'social' ? '16px' : '15px',
        color: HUD_THEME.text,
        align: isCenteredPanel ? 'center' : 'left',
      }).setOrigin(isCenteredPanel ? 0.5 : 0, 0).setDepth(DEPTH + 6);
      objs.push(t);
      if (row.key || row.check) texts.push({ t, row });

      currentY += which === 'task' ? panelRow * 1.25 : panelRow;
    });

    this._panels[which] = objs;
    this._panelTexts[which] = texts;
  }

  _openSettingPanel(px, py) {
    const s = this.scene;
    const panelH = PANEL_PAD * 2 + 5 * 42 + 4 * 8;

    const bg = s.add.graphics().setDepth(DEPTH + 5);
    bg.fillStyle(HUD_THEME.fill, 0.97);
    bg.fillRoundedRect(px, py, PANEL_W, panelH, 12);
    bg.lineStyle(2, HUD_THEME.stroke, 0.95);
    bg.strokeRoundedRect(px, py, PANEL_W, panelH, 12);
    bg.lineStyle(1, HUD_THEME.innerStroke, 0.9);
    bg.strokeRoundedRect(px + 5, py + 5, PANEL_W - 10, panelH - 10, 9);

    const makeActionButton = (y, text, action) => {
      return makeButton(s, px + PANEL_W / 2, y, PANEL_W - 24, 36, text, () => {
        this._closePanel('setting');
        this._openPanel = null;
        action();
      }, {
        fill: 0xfff3d2,
        hover: 0xffe7aa,
        stroke: 0xb7834d,
        textColor: '#5b3419',
        fontSize: '16px',
        radius: 14,
      }).setDepth(DEPTH + 6);
    };

    const btn1 = makeActionButton(py + PANEL_PAD + 18,       '存档',     () => this._openSavePanel());
    const btn2 = makeActionButton(py + PANEL_PAD + 18 + 44,  '读档',     () => this._openLoadPanel());
    const btn3 = makeActionButton(py + PANEL_PAD + 18 + 88,  '设置',     () => this._openAudioSettingPanel(px, py));
    const btn4 = makeActionButton(py + PANEL_PAD + 18 + 132, '参考攻略', () => this._openReferenceGuidePanel());
    const btn5 = makeActionButton(py + PANEL_PAD + 18 + 176, '无敌模式', () => this._confirmGodMode());

    this._panels.setting = [bg, btn1, btn2, btn3, btn4, btn5];
    this._panelTexts.setting = [];
  }

  _closeReferenceGuidePanel() {
    if (!this._guideOverlay) return;
    const overlay = this._guideOverlay;
    overlay.cleanup?.();
    overlay.objects?.forEach((obj) => obj?.destroy?.());
    this._guideOverlay = null;
  }

  _openReferenceGuidePanel() {
    this._closeReferenceGuidePanel();

    const s = this.scene;
    const depth = 10000;
    const viewH = s.scale?.height ?? 640;
    const panel = {
      x: Math.round((GAME_W - 980) / 2),
      y: 36,
      w: 980,
      h: 560,
      pad: 30,
    };
    const contentX = panel.x + panel.pad;
    const contentY = panel.y + 96;
    const contentW = panel.w - panel.pad * 2 - 34;
    const contentH = panel.h - 132;
    const objects = [];

    const shade = s.add.rectangle(GAME_W / 2, viewH / 2, GAME_W, viewH, 0x2f1b0f, 0.42)
      .setDepth(depth)
      .setInteractive();
    const blocker = s.add.zone(GAME_W / 2, viewH / 2, GAME_W, viewH)
      .setInteractive()
      .setDepth(depth + 1);
    objects.push(shade, blocker);

    const shadow = s.add.graphics().setDepth(depth + 2);
    shadow.fillStyle(0x3b2414, 0.26);
    shadow.fillRoundedRect(panel.x + 8, panel.y + 10, panel.w, panel.h, 24);
    objects.push(shadow);

    const bg = s.add.graphics().setDepth(depth + 3);
    bg.fillGradientStyle(0xfff7df, 0xfff7df, 0xffedc4, 0xffedc4, 0.98);
    bg.fillRoundedRect(panel.x, panel.y, panel.w, panel.h, 24);
    bg.lineStyle(3, 0xa46b36, 0.95);
    bg.strokeRoundedRect(panel.x, panel.y, panel.w, panel.h, 24);
    bg.lineStyle(1, 0xffe9bd, 0.95);
    bg.strokeRoundedRect(panel.x + 8, panel.y + 8, panel.w - 16, panel.h - 16, 18);
    objects.push(bg);

    const title = makeLabel(s, panel.x + panel.pad, panel.y + 26, '参考攻略', {
      fontSize: '28px',
      color: HUD_THEME.text,
    }).setDepth(depth + 5);
    objects.push(title);

    const subtitle = makeLabel(s, panel.x + panel.pad, panel.y + 64, '建议先自行体验；卡关时再打开查看。部分内容存在随机性，仅供参考。', {
      fontSize: '16px',
      color: '#7a5635',
    }).setDepth(depth + 5);
    objects.push(subtitle);

    const closeBtn = makeButton(s, panel.x + panel.w - 76, panel.y + 48, 116, 38, '关闭', () => {
      this._closeReferenceGuidePanel();
    }, {
      fontSize: '15px',
      fill: 0xfff3d2,
      hover: 0xffe7aa,
      stroke: 0xb7834d,
      textColor: '#5b3419',
      radius: 14,
    }).setDepth(depth + 7);
    objects.push(closeBtn);

    const contentBg = s.add.graphics().setDepth(depth + 4);
    contentBg.fillStyle(0xfffbeb, 0.78);
    contentBg.fillRoundedRect(contentX - 12, contentY - 14, contentW + 24, contentH + 28, 16);
    contentBg.lineStyle(1, 0xd8a05a, 0.35);
    contentBg.strokeRoundedRect(contentX - 12, contentY - 14, contentW + 24, contentH + 28, 16);
    objects.push(contentBg);

    const contentContainer = s.add.container(0, contentY).setDepth(depth + 6);
    const guideText = s.add.text(contentX, 0, REFERENCE_GUIDE_TEXT, {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '17px',
      color: '#5b3419',
      lineSpacing: 7,
      wordWrap: { width: contentW, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    contentContainer.add(guideText);
    objects.push(contentContainer);

    const maskGraphics = s.make.graphics();
    maskGraphics.fillStyle(0xffffff, 1);
    maskGraphics.fillRect(contentX - 4, contentY, contentW + 8, contentH);
    const textMask = maskGraphics.createGeometryMask();
    contentContainer.setMask(textMask);
    objects.push(maskGraphics);

    const scrollBar = s.add.graphics().setDepth(depth + 8);
    objects.push(scrollBar);
    const trackX = contentX + contentW + 22;
    const trackY = contentY;
    const trackW = 14;
    const trackH = contentH;
    const thumbMinH = 58;
    const maxScroll = Math.max(0, guideText.height - contentH);
    const thumbH = maxScroll > 0
      ? Phaser.Math.Clamp((contentH / guideText.height) * trackH, thumbMinH, trackH)
      : trackH;
    const maxThumbTravel = Math.max(0, trackH - thumbH);
    let scrollY = 0;

    const trackHit = s.add.zone(trackX, trackY + trackH / 2, 44, trackH)
      .setInteractive({ useHandCursor: maxScroll > 0 })
      .setDepth(depth + 9);
    const thumbHit = s.add.zone(trackX, trackY + thumbH / 2, 44, thumbH)
      .setInteractive({ useHandCursor: maxScroll > 0 })
      .setDepth(depth + 10);
    objects.push(trackHit, thumbHit);
    if (maxScroll > 0) s.input.setDraggable(thumbHit);

    const drawScrollBar = () => {
      const ratio = maxScroll > 0 ? scrollY / maxScroll : 0;
      const thumbY = trackY + ratio * maxThumbTravel;
      scrollBar.clear();
      scrollBar.fillStyle(0xf7d8a2, 0.78);
      scrollBar.fillRoundedRect(trackX - trackW / 2, trackY, trackW, trackH, 8);
      scrollBar.lineStyle(1, 0xb7834d, 0.35);
      scrollBar.strokeRoundedRect(trackX - trackW / 2, trackY, trackW, trackH, 8);
      if (maxScroll <= 0) return;
      scrollBar.fillStyle(0xb7834d, 0.75);
      scrollBar.fillRoundedRect(trackX - trackW / 2 + 1, thumbY, trackW - 2, thumbH, 7);
      thumbHit.y = thumbY + thumbH / 2;
    };

    const applyScroll = () => {
      scrollY = Phaser.Math.Clamp(scrollY, 0, maxScroll);
      contentContainer.y = contentY - scrollY;
      drawScrollBar();
    };

    const wheelHandler = (pointer, gameObjects, deltaX, deltaY) => {
      const inside = pointer.x >= contentX - 16
        && pointer.x <= trackX + 28
        && pointer.y >= contentY - 16
        && pointer.y <= contentY + contentH + 16;
      if (!inside || maxScroll <= 0) return;
      scrollY += deltaY * 0.55;
      applyScroll();
    };

    const dragHandler = (pointer, dragX, dragY) => {
      if (maxScroll <= 0) return;
      const targetThumbY = Phaser.Math.Clamp(dragY - thumbH / 2, trackY, trackY + maxThumbTravel);
      scrollY = ((targetThumbY - trackY) / Math.max(maxThumbTravel, 1)) * maxScroll;
      applyScroll();
    };

    const trackHandler = (pointer) => {
      if (maxScroll <= 0) return;
      const targetThumbY = Phaser.Math.Clamp(pointer.y - thumbH / 2, trackY, trackY + maxThumbTravel);
      scrollY = ((targetThumbY - trackY) / Math.max(maxThumbTravel, 1)) * maxScroll;
      applyScroll();
    };

    s.input.on('wheel', wheelHandler);
    thumbHit.on('drag', dragHandler);
    trackHit.on('pointerdown', trackHandler);
    applyScroll();

    this._guideOverlay = {
      objects,
      cleanup: () => {
        s.input.off('wheel', wheelHandler);
        thumbHit.off('drag', dragHandler);
        trackHit.off('pointerdown', trackHandler);
      },
    };
  }

  _openAudioSettingPanel(px, py) {
    const s = this.scene;
    const audioPanelW = 300;
    const audioPx = Math.min(Math.max(px - (audioPanelW - PANEL_W), 8), GAME_W - audioPanelW - 8);
    const audioPy = py;
    const rowTop = audioPy + PANEL_PAD + 14;
    const panelH = PANEL_PAD * 2 + 3 * 58 + 50;

    const bg = s.add.graphics().setDepth(DEPTH + 5);
    bg.fillStyle(HUD_THEME.fill, 0.97);
    bg.fillRoundedRect(audioPx, audioPy, audioPanelW, panelH, 12);
    bg.lineStyle(2, HUD_THEME.stroke, 0.95);
    bg.strokeRoundedRect(audioPx, audioPy, audioPanelW, panelH, 12);
    bg.lineStyle(1, HUD_THEME.innerStroke, 0.9);
    bg.strokeRoundedRect(audioPx + 5, audioPy + 5, audioPanelW - 10, panelH - 10, 9);

    const objs = [bg];

    const makeVolumeRow = (y, label, getValue, setValue) => {
      const valueText = makeLabel(s, audioPx + PANEL_PAD + 4, y, '', {
        fontSize: '16px',
        color: HUD_THEME.text,
      }).setDepth(DEPTH + 6);

      const refresh = () => {
        valueText.setText(`${label}${Math.round(getValue() * 100)}%`);
      };

      const adjust = (delta) => {
        const next = Math.max(0, Math.min(1, getValue() + delta));
        setValue(next);
        refresh();
      };

      const minus = makeButton(s, audioPx + audioPanelW - 92, y + 9, 34, 30, '-', () => adjust(-0.1), {
        fontSize: '18px',
        radius: 10,
      }).setDepth(DEPTH + 6);
      const plus = makeButton(s, audioPx + audioPanelW - 44, y + 9, 34, 30, '+', () => adjust(0.1), {
        fontSize: '18px',
        radius: 10,
      }).setDepth(DEPTH + 6);

      refresh();
      objs.push(valueText, minus, plus);
    };

    makeVolumeRow(rowTop, '音乐音量：', () => AudioManager.getVolume(), (value) => AudioManager.setVolume(value));
    makeVolumeRow(rowTop + 58, '音效音量：', () => AudioManager.getSfxVolume(), (value) => AudioManager.setSfxVolume(value));

    let languageBtn = null;
    const refreshLanguageButton = () => {
      languageBtn?.t?.setText(`语言：${getLanguageLabel()}`);
    };
    languageBtn = makeButton(s, audioPx + audioPanelW / 2, rowTop + 58 * 2 + 8, audioPanelW - 28, 36, `语言：${getLanguageLabel()}`, () => {
      toggleLanguage();
      refreshSceneLanguage(this.scene);
      refreshLanguageButton();
    }, {
      fill: 0xfff3d2,
      hover: 0xffe7aa,
      stroke: 0xb7834d,
      textColor: '#5b3419',
      fontSize: '16px',
      radius: 14,
    }).setDepth(DEPTH + 6);
    objs.push(languageBtn);

    const backTitle = makeButton(s, audioPx + audioPanelW / 2, rowTop + 58 * 3 + 20, audioPanelW - 28, 36, '返回标题', () => {
      this._closePanel('setting');
      this._openPanel = null;
      this._confirmBackToTitle();
    }, {
      fill: 0xfff3d2,
      hover: 0xffe7aa,
      stroke: 0xb7834d,
      textColor: '#5b3419',
      fontSize: '16px',
      radius: 14,
    }).setDepth(DEPTH + 6);
    objs.push(backTitle);

    this._openPanel = 'setting';
    this._panels.setting = objs;
    this._panelTexts.setting = [];
  }

  // ── 存档：弹三档选择面板 ────────────────────────────────────────────
  _openSavePanel() {
    if (this.scene?._storyPlaybackActive) {
      this._showInfo('\u4e3a\u907f\u514d\u8bfb\u6863\u540e\u5267\u60c5\u8fdb\u5ea6\u5f02\u5e38\uff0c\u5267\u60c5\u64ad\u653e\u4e2d\u6682\u4e0d\u652f\u6301\u5b58\u6863\u3002');
      return;
    }

    const slots = _buildSlots();
    this._slotPanel = new SaveSlotPanel(this.scene);
    this._slotPanel.show({
      title: '选择存档位',
      slots,
      mode: 'save',
      onClose: () => { this._slotPanel = null; },
      onSelect: (slotInfo) => {
        this._slotPanel = null;
        if (slotInfo.empty) {
          // 空档直接保存
          this._doSave(slotInfo.slot);
        } else {
          // 已有存档，确认覆盖
          this.choice.show(
            [`第 ${slotInfo.slot} 档已有存档，是否覆盖？`],
            [
              { label: '覆盖保存', action: () => this._doSave(slotInfo.slot) },
              { label: '取消',     action: () => {} },
            ],
            { title: '覆盖确认', depthBase: 10000,shadeAlpha: 0.32 }
          );
        }
      },
    });
  }

  _doSave(slot) {
    setResumeScene(this.gs, this.scene.sys.settings.key);
    const ok = saveState(this.gs, slot);
    this._showInfo(ok ? '\u5df2\u4fdd\u5b58\u3002' : '\u4fdd\u5b58\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u6d4f\u89c8\u5668\u5b58\u50a8\u6743\u9650\u3002');
  }

  // ── 读档：弹三档选择面板 ────────────────────────────────────────────
  _openLoadPanel() {
    const slots = _buildSlots();
    this._slotPanel = new SaveSlotPanel(this.scene);
    this._slotPanel.show({
      title: '选择读档位',
      slots,
      mode: 'load',
      onClose: () => { this._slotPanel = null; },
      onSelect: (slotInfo) => {
        this._slotPanel = null;
        if (slotInfo.empty) {
          this._showInfo('这个档位还没有存档。');
          return;
        }
        // 有存档，确认放弃当前进度
        this.choice.show(
          ['读取该档会放弃当前未保存进度，是否继续？'],
          [
            {
              label: '确认读取',
              action: () => {
                const loadedGs = loadState(slotInfo.slot);
                if (!loadedGs) {
                  this._showInfo('读取失败，存档可能已损坏。');
                  return;
                }
                const targetScene = resolveResumeScene(loadedGs);
                this._startLoadedScene(targetScene, loadedGs);
              },
            },
            { label: '取消', action: () => {} },
          ],
          { title: '读取存档', depthBase: 200 }
        );
      },
    });
  }

  _startLoadedScene(targetScene, loadedGs) {
    const scenePlugin = this.scene.scene;
    const currentKey = this.scene.sys.settings.key;
    const gameplayScenes = [
      'MapScene',
      'OfficeScene',
      'FixedActionScene',
      'ResultScene',
      'PrologueScene',
      'ActivityRoomScene',
      'ToyRoomScene',
      'OutdoorYardScene',
      'PaintingRoomScene',
      'LibraryScene',
      'SensoryRoomScene',
      'PaintingSensoryScene',
      'ActivityStepPuzzleScene',
      'ToyRoomJointAttentionScene',
      'OutdoorAACScene',
      'LibraryOddWordScene',
      'SensoryBalanceScene',
    ];

    gameplayScenes.forEach((key) => {
      if (key !== currentKey && scenePlugin.isActive(key)) {
        scenePlugin.stop(key);
      }
    });

    scenePlugin.start(targetScene, { gs: loadedGs });
  }

  _confirmBackToTitle() {
  this.choice.show(
    ['确认返回标题吗？未保存的进度可能会丢失。'],
    [
      { label: '确认', action: () => this.scene.scene.start('StartScene') },
      { label: '取消', action: () => {} },
    ],
    {
      title: '返回标题',
      depthBase: 10000,
      shadeAlpha: 0.32,
    }
  );
}

  _showInfo(message) {
  this.choice.show(
    [message],
    [{ label: '知道了', action: () => {} }],
    {
     depthBase: 260,
      shadeAlpha: 0.32,
    }
  );
}

  _applyGodMode() {
    const gs = this.gs;

    gs.funds = 999999;
    gs.reputation = 100;
    gs.parentTrust = 100;

    gs.attrs ??= {};
    gs.attrs.professional = 100;
    gs.attrs.communication = 100;
    gs.attrs.physical = 100;
    gs.attrs.physicalExp = 400;

    syncActionCapacity(gs);
    gs.maxActionPoints = 99;
    gs.actionPoints = 99;

    gs.group ??= {};
    gs.group.trust = 100;
    gs.group.stress = 0;

    gs.orange ??= {};
    gs.orange.affection = 100;
    gs.orange.flags ??= {};

    gs.director ??= {};
    gs.director.affection = 100;
    gs.director.flags ??= {};

    gs.rooms ??= {};
    ROOMS.forEach((room) => {
      gs.rooms[room.id] = true;
    });

    gs.collections ??= {};
    gs.collections.items ??= {};
    Object.entries(COLLECTIONS_DATA).forEach(([id, item]) => {
      if (item?.placeholder) return;
      gs.collections.items[id] ||= { obtainedAt: Date.now() };
      unlockGlobalCollection(id);
    });

    gs.flags ??= {};
    gs.flags.godModeEnabled = true;

    this.update(gs);
  }

  _confirmGodMode() {
    this.choice.show(
      [
        '是否开启无敌模式？开启后会一键调整数值、解锁所有房间、解锁所有CG与橙橙画作，并放开橙橙剧情入口。',
        '注意：无敌模式仅供想快速体验内容的玩家和评审使用；开启后，本次游玩无法纳入通关记录。',
      ],
      [
        {
          label: '确认开启',
          action: () => {
            this._applyGodMode();
            this._showInfo('已开启无敌模式，已解锁所有CG与橙橙画作。本次游玩无法纳入通关记录。');
          },
        },
        { label: '取消', action: () => {} },
      ],
      {
        title: '无敌模式',
        depthBase: 260,
        shadeAlpha: 0.28,
      }
    );
  }

  // ─── 读取嵌套值 ───────────────────────────────────────────
  _getVal(gs, path) {
    return path.split('.').reduce((o, k) => (o != null ? o[k] : '?'), gs) ?? '?';
  }

  _formatWeekText(gs) {
    const day = Number(gs?.day);
    return Number.isFinite(day) ? `第 ${day} 周` : '第 - 周';
  }

  // ─── 公开 update ─────────────────────────────────────────
  update(gs = this.gs) {
    this.gs = gs;

    this._slots.week.t.setText(this._formatWeekText(this.gs));
    this._slots.funds.t.setText(`金钱：${this.gs.funds}`);
    this._slots.rep.t.setText(`名望：${this.gs.reputation}`);
    this._slots.ap.t.setText(`行动力：${this.gs.actionPoints}/${this.gs.maxActionPoints}`);

    // 刷新已展开的面板数值
    ['attrs', 'social', 'task'].forEach(which => {
      this._panelTexts[which].forEach(({ t, row }) => {
        if (which === 'task' && typeof row.check === 'function') {
          t.setText(`${row.label} [${row.check(gs) ? '已完成' : '未完成'}]`);
          return;
        }
        const val = this._getVal(gs, row.key);
        if (which === 'task') {
          const ok = row.cond(val);
          t.setText(`${row.label}${val} [${ok ? '✓ 已完成' : '○ 未完成'}]`);
        } else {
          t.setText(`${row.label}${val}`);
        }
      });
    });
  }
}

