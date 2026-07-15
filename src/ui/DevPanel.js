import { GAME_W } from '../core/Constants.js';
import { syncActionCapacity } from '../core/GameState.js';
import { ROOMS } from '../data/rooms.js';

const DEPTH = 220;
const PANEL_X = 426;
const PANEL_Y = 56;
const PANEL_W = 522;
const ROW_H = 26;
const NAME_X = 12;
const VALUE_X = 214;
const BTN_START_X = 262;
const BTN_W = 56;
const BTN_GAP = 8;
const BUTTON_LABELS = [-10, -1, +1, +10];

const ROWS = [
  { label: '金钱', path: 'funds' },
  { label: '名望', path: 'reputation' },
  { label: '家长信任', path: 'parentTrust' },
  { label: '当前行动力', path: 'actionPoints' },
  { label: '最大行动力', path: 'maxActionPoints' },
  { label: '专业理解', path: 'attrs.professional' },
  { label: '沟通能力', path: 'attrs.communication' },
  { label: '体能经验', path: 'attrs.physicalExp' },
  { label: '孩子信任度', path: 'group.trust' },
  { label: '孩子压力值', path: 'group.stress' },
  { label: '橙橙好感度', path: 'orange.affection' },
  { label: '所长好感度', path: 'director.affection' },
];

function getByPath(obj, path) {
  return path.split('.').reduce((cur, key) => (cur != null ? cur[key] : undefined), obj);
}

function setByPath(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  let cur = obj;
  parts.forEach((key) => {
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key];
  });
  cur[last] = value;
}

function toSafeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function createMiniButton(scene, container, x, y, text, onClick) {
  const bg = scene.add.rectangle(x, y, BTN_W, 20, 0xfff0cb, 1);
  bg.setStrokeStyle(1, 0xa87747, 1);
  bg.setInteractive({ useHandCursor: true });

  const label = scene.add.text(x, y, String(text), {
    fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", "PingFang SC", sans-serif',
    fontSize: '12px',
    color: '#5b3419',
  }).setOrigin(0.5);

  bg.on('pointerover', () => bg.setFillStyle(0xffe4a6, 1));
  bg.on('pointerout', () => bg.setFillStyle(0xfff0cb, 1));
  bg.on('pointerdown', onClick);

  container.add([bg, label]);
}

function createTextButton(scene, container, x, y, w, h, text, onClick) {
  const bg = scene.add.rectangle(x, y, w, h, 0xffd980, 1);
  bg.setStrokeStyle(1, 0xa87747, 1);
  bg.setInteractive({ useHandCursor: true });

  const label = scene.add.text(x, y, text, {
    fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", "PingFang SC", sans-serif',
    fontSize: '12px',
    color: '#5b3419',
  }).setOrigin(0.5);

  bg.on('pointerover', () => bg.setFillStyle(0xffc766, 1));
  bg.on('pointerout', () => bg.setFillStyle(0xffd980, 1));
  bg.on('pointerdown', onClick);

  container.add([bg, label]);
}

