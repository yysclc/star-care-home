import { ACTIVE_SLOT_KEY, LEGACY_SAVE_KEY, SAVE_SLOT_COUNT, SAVE_SLOT_KEYS } from './Constants.js';
import { clamp, deepMerge, addByPath } from './ValueSystem.js';
import { syncGlobalCollectionsFromState } from '../data/collections.js';

export const BASE_AP = 12;
export const PHYSICAL_PER_AP = 10;
export const AP_PER_STEP = 1;

// ─────────────────────────────────────────────────────────────────────────────
// 唯一默认 schema
// 以后新增字段只改这里；字段改名才在 migrateState 里写迁移。
// ─────────────────────────────────────────────────────────────────────────────
export const GAME_STATE_SCHEMA = {
  version: 1,

  day: 1,

  funds: 1500,
  reputation: 20,
  parentTrust: 50,

  actionPoints: 12,
  maxActionPoints: 12,

  // 机构属性（staff 端）
  attrs: {
    professional: 1,
    communication: 1,
    physical: 1,
    physicalExp: 0,
  },

  group: {
    trust: 40,
    stress: 30,
  },

  // NPC 好感 / flags
  orange: {
    affection: 0,
    flags: {},
  },

  director: {
    affection: 0,
    flags: {},
  },

  // 解锁的房间
  rooms: {
    activityRoom: true,
    toyRoom: true,
    diningRoom: true,
    outdoorYard: true,
    paintingRoom: false,
    library: false,
    sensoryRoom: false,
  },

  // 当日进度（固定 / 自由行动）
  dayProgress: {
    fixedActionsDone: 0,
    fixedActionCounts: {},
    fixedActionHistory: [],
    freeActionDone: {},
    orangeInteractionDone: {},
    parentAiTriggeredEvents: [],
    parentAiTriggeredOutcomes: [],
    parentAiCompletedEvents: [],
    parentAiCompletedOutcomes: [],
    parentAiSessions: {},
    parentAiCompletedSessions: {},
    phase: 'prologue',
  },

  // 全局 flags（任意 boolean 标记）
  flags: {},

  // 玩家信息
  player: {
    gender: 'female',
    attrs: {
      professional: 0,
      communication: 0,
      physical: 0,
    },
    prologueLetterReaction: '',
  },

  // 收集物 / CG
  collections: {
    items: {},
    cgs: {},
  },

  // 道具栏
  inventory: {
    careItems: [],
  },

  // 用户设置（音量等，留空）
  settings: {},

  // Resume target for save/load. Scene code can add more details when needed.
  resume: {
    sceneKey: '',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 深拷贝工具（兼容所有目标浏览器）
// ─────────────────────────────────────────────────────────────────────────────
export function cloneDefault(value) {
  return JSON.parse(JSON.stringify(value));
}

// ─────────────────────────────────────────────────────────────────────────────
// 版本迁移
// 字段改名写这里；新增字段只改 schema。
// ─────────────────────────────────────────────────────────────────────────────
export function migrateState(gs) {
  const version = gs.version ?? 0;

  if (version < 1) {
    // v0 → v1: week 字段已被 day 替代（day = (week-1)*5 + dayOfWeek）
    // 如果旧档有独立的 week 字段，忽略即可；schema 里已无 week 顶层字段。
    // prologueLetterReaction 旧址在 gs 根，新址在 gs.player
    if (gs.prologueLetterReaction !== undefined && !gs.player?.prologueLetterReaction) {
      gs.player = gs.player ?? {};
      gs.player.prologueLetterReaction = gs.prologueLetterReaction;
    }
  }

  gs.version = GAME_STATE_SCHEMA.version;
  return gs;
}

// ─────────────────────────────────────────────────────────────────────────────
// normalizeState
// 语义：默认值兜底，存档值覆盖默认值（defaults + saved = final）
// 只补缺字段，不覆盖已有字段。
// ─────────────────────────────────────────────────────────────────────────────
export function normalizeState(raw) {
  // deepMerge(base, incoming) → base 的结构打底，incoming 的值优先
  const gs = deepMerge(cloneDefault(GAME_STATE_SCHEMA), raw || {});

  // 对 dayProgress 中的数组/对象字段做额外防护
  // （deepMerge 已正确保留 incoming 的 array；这里只是明确防止 undefined）
  gs.dayProgress ??= {};
  gs.dayProgress.fixedActionsDone    = gs.dayProgress.fixedActionsDone    ?? 0;
  gs.dayProgress.fixedActionCounts   = gs.dayProgress.fixedActionCounts   ?? {};
  gs.dayProgress.fixedActionHistory  = gs.dayProgress.fixedActionHistory  ?? [];
  gs.dayProgress.freeActionDone      = gs.dayProgress.freeActionDone      ?? {};
  gs.dayProgress.orangeInteractionDone = gs.dayProgress.orangeInteractionDone ?? {};
  gs.dayProgress.parentAiTriggeredEvents = Array.isArray(gs.dayProgress.parentAiTriggeredEvents)
    ? gs.dayProgress.parentAiTriggeredEvents
    : [];
  gs.dayProgress.parentAiTriggeredOutcomes = Array.isArray(gs.dayProgress.parentAiTriggeredOutcomes)
    ? gs.dayProgress.parentAiTriggeredOutcomes
    : [];
  gs.dayProgress.parentAiCompletedEvents = Array.isArray(gs.dayProgress.parentAiCompletedEvents)
    ? gs.dayProgress.parentAiCompletedEvents
    : [];
  gs.dayProgress.parentAiCompletedOutcomes = Array.isArray(gs.dayProgress.parentAiCompletedOutcomes)
    ? gs.dayProgress.parentAiCompletedOutcomes
    : [];
  gs.dayProgress.parentAiSessions = gs.dayProgress.parentAiSessions ?? {};
  gs.dayProgress.parentAiCompletedSessions = gs.dayProgress.parentAiCompletedSessions ?? {};
  gs.resume ??= {};
  gs.resume.sceneKey = typeof gs.resume.sceneKey === 'string' ? gs.resume.sceneKey : '';

  return syncActionCapacity(gs);
}

export function setResumeScene(gs, sceneKey) {
  if (!gs || typeof gs !== 'object') return gs;
  gs.resume ??= {};
  gs.resume.sceneKey = typeof sceneKey === 'string' ? sceneKey : '';
  return gs;
}

export function resolveResumeScene(gs) {
  const explicit = gs?.resume?.sceneKey;
  if (typeof explicit === 'string' && explicit.trim()) {
    return explicit.trim();
  }

  const phase = gs?.dayProgress?.phase;
  if (phase === 'prologue') return 'PrologueScene';
  if (phase === 'result') return 'ResultScene';

  // Legacy saves used "fixed" for the office entry before fixed actions.
  // New saves inside FixedActionScene carry resume.sceneKey = "FixedActionScene".
  return 'OfficeScene';
}

export function getCurrentWeek(gs, fallback = 1) {
  const explicitWeek = Number(gs?.week);
  if (Number.isFinite(explicitWeek) && explicitWeek >= 1) {
    return Math.floor(explicitWeek);
  }

  const progressWeek = Number(gs?.progress?.week);
  if (Number.isFinite(progressWeek) && progressWeek >= 1) {
    return Math.floor(progressWeek);
  }

  const dayAsWeek = Number(gs?.day);
  if (Number.isFinite(dayAsWeek) && dayAsWeek >= 1) {
    return Math.floor(dayAsWeek);
  }

  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// createFreshState / createInitialState（两个名字指向同一逻辑，兼容旧调用）
// 必须完整深拷贝 schema，禁止引用复用。
// ─────────────────────────────────────────────────────────────────────────────
export function createFreshState() {
  return normalizeState(cloneDefault(GAME_STATE_SCHEMA));
}

/** @alias createFreshState */
export const createInitialState = createFreshState;

// ─────────────────────────────────────────────────────────────────────────────
// slot 工具
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SLOT = 1;

function isValidSlot(slot) {
  return Number.isInteger(slot) && slot >= 1 && slot <= SAVE_SLOT_COUNT;
}

function normalizeSlot(slot, fallback = DEFAULT_SLOT) {
  const parsed = Number(slot);
  return isValidSlot(parsed) ? parsed : fallback;
}

function getSlotKey(slot) {
  const resolved = normalizeSlot(slot);
  return SAVE_SLOT_KEYS[resolved] ?? SAVE_SLOT_KEYS[DEFAULT_SLOT];
}

function isSlotEmpty(slot) {
  try {
    return !localStorage.getItem(getSlotKey(slot));
  } catch {
    return true;
  }
}

function areAllSlotsEmpty() {
  for (let i = 1; i <= SAVE_SLOT_COUNT; i += 1) {
    if (!isSlotEmpty(i)) return false;
  }
  return true;
}

export function getActiveSlot() {
  try {
    const raw = localStorage.getItem(ACTIVE_SLOT_KEY);
    return normalizeSlot(raw, DEFAULT_SLOT);
  } catch {
    return DEFAULT_SLOT;
  }
}

export function setActiveSlot(slot) {
  const resolved = normalizeSlot(slot, DEFAULT_SLOT);
  try {
    localStorage.setItem(ACTIVE_SLOT_KEY, String(resolved));
  } catch {
    // ignore write failures
  }
  return resolved;
}

function getRequestedSlot(slot) {
  if (slot != null) {
    return normalizeSlot(slot, DEFAULT_SLOT);
  }
  return getActiveSlot();
}

// ─────────────────────────────────────────────────────────────────────────────
// 兼容旧存档格式（envelope { meta, state } 或裸 state）
// ─────────────────────────────────────────────────────────────────────────────
function toEnvelopePayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  if ('state' in raw) return raw.state;
  return raw;
}

// ─────────────────────────────────────────────────────────────────────────────
// 旧 localStorage key 迁移（一次性）
// ─────────────────────────────────────────────────────────────────────────────
function migrateLegacySaveIfNeeded() {
  try {
    if (!areAllSlotsEmpty()) return;

    const legacyRaw = localStorage.getItem(LEGACY_SAVE_KEY);
    if (!legacyRaw) return;

    const parsed = JSON.parse(legacyRaw);
    const migrated = migrateState(toEnvelopePayload(parsed));
    const normalizedState = normalizeState(migrated);

    localStorage.setItem(
      getSlotKey(1),
      JSON.stringify({
        meta: { savedAt: Date.now(), slot: 1 },
        state: normalizedState,
      })
    );

    setActiveSlot(1);
  } catch {
    // ignore parse/storage failures
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// loadState
// 流程：读 JSON → parse → migrateState → normalizeState → 返回完整 gs
// ─────────────────────────────────────────────────────────────────────────────
export function loadState(slot) {
  try {
    migrateLegacySaveIfNeeded();

    const resolvedSlot = getRequestedSlot(slot);
    const raw = localStorage.getItem(getSlotKey(resolvedSlot));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const payload = toEnvelopePayload(parsed);
    const migrated = migrateState(cloneDefault(payload));
    const normalized = normalizeState(migrated);
    syncGlobalCollectionsFromState(normalized);

    setActiveSlot(resolvedSlot);
    return normalized;
  } catch (err) {
    console.error('[GameState] loadState failed:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// saveState
// 保存完整 gs（先 normalize，再写 envelope）
// ─────────────────────────────────────────────────────────────────────────────
export function saveState(gs, slot) {
  const resolvedSlot = getRequestedSlot(slot);
  const normalized = cloneDefault(normalizeState(gs));
  syncGlobalCollectionsFromState(normalized);

  try {
    const serialized = JSON.stringify({
      meta: {
        savedAt: Date.now(),
        slot: resolvedSlot,
        week: getCurrentWeek(normalized),
      },
      state: normalized,
    });

    const key = getSlotKey(resolvedSlot);
    localStorage.setItem(key, serialized);

    if (localStorage.getItem(key) !== serialized) {
      throw new Error('localStorage write verification failed');
    }

    setActiveSlot(resolvedSlot);
    return true;
  } catch (err) {
    console.error('[GameState] saveState failed:', err);
    return false;
  }
}

export function clearSlotState(slot) {
  const resolvedSlot = getRequestedSlot(slot);
  try {
    localStorage.removeItem(getSlotKey(resolvedSlot));
    return true;
  } catch (err) {
    console.error('[GameState] clearSlotState failed:', err);
    return false;
  }
}

export function resetState(slot) {
  const fresh = createFreshState();
  saveState(fresh, slot);
  return fresh;
}

// ─────────────────────────────────────────────────────────────────────────────
// 行动力计算
// ─────────────────────────────────────────────────────────────────────────────
export function syncActionCapacity(gs) {
  gs.attrs ??= {};
  const physicalExp = Math.max(0, Number(gs.attrs.physicalExp) || 0);
  gs.attrs.physicalExp = physicalExp;

  const nextMaxActionPoints = BASE_AP + Math.floor(physicalExp / PHYSICAL_PER_AP) * AP_PER_STEP;
  gs.maxActionPoints = clamp(nextMaxActionPoints, 1, 99);
  gs.actionPoints = clamp(Number(gs.actionPoints) || 0, 0, gs.maxActionPoints);
  return gs;
}

export function spendActionPoints(gs, cost) {
  if (cost <= 0) return true;
  if (gs.actionPoints < cost) return false;
  gs.actionPoints -= cost;
  return true;
}

export function restoreActionPoints(gs, amount) {
  const before = gs.actionPoints;
  gs.actionPoints = clamp(gs.actionPoints + amount, 0, gs.maxActionPoints);
  return gs.actionPoints - before;
}

export function applyEffects(gs, effects = {}) {
  const changes = [];
  let touchedPhysicalExp = false;

  Object.entries(effects).forEach(([path, delta]) => {
    if (path === 'actionPoints') {
      const before = gs.actionPoints;
      gs.actionPoints = clamp(gs.actionPoints + delta, 0, gs.maxActionPoints);
      changes.push({ path, before, after: gs.actionPoints, delta: gs.actionPoints - before });
      return;
    }

    const targetPath = path === 'attrs.physical' ? 'attrs.physicalExp' : path;

    const boundedPaths = new Set([
      'reputation',
      'parentTrust',
      'group.trust',
      'group.stress',
      'orange.affection',
      'director.affection',
    ]);

    const bounds = (targetPath === 'attrs.physicalExp' || boundedPaths.has(targetPath))
      ? { min: 0, max: Infinity }
      : { min: -Infinity, max: Infinity };

    changes.push({ path: targetPath, ...addByPath(gs, targetPath, delta, bounds) });
    if (targetPath === 'attrs.physicalExp') touchedPhysicalExp = true;
  });

  if (touchedPhysicalExp) {
    syncActionCapacity(gs);
  } else {
    gs.actionPoints = clamp(gs.actionPoints, 0, gs.maxActionPoints);
  }

  return changes;
}

// ─────────────────────────────────────────────────────────────────────────────
// 向后兼容：旧代码可能 import { DEFAULT_STATE, clone } from './GameState'
// ─────────────────────────────────────────────────────────────────────────────
/** @deprecated 请改用 GAME_STATE_SCHEMA */
export const DEFAULT_STATE = GAME_STATE_SCHEMA;

/** @deprecated 请改用 cloneDefault */
export function clone(obj) {
  return cloneDefault(obj);
}



