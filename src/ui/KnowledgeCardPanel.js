import { GAME_H, GAME_W, TEXT_STYLE } from '../core/Constants.js';
import { makeButton } from './widgets.js';
import AudioManager from '../systems/AudioManager.js';

const LAYOUT = {
  cardWidth: 860,
  minCardHeight: 430,
  padX: 54,
  padTop: 82,
  padBottom: 32,
  gapTip: 24,
  gapButton: 26,
  tagWidth: 350,
  tagHeight: 52,
  tagOverhang: 28,
  buttonWidth: 160,
  buttonHeight: 44,
  textWidth: 752,
  depthBase: 220,
};

export default class KnowledgeCardPanel {
  constructor(scene) {
    this.scene = scene;
    this._open = false;
    this._elems = [];
  }

  show(opts) {
    if (this._open) return;
    this._open = true;
    const o = opts || {};
    const title = o.title || '';
    const body = o.body || [];
    const tip = o.tip || '';
    const onClose = o.onClose;
    const showArchive = o.showArchive === true;
    const depth = LAYOUT.depthBase;
    const W = LAYOUT.cardWidth;
    const padX = LAYOUT.padX;
    const textW = LAYOUT.textWidth;
    const cx = GAME_W / 2;

    const bodyText = body.join('\n');
    const bodyTmp = this.scene.add.text(0, 0, bodyText, {
      ...TEXT_STYLE, fontSize: '22px', lineSpacing: 10,
      wordWrap: { width: textW, useAdvancedWrap: true },
    });
    const bodyTextHeight = bodyTmp.height;
    bodyTmp.destroy();

    let tipH = 0;
    if (tip) {
      const tt = this.scene.add.text(0, 0, tip, {
        ...TEXT_STYLE, fontSize: '19px', lineSpacing: 6,
        wordWrap: { width: textW - 32, useAdvancedWrap: true },
      });
      tipH = tt.height + 28;
      tt.destroy();
    }

    const contentH = LAYOUT.padTop + (bodyTextHeight || 28)
      + (tipH ? LAYOUT.gapTip + tipH : 0)
      + LAYOUT.gapButton + LAYOUT.buttonHeight + LAYOUT.padBottom;
    const H = Math.min(Math.max(contentH, LAYOUT.minCardHeight), GAME_H - 54);
    const cy = GAME_H / 2;
    const x = cx - W / 2;
    const y = cy - H / 2;

    const shade = this.scene.add
      .rectangle(cx, cy, GAME_W, GAME_H, 0x2a1a0d, 0.42)
      .setDepth(depth).setInteractive();
    this._elems.push(shade);

    const shadow = this.scene.add.graphics().setDepth(depth + 1);
    shadow.fillStyle(0x3b2414, 0.28);
    shadow.fillRoundedRect(x + 8, y + 10, W, H, 22);
    this._elems.push(shadow);

    const bg = this.scene.add.graphics().setDepth(depth + 2);
    bg.fillStyle(0xfff6df, 0.98);
    bg.fillRoundedRect(x, y, W, H, 22);
    bg.lineStyle(3, 0xb7834d, 0.92);
    bg.strokeRoundedRect(x, y, W, H, 22);
    bg.lineStyle(1, 0xffffff, 0.68);
    bg.strokeRoundedRect(x + 7, y + 7, W - 14, H - 14, 17);
    this._elems.push(bg);

    const tagW = LAYOUT.tagWidth;
    const tagH = LAYOUT.tagHeight;
    const tagX = x + 38;
    const tagY = y - LAYOUT.tagOverhang;

    const tagShadow = this.scene.add.graphics().setDepth(depth + 3);
    tagShadow.fillStyle(0x3b2414, 0.22);
    tagShadow.fillRoundedRect(tagX + 4, tagY + 5, tagW, tagH, 16);
    this._elems.push(tagShadow);

    const tag = this.scene.add.graphics().setDepth(depth + 4);
    tag.fillStyle(0xb7834d, 0.98);
    tag.fillRoundedRect(tagX, tagY, tagW, tagH, 16);
    tag.lineStyle(2, 0xffe4aa, 0.95);
    tag.strokeRoundedRect(tagX, tagY, tagW, tagH, 16);
    this._elems.push(tag);

    const tagText = this.scene.add
      .text(tagX + tagW / 2, tagY + tagH / 2, title, {
        ...TEXT_STYLE, fontSize: '17px',
        color: '#fff8e6', align: 'center',
        wordWrap: { width: tagW - 34, useAdvancedWrap: true },
      })
      .setOrigin(0.5).setDepth(depth + 5);
    tagText.setShadow(0, 1, '#5b3419', 2, true, true);
    this._elems.push(tagText);

    const bodyStartY = y + LAYOUT.padTop;
    const bodyTxt = this.scene.add
      .text(x + padX, bodyStartY, bodyText, {
        ...TEXT_STYLE, fontSize: '22px', color: '#5b3419',
        align: 'left', lineSpacing: 10,
        wordWrap: { width: textW, useAdvancedWrap: true },
      })
      .setOrigin(0, 0).setDepth(depth + 3);
    this._elems.push(bodyTxt);

    if (tip) {
      const tipStartY = bodyStartY + bodyTextHeight + (bodyTextHeight > 0 ? LAYOUT.gapTip : 12);
      const tipPadX = 16;
      const tipPadY = 14;
      const tipBoxW = textW;
      const tipBoxH = tipH;

      const tipBg = this.scene.add.graphics().setDepth(depth + 3);
      tipBg.fillStyle(0xffe9bd, 0.55);
      tipBg.fillRoundedRect(x + padX, tipStartY, tipBoxW, tipBoxH, 12);
      tipBg.lineStyle(1, 0xd4956a, 0.55);
      tipBg.strokeRoundedRect(x + padX, tipStartY, tipBoxW, tipBoxH, 12);
      this._elems.push(tipBg);

      const tipTxt = this.scene.add
        .text(x + padX + tipPadX, tipStartY + tipPadY, tip, {
          ...TEXT_STYLE, fontSize: '19px', color: '#7a4e2e',
          align: 'left', lineSpacing: 6,
          wordWrap: { width: textW - tipPadX * 2, useAdvancedWrap: true },
        })
        .setOrigin(0, 0).setDepth(depth + 4);
      this._elems.push(tipTxt);
    }

    const btnY = y + H - LAYOUT.padBottom - LAYOUT.buttonHeight / 2;
    const self = this;
    let closing = false;
    const btn = makeButton(
      this.scene, cx, btnY,
      LAYOUT.buttonWidth, LAYOUT.buttonHeight,
      '继续',
      function() {
        if (closing) return;
        closing = true;
        btn.disableInteractive?.();
        AudioManager.playSfx('sfx_dialog_next', { volume: 0.8 });
        if (showArchive) {
          self._showArchivedNotice(onClose);
        } else {
          self._cleanup();
          if (onClose) onClose();
        }
      },
      {
        fontSize: '20px', fill: 0xfff3d2, hover: 0xffe7aa,
        stroke: 0xb7834d, textColor: '#5b3419', radius: 16,
      }
    ).setDepth(depth + 5);
    this._elems.push(btn.g);
    this._elems.push(btn.t);
    this._elems.push(btn.zone);
  }

