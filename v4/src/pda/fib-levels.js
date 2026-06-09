const DEFAULT_FIB_LEVEL_COLOR = '#60636f';

export const DEFAULT_FIB_LEVELS = Object.freeze([
  { value: 1, visible: true, color: '#60636f' },
  { value: 0.79, visible: true, color: '#00a6b4' },
  { value: 0.705, visible: true, color: '#ffa726' },
  { value: 0.62, visible: true, color: '#4caf50' },
  { value: 0.5, visible: true, color: '#ff4d5d' },
  { value: 0.236, visible: true, color: '#ab47bc' },
  { value: 0, visible: true, color: '#60636f' },
  { value: -0.272, visible: true, color: '#ff9800' },
  { value: -0.62, visible: true, color: '#4caf50' },
  { value: -1, visible: true, color: '#8d8f95' },
  { value: -1.5, visible: false, color: '#2f7f8a' },
  { value: -2, visible: false, color: '#5f6368' },
  { value: -2.5, visible: false, color: '#2c7a83' },
  { value: -3, visible: false, color: '#5f6368' },
  { value: -3.5, visible: false, color: '#2c7a83' },
  { value: -4, visible: false, color: '#5f6368' },
  { value: -4.5, visible: false, color: '#2c7a83' },
  { value: -5, visible: false, color: '#5f6368' },
  { value: 1.272, visible: false, color: '#8a5a0a' },
  { value: 2.272, visible: false, color: '#9e6d11' },
  { value: 3.272, visible: false, color: '#1d6f60' },
  { value: 4, visible: false, color: '#5f6368' },
  { value: 4.414, visible: false, color: '#8d2d5d' },
  { value: 4.764, visible: false, color: '#1d6f60' },
]);

function normalizeColor(value, fallback = DEFAULT_FIB_LEVEL_COLOR) {
  const color = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

export function normalizeFibLevel(level = {}) {
  const value = Number(level.value);
  if (!Number.isFinite(value)) return null;
  return {
    value,
    visible: level.visible !== false,
    color: normalizeColor(level.color),
  };
}

export function normalizeFibLevelList(levels = []) {
  return (Array.isArray(levels) ? levels : [])
    .map(normalizeFibLevel)
    .filter(Boolean);
}

export function getDefaultFibLevels() {
  return DEFAULT_FIB_LEVELS.map((level) => ({ ...level }));
}

function levelKey(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(6) : '';
}

export function normalizeFibLevels(levels = []) {
  const normalized = normalizeFibLevelList(levels);
  const byValue = new Map(normalized.map((level) => [levelKey(level.value), level]));
  const defaults = getDefaultFibLevels().map((level) => byValue.get(levelKey(level.value)) || level);
  const defaultKeys = new Set(defaults.map((level) => levelKey(level.value)));
  const customLevels = normalized.filter((level) => !defaultKeys.has(levelKey(level.value)));
  return [...defaults, ...customLevels];
}

export function updateFibLevel(levels = [], index, patch = {}) {
  const normalized = normalizeFibLevels(levels);
  const targetIndex = Number(index);
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= normalized.length) {
    return normalized;
  }
  const current = normalized[targetIndex];
  const next = normalizeFibLevel({ ...current, ...patch });
  if (!next) return normalized;
  return normalized.map((level, itemIndex) => (itemIndex === targetIndex ? next : level));
}

export function getVisibleFibLevels(levels = []) {
  return normalizeFibLevels(levels).filter((level) => level.visible !== false);
}
