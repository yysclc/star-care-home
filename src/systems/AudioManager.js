import { RESOURCE_PACKS } from '../data/resourcePacks.js';

const DEFAULT_FADE_MS = 250;
const DEFAULT_BGM_VOLUME = 0.6;
const DEFAULT_SFX_VOLUME = 0.8;

let initialized = false;
let pathMap = null;
let currentAudio = null;
let currentKey = null;
let loopingSfx = {};
let pendingKey = null;
let pendingOpts = null;
let queuedBgm = null;
let stoppingCurrent = false;
let bgmWanted = false;
let lastBgmKey = null;
let lastBgmOpts = null;
let recoverTimer = null;
let bgmVolume = DEFAULT_BGM_VOLUME;
let sfxVolume = DEFAULT_SFX_VOLUME;
let muted = false;
let userInteracted = false;

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function buildPathMap() {
  const map = {};
  Object.values(RESOURCE_PACKS).forEach((pack) => {
    [...(pack.audio ?? []), ...(pack.music ?? [])].forEach(({ key, path }) => {
      map[key] = path;
    });
  });
  return map;
}

function getPath(key) {
  pathMap ??= buildPathMap();
  return pathMap[key];
}

function fade(audio, fromVolume, toVolume, durationMs, onComplete) {
  if (!audio || durationMs <= 0) {
    if (audio) audio.volume = toVolume;
    onComplete?.();
    return;
  }

  if (audio._fadeTimer) {
    clearInterval(audio._fadeTimer);
  }

  const steps = Math.max(1, Math.floor(durationMs / 50));
  const delta = (toVolume - fromVolume) / steps;
  let step = 0;
  audio.volume = fromVolume;

  audio._fadeTimer = setInterval(() => {
    step += 1;
    audio.volume = clamp01(fromVolume + delta * step);

    if (step >= steps) {
      clearInterval(audio._fadeTimer);
      audio._fadeTimer = null;
      audio.volume = toVolume;
      onComplete?.();
    }
  }, 50);
}

function cleanupAudio(audio) {
  if (!audio) return;

  if (audio._fadeTimer) {
    clearInterval(audio._fadeTimer);
    audio._fadeTimer = null;
  }

  try {
    audio.pause();
    audio.src = '';
  } catch {
    // Ignore browser audio cleanup failures.
  }
}

function stopCurrent(fadeMs = DEFAULT_FADE_MS, onComplete) {
  if (!currentAudio) {
    currentKey = null;
    onComplete?.();
    return;
  }

  const audio = currentAudio;

  fade(audio, audio.volume, 0, fadeMs, () => {
    cleanupAudio(audio);
    if (currentAudio === audio) {
      currentAudio = null;
      currentKey = null;
    }
    onComplete?.();
  });
}

function startQueuedBgm() {
  stoppingCurrent = false;

  if (!queuedBgm) return;
  const { key, opts } = queuedBgm;
  queuedBgm = null;
  playInternal(key, opts);
}

function playInternal(key, opts = {}) {
  const path = getPath(key);
  if (!path) {
    console.warn(`[AudioManager] Unknown audio key: ${key}`);
    return;
  }

  const fadeMs = opts.fadeMs ?? DEFAULT_FADE_MS;

  const start = () => {
    const audio = new Audio(path);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    audio.muted = muted;
    currentAudio = audio;
    currentKey = key;

    const playPromise = audio.play();
    if (!playPromise) {
      fade(audio, 0, muted ? 0 : bgmVolume, fadeMs);
      return;
    }

    playPromise
      .then(() => {
        if (currentAudio !== audio) {
          cleanupAudio(audio);
          return;
        }
        pendingKey = null;
        pendingOpts = null;
        fade(audio, 0, muted ? 0 : bgmVolume, fadeMs);
      })
      .catch(() => {
        if (currentAudio === audio) {
          currentAudio = null;
          currentKey = null;
        }
        if (bgmWanted && lastBgmKey === key) {
          pendingKey = key;
          pendingOpts = opts;
        }
        cleanupAudio(audio);
      });
  };

  if (currentAudio) {
    queuedBgm = { key, opts };
    if (!stoppingCurrent) {
      stoppingCurrent = true;
      stopCurrent(fadeMs, startQueuedBgm);
    }
  } else {
    start();
  }
}

function retryPendingBgm() {
  if (!bgmWanted || !pendingKey) return;
  const key = pendingKey;
  const opts = pendingOpts ?? {};
  pendingKey = null;
  pendingOpts = null;
  playInternal(key, opts);
}