  _showArchivedNotice(onClose) {
    const depth = LAYOUT.depthBase + 10;
    const noticeW = 320;
    const noticeH = 42;
    const cx = GAME_W / 2;
    const noticeY = GAME_H / 2 + 120;

    const noticeBg = this.scene.add.graphics().setDepth(depth);
    noticeBg.fillStyle(0x6f4318, 0.92);
    noticeBg.fillRoundedRect(cx - noticeW / 2, noticeY - noticeH / 2, noticeW, noticeH, 14);
    this._elems.push(noticeBg);

    const noticeTxt = this.scene.add
      .text(cx, noticeY, '已收录至 ASD 资料馆', {
        ...TEXT_STYLE, fontSize: '16px',
        color: '#ffe9bd', align: 'center',
      })
      .setOrigin(0.5).setDepth(depth + 1);
    this._elems.push(noticeTxt);

    const self = this;
    this.scene.time.delayedCall(1500, function() {
      self._cleanup();
      if (onClose) onClose();
    });
  }

  close() { this._cleanup(); }

  destroy() { this._cleanup(); }

  _cleanup() {
    var i;
    for (i = 0; i < this._elems.length; i++) {
      var e = this._elems[i];
      if (e && typeof e.destroy === 'function') e.destroy();
    }
    this._elems = [];
    this._open = false;
  }
}
