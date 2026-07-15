/**
 * verifySaveLoadIntegrity.js
 *
 * GameState 存读档完整性测试（开发期手动运行）
 *
 * 使用方法（浏览器控制台）：
 *   import('/src/debug/verifySaveLoadIntegrity.js').then(m => m.verifySaveLoadIntegrity())
 *
 * 或在游戏启动后直接：
 *   window.__verifySave?.()
 */

import {
  GAME_STATE_SCHEMA,
  createFreshState,
  createInitialState,
  normalizeState,
  migrateState,
  saveState,
  loadState,
  clearSlotState,
  cloneDefault,
} from '../core/GameState.js';

// ─────────────────────────────────────────────────────────────────────────────
// 断言工具
// ─────────────────────────────────────────────────────────────────────────────
let _pass = 0;
let _fail = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    _pass += 1;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    _fail += 1;
  }
}

function assertEq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅ ${label}`);
    _pass += 1;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    console.error(`     expected: ${JSON.stringify(expected)}`);
    console.error(`     actual  : ${JSON.stringify(actual)}`);
    _fail += 1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export function verifySaveLoadIntegrity() {
  _pass = 0;
  _fail = 0;

  console.group('=== verifySaveLoadIntegrity ===');

  // ── 1. schema 深拷贝隔离 ────────────────────────────────────────────────
  console.group('[1] schema 与 createFreshState 隔离');

  const gsA = createFreshState();
  const gsB = createFreshState();

  // 修改 gsA 的嵌套对象，不得影响 schema 或 gsB
  gsA.player.name = '测试玩家';
  gsA.player.attrs.professional = 30;
  gsA.player.attrs.communication = 10;
  gsA.player.attrs.stamina = 10;        // schema 里没有此字段，需保留
  gsA.progress = { week: 2, day: 6, phase: 'free' }; // schema 里没有 progress，自由设置

  assertEq(GAME_STATE_SCHEMA.player.name, '', 'schema.player.name 未被 gsA 污染');
  assertEq(GAME_STATE_SCHEMA.player.attrs.professional, 0, 'schema.player.attrs.professional 未被污染');
  assertEq(gsB.player.name, '', 'gsB.player.name 未被 gsA 污染');
  assertEq(gsB.player.attrs.professional, 0, 'gsB.player.attrs 未被 gsA 污染');
  assert(!('progress' in gsB), 'gsB 不含 gsA 新增的 progress 字段');

  console.groupEnd();

  // ── 2. 存档 / 读档完整性（slot 2）──────────────────────────────────────
  console.group('[2] saveState → loadState 字段完整性（slot 2）');

  // 清空 slot 2 保证干净
  clearSlotState(2);

  // 丰富 gsA
  gsA.day = 6;
  gsA.flags.prologueCompleted = true;
  gsA.flags.day1OfficeIntroPlayed = true;
  gsA.flags.prologueStampBonusGiven = true;
  gsA.director.affection = 15;
  gsA.inventory = gsA.inventory ?? { careItems: [] };
  gsA.inventory.careItems.push({ id: 'item_001', name: '贴纸' });
  gsA.collections = gsA.collections ?? { items: {}, cgs: {} };
  gsA.collections.items['star_badge'] = true;
  gsA.attrs.professional = 5;
  gsA.attrs.communication = 3;

  saveState(gsA, 2);
  const gsLoaded = loadState(2);

  assert(gsLoaded !== null, 'loadState 返回非 null');
  assertEq(gsLoaded.player.name, '测试玩家', 'player.name 一致');
  assertEq(gsLoaded.player.attrs.professional, 30, 'player.attrs.professional 一致');
  assertEq(gsLoaded.day, 6, 'day 一致');
  assertEq(gsLoaded.flags.prologueCompleted, true, 'flags.prologueCompleted 一致');
  assertEq(gsLoaded.flags.prologueStampBonusGiven, true, 'flags.prologueStampBonusGiven 一致');
  assertEq(gsLoaded.director.affection, 15, 'director.affection 一致');
  assert(
    Array.isArray(gsLoaded.inventory.careItems) && gsLoaded.inventory.careItems.length === 1,
    'inventory.careItems 保留（未重置为空数组）'
  );
  assertEq(gsLoaded.inventory.careItems[0].id, 'item_001', 'careItems[0].id 一致');
  assertEq(gsLoaded.collections.items['star_badge'], true, 'collections.items 一致');
  assertEq(gsLoaded.attrs.professional, 5, 'attrs.professional 一致');

  console.groupEnd();

  // ── 3. slot 互不污染 ─────────────────────────────────────────────────────
  console.group('[3] slot 1 与 slot 2 互不污染');

  clearSlotState(1);
  const gsSlot1 = createFreshState();
  gsSlot1.player.name = '槽1玩家';
  gsSlot1.day = 1;
  saveState(gsSlot1, 1);

  const gsReloadSlot2 = loadState(2);
  const gsReloadSlot1 = loadState(1);

  assertEq(gsReloadSlot1.player.name, '槽1玩家', 'slot1 player.name 正确');
  assertEq(gsReloadSlot2.player.name, '测试玩家', 'slot2 player.name 正确，未被 slot1 覆盖');
  assertEq(gsReloadSlot1.day, 1, 'slot1 day 正确');
  assertEq(gsReloadSlot2.day, 6, 'slot2 day 正确，未被 slot1 覆盖');

  console.groupEnd();

  // ── 4. normalizeState 补缺不覆盖 ─────────────────────────────────────────
  console.group('[4] normalizeState 补缺不覆盖');

  const partial = {
    day: 3,
    player: { name: '覆盖玩家', gender: 'male' },
    director: { affection: 50 },
    flags: { customFlag: true },
  };
  const normalized = normalizeState(partial);

  assertEq(normalized.day, 3, 'day 来自 partial');
  assertEq(normalized.player.name, '覆盖玩家', 'player.name 来自 partial');
  assertEq(normalized.player.gender, 'male', 'player.gender 来自 partial');
  assertEq(normalized.director.affection, 50, 'director.affection 来自 partial');
  assertEq(normalized.flags.customFlag, true, 'flags.customFlag 保留');
  // 补缺的默认字段
  assert(typeof normalized.funds === 'number', 'funds 被补缺');
  assert(typeof normalized.attrs === 'object', 'attrs 被补缺');
  assert(normalized.inventory !== undefined, 'inventory 被补缺');
  assert(normalized.collections !== undefined, 'collections 被补缺');

  console.groupEnd();

  // ── 5. 数组不被重置 ────────────────────────────────────────────────────────
  console.group('[5] eventLog / careItems 不被 normalize 重置');

  const withArrays = {
    dayProgress: {
      fixedActionHistory: ['action_a', 'action_b'],
      freeActionDone: { kitchen: true },
      parentAiTriggeredOutcomes: [{
        id: 'xiaoming_dinosaur:ask_xiaoming_first',
        eventId: 'xiaoming_dinosaur',
        choiceId: 'ask_xiaoming_first',
      }],
      parentAiCompletedOutcomes: ['xiaoli_sunlight:three_light_zones'],
    },
    inventory: { careItems: [{ id: 'toy_1' }] },
  };
  const normed = normalizeState(withArrays);

  assertEq(normed.dayProgress.fixedActionHistory, ['action_a', 'action_b'], 'fixedActionHistory 保留');
  assertEq(normed.dayProgress.freeActionDone, { kitchen: true }, 'freeActionDone 保留');
  assertEq(normed.dayProgress.parentAiTriggeredOutcomes[0].choiceId, 'ask_xiaoming_first', 'Parent AI 分支结果保留');
  assertEq(normed.dayProgress.parentAiCompletedOutcomes, ['xiaoli_sunlight:three_light_zones'], 'Parent AI 完成结果保留');
  assertEq(normed.inventory.careItems.length, 1, 'careItems 未被重置为空数组');

  console.groupEnd();

  // ── 6. migrateState 版本字段 ─────────────────────────────────────────────
  console.group('[6] migrateState');

  const v0Save = { day: 2, prologueLetterReaction: 'curious', player: {} };
  const migrated = migrateState(v0Save);

  assertEq(migrated.version, GAME_STATE_SCHEMA.version, 'version 升级到最新');
  assertEq(migrated.player.prologueLetterReaction, 'curious', 'v0 prologueLetterReaction 迁移到 player');

  console.groupEnd();

  // ── 7. createFreshState 与 createInitialState 等价 ───────────────────────
  console.group('[7] createFreshState / createInitialState 等价');

  const gsF = createFreshState();
  const gsI = createInitialState();

  assertEq(JSON.stringify(gsF), JSON.stringify(gsI), 'createFreshState 与 createInitialState 输出相同结构');
  assert(gsF !== gsI, '两次调用返回不同对象（深拷贝）');
  assert(gsF.player !== gsI.player, 'player 对象不共享引用');
  assert(gsF.flags !== gsI.flags, 'flags 对象不共享引用');
  assert(gsF.inventory.careItems !== gsI.inventory.careItems, 'inventory.careItems 不共享引用');

  console.groupEnd();

  // ── 8. cloneDefault 深拷贝隔离 ──────────────────────────────────────────
  console.group('[8] cloneDefault 深拷贝隔离');

  const original = { a: { b: [1, 2, 3] } };
  const copied = cloneDefault(original);
  copied.a.b.push(4);

  assertEq(original.a.b.length, 3, 'cloneDefault 后修改副本不影响原对象');

  console.groupEnd();

  // ── 清理测试用 slot ───────────────────────────────────────────────────────
  clearSlotState(1);
  clearSlotState(2);

  // ── 结果汇总 ──────────────────────────────────────────────────────────────
  console.log('');
  console.log(`结果：${_pass} 通过 / ${_fail} 失败`);
  if (_fail === 0) {
    console.log('🎉 全部通过！GameState 存读档完整性正常。');
  } else {
    console.warn(`⚠️  有 ${_fail} 项失败，请检查上方 ❌ 信息。`);
  }

  console.groupEnd();

  return { pass: _pass, fail: _fail };
}

// 挂载到 window，方便控制台直接调用
if (typeof window !== 'undefined') {
  window.__verifySave = verifySaveLoadIntegrity;
  console.log('[debug] verifySaveLoadIntegrity 已挂载到 window.__verifySave()');
}
