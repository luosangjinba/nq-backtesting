import { resolveDaySeparatorInstants } from './session-calendar-domain.js';

const STYLE_DASHES = Object.freeze({
  dashed: [6, 4],
  dotted: [2, 4],
  solid: [],
});

function timestampOf(bar) {
  return Number(bar?.timestamp ?? bar?.time);
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function logicalPositionForTimestamp(times, timestamp, medianInterval) {
  let low = 0;
  let high = times.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (times[middle] === timestamp) return middle;
    if (times[middle] < timestamp) low = middle + 1;
    else high = middle - 1;
  }
  if (high < 0 || low >= times.length) return null;
  const gap = times[low] - times[high];
  if (gap <= 0 || gap > medianInterval * 1.5) return null;
  return high + ((timestamp - times[high]) / gap);
}

export function createDaySeparatorOverlayLines(bars = [], settings = {}) {
  const mode = settings.chartDaySeparators || 'off';
  if (mode === 'off') return [];
  const times = [...new Set(bars.map(timestampOf).filter(Number.isFinite))]
    .sort((left, right) => left - right);
  if (times.length < 2) return [];
  const intervals = times.slice(1).map((time, index) => time - times[index]).filter((value) => value > 0);
  const medianInterval = median(intervals);
  if (!medianInterval || medianInterval >= 86_400) return [];

  return resolveDaySeparatorInstants({
    fromTimestamp: times[0],
    mode,
    toTimestamp: times.at(-1),
  }).flatMap((separator) => {
    const logical = logicalPositionForTimestamp(times, separator.timestamp, medianInterval);
    if (logical === null) return [];
    const ict = separator.type === 'ict';
    const style = ict
      ? settings.chartIctDaySeparatorStyle
      : settings.chartTradingDaySeparatorStyle;
    return [Object.freeze({
      color: ict
        ? settings.chartIctDaySeparatorColor
        : settings.chartTradingDaySeparatorColor,
      dash: [...(STYLE_DASHES[style] || [])],
      logical,
      style,
      timestamp: separator.timestamp,
      type: separator.type,
    })];
  });
}
