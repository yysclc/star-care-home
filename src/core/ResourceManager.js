/**
 * ResourceManager.js
 *
 * 轻量资源包管理器。
 *
 * 公开 API：
 *   ResourceManager.loadPack(scene, packName, options?)
 *     → 加载指定包。options: { onProgress, onComplete, silent }
 *     → 返回 Promise<void>（静默模式下 reject 不会抛出）
 *
 *   ResourceManager.preloadNextPack(scene, currentPackName)
 *     → 后台静默加载 currentPackName.next 对应的包
 *
 *   ResourceManager.isLoaded(packName)
 *     → 查询某个包是否已完成加载
 *
 * 防重复加载（两层）：
 *   1. 包级别：_loadedPacks 记录已完成的包名，整包跳过
 *   2. 资源级别：对每个 key 检查 textures.exists / cache.audio.has，单项跳过
 *
 * 失败降级：
 *   - silent 模式下只 console.warn，不影响游戏主流程
 *   - 阻塞模式下加载错误也只跳过单项，不卡整个流程
 */

import { RESOURCE_PACKS } from '../data/resourcePacks.js';

// ── 内部状态 ──────────────────────────────────────────────────────────────────
const _loadedPacks  = new Set();   // 已完成加载的 packName
const _pendingPacks = new Set();   // 正在加载中的 packName（防并发重入）
const _pendingPromises = new Map(); // packName -> Promise<void>
const _pendingImageKeys = new Set();
const _pendingAudioKeys = new Set();

// ── 内部工具 ──────────────────────────────────────────────────────────────────

/** 过滤掉已在 Phaser 缓存中存在的图片 key */
function _filterImages(scene, images) {
  return images.filter(({ key }) => !scene.textures.exists(key) && !_pendingImageKeys.has(key));
}

/** 过滤掉已在 Phaser 音频缓存中存在的 key */
function _filterAudio(scene, items) {
  return items.filter(({ key }) => !scene.cache.audio.has(key) && !_pendingAudioKeys.has(key));
}

function _clearPendingOnLoad(scene, type, key, pendingSet) {
  const clear = () => pendingSet.delete(key);
  scene.load.once(`filecomplete-${type}-${key}`, clear);
  scene.load.once('complete', clear);
  scene.load.on('loaderror', (file) => {
    if (file?.key === key) clear();
  });
}

/**
 * 核心加载函数。
 * 把一批 image + audio + music 加入 scene.load 并 start。
 * @returns Promise<void>
 */
function _doLoad(scene, images, audioItems, { onProgress, onComplete } = {}) {
  return new Promise((resolve) => {
    // 没有需要加载的资源 → 直接完成
    if (images.length === 0 && audioItems.length === 0) {
      onProgress?.(1);
      onComplete?.();
      resolve();
      return;
    }

    // 注册资源
    for (const { key, path } of images) {
      _pendingImageKeys.add(key);
      scene.load.image(key, path);
    }
    for (const { key, path } of audioItems) {
      _pendingAudioKeys.add(key);
      scene.load.audio(key, path);
    }

    // 监听加载错误（始终只 warn，不阻断）
    const onError = (file) => {
      console.warn(`[ResourceManager] 加载失败，已跳过：${file.key} → ${file.src}`);
    };
    scene.load.on('loaderror', onError);

    // 进度
    if (onProgress) {
      scene.load.on('progress', onProgress);
    }

    // 完成
    scene.load.once('complete', () => {
      scene.load.off('loaderror', onError);
      if (onProgress) scene.load.off('progress', onProgress);
      images.forEach(({ key }) => _pendingImageKeys.delete(key));
      audioItems.forEach(({ key }) => _pendingAudioKeys.delete(key));
      onComplete?.();
      resolve();
    });

    scene.load.start();
  });
}

// ── 公开 API ──────────────────────────────────────────────────────────────────

function getPackNameForWeek(week) {
  const n = Number(week);
  if (!Number.isFinite(n) || n < 1) return 'week1';
  return `week${Math.floor(n)}`;
}

