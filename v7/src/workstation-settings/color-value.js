const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const HEX_ALPHA_PATTERN = /^#[0-9a-f]{8}$/i;
const LEGACY_HEX_PATTERN = /^#[0-9a-f]{6}$/i;

function expand(short) {
  return [...short].map((digit) => `${digit}${digit}`).join('');
}

/** Normalize CSS-style hex input to the one durable #rrggbbaa representation. */
export function normalizeHexAlphaColor(value) {
  if (typeof value !== 'string' || !HEX_COLOR_PATTERN.test(value)) return null;
  const digits = value.slice(1).toLowerCase();
  if (digits.length === 3) return `#${expand(digits)}ff`;
  if (digits.length === 4) return `#${expand(digits)}`;
  if (digits.length === 6) return `#${digits}ff`;
  return `#${digits}`;
}

export function isNormalizedHexAlphaColor(value) {
  return typeof value === 'string' && HEX_ALPHA_PATTERN.test(value);
}

export function migrateOpaqueHexColor(value) {
  return typeof value === 'string' && LEGACY_HEX_PATTERN.test(value)
    ? `${value.toLowerCase()}ff`
    : null;
}

export function hexColorWithoutAlpha(value) {
  const normalized = normalizeHexAlphaColor(value);
  return normalized === null ? null : normalized.slice(0, 7);
}

export function hexColorOpacityPercent(value) {
  const normalized = normalizeHexAlphaColor(value);
  return normalized === null ? null : Math.round((parseInt(normalized.slice(7), 16) / 255) * 100);
}

export function hexColorWithOpacity(value, percent) {
  const normalized = normalizeHexAlphaColor(value);
  if (normalized === null || !Number.isFinite(Number(percent))) return null;
  const bounded = Math.min(100, Math.max(0, Math.round(Number(percent))));
  const alpha = Math.round((bounded / 100) * 255).toString(16).padStart(2, '0');
  return `${normalized.slice(0, 7)}${alpha}`;
}
