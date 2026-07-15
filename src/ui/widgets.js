import { COLORS, FONT_FAMILY, GAME_H, GAME_W, TEXT_STYLE } from '../core/Constants.js';
import AudioManager from '../systems/AudioManager.js';
import { localizeText } from '../i18n/language.js';

const DEFAULT_BUTTON_SFX = 'sfx_dialog_next';
const DEFAULT_BUTTON_SFX_VOLUME = 0.8;

function playButtonSfx(opts = {}) {
  if (opts.noSfx) return;
  AudioManager.playSfx(opts.sfxKey ?? DEFAULT_BUTTON_SFX, {
    volume: opts.sfxVolume ?? DEFAULT_BUTTON_SFX_VOLUME,
  });
}

export function makeLabel(scene, x, y, label, opts = {}) {
  const text = scene.add.text(x, y, localizeText(label), {
    ...TEXT_STYLE,
    fontSize: opts.fontSize ?? '16px',
    color: opts.color ?? '#111111',
    align: opts.align ?? 'left',
    lineSpacing: opts.lineSpacing ?? 4,
    wordWrap: opts.wordWrap,
  });
  text.__starcareRawText = label;
  return text;
}

export function makeButton(scene, x, y, w, h, label, callback, opts = {}) {
  const disabled = Boolean(opts.disabled);
  const fill = disabled ? (opts.disabledFill ?? COLORS.disabled) : (opts.fill ?? 0xfff3d2);
const hover = opts.hover ?? 0xffe7aa;
const stroke = opts.stroke ?? 0xb7834d;
const fontSize = opts.fontSize ?? '16px';
 const textColor = disabled ? (opts.disabledTextColor ?? '#6b7280') : (opts.textColor ?? '#5b3419');
  

  const g = scene.add.graphics();
  const draw = (color) => {
    g.clear();
    g.fillStyle(color, opts.alpha ?? 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, opts.radius ?? 8);
    g.lineStyle(1, stroke, disabled ? 0.45 : 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, opts.radius ?? 8);
  };
  draw(fill);

  const t = scene.add.text(x, y, localizeText(label), {
    ...TEXT_STYLE,
    fontSize,
    color: textColor,
    align: 'center',
    wordWrap: opts.wordWrap,
  }).setOrigin(0.5);
  t.__starcareRawText = label;

  const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: !disabled });
  if (!disabled) {
    zone.on('pointerover', () => draw(hover));
    zone.on('pointerout', () => draw(fill));
    zone.on('pointerdown', () => {
      playButtonSfx(opts);
      callback?.();
    });
  }

    const api = {
    g,
    t,
    zone,

    get alpha() {
      return g.alpha;
    },

    set alpha(value) {
      g.setAlpha(value);
      t.setAlpha(value);
      zone.setAlpha(value);
    },

    get visible() {
      return g.visible;
    },

    set visible(value) {
      g.setVisible(value);
      t.setVisible(value);
      zone.setVisible(value);
    },

    setDepth(depth) {
      g.setDepth(depth);
      t.setDepth(depth + 1);
      zone.setDepth(depth + 2);
      return this;
    },

    setAlpha(alpha) {
      this.alpha = alpha;
      return this;
    },

    setVisible(visible) {
      this.visible = visible;
      return this;
    },

    setInteractive(config = { useHandCursor: true }) {
      zone.setInteractive(config);
      return this;
    },

    disableInteractive() {
      zone.disableInteractive();
      return this;
    },

    destroy() {
      g.destroy();
      t.destroy();
      zone.destroy();
    },
  };

  return api;
}

