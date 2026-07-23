import { normalizeHexAlphaColor } from './color-value.js';
import { failWorkstationSettings } from './settings-value.js';

const DEFAULT_LIMIT = 8;
const DEFAULT_STORAGE_KEY = 'v7.color-history:global';
const SCHEMA = 'v7.color-history';
const VERSION = 1;

function requireStorage(storage) {
  for (const method of ['read', 'write']) {
    if (typeof storage?.[method] !== 'function') {
      failWorkstationSettings(
        'COLOR_HISTORY_STORAGE_INVALID',
        `Color history storage requires ${method}().`,
      );
    }
  }
  return storage;
}

function normalizedColors(colors, limit) {
  const result = [];
  for (const value of colors) {
    const color = normalizeHexAlphaColor(value);
    if (color !== null && !result.includes(color)) result.push(color);
    if (result.length === limit) break;
  }
  return Object.freeze(result);
}

function restore(raw, limit) {
  if (raw === null) return Object.freeze([]);
  try {
    const wire = JSON.parse(raw);
    if (!wire || typeof wire !== 'object' || Array.isArray(wire)
      || Object.keys(wire).sort().join(',') !== 'colors,schema,version'
      || wire.schema !== SCHEMA || wire.version !== VERSION || !Array.isArray(wire.colors)) {
      return Object.freeze([]);
    }
    return normalizedColors(wire.colors, limit);
  } catch {
    return Object.freeze([]);
  }
}

/** Own the global, non-transactional recent-color convenience record. */
export function createColorHistoryStore({
  storage,
  storageKey = DEFAULT_STORAGE_KEY,
  limit = DEFAULT_LIMIT,
}) {
  const port = requireStorage(storage);
  if (typeof storageKey !== 'string' || storageKey.length === 0
    || !Number.isSafeInteger(limit) || limit < 1 || limit > 32) {
    failWorkstationSettings(
      'COLOR_HISTORY_OPTIONS_INVALID',
      'Color history requires a non-empty key and a limit from 1 through 32.',
    );
  }
  let colors = null;

  function initialize() {
    if (colors !== null) return colors;
    try { colors = restore(port.read(storageKey), limit); }
    catch { colors = Object.freeze([]); }
    return colors;
  }

  function record(values) {
    if (!Array.isArray(values)) {
      failWorkstationSettings('COLOR_HISTORY_VALUES_INVALID', 'Color history values must be an array.');
    }
    const next = normalizedColors([...values, ...initialize()], limit);
    port.write(storageKey, JSON.stringify({ colors: next, schema: SCHEMA, version: VERSION }));
    colors = next;
    return colors;
  }

  return Object.freeze({ initialize, record, snapshot: () => initialize() });
}
