import { GAME_H, GAME_W, TEXT_STYLE } from '../core/Constants.js';
import { localizeText } from '../i18n/language.js';
import { makeButton } from './widgets.js';

function growFontSize(value, fallback, delta = 2) {
  const raw = value ?? fallback;
  if (typeof raw !== 'string') return raw;
  const match = raw.match(/^(\d+(?:\.\d+)?)px$/);
  if (!match) return raw;
  return `${Number(match[1]) + delta}px`;
}

export default class ChoicePanel {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
  }

  show(lines, choices, opts = {}) {
    if (this.open) return;
    this.open = true;

    const cleanLines = Array.isArray(lines) ? lines : [String(lines ?? '')];
    const cleanChoices = Array.isArray(choices) ? choices : [];

    const W = opts.width ?? 1000;
    const H = opts.height ?? Math.min(opts.maxHeight ?? 330, 150 + cleanChoices.length * 48);
    const cx = GAME_W / 2;
    const bottomMargin = opts.bottomMargin ?? 18;
    const x = cx - W / 2;
    const y = GAME_H - H - bottomMargin;
    const depthBase = opts.depthBase ?? 100;

    const elems = [];
    const buttons = [];

    // 阻止点穿到底下按钮。
    const shade = this.scene.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, opts.shadeAlpha ?? 0.10)
      .setDepth(depthBase)
      .setInteractive();
    elems.push(shade);

    // 阴影
    const shadow = this.scene.add.graphics().setDepth(depthBase + 1);
    shadow.fillStyle(0x3b2414, 0.28);
    shadow.fillRoundedRect(x + 6, y + 8, W, H, 22);
    elems.push(shadow);

    // 主框
    const bg = this.scene.add.graphics().setDepth(depthBase + 2);
    bg.fillStyle(0xfff7df, 0.97);
    bg.fillRoundedRect(x, y, W, H, 22);
    bg.lineStyle(3, 0xa46b36, 0.95);
    bg.strokeRoundedRect(x, y, W, H, 22);

    bg.lineStyle(1, 0xffe9bd, 0.95);
    bg.strokeRoundedRect(x + 7, y + 7, W - 14, H - 14, 17);
    elems.push(bg);

    // 标题牌
    const tagW = opts.tagWidth ?? 138;
    const tagH = opts.tagHeight ?? 40;
    const tagX = x + 38;
    const tagY = y - 26;

    const tag = this.scene.add.graphics().setDepth(depthBase + 4);
    tag.fillStyle(0xb7834d, 0.98);
    tag.fillRoundedRect(tagX, tagY, tagW, tagH, 15);
    tag.lineStyle(2, 0xffe4aa, 0.95);
    tag.strokeRoundedRect(tagX, tagY, tagW, tagH, 15);
    elems.push(tag);

    const titleText = opts.title ?? '请选择';
    const tagText = this.scene.add.text(tagX + tagW / 2, tagY + tagH / 2, localizeText(titleText), {
      ...TEXT_STYLE,
      fontSize: growFontSize(opts.titleFontSize, '18px'),
      color: '#fff8e6',
      align: 'center',
    }).setOrigin(0.5).setDepth(depthBase + 5);
    tagText.__starcareRawText = titleText;
    tagText.setShadow(0, 1, '#5b3419', 2, true, true);
    elems.push(tagText);

    // 说明文字
    const textBlock = cleanLines.join('\n');
    const txt = this.scene.add.text(x + 44, y + 42, localizeText(textBlock), {
      ...TEXT_STYLE,
      fontSize: growFontSize(opts.fontSize, '16px'),
      color: '#5b3419',
      align: 'left',
      lineSpacing: 6,
      wordWrap: { width: W - 88 },
    }).setOrigin(0, 0).setDepth(depthBase + 5);
    txt.__starcareRawText = textBlock;
    elems.push(txt);

    const textBottom = y + 94;
    const btnW = opts.choiceWidth ?? Math.min(820, W - 120);
    const btnH = opts.choiceHeight ?? 38;
    const gap = opts.choiceGap ?? 10;
    const startY = Math.max(textBottom, y + H - 32 - cleanChoices.length * (btnH + gap));

    cleanChoices.forEach((choice, i) => {
      const b = makeButton(
        this.scene,
        cx,
        startY + i * (btnH + gap),
        btnW,
        btnH,
        choice.label,
        () => {
          elems.forEach((e) => e.destroy());
          buttons.forEach((btn) => btn.destroy());
          this.open = false;
          if (choice.action) choice.action();
        },
        {
          fill: choice.disabled ? 0xd1d5db : 0xfff3d2,
          hover: 0xffe7aa,
          stroke: 0xb7834d,
          disabled: choice.disabled,
          textColor: '#5b3419',
          disabledTextColor: '#6b7280',
          fontSize: growFontSize(opts.choiceFontSize, '15px'),
          radius: 16,
          wordWrap: { width: btnW - 28 },
        }
      ).setDepth(depthBase + 6);

      buttons.push(b);
    });
  }

  showVNChoice(lines, choices, opts = {}) {
    if (this.open) return;
    this.open = true;

    const sourceLines = Array.isArray(lines) ? lines : [String(lines ?? '')];
    const cleanChoices = Array.isArray(choices) ? choices : [];

    const fullLines = opts.title ? [String(opts.title), ...sourceLines] : sourceLines;
    const displayLines = fullLines.slice(0, 2);
    if (fullLines.length > 2) {
      displayLines[1] = `${displayLines[1] ?? ''}……`;
    }

    const boxW = opts.boxW ?? 1000;
    const boxH = opts.boxH ?? 148;
    const boxCenterX = opts.boxX ?? (GAME_W / 2);
    const boxX = boxCenterX - boxW / 2;
    const boxY = opts.boxY ?? (GAME_H - boxH - 18);
    const textX = opts.textX ?? (boxCenterX - boxW / 2 + 54);
    const textY = opts.textY ?? (boxY + 42);

    const choiceX = opts.choiceX ?? (GAME_W / 2);
    const choiceStartY = opts.choiceStartY ?? 210;
    const choiceWidth = opts.choiceWidth ?? 820;
    const choiceHeight = opts.choiceHeight ?? 44;
    const choiceGap = opts.choiceGap ?? 16;

    const shadeDepth = opts.shadeDepth ?? 100;
    const boxDepth = opts.boxDepth ?? 102;
    const choiceDepth = opts.choiceDepth ?? 104;

    const elems = [];
    const buttons = [];
    const cleanup = () => {
      elems.forEach((e) => e.destroy());
      buttons.forEach((b) => b.destroy());
      this.open = false;
    };

    // 遮罩留出顶部 HUD 区域，避免盖住 HUD 交互。
    const hudSafeTop = opts.hudSafeTop ?? 52;
    const shadeHeight = Math.max(0, GAME_H - hudSafeTop);
    const shadeY = hudSafeTop + shadeHeight / 2;
    const shade = this.scene.add
      .rectangle(GAME_W / 2, shadeY, GAME_W, shadeHeight, 0x000000, opts.shadeAlpha ?? 0.10)
      .setDepth(shadeDepth)
      .setInteractive();
    elems.push(shade);

    const boxShadow = this.scene.add.graphics().setDepth(boxDepth);
    boxShadow.fillStyle(0x3b2414, 0.20);
    boxShadow.fillRoundedRect(boxX + 4, boxY + 5, boxW, boxH, 18);
    elems.push(boxShadow);

    const box = this.scene.add.graphics().setDepth(boxDepth + 1);
    box.fillStyle(0xfff7df, 0.96);
    box.fillRoundedRect(boxX, boxY, boxW, boxH, 18);
    box.lineStyle(2, 0xa46b36, 0.95);
    box.strokeRoundedRect(boxX, boxY, boxW, boxH, 18);
    box.lineStyle(1, 0xffe9bd, 0.95);
    box.strokeRoundedRect(boxX + 5, boxY + 5, boxW - 10, boxH - 10, 13);
    elems.push(box);

    const displayText = displayLines.join('\n');
    const text = this.scene.add.text(textX, textY, localizeText(displayText), {
      ...TEXT_STYLE,
      fontSize: growFontSize(opts.fontSize, '22px'),
      color: '#5b3419',
      align: 'left',
      lineSpacing: opts.lineSpacing ?? 6,
      wordWrap: { width: boxW - 168 },
    }).setOrigin(0, 0).setDepth(boxDepth + 2);
    text.__starcareRawText = displayText;
    elems.push(text);

    cleanChoices.forEach((choice, i) => {
      const b = makeButton(
        this.scene,
        choiceX,
        choiceStartY + i * (choiceHeight + choiceGap),
        choiceWidth,
        choiceHeight,
        choice.label,
        () => {
          if (choice.disabled) return;
          cleanup();
          if (choice.action) choice.action();
        },
        {
          fill: choice.disabled ? 0xd1d5db : 0xfff3d2,
          hover: 0xffe7aa,
          stroke: 0xb7834d,
          disabled: choice.disabled,
          textColor: '#5b3419',
          disabledTextColor: '#6b7280',
          fontSize: growFontSize(opts.choiceFontSize, '18px'),
          radius: 14,
          wordWrap: { width: choiceWidth - 28 },
        }
      ).setDepth(choiceDepth);

      buttons.push(b);
    });
  }
}