const ResourceManager = {

  /**
   * 加载指定资源包。
   *
   * @param {Phaser.Scene} scene        - 用于执行加载的 Phaser Scene 实例
   * @param {string}       packName     - 资源包名（对应 RESOURCE_PACKS 的 key）
   * @param {object}       [options]
   * @param {function}     [options.onProgress]  - 进度回调 (0~1)
   * @param {function}     [options.onComplete]  - 完成回调
   * @param {boolean}      [options.silent=false] - 静默模式：失败只 warn，不影响主流程
   * @returns {Promise<void>}
   */
  loadPack(scene, packName, options = {}) {
    const { onProgress, onComplete, silent = false } = options;

    // 已加载过 → 直接回调
    if (_loadedPacks.has(packName)) {
      onProgress?.(1);
      onComplete?.();
      return Promise.resolve();
    }

    // 正在加载中 → 复用同一 Promise，等待完成
    if (_pendingPacks.has(packName)) {
      if (!silent) {
        console.warn(`[ResourceManager] "${packName}" 正在加载中，复用进行中的加载任务。`);
      }
      const pending = _pendingPromises.get(packName) ?? Promise.resolve();
      return pending.then(() => {
        onProgress?.(1);
        onComplete?.();
      });
    }

    const pack = RESOURCE_PACKS[packName];
    if (!pack) {
      const msg = `[ResourceManager] 未知资源包："${packName}"`;
      if (silent) { console.warn(msg); return Promise.resolve(); }
      console.warn(msg);
      return Promise.resolve();
    }

    _pendingPacks.add(packName);

    // 过滤已缓存的资源
    const images = _filterImages(scene, pack.images ?? []);
    const audio  = _filterAudio(scene, [...(pack.audio ?? []), ...(pack.music ?? [])]);

    const promise = _doLoad(scene, images, audio, { onProgress, onComplete })
      .then(() => {
        _loadedPacks.add(packName);
      })
      .catch((err) => {
        if (!silent) throw err;
        console.warn(`[ResourceManager] "${packName}" 加载出错（已降级）：`, err);
      })
      .finally(() => {
        _pendingPacks.delete(packName);
        _pendingPromises.delete(packName);
      });

    _pendingPromises.set(packName, promise);
    return promise;
  },

  /**
   * 后台静默预加载 currentPackName 的下一个资源包。
   * 不阻塞游戏，失败只 warn。
   *
   * @param {Phaser.Scene} scene
   * @param {string}       currentPackName
   */
  preloadNextPack(scene, currentPackName) {
    const pack = RESOURCE_PACKS[currentPackName];
    if (!pack?.next) return;
    const nextName = pack.next;

    if (_loadedPacks.has(nextName) || _pendingPacks.has(nextName)) return;

    console.log(`[ResourceManager] 后台预加载 "${nextName}"…`);
    this.loadPack(scene, nextName, { silent: true });
  },

  /**
   * 查询某个包是否已完成加载。
   * @param {string} packName
   * @returns {boolean}
   */
  isLoaded(packName) {
    return _loadedPacks.has(packName);
  },

  isImagePending(key) {
    return _pendingImageKeys.has(key);
  },

  isAudioPending(key) {
    return _pendingAudioKeys.has(key);
  },

  queueImage(scene, key, path) {
    if (!key || !path || scene.textures.exists(key) || _pendingImageKeys.has(key)) {
      return false;
    }
    _pendingImageKeys.add(key);
    scene.load.image(key, path);
    _clearPendingOnLoad(scene, 'image', key, _pendingImageKeys);
    return true;
  },

  queueAudio(scene, key, path) {
    if (!key || !path || scene.cache.audio.has(key) || _pendingAudioKeys.has(key)) {
      return false;
    }
    _pendingAudioKeys.add(key);
    scene.load.audio(key, path);
    _clearPendingOnLoad(scene, 'audio', key, _pendingAudioKeys);
    return true;
  },

  getPackNameForWeek(week) {
    return getPackNameForWeek(week);
  },
};

export default ResourceManager;
