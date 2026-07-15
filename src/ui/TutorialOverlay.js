
import { GAME_H, GAME_W, TEXT_STYLE } from '../core/Constants.js';
import { makeButton } from './widgets.js';

const DEFAULT_DEPTH_BASE = 20000;

export default class TutorialOverlay {
  constructor(scene, steps, onDone, opts = {}) {
    this.scene = scene;
    this.steps = Array.isArray(steps) ? steps : [];
    this.onDone = onDone;
    this.depthBase = opts.depthBase ?? DEFAULT_DEPTH_BASE;
    this.index = 0;
    this._button = null;

    this.container = scene.add.container(0, 0).setDepth(this.depthBase);
    this.shade = scene.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.35)
      .setInteractive();
    this.highlight = scene.add.graphics();
    this.pointer = scene.add.graphics();
    this.panel = scene.add.graphics();
    this.text = scene.add.text(0, 0, '', {
      ...TEXT_STYLE,
      fontSize: '17px',
      color: '#5b3419',
      lineSpacing: 6,
      wordWrap: { width: 328, useAdvancedWrap: true },
    });

    this.container.add([this.shade, this.highlight, this.pointer, this.panel, this.text]);
    this.showStep(0);
  }

  showStep(index) {
    if (index >= this.steps.length) {
      this.close();
      return;
    }

    this.index = index;
    const step = this.steps[index] ?? {};
    const rect = step.rect ?? { x: 0, y: 0, w: GAME_W, h: 80 };

    this.highlight.clear();
    this.highlight.lineStyle(4, 0xfff3b0, 1);
    this.highlight.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, 10);
    this.highlight.lineStyle(8, 0xffd66b, 0.22);
    this.highlight.strokeRoundedRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6, 12);

    const panelW = 392;
    const textWidth = panelW - 32;
    this.text
      .setWordWrapWidth(textWidth, true)
      .setText(step.text ?? '');
    const panelH = Math.max(96, this.text.height + 66);
    const panelX = this._clamp(rect.x + rect.w / 2 - panelW / 2, 24, GAME_W - panelW - 24);
    const panelY = rect.y + rect.h + panelH + 34 > GAME_H
      ? Math.max(76, rect.y - panelH - 28)
      : rect.y + rect.h + 28;

    this.panel.clear();
    this.panel.fillStyle(0xfff3d2, 0.98);
    this.panel.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    this.panel.lineStyle(2, 0xb7834d, 1);
    this.panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

    this.text.setPosition(panelX + 16, panelY + 16);

    this.pointer.clear();
    this._drawPointer(rect, panelX, panelY, panelW, panelH);

    this._button?.destroy();
    this._button = makeButton(
      this.scene,
      panelX + panelW - 72,
      panelY + panelH - 28,
      112,
      34,
      step.buttonLabel ?? (index >= this.steps.length - 1 ? '\u5b8c\u6210' : '\u4e0b\u4e00\u6b65'),
      () => this.showStep(this.index + 1),
      { fontSize: '16px', fill: 0xfffbeb, hover: 0xfef3c7 }
    ).setDepth(this.depthBase + 10);
  }

  close() {
    this.destroy();
    this.onDone?.();
  }

  destroy() {
    this._button?.destroy();
    this._button = null;
    this.container?.destroy(true);
    this.container = null;
  }

  _drawPointer(rect, panelX, panelY, panelW, panelH) {
    const fromX = this._clamp(rect.x + rect.w / 2, 20, GAME_W - 20);
    const fromY = rect.y + rect.h / 2;
    const toX = this._clamp(panelX + panelW / 2, 20, GAME_W - 20);
    const toY = panelY > fromY ? panelY : panelY + panelH;

    this.pointer.lineStyle(3, 0xffd66b, 0.95);
    this.pointer.beginPath();
    this.pointer.moveTo(fromX, fromY);
    this.pointer.lineTo(toX, toY);
    this.pointer.strokePath();

    const dir = panelY > fromY ? -1 : 1;
    this.pointer.fillStyle(0xffd66b, 0.95);
    this.pointer.beginPath();
    this.pointer.moveTo(toX, toY);
    this.pointer.lineTo(toX - 8, toY + dir * 12);
    this.pointer.lineTo(toX + 8, toY + dir * 12);
    this.pointer.closePath();
    this.pointer.fillPath();
  }

  _clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}
