import { CONTENT_CENTER_X } from '../core/Constants.js';

const DEPTH = 80;

export const COMPUTER_LAYOUT = {
  panel: { x: CONTENT_CENTER_X, y: 330, width: 900, height: 560 },
  close: { x: CONTENT_CENTER_X -340, y: 504, size: 70, hoverSize: 80 },
  desktopIcons: {
    startX: CONTENT_CENTER_X - 300,
    y: 314,
    gap: 200,
    size: 180,
    hoverSize: 190,
    hitWidth: 180,
    hitHeight: 190,
  },
  text: {
    x: CONTENT_CENTER_X,
    y: 178,
    width: 690,
  },
  choices: {
    x: CONTENT_CENTER_X,
    startY: 390,
    gap: 58,
    width: 430,
    height: 46,
  },
};

export default class ComputerPanel {
  constructor(scene, { onClose } = {}) {
    this.scene = scene;
    this.onClose = onClose;
    this.controls = [];
    this.controlsEnabled = true;
    this.container = scene.add.container(0, 0).setDepth(DEPTH);
    this.content = scene.add.container(0, 0);

    const blocker = scene.add
      .rectangle(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width, scene.scale.height, 0x111827, 0.42)
      .setInteractive();

    const cfg = COMPUTER_LAYOUT.panel;
    const panel = scene.add.image(cfg.x, cfg.y, 'computer_panel').setDisplaySize(cfg.width, cfg.height);

    const closeCfg = COMPUTER_LAYOUT.close;
    const close = scene.add.image(closeCfg.x, closeCfg.y, 'computer_icon_close')
      .setDisplaySize(closeCfg.size, closeCfg.size)
      .setInteractive({ useHandCursor: true });
    close.on('pointerover', () => close.setDisplaySize(closeCfg.hoverSize, closeCfg.hoverSize));
    close.on('pointerout', () => close.setDisplaySize(closeCfg.size, closeCfg.size));
    close.on('pointerdown', () => this.destroy());
    this.closeButton = close;
    this.controls.push(close);

    this.container.add([blocker, panel, this.content, close]);
  }

  destroy() {
    this.container?.destroy();
    this.container = null;
    this.content = null;
    this.onClose?.();
  }

  clear() {
    this.content?.removeAll(true);
    this.controls = this.closeButton ? [this.closeButton] : [];
  }

  setControlsEnabled(enabled) {
    this.controlsEnabled = enabled;
    this.controls.forEach((control) => {
      if (!control?.active) return;
      if (enabled) {
        control.setInteractive({ useHandCursor: true });
      } else {
        control.disableInteractive();
      }
    });
  }

  showDesktop(apps) {
    this.clear();
    this.setControlsEnabled(true);
    const cfg = COMPUTER_LAYOUT.desktopIcons;
    apps.forEach((app, index) => {
      const x = cfg.startX + index * cfg.gap;
      const icon = this.scene.add.image(x, cfg.y, app.key)
        .setDisplaySize(cfg.size, cfg.size)
        .setInteractive({ useHandCursor: true });
      const hit = this.scene.add.zone(x, cfg.y, cfg.hitWidth, cfg.hitHeight)
        .setInteractive({ useHandCursor: true });

      const grow = () => icon.setDisplaySize(cfg.hoverSize, cfg.hoverSize);
      const shrink = () => icon.setDisplaySize(cfg.size, cfg.size);
      icon.on('pointerover', grow);
      icon.on('pointerout', shrink);
      icon.on('pointerdown', () => app.action?.());
      hit.on('pointerover', grow);
      hit.on('pointerout', shrink);
      hit.on('pointerdown', () => app.action?.());
      this.controls.push(icon, hit);

      this.content.add([icon, hit]);
    });
    this.setControlsEnabled(true);
  }

  showTextPage(lines, choices = []) {
    this.clear();
    this.setControlsEnabled(true);
    const textCfg = COMPUTER_LAYOUT.text;
    const body = this.scene.add.text(textCfg.x, textCfg.y, lines.join('\n'), {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: '#4b3322',
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: textCfg.width },
    }).setOrigin(0.5, 0);
    this.content.add(body);

    const choiceCfg = COMPUTER_LAYOUT.choices;
    choices.forEach((choice, index) => {
      this.content.add(this._makeTextButton(
        choiceCfg.x,
        choiceCfg.startY + index * choiceCfg.gap,
        choiceCfg.width,
        choiceCfg.height,
        choice.label,
        choice.action,
      ));
    });
    this.setControlsEnabled(true);
  }

  _makeTextButton(x, y, w, h, label, action) {
    const group = this.scene.add.container(0, 0);
    const bg = this.scene.add.rectangle(x, y, w, h, 0xfff3d2, 0.96)
      .setStrokeStyle(2, 0xb7834d, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(x, y, label, {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", sans-serif',
      fontSize: '19px',
      color: '#5b3419',
      align: 'center',
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0xffe7aa, 1));
    bg.on('pointerout', () => bg.setFillStyle(0xfff3d2, 0.96));
    bg.on('pointerdown', () => action?.());
    this.controls.push(bg);
    group.add([bg, text]);
    return group;
  }
}
