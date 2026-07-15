import { GAME_H, GAME_W, TEXT_STYLE } from '../core/Constants.js';
import AudioManager from '../systems/AudioManager.js';

const CONFIRM_SFX = {
  key: 'sfx_dialog_next',
  volume: 0.8,
};

const DIALOG_LAYOUT = {
  width: 1000,
  height: 148,
  bottomMargin: 18,
  shadeAlpha: 0.08,

  // 分页与排版默认参数
  maxCharsPerLine: 36,
  maxLinesPerPage: 2,
  lineSpacing: 6,
  textOffsetX: 54,
  textOffsetY: 48,
  textWidthReserve: 168,

  // 姓名牌
  tagWidth: 150,
  tagHeight: 44,
  tagOffsetX: 38,
  tagOffsetY: -30,

  // 页码与按钮位置
  pageIndicatorOffsetX: 92,
  skipWidth: 92,
  skipHeight: 34,
  skipOffsetX: 66,
  skipOffsetY: 24,
};

const DEFAULT_SPEAKERS = new Set([
  '陈岚',
  '周嘉宁',
  '橙橙',
  '林老师',
  '王老师',
  '张老师',
  '小张老师',
  '刘老师',
  '孙老师',
  '周嘉宁',
  '小孩母亲',
  '小孩父亲',
  '小明母亲',
  '小凯',
  '橙橙父亲',
  '家长',
  '你',
]);

// 从单条文本中解析 【说话人】前缀，返回 { speaker, text }
// 例：'【陈岚】你好' → { speaker: '陈岚', text: '你好' }
// 例：'你站在门口。'  → { speaker: null,  text: '你站在门口。' }
function parseSpeaker(raw, validSpeakers = DEFAULT_SPEAKERS) {
  const line = String(raw ?? '');
  const m = line.match(/^【([^】]+)】(.*)$/s);
  if (!m) return { speaker: null, text: line };

  const speaker = m[1].trim();
  if (!validSpeakers.has(speaker)) {
    return { speaker: null, text: line };
  }

  return { speaker, text: m[2] };
}


// 把原始 lines 拆分成带说话人信息的页面数组
// 每页格式：{ speaker: string|null, text: string }
// 合并规则：
//   - 有【说话人】的台词：独立成页，不与其他行合并
//   - 纯旁白（无说话人）：相邻旁白行可合并，最多 maxLinesPerPage 行/页
//   - 一旦遇到台词行，旁白缓冲立即落页
function paginateWithSpeaker(
  lines,
  maxCharsPerLine = DIALOG_LAYOUT.maxCharsPerLine,
  maxLinesPerPage = DIALOG_LAYOUT.maxLinesPerPage,
  validSpeakers = DEFAULT_SPEAKERS
) {
  const pages = [];

  // 旁白行缓冲：累积纯旁白视觉行，凑满 maxLinesPerPage 再落页
  let narratorBuf = [];

  const flushNarrator = () => {
    if (narratorBuf.length === 0) return;
    for (let i = 0; i < narratorBuf.length; i += maxLinesPerPage) {
      pages.push({
        speaker: null,
        text: narratorBuf.slice(i, i + maxLinesPerPage).join('\n'),
      });
    }
    narratorBuf = [];
  };

  lines.forEach((rawLine) => {
    const { speaker, text } = parseSpeaker(rawLine, validSpeakers);

    // 把 text 按字符数切成若干视觉行
    const visualLines = [];
    if (text === '') {
      visualLines.push('');
    } else {
      let rest = String(text ?? '');
      while (rest.length > maxCharsPerLine) {
        visualLines.push(rest.slice(0, maxCharsPerLine));
        rest = rest.slice(maxCharsPerLine);
      }
      visualLines.push(rest);
    }

    if (speaker) {
      // 台词：先把旁白缓冲落页，再把台词独立成页（允许台词内部超长换行）
      flushNarrator();
      for (let i = 0; i < visualLines.length; i += maxLinesPerPage) {
        pages.push({
          speaker,
          text: visualLines.slice(i, i + maxLinesPerPage).join('\n'),
        });
      }
    } else {
      // 旁白：加入缓冲，满了就落页
      visualLines.forEach((vl) => {
        narratorBuf.push(vl);
        if (narratorBuf.length >= maxLinesPerPage) {
          pages.push({ speaker: null, text: narratorBuf.join('\n') });
          narratorBuf = [];
        }
      });
    }
  });

  // 落出剩余旁白
  flushNarrator();

  return pages.length ? pages : [{ speaker: null, text: '' }];
}

