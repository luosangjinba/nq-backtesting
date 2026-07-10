import { normalizeMinuteTimeframe } from './time-domain.js';

export const SESSION_AWARE_DISPLAY_TIMEFRAME_VALUES = Object.freeze(['1D', '1W', '1M']);

const SESSION_AWARE_SOURCE_BAR_ESTIMATES = Object.freeze({
  '1D': 1440,
  '1W': 10080,
  '1M': Infinity,
});

export function normalizeSessionAwareDisplayTimeframe(value) {
  const text = String(value ?? '').trim().toUpperCase();
  return SESSION_AWARE_DISPLAY_TIMEFRAME_VALUES.includes(text) ? text : null;
}

export function isSessionAwareDisplayTimeframe(value) {
  return normalizeSessionAwareDisplayTimeframe(value) !== null;
}

export function normalizeDisplayTimeframeValue(value, {
  fieldName = 'displayTimeframe',
} = {}) {
  const sessionAware = normalizeSessionAwareDisplayTimeframe(value);
  if (sessionAware) return sessionAware;
  return normalizeMinuteTimeframe(value, {
    allowSuffix: false,
    fieldName,
  });
}

export function formatDisplayTimeframeValue(value) {
  const sessionAware = normalizeSessionAwareDisplayTimeframe(value);
  if (sessionAware) return sessionAware;
  return `${value}m`;
}

export function estimateSessionAwareSourceBarCount({
  count,
  sourceBarLimit,
  targetTimeframe,
} = {}) {
  const sessionAware = normalizeSessionAwareDisplayTimeframe(targetTimeframe);
  if (!sessionAware) return null;
  const targetCount = normalizeMinuteTimeframe(count, {
    allowSuffix: false,
    fieldName: 'count',
  });
  const multiplier = SESSION_AWARE_SOURCE_BAR_ESTIMATES[sessionAware];
  return Math.min(sourceBarLimit, targetCount * multiplier);
}