function recoverBgm() {
  recoverTimer = null;

  if (!bgmWanted || !userInteracted) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

  if (pendingKey) {
    retryPendingBgm();
    return;
  }

  if (currentAudio && currentKey && currentAudio.paused && !stoppingCurrent) {
    const audio = currentAudio;
    const playPromise = audio.play();
    if (!playPromise) {
      if (!muted && !audio._fadeTimer) audio.volume = bgmVolume;
      return;
    }

    playPromise
      .then(() => {
        if (currentAudio !== audio) return;
        pendingKey = null;
        pendingOpts = null;
        if (!muted && !audio._fadeTimer) audio.volume = bgmVolume;
      })
      .catch(() => {
        if (currentAudio === audio && currentKey) {
          pendingKey = currentKey;
          pendingOpts = lastBgmOpts ?? {};
        }
      });
    return;
  }

  if (!currentAudio && lastBgmKey && !stoppingCurrent) {
    playInternal(lastBgmKey, lastBgmOpts ?? {});
  }
}

function scheduleRecoverBgm(delayMs = 80) {
  if (recoverTimer) clearTimeout(recoverTimer);
  recoverTimer = setTimeout(recoverBgm, delayMs);
}

function markUserInteracted() {
  userInteracted = true;
  scheduleRecoverBgm(0);
}

const AudioManager = {
  init() {
    pathMap = buildPathMap();
    if (initialized) return;
    initialized = true;

    document.addEventListener('pointerdown', markUserInteracted, { passive: true });
    document.addEventListener('keydown', markUserInteracted);
    document.addEventListener('touchstart', markUserInteracted, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') scheduleRecoverBgm(120);
    });
    window.addEventListener('pageshow', () => scheduleRecoverBgm(120));
    window.addEventListener('focus', () => scheduleRecoverBgm(120));
  },

  playBgm(key, opts = {}) {
    bgmWanted = true;
    lastBgmKey = key;
    lastBgmOpts = { ...opts };
    if (currentKey === key && currentAudio && !stoppingCurrent) {
      scheduleRecoverBgm(0);
      return;
    }
    playInternal(key, opts);
  },

  stopBgm(opts = {}) {
    bgmWanted = false;
    pendingKey = null;
    pendingOpts = null;
    queuedBgm = null;
    stopCurrent(opts.fadeMs ?? DEFAULT_FADE_MS, () => {
      stoppingCurrent = false;
    });
  },

  playSfx(key, opts = {}) {
    if (!userInteracted) return;

    const path = getPath(key);
    if (!path) {
      console.warn(`[AudioManager] Unknown audio key: ${key}`);
      return;
    }

    const audio = new Audio(path);
    audio.loop = false;
    audio.preload = 'auto';
    audio.volume = muted ? 0 : sfxVolume * clamp01(opts.volume ?? 1);
    audio.play().catch(() => {});
  },

  playLoopingSfx(key, opts = {}) {
    if (!userInteracted) return;
    if (loopingSfx[key]) return;

    const path = getPath(key);
    if (!path) {
      console.warn(`[AudioManager] Unknown audio key: ${key}`);
      return;
    }

    const audio = new Audio(path);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = muted ? 0 : sfxVolume * clamp01(opts.volume ?? 1);
    audio.muted = muted;
    loopingSfx[key] = { audio, volume: clamp01(opts.volume ?? 1) };
    audio.play().catch(() => {
      delete loopingSfx[key];
    });
  },

  stopLoopingSfx(key) {
    const entry = loopingSfx[key];
    if (!entry) return;

    try {
      entry.audio.pause();
      entry.audio.src = '';
    } catch {
      // Ignore browser audio cleanup failures.
    }
    delete loopingSfx[key];
  },

  setVolume(value) {
    bgmVolume = clamp01(value);
    if (currentAudio && !muted && !currentAudio._fadeTimer) {
      currentAudio.volume = bgmVolume;
    }
  },

  setSfxVolume(value) {
    sfxVolume = clamp01(value);
    Object.values(loopingSfx).forEach((entry) => {
      if (!entry?.audio) return;
      entry.audio.volume = muted ? 0 : sfxVolume * entry.volume;
    });
  },

  getVolume() {
    return bgmVolume;
  },

  getSfxVolume() {
    return sfxVolume;
  },

  setMuted(value) {
    muted = Boolean(value);
    if (currentAudio) {
      currentAudio.muted = muted;
      if (!muted && !currentAudio._fadeTimer) currentAudio.volume = bgmVolume;
    }
    Object.values(loopingSfx).forEach((entry) => {
      if (!entry?.audio) return;
      entry.audio.muted = muted;
      if (!muted) entry.audio.volume = sfxVolume * entry.volume;
    });
  },

  notifyUserGesture() {
    markUserInteracted();
  },

  recover() {
    scheduleRecoverBgm(0);
  },

  getCurrentKey() {
    return currentKey;
  },

  getPendingKey() {
    return pendingKey;
  },
};

export default AudioManager;