export function createDevPanel(scene, gs, options = {}) {
  const onChange = typeof options.onChange === 'function' ? options.onChange : null;
  const onGodMode = typeof options.onGodMode === 'function' ? options.onGodMode : null;
  const x = options.x ?? PANEL_X;
  const y = options.y ?? PANEL_Y;
  const width = options.width ?? PANEL_W;
  const rowH = options.rowHeight ?? ROW_H;
  const panelH = 44 + ROWS.length * rowH + 10;

  const container = scene.add.container(x, y).setDepth(options.depth ?? DEPTH);

  const bg = scene.add.graphics();
  bg.fillStyle(0xfff7df, 0.98);
  bg.fillRoundedRect(0, 0, width, panelH, 12);
  bg.lineStyle(2, 0xa46b36, 0.95);
  bg.strokeRoundedRect(0, 0, width, panelH, 12);
  bg.lineStyle(1, 0xffe9bd, 0.9);
  bg.strokeRoundedRect(4, 4, width - 8, panelH - 8, 9);

  const title = scene.add.text(12, 10, '无敌模式', {
    fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", "PingFang SC", sans-serif',
    fontSize: '14px',
    color: '#5b3419',
  });

  const closeBg = scene.add.rectangle(width - 36, 18, 48, 20, 0xfff0cb, 1)
    .setStrokeStyle(1, 0xa87747, 1)
    .setInteractive({ useHandCursor: true });
  const closeText = scene.add.text(width - 36, 18, '关闭', {
    fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", "PingFang SC", sans-serif',
    fontSize: '12px',
    color: '#5b3419',
  }).setOrigin(0.5);

  closeBg.on('pointerover', () => closeBg.setFillStyle(0xffe4a6, 1));
  closeBg.on('pointerout', () => closeBg.setFillStyle(0xfff0cb, 1));

  container.add([bg, title, closeBg, closeText]);

  const valueTexts = new Map();

  const refreshValue = (path) => {
    const txt = valueTexts.get(path);
    if (!txt || !txt.active) return;
    txt.setText(String(toSafeNumber(getByPath(gs, path))));
  };

  const refreshAllValues = () => {
    ROWS.forEach((row) => refreshValue(row.path));
  };

  const applyDelta = (path, delta) => {
    const current = toSafeNumber(getByPath(gs, path));
    let next = Math.max(0, current + delta);

    if (path === 'actionPoints') {
      next = Math.min(next, toSafeNumber(gs.maxActionPoints));
    }

    setByPath(gs, path, next);

    if (path === 'attrs.physicalExp') {
      syncActionCapacity(gs);
      refreshValue('attrs.physicalExp');
      refreshValue('maxActionPoints');
      refreshValue('actionPoints');
    } else if (path === 'maxActionPoints') {
      gs.maxActionPoints = Math.max(1, toSafeNumber(gs.maxActionPoints));
      gs.actionPoints = Math.min(toSafeNumber(gs.actionPoints), gs.maxActionPoints);
      refreshValue('maxActionPoints');
      refreshValue('actionPoints');
    } else {
      refreshValue(path);
    }

    onChange?.(gs);
  };

  const applyGodMode = () => {
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

    gs.flags ??= {};
    gs.flags.godModeEnabled = true;

    refreshAllValues();
    onChange?.(gs);
  };

  createTextButton(scene, container, width - 122, 18, 92, 20, '无敌模式', () => {
    if (onGodMode) {
      onGodMode(applyGodMode);
      return;
    }
    applyGodMode();
  });

  ROWS.forEach((row, idx) => {
    const y0 = 40 + idx * rowH + rowH / 2;

    const nameText = scene.add.text(NAME_X, y0, row.label, {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '12px',
      color: '#6a3f1f',
    }).setOrigin(0, 0.5);

    const valueText = scene.add.text(VALUE_X, y0, String(toSafeNumber(getByPath(gs, row.path))), {
      fontFamily: '"MaokenZhuyuan", "Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '12px',
      color: '#5b3419',
    }).setOrigin(0.5, 0.5);

    valueTexts.set(row.path, valueText);
    container.add([nameText, valueText]);

    BUTTON_LABELS.forEach((delta, btnIdx) => {
      const bx = BTN_START_X + btnIdx * (BTN_W + BTN_GAP);
      createMiniButton(scene, container, bx, y0, delta > 0 ? `+${delta}` : `${delta}`, () => applyDelta(row.path, delta));
    });
  });

  const rawDestroy = container.destroy.bind(container);
  container.destroy = (...args) => {
    if (!container.active) return;
    rawDestroy(...args);
  };
  container.close = () => {
    if (!container.active) return;
    container.destroy();
  };

  closeBg.on('pointerdown', () => container.close());

  if (x + width > GAME_W - 8) {
    container.x = Math.max(8, GAME_W - width - 8);
  }

  return container;
}
