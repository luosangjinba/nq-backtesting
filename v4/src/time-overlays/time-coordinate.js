// Shared timestamp -> x-coordinate helpers for time overlays and calendar locate.
// The key case is an event timestamp inside a higher-timeframe bar, such as
// 09:30 inside a 1H/4H candle. LightweightCharts only has coordinates for bar
// times, so we interpolate within the containing bar.

function toNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getBarTimestamp(bar) {
  return toNumber(bar?.timestamp);
}

function getBarChartTime(bar, timeframe) {
  return Number(timeframe) === 1440 ? bar?.tradingDay : bar?.timestamp;
}

function getTimeScale(chartInstance) {
  return chartInstance?.timeScale?.() || null;
}

function getBarSpacing(chartInstance) {
  const spacing = Number(getTimeScale(chartInstance)?.options?.().barSpacing);
  return Number.isFinite(spacing) && spacing > 0 ? spacing : 6;
}

function getCoordinate(chartInstance, time) {
  if (time === undefined || time === null) return null;
  return getTimeScale(chartInstance)?.timeToCoordinate(time) ?? null;
}

export function findContainingBarIndex(displayBars = [], timestamp, timeframe) {
  const target = toNumber(timestamp);
  if (!Number.isFinite(target) || !Array.isArray(displayBars) || !displayBars.length) return -1;

  const timeframeSeconds = Math.max(60, Number(timeframe) * 60 || 60);
  for (let index = 0; index < displayBars.length; index += 1) {
    const currentTs = getBarTimestamp(displayBars[index]);
    if (currentTs === null) continue;
    const nextTs = getBarTimestamp(displayBars[index + 1]);
    const endTs = nextTs !== null && nextTs > currentTs ? nextTs : currentTs + timeframeSeconds;
    if (target >= currentTs && target < endTs) return index;
  }

  return -1;
}

export function timestampToXCoordinate({
  chartInstance,
  displayBars = [],
  timestamp,
  timeframe,
} = {}) {
  const target = toNumber(timestamp);
  if (!chartInstance || !Number.isFinite(target) || !Array.isArray(displayBars) || !displayBars.length) {
    return null;
  }

  const containingIndex = findContainingBarIndex(displayBars, target, timeframe);
  if (containingIndex < 0) return null;

  const currentBar = displayBars[containingIndex];
  const currentTs = getBarTimestamp(currentBar);
  const currentX = getCoordinate(chartInstance, getBarChartTime(currentBar, timeframe));
  if (currentTs === null || currentX === null) return null;

  if (target === currentTs) return currentX;

  const nextBar = displayBars[containingIndex + 1];
  const nextTs = getBarTimestamp(nextBar);
  const timeframeSeconds = Math.max(60, Number(timeframe) * 60 || 60);
  const endTs = nextTs !== null && nextTs > currentTs ? nextTs : currentTs + timeframeSeconds;
  const progress = Math.min(1, Math.max(0, (target - currentTs) / (endTs - currentTs || timeframeSeconds)));

  const nextX = nextBar ? getCoordinate(chartInstance, getBarChartTime(nextBar, timeframe)) : null;
  if (nextX !== null && nextX > currentX) {
    return currentX + (nextX - currentX) * progress;
  }

  return currentX + getBarSpacing(chartInstance) * progress;
}

export function timestampRangeToXRange(options = {}) {
  const from = timestampToXCoordinate({ ...options, timestamp: options.startTimestamp });
  const to = timestampToXCoordinate({ ...options, timestamp: options.endTimestamp });
  if (from === null || to === null) return null;
  return {
    from: Math.min(from, to),
    to: Math.max(from, to),
  };
}