export default class DialogBox {
  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this._activeClose = null;
  }

  forceClose(options = {}) {
    if (typeof this._activeClose === 'function') {
      this._activeClose({ silent: true, ...options });
    }
  }

  show(lines, onClose, opts = {}) {
    if (this.open) return;
    this.open = true;

    const cleanLines = Array.isArray(lines) ? lines : [String(lines ?? '')];

    const W = opts.width ?? DIALOG_LAYOUT.width;
    const H = opts.height ?? DIALOG_LAYOUT.height;
    const cx = GAME_W / 2;
    const bottomMargin = opts.bottomMargin ?? DIALOG_LAYOUT.bottomMargin;
    const x = cx - W / 2;
    const y = GAME_H - H - bottomMargin;

    // 外部强制指定的 speaker（旧接口兼容），优先级低于行内 【】 解析
    const forceSpeaker = opts.hideSpeaker ? null : (opts.speaker ?? opts.name ?? null);
    const fontSize = opts.fontSize ?? '24px';
    const validSpeakers = new Set([
      ...DEFAULT_SPEAKERS,
      ...(opts.validSpeakers ?? []),
    ]);
    // 使用带说话人信息的分页，每页 { speaker, text }
    const pages = paginateWithSpeaker(
      cleanLines,
      opts.maxCharsPerLine ?? DIALOG_LAYOUT.maxCharsPerLine,
      opts.maxLinesPerPage ?? DIALOG_LAYOUT.maxLinesPerPage,
      validSpeakers
    );
    let pageIndex = 0;

    const elems = [];

    // 阻止点穿到底下按钮，但不要把整个画面压得太黑。
    const shade = this.scene.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, opts.shadeAlpha ?? DIALOG_LAYOUT.shadeAlpha)
      .setDepth(40)
      .setInteractive();
    elems.push(shade);

    // 阴影
    const shadow = this.scene.add.graphics().setDepth(91);
    shadow.fillStyle(0x3b2414, 0.28);
    shadow.fillRoundedRect(x + 6, y + 8, W, H, 22);
    elems.push(shadow);

    // 主文本框
    const bg = this.scene.add.graphics().setDepth(92);
    bg.fillStyle(0xfff7df, 0.96);
    bg.fillRoundedRect(x, y, W, H, 22);
    bg.lineStyle(3, 0xa46b36, 0.95);
    bg.strokeRoundedRect(x, y, W, H, 22);

    // 内描边
    bg.lineStyle(1, 0xffe9bd, 0.95);
    bg.strokeRoundedRect(x + 7, y + 7, W - 14, H - 14, 17);
    elems.push(bg);

    // 姓名牌容器：随翻页动态更新，不加入 elems（单独管理销毁）
    const tagW = opts.tagWidth ?? DIALOG_LAYOUT.tagWidth;
    const tagH = opts.tagHeight ?? DIALOG_LAYOUT.tagHeight;
    const tagX = x + DIALOG_LAYOUT.tagOffsetX;
    const tagY = y + DIALOG_LAYOUT.tagOffsetY;

    let tagElems = [];

    const renderTag = (speaker) => {
      // 销毁上一页的姓名牌
      tagElems.forEach((e) => e.destroy());
      tagElems = [];

      if (!speaker) return;

      const tagShadow = this.scene.add.graphics().setDepth(93);
      tagShadow.fillStyle(0x3b2414, 0.25);
      tagShadow.fillRoundedRect(tagX + 4, tagY + 5, tagW, tagH, 16);
      tagElems.push(tagShadow);

      const tag = this.scene.add.graphics().setDepth(94);
      tag.fillStyle(0xb7834d, 0.98);
      tag.fillRoundedRect(tagX, tagY, tagW, tagH, 16);
      tag.lineStyle(2, 0xffe4aa, 0.95);
      tag.strokeRoundedRect(tagX, tagY, tagW, tagH, 16);
      tagElems.push(tag);

      const tagText = this.scene.add.text(tagX + tagW / 2, tagY + tagH / 2, speaker, {
        ...TEXT_STYLE,
        fontSize: opts.speakerFontSize ?? '20px',
        color: '#fff8e6',
        align: 'center',
      }).setOrigin(0.5).setDepth(95);
      tagText.setShadow(0, 1, '#5b3419', 2, true, true);
      tagElems.push(tagText);
    };

    // 对话框区域也可点击继续。
    const dialogZone = this.scene.add
      .zone(x + W / 2, y + H / 2, W, H)
      .setDepth(95)
      .setInteractive({ useHandCursor: true });
    elems.push(dialogZone);

    // 正文
    const txt = this.scene.add.text(
      x + DIALOG_LAYOUT.textOffsetX,
      y + DIALOG_LAYOUT.textOffsetY,
      pages[pageIndex].text,
      {
        ...TEXT_STYLE,
        fontSize,
        color: '#5b3419',
        align: 'left',
        lineSpacing: opts.lineSpacing ?? DIALOG_LAYOUT.lineSpacing,
      }
    ).setOrigin(0, 0).setDepth(95);
    elems.push(txt);

    // 渲染第一页姓名牌
    renderTag(pages[pageIndex].speaker ?? forceSpeaker);

    // 页码
    const skipElems = [];
    let closed = false;

    const closeAll = ({ skipped = false, silent = false } = {}) => {
      if (closed) return;
      closed = true;
      tagElems.forEach((e) => e.destroy());
      skipElems.forEach((e) => e.destroy());
      elems.forEach((e) => e.destroy());
      this.open = false;
      this._activeClose = null;
      if (silent) return;
      if (skipped && typeof opts.onSkip === 'function') {
        opts.onSkip();
        return;
      }
      if (onClose) onClose();
    };

    this._activeClose = closeAll;

    const advance = () => {
      if (closed) return;

      if (pageIndex < pages.length - 1) {
        pageIndex += 1;
        txt.setText(pages[pageIndex].text);
        renderTag(pages[pageIndex].speaker ?? forceSpeaker);
        return;
      }

      closeAll();
    };

    // 点击对话框外的遮罩/空白区域也继续；遮罩仍然负责阻止点穿到底层按钮。
    shade.on('pointerdown', advance);
    dialogZone.on('pointerdown', advance);

    if (opts.showSkip !== false) {
      const skipW = opts.skipWidth ?? DIALOG_LAYOUT.skipWidth;
      const skipH = opts.skipHeight ?? DIALOG_LAYOUT.skipHeight;
      const skipX = x + W - (opts.skipOffsetX ?? DIALOG_LAYOUT.skipOffsetX);
      const skipY = y + DIALOG_LAYOUT.skipOffsetY;

      const skipBg = this.scene.add
        .rectangle(skipX, skipY, skipW, skipH, 0xfff3d2, 0.96)
        .setDepth(96)
        .setStrokeStyle(2, 0xb7834d, 0.95)
        .setInteractive({ useHandCursor: true });
      const skipText = this.scene.add.text(skipX, skipY, opts.skipLabel ?? '跳过', {
        ...TEXT_STYLE,
        fontSize: '16px',
        color: '#5b3419',
      }).setOrigin(0.5).setDepth(97);
      const skipZone = this.scene.add
        .zone(skipX, skipY, skipW, skipH)
        .setDepth(98)
        .setInteractive({ useHandCursor: true });

      const skipNow = (_pointer, _localX, _localY, event) => {
        event?.stopPropagation?.();
        if (!opts.noSfx) AudioManager.playSfx(CONFIRM_SFX.key, { volume: CONFIRM_SFX.volume });
        closeAll({ skipped: true });
      };

      skipBg.on('pointerover', () => skipBg.setFillStyle(0xffe7aa, 0.98));
      skipBg.on('pointerout', () => skipBg.setFillStyle(0xfff3d2, 0.96));
      skipBg.on('pointerdown', skipNow);
      skipZone.on('pointerover', () => skipBg.setFillStyle(0xffe7aa, 0.98));
      skipZone.on('pointerout', () => skipBg.setFillStyle(0xfff3d2, 0.96));
      skipZone.on('pointerdown', skipNow);

      skipElems.push(skipBg, skipText, skipZone);
    }

  }
}
