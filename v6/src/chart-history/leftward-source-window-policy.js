import {
  normalizeMinuteTimeframe,
} from '../time-domain/time-domain.js';
import {
  estimateSessionAwareSourceBarCount,
  normalizeSessionAwareDisplayTimeframe,
} from '../time-domain/htf-display-timeframe-domain.js';

export const LEFTWARD_BASE_SOURCE_BAR_LIMIT = 2500;
export const LEFTWARD_MAX_SOURCE_BAR_LIMIT = 40000;

const MINUTE_HTF_TARGET_DISPLAY_BARS = 20;
const SESSION_AWARE_TARGET_DISPLAY_BARS = Object.freeze({
  '1D': 12,
  '1W': 4,
  '1M': 1,
});
const SESSION_AWARE_SOURCE_BAR_LIMITS = Object.freeze({
  '1D': 20000,
  '1W': LEFTWARD_MAX_SOURCE_BAR_LIMIT,
  '1M': LEFTWARD_MAX_SOURCE_BAR_LIMIT,
});

function clampSourceBars(value, limit) {
  return Math.min(
    Number(limit),
    Math.max(1, Math.ceil(Number(value) || 1)),
  );
}

export function resolveLeftwardSourceWindowPolicy({
  displayTimeframe,
  sourceTimeframe,
} = {}) {
  const source = normalizeMinuteTimeframe(sourceTimeframe, {
    fieldName: 'Leftward source window policy sourceTimeframe',
  });
  const sessionAwareDisplay = normalizeSessionAwareDisplayTimeframe(displayTimeframe);

  if (sessionAwareDisplay) {
    const sourceBarLimit = SESSION_AWARE_SOURCE_BAR_LIMITS[sessionAwareDisplay];
    const targetDisplayBars = SESSION_AWARE_TARGET_DISPLAY_BARS[sessionAwareDisplay];
    const displaySourceBars = estimateSessionAwareSourceBarCount({
      count: 1,
      sourceBarLimit,
      targetTimeframe: sessionAwareDisplay,
    });
    const prefetchSourceBars = estimateSessionAwareSourceBarCount({
      count: targetDisplayBars,
      sourceBarLimit,
      targetTimeframe: sessionAwareDisplay,
    });
    return {
      displaySourceBars,
      prefetchSourceBars,
      sourceBarLimit,
      targetDisplayBars,
    };
  }

  const display = normalizeMinuteTimeframe(displayTimeframe ?? source, {
    fieldName: 'Leftward source window policy displayTimeframe',
  });
  const displaySourceBars = display / source;

  if (display < 60) {
    return {
      displaySourceBars,
      prefetchSourceBars: 0,
      sourceBarLimit: LEFTWARD_BASE_SOURCE_BAR_LIMIT,
      targetDisplayBars: 0,
    };
  }

  const proportionalSourceBars = displaySourceBars * MINUTE_HTF_TARGET_DISPLAY_BARS;
  const sourceBarLimit = Math.min(
    LEFTWARD_MAX_SOURCE_BAR_LIMIT,
    Math.max(LEFTWARD_BASE_SOURCE_BAR_LIMIT, Math.ceil(proportionalSourceBars)),
  );

  return {
    displaySourceBars,
    prefetchSourceBars: clampSourceBars(proportionalSourceBars, sourceBarLimit),
    sourceBarLimit,
    targetDisplayBars: MINUTE_HTF_TARGET_DISPLAY_BARS,
  };
}
