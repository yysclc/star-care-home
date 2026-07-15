import { COLLECTIONS_DATA } from './collections.js';
import { isWeekGoalMet } from './weekConfigs.js';

/**
 * 档案馆持久化存储
 * 行动指南解锁状态 & 玩家最高记录（localStorage）
 */

const LS_KEY_GUIDE_UNLOCKED = 'asd_action_guide_unlocked';
const LS_KEY_GAME_STATS = 'asd_last_game_stats';
const LS_KEY_BEST_RECORD = 'asd_best_play_record_v1';

const EMPTY_BEST_RECORD = {
  maxCompletedWeek: 0,
  bestInstitutionEndingCount: 0,
  bestCareEndingCount: 0,
  bestOrangeEndingCount: 0,
  maxOrangeArtworkCount: 0,
  maxDirectorStoryCount: 0,
  bestChildTrust: 0,
  bestReputation: 0,
  bestFunds: 0,
  bestProfessional: 0,
  bestCommunication: 0,
  bestStaminaExp: 0,
  updatedAt: 0,
};

export function isActionGuideUnlocked() {
  try {
    return localStorage.getItem(LS_KEY_GUIDE_UNLOCKED) === 'true';
  } catch (_) {
    return false;
  }
}

export function unlockActionGuide() {
  try {
    localStorage.setItem(LS_KEY_GUIDE_UNLOCKED, 'true');
  } catch (_) { /* ignore */ }
}

export function getLastGameStats() {
  return getBestGameStats();
}

export function getBestGameStats() {
  try {
    const raw = localStorage.getItem(LS_KEY_BEST_RECORD) || localStorage.getItem(LS_KEY_GAME_STATS);
    if (!raw) return { ...EMPTY_BEST_RECORD };
    return JSON.parse(raw);
  } catch (_) {
    return { ...EMPTY_BEST_RECORD };
  }
}

export function saveLastGameStats(gs) {
  return saveBestGameStats(gs);
}

function getCompletedWeek(gs) {
  const week = Number(gs?.day ?? 0);
  if (!Number.isFinite(week)) return 0;
  return Math.max(0, Math.min(7, Math.floor(week)));
}

function countOrangeArtworks(gs) {
  const items = gs?.collections?.items ?? {};
  return Object.keys(COLLECTIONS_DATA).filter((id) => (
    COLLECTIONS_DATA[id]?.category === 'artwork'
    && !COLLECTIONS_DATA[id]?.placeholder
    && items[id]
  )).length;
}

function countDirectorStories(gs) {
  const flags = gs?.director?.flags ?? {};
  const chatCount = Number(flags.chenlan_chat_count ?? 0) || 0;
  const affectionUnlocks = [
    flags.director_affection_10_seen,
    flags.director_affection_20_seen,
    flags.director_affection_30_seen,
  ].filter(Boolean).length;
  return Math.max(chatCount, affectionUnlocks);
}

function hasFinalWeekGoalMet(gs) {
  return Number(gs?.day) >= 7 && isWeekGoalMet(gs);
}

function hasInstitutionGoodEnding(gs) {
  return hasFinalWeekGoalMet(gs)
    && (Number(gs?.reputation ?? 0) || 0) >= 100
    && (Number(gs?.funds ?? 0) || 0) >= 2500;
}

function hasCareGoodEnding(gs) {
  return hasFinalWeekGoalMet(gs)
    && (Number(gs?.director?.affection ?? 0) || 0) >= 30
    && (Number(gs?.parentTrust ?? 0) || 0) >= 80
    && (Number(gs?.attrs?.professional ?? 0) || 0) >= 90
    && (Number(gs?.attrs?.communication ?? 0) || 0) >= 80;
}

function hasOrangeGoodEnding(gs) {
  const flags = gs?.orange?.flags ?? {};
  const items = gs?.collections?.items ?? {};
  return hasFinalWeekGoalMet(gs)
    && (
      flags.week7_orange_result === 'success'
      || flags.week7_door_person_art_obtained
      || items.door_person_boy_art
      || items.door_person_girl_art
    );
}

function buildCurrentRecord(gs) {
  return {
    maxCompletedWeek: getCompletedWeek(gs),
    bestInstitutionEndingCount: hasInstitutionGoodEnding(gs) ? 1 : 0,
    bestCareEndingCount: hasCareGoodEnding(gs) ? 1 : 0,
    bestOrangeEndingCount: hasOrangeGoodEnding(gs) ? 1 : 0,
    maxOrangeArtworkCount: countOrangeArtworks(gs),
    maxDirectorStoryCount: countDirectorStories(gs),
    bestChildTrust: Number(gs?.group?.trust ?? 0) || 0,
    bestReputation: Number(gs?.reputation ?? 0) || 0,
    bestFunds: Number(gs?.funds ?? 0) || 0,
    bestProfessional: Number(gs?.attrs?.professional ?? 0) || 0,
    bestCommunication: Number(gs?.attrs?.communication ?? 0) || 0,
    bestStaminaExp: Number(gs?.attrs?.physicalExp ?? 0) || 0,
    updatedAt: Date.now(),
  };
}

function mergeBestRecord(prev, current) {
  const merged = { ...EMPTY_BEST_RECORD, ...(prev ?? {}) };
  Object.entries(current).forEach(([key, value]) => {
    if (key === 'updatedAt') return;
    merged[key] = Math.max(Number(merged[key] ?? 0) || 0, Number(value ?? 0) || 0);
  });
  merged.updatedAt = current.updatedAt;
  return merged;
}

export function saveBestGameStats(gs) {
  if (gs?.flags?.godModeEnabled) return false;
  try {
    const prev = getBestGameStats();
    const current = buildCurrentRecord(gs);
    const best = mergeBestRecord(prev, current);
    localStorage.setItem(LS_KEY_BEST_RECORD, JSON.stringify(best));
    localStorage.setItem(LS_KEY_GAME_STATS, JSON.stringify(best));
    return true;
  } catch (_) { /* ignore */ }
  return false;
}
