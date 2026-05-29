import { TIMEFRAME_TO_SECONDS, timeframeToString } from '../config.js';

function parsePositiveNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeTimeframeLabel(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim().toUpperCase();
}

function getSecondsForTimeframeLabel(value) {
  const label = normalizeTimeframeLabel(value);
  if (!label) return null;
  if (TIMEFRAME_TO_SECONDS[label]) return TIMEFRAME_TO_SECONDS[label];
  const minuteMatch = label.match(/^(\d+)M$/);
  if (minuteMatch) return Number(minuteMatch[1]) * 60;
  const hourMatch = label.match(/^(\d+)H$/);
  if (hourMatch) return Number(hourMatch[1]) * 3600;
  if (label === 'DAILY') return TIMEFRAME_TO_SECONDS.D;
  return null;
}

function inferSourceTimeframeSeconds(annotation = {}) {
  const candidates = [
    annotation.display?.extendTimeframe,
    annotation.display?.sourceTimeframe,
    annotation.timeframe,
    ...(Array.isArray(annotation.contexts) ? annotation.contexts : []),
  ];

  for (const candidate of candidates) {
    const label = normalizeTimeframeLabel(candidate).split(/\s+/)[0];
    const seconds = getSecondsForTimeframeLabel(label);
    if (seconds) return seconds;
  }
  return null;
}

export function getCurrentTimeframeSeconds(currentTimeframe) {
  const label = timeframeToString(currentTimeframe);
  return getSecondsForTimeframeLabel(label) || Number(currentTimeframe) * 60 || 3600;
}

export function buildExtendDisplayPatch(extendBars, currentTimeframe) {
  const bars = parsePositiveNumber(extendBars, 0);
  const timeframe = timeframeToString(currentTimeframe);
  const timeframeSeconds = getCurrentTimeframeSeconds(currentTimeframe);
  return {
    extendBars: bars,
    extendSeconds: bars * timeframeSeconds,
    extendTimeframe: timeframe,
  };
}

export function getExtendSeconds(annotation = {}, fallbackBars = 0, currentTimeframe = 60) {
  const explicitSeconds = parsePositiveNumber(annotation.display?.extendSeconds, null);
  if (explicitSeconds !== null) return explicitSeconds;

  const explicitBars = annotation.display?.extendBars ?? annotation.extendBars;
  const hasExplicitBars = explicitBars !== undefined && explicitBars !== null;
  const bars = hasExplicitBars ? parsePositiveNumber(explicitBars, 0) : parsePositiveNumber(fallbackBars, 0);
  if (bars <= 0) return 0;

  const sourceSeconds =
    hasExplicitBars
      ? inferSourceTimeframeSeconds(annotation) || getCurrentTimeframeSeconds(currentTimeframe)
      : getCurrentTimeframeSeconds(currentTimeframe);
  return bars * sourceSeconds;
}

export function getExtendBarsForTimeframe(annotation = {}, fallbackBars = 0, currentTimeframe = 60) {
  const timeframeSeconds = getCurrentTimeframeSeconds(currentTimeframe);
  if (timeframeSeconds <= 0) return fallbackBars;
  return getExtendSeconds(annotation, fallbackBars, currentTimeframe) / timeframeSeconds;
}
