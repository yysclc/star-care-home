import { GAME_H, GAME_W, TEXT_STYLE } from '../core/Constants.js';
import { makeButton } from './widgets.js';
import AudioManager from '../systems/AudioManager.js';
import { getUiTheme } from './uiThemes.js';

/**
 * SaveSlotPanel —— 可复用的存档槽位选择面板
 *
 * 用法：
 *   const panel = new SaveSlotPanel(scene);
 *   panel.show({ title, slots, mode, onSelect, onClose });
 *
 * @param {Phaser.Scene} scene - 所属场景
 */
export default class SaveSlotPanel {
  constructor(scene) {
    this.scene = scene;
    this._open = false;
    this._elems = [];   // Graphics / Text
    this._buttons = []; // makeButton 返回对象
  }

  /**
   * 显示面板
   *
   * @param {object} opts
   * @param {string}   opts.title      - 面板标题，如 "选择存档" / "选择读档位"
   * @param {Array}    opts.slots      - 槽位数组（由外部构造）
   *   每项格式：
   *     { slot: 1, empty: true }
   *     { slot: 2, empty: false, week: 3, savedAt: 1710000000000 }
   * @param {string}   opts.mode       - 'save' | 'load'，影响空档的提示文字（可选）
   * @param {Function} opts.onSelect   - 点击某档时的回调 (slotInfo) => void
   * @param {Function} opts.onClose    - 点击关闭时的回调 () => void
   */
  show({ title = '选择存档', slots = [], mode = 'load', theme = 'warm', onSelect, onClose } = {}) {
    if (this._open) return;
    this._open = true;
    const colors = getUiTheme(theme);

    const depthBase = 150; // 确保浮在 HUD / ChoicePanel 之上
    const W = 660;
    const ROW_H = 58;
    const ROW_GAP = 12;
    const PADDING_TOP = 72;
    const PADDING_BOTTOM = 28;
    const H = PADDING_TOP + slots.length * (ROW_H + ROW_GAP) - ROW_GAP + PADDING_BOTTOM;
    const cx = GAME_W / 2;
    const cy = GAME_H / 2;
    const x = cx - W / 2;
    const y = cy - H / 2;

    // ── 半透明遮罩（阻止穿透点击） ────────────────────────────
    const shade = this.scene.add
      .rectangle(cx, cy, GAME_W, GAME_H, colors.overlay, theme === 'start' ? 0.52 : 0.45)
      .setDepth(depthBase)
      .setInteractive();
    this._elems.push(shade);

    // ── 阴影 ─────────────────────────────────────────────────
    const shadow = this.scene.add.graphics().setDepth(depthBase + 1);
    shadow.fillStyle(colors.shadow, colors.shadowAlpha);
    shadow.fillRoundedRect(x + 7, y + 10, W, H, 22);
    this._elems.push(shadow);

    // ── 主框 ─────────────────────────────────────────────────
    const bg = this.scene.add.graphics().setDepth(depthBase + 2);
    if (colors.panelFill2) {
      bg.fillGradientStyle(colors.panelFill, colors.panelFill, colors.panelFill2, colors.panelFill2, colors.panelAlpha);
    } else {
      bg.fillStyle(colors.panelFill, colors.panelAlpha);
    }
    bg.fillRoundedRect(x, y, W, H, 22);
    bg.lineStyle(3, colors.panelStroke, colors.panelStrokeAlpha);
    bg.strokeRoundedRect(x, y, W, H, 22);
    bg.lineStyle(1, colors.innerStroke, colors.innerStrokeAlpha);
    bg.strokeRoundedRect(x + 7, y + 7, W - 14, H - 14, 17);
    this._elems.push(bg);

    // ── 标题牌 ────────────────────────────────────────────────
    const tagW = 180;
    const tagH = 42;
    const tagX = x + 40;
    const tagY = y - 22;

    const tag = this.scene.add.graphics().setDepth(depthBase + 3);
    tag.fillStyle(colors.tagFill, 0.98);
    tag.fillRoundedRect(tagX, tagY, tagW, tagH, 14);
    tag.lineStyle(2, colors.tagStroke, 0.95);
    tag.strokeRoundedRect(tagX, tagY, tagW, tagH, 14);
    this._elems.push(tag);

    const tagText = this.scene.add
      .text(tagX + tagW / 2, tagY + tagH / 2, title, {
        ...TEXT_STYLE,
        fontSize: '18px',
        color: colors.closeText,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(depthBase + 4);
    tagText.setShadow(0, 1, theme === 'start' ? '#050b18' : '#5b3419', 2, true, true);
    this._elems.push(tagText);

    // ── 关闭按钮（右上角 ×） ──────────────────────────────────
    const closeSize = 36;
    const closeX = x + W - 20;
    const closeY = y + 20;

    const closeBg = this.scene.add.graphics().setDepth(depthBase + 3);
    closeBg.fillStyle(colors.closeFill, 0.90);
    closeBg.fillCircle(closeX, closeY, closeSize / 2);
    this._elems.push(closeBg);

    const closeTxt = this.scene.add
      .text(closeX, closeY, '×', {
        ...TEXT_STYLE,
        fontSize: '22px',
        color: colors.closeText,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(depthBase + 4);
    this._elems.push(closeTxt);

    const closeZone = this.scene.add
      .zone(closeX, closeY, closeSize + 8, closeSize + 8)
      .setInteractive({ useHandCursor: true })
      .setDepth(depthBase + 5);
    closeZone.on('pointerover', () => {
      closeBg.clear();
      closeBg.fillStyle(colors.closeHover, 1);
      closeBg.fillCircle(closeX, closeY, closeSize / 2);
    });
    closeZone.on('pointerout', () => {
      closeBg.clear();
      closeBg.fillStyle(colors.closeFill, 0.90);
      closeBg.fillCircle(closeX, closeY, closeSize / 2);
    });
    closeZone.on('pointerdown', () => {
      AudioManager.playSfx('sfx_dialog_next', { volume: 0.8 });
      this._cleanup();
      if (onClose) onClose();
    });
    this._elems.push(closeZone);

    // ── 槽位行 ────────────────────────────────────────────────
    const rowX = cx;
    const rowW = W - 80;
    const startRowY = y + PADDING_TOP + ROW_H / 2;

    slots.forEach((slotInfo, i) => {
      const rowY = startRowY + i * (ROW_H + ROW_GAP);
      const label = this._formatSlotLabel(slotInfo);
      const isEmpty = slotInfo.empty;

      const btn = makeButton(
        this.scene,
        rowX,
        rowY,
        rowW,
        ROW_H,
        label,
        () => {
          this._cleanup();
          if (onSelect) onSelect(slotInfo);
        },
        {
          fill: isEmpty ? colors.disabledFill : colors.buttonFill,
          hover: isEmpty ? colors.disabledHover : colors.buttonHover,
          stroke: isEmpty ? colors.disabledStroke : colors.buttonStroke,
          disabled: false, // 空档也可点击，由外部 onSelect 决定行为
          textColor: isEmpty ? colors.disabledText : colors.buttonText,
          fontSize: '17px',
          radius: 14,
          wordWrap: { width: rowW - 32 },
        }
      ).setDepth(depthBase + 4);

      this._buttons.push(btn);
    });
  }

  /**
   * 关闭并销毁面板（外部调用）
   */
  close() {
    this._cleanup();
  }

  /**
   * 同 close()，语义别名
   */
  destroy() {
    this._cleanup();
  }

  // ── 私有 ────────────────────────────────────────────────────

  _cleanup() {
    this._elems.forEach((e) => e.destroy());
    this._buttons.forEach((b) => b.destroy());
    this._elems = [];
    this._buttons = [];
    this._open = false;
  }

  /**
   * 将 slotInfo 格式化为显示文本
   * 空档：第 1 档｜空档
   * 有档：第 1 档｜第 3 周｜2026-06-23 14:30
   */
  _formatSlotLabel(slotInfo) {
    const slotNum = `第 ${slotInfo.slot} 档`;
    if (slotInfo.empty) {
      return `${slotNum}  ｜  空档`;
    }
    const weekStr = `第 ${slotInfo.week ?? '?'} 周`;
    const timeStr = slotInfo.savedAt ? this._formatTime(slotInfo.savedAt) : '——';
    return `${slotNum}  ｜  ${weekStr}  ｜  ${timeStr}`;
  }

  /**
   * 时间戳 → "2026-06-23 14:30"
   */
  _formatTime(ts) {
    const d = new Date(ts);
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}`;
  }
}
