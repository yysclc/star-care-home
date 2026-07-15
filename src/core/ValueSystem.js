export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function deepMerge(base, incoming) {
  // Arrays: prefer incoming array as-is; fall back to base copy
  if (Array.isArray(base)) {
    return Array.isArray(incoming) ? [...incoming] : [...base];
  }

  const out = { ...base };
  if (!incoming || typeof incoming !== 'object') return out;

  // First pass: keys that exist in base
  Object.keys(base).forEach((key) => {
    const bv = base[key];
    const iv = incoming[key];

    if (Array.isArray(bv)) {
      out[key] = Array.isArray(iv) ? [...iv] : [...bv];
    } else if (bv !== null && typeof bv === 'object') {
      out[key] = iv !== undefined ? deepMerge(bv, iv) : deepMerge(bv, {});
    } else {
      out[key] = iv !== undefined ? iv : bv;
    }
  });

  // Second pass: keys only in incoming (e.g. flags set at runtime, new schema fields in saves)
  Object.keys(incoming).forEach((key) => {
    if (!(key in base)) {
      const iv = incoming[key];
      // Deep-copy incoming-only values to avoid reference sharing
      out[key] = (iv !== null && typeof iv === 'object')
        ? JSON.parse(JSON.stringify(iv))
        : iv;
    }
  });

  return out;
}

export function getByPath(obj, path, fallback = undefined) {
  if (!path) return fallback;
  return path.split('.').reduce((acc, part) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, part)) return acc[part];
    return undefined;
  }, obj) ?? fallback;
}

export function setByPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cur[part] || typeof cur[part] !== 'object') cur[part] = {};
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
}

export function addByPath(obj, path, delta, { min = -Infinity, max = Infinity } = {}) {
  const current = clamp(getByPath(obj, path, 0), min, max);
  const next = clamp(current + delta, min, max);
  setByPath(obj, path, next);
  return { before: current, after: next, delta: next - current };
}

export function describeDelta(label, delta) {
  if (delta === 0) return `${label} 无变化`;
  return `${label} ${delta > 0 ? '+' : ''}${delta}`;
}
