const DEFAULT_PARENT_AI_API_BASE = import.meta.env?.DEV ? 'http://localhost:5178' : '';
const PARENT_AI_TIMEOUT_MS = 30000;
const PARENT_AI_RETRY_COUNT = 1;

function getApiBase() {
  const configured = globalThis.window?.PARENT_AI_API_BASE
    ?? import.meta.env?.VITE_PARENT_AI_API_BASE
    ?? DEFAULT_PARENT_AI_API_BASE;
  return String(configured).replace(/\/+$/, '');
}

async function postJson(path, payload) {
  return requestJson(`${getApiBase()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PARENT_AI_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function shouldRetry(error, response) {
  if (response) {
    return response.status === 408 || response.status === 429 || response.status >= 500;
  }
  return error?.name === 'AbortError' || error instanceof TypeError;
}

async function requestJson(url, options = {}) {
  let lastError = null;
  for (let attempt = 0; attempt <= PARENT_AI_RETRY_COUNT; attempt += 1) {
    let response = null;
    try {
      response = await fetchWithTimeout(url, options);
      const data = await response.json().catch(() => ({}));
      if (response.ok) return data;
      const error = new Error(data.error ?? `Parent AI API request failed: ${response.status}`);
      if (attempt < PARENT_AI_RETRY_COUNT && shouldRetry(error, response)) {
        lastError = error;
        continue;
      }
      throw error;
    } catch (error) {
      if (attempt < PARENT_AI_RETRY_COUNT && shouldRetry(error, response)) {
        lastError = error;
        continue;
      }
      if (error?.name === 'AbortError') {
        throw new Error('Parent AI API request timed out.');
      }
      throw error;
    }
  }
  throw lastError ?? new Error('Parent AI API request failed.');
}

export async function requestParentAiStart(payload) {
  return postJson('/api/parent-ai/start', payload);
}

export async function requestParentAiTurn({ session, playerReply }) {
  return postJson('/api/parent-ai/turn', { session, playerReply });
}

export async function requestParentAiPlaytest(payload) {
  return postJson('/api/parent-ai/playtest', payload);
}

export async function requestParentAiStatus() {
  return requestJson(`${getApiBase()}/api/status`);
}
