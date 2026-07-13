import { formatApiTime, windowBoundsMs } from '../bar-data/bar-window.js';
import { normalizeDisplayTimeframeValue } from '../time-domain/htf-display-timeframe-domain.js';
import { targetTimeframeToFixedMinutes } from '../time-domain/target-timeframe-domain.js';

const SESSION_AWARE_CALENDAR_DAYS_PER_BAR = Object.freeze({
  '1D': 2,
  '1W': 10,
  '1M': 45,
});

export function planViewportTargetHistoryWindow({
  displayTimeframe,
  plannedSourceWindow,
  targetDisplayBars,
} = {}) {
  const timeframe = normalizeDisplayTimeframeValue(displayTimeframe, {
    fieldName: 'Viewport target history timeframe',
  });
  const count = Math.max(1, Math.ceil(Number(targetDisplayBars) || 1));
  const { endMs } = windowBoundsMs(plannedSourceWindow);
  const fixedMinutes = targetTimeframeToFixedMinutes(timeframe);
  const durationMs = fixedMinutes
    ? count * fixedMinutes * 60 * 1000
    : count * SESSION_AWARE_CALENDAR_DAYS_PER_BAR[timeframe] * 24 * 60 * 60 * 1000;
  return {
    ...plannedSourceWindow,
    end: formatApiTime(endMs),
    start: formatApiTime(endMs - durationMs),
  };
}