export function makeStartButton(scene, x, y, w, h, label, callback, opts = {}) {
  const primary = opts.primary ?? false;
  const container = scene.add.container(x, y);

  const glow = scene.add.graphics();
  const body = scene.add.graphics();
  const shine = scene.add.graphics();

  const text = scene.add.text(0, 0, localizeText(label), {
    fontFamily: FONT_FAMILY,
    fontSize: opts.fontSize ?? '25px',
    color: primary ? '#fff3c7' : '#fff0bf',
    align: 'center',
  }).setOrigin(0.5);
  text.__starcareRawText = label;
  text.setShadow(0, 2, '#2a1604', 5, true, true);

  const star = scene.add.text(w / 2 - 28, 0, '\u2726', {
    fontFamily: FONT_FAMILY,
    fontSize: '22px',
    color: '#ffdf8c',
  }).setOrigin(0.5);
  star.setShadow(0, 0, '#ffd36c', 10, true, true);

  const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });

  function draw(state = 'normal') {
    const hover = state === 'hover';
    const pressed = state === 'pressed';
    glow.clear();
    body.clear();
    shine.clear();

    glow.lineStyle(14, 0xffc768, hover ? 0.20 : 0.12);
    glow.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    glow.lineStyle(7, 0xffefb0, hover ? 0.22 : 0.14);
    glow.strokeRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, h / 2 - 2);

    if (primary) {
      body.fillStyle(0x6f4318, pressed ? 0.70 : hover ? 0.64 : 0.54);
      body.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      body.fillStyle(0xffd27a, pressed ? 0.16 : hover ? 0.22 : 0.15);
      body.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.44, h / 2 - 4);
      body.lineStyle(2, 0xffe3a0, hover ? 0.98 : 0.82);
    } else {
      body.fillStyle(0x07183e, pressed ? 0.76 : hover ? 0.70 : 0.58);
      body.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      body.fillStyle(0x5d7cc5, pressed ? 0.08 : hover ? 0.15 : 0.10);
      body.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.44, h / 2 - 4);
      body.lineStyle(2, 0xffdd8b, hover ? 0.95 : 0.74);
    }

    body.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    body.lineStyle(1, 0xfff8dc, hover ? 0.28 : 0.16);
    body.strokeRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, h / 2 - 6);

    shine.lineStyle(1, 0xffd477, hover ? 0.75 : 0.48);
    shine.beginPath();
    shine.moveTo(-w / 2 + 18, -h / 2 + 8);
    shine.lineTo(-w / 2 + 42, -h / 2 + 8);
    shine.moveTo(w / 2 - 42, h / 2 - 8);
    shine.lineTo(w / 2 - 18, h / 2 - 8);
    shine.strokePath();
  }

  draw('normal');
  container.add([glow, body, shine, text, star, zone]);

  zone.on('pointerover', () => {
    draw('hover');
    scene.tweens.add({ targets: container, y: y - 3, scaleX: 1.025, scaleY: 1.025, duration: 130, ease: 'Sine.easeOut' });
  });

  zone.on('pointerout', () => {
    draw('normal');
    scene.tweens.add({ targets: container, y, scaleX: 1, scaleY: 1, duration: 130, ease: 'Sine.easeOut' });
  });

  zone.on('pointerdown', () => {
    playButtonSfx(opts);
    draw('pressed');
    scene.tweens.add({ targets: container, y: y + 2, scaleX: 0.99, scaleY: 0.99, duration: 70, yoyo: true, ease: 'Sine.easeInOut', onComplete: callback });
  });

  return container;
}

export function makeCoverBackground(scene, textureKey, darken = 0.08) {
  const bg = scene.add.image(GAME_W / 2, GAME_H / 2, textureKey);
  const scale = Math.max(GAME_W / bg.width, GAME_H / bg.height);
  bg.setScale(scale);
  if (darken > 0) scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, darken);
  return bg;
}

export function makePageTitle(scene, title, subtitle = '') {
  makeLabel(scene, GAME_W / 2, 82, title, { fontSize: '30px', align: 'center', color: '#ffffff' })
    .setOrigin(0.5)
    .setShadow(0, 2, '#000000', 4, true, true);
  if (subtitle) {
    makeLabel(scene, GAME_W / 2, 120, subtitle, { fontSize: '17px', align: 'center', color: '#ffffff' })
      .setOrigin(0.5)
      .setShadow(0, 2, '#000000', 4, true, true);
  }
}


export function makeContainBackground(scene, textureKey, darken = 0) {
  const bg = scene.add.image(GAME_W / 2, GAME_H / 2, textureKey);
  const scale = Math.min(GAME_W / bg.width, GAME_H / bg.height);
  bg.setScale(scale);
  if (darken > 0) scene.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, darken);
  return bg;
}
