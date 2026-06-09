const DEFAULT_FIB_LEVEL_COLOR = '#60636f';

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
