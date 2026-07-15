import {
  normalizeTargetTimeframeId,
  targetTimeframeToFixedMinutes,
} from '../time-domain/target-timeframe-domain.js';

export const DEFAULT_TIME_AXIS_SCAFFOLD_POINT_COUNT = 32;

function normalizeCount(value) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : DEFAULT_TIME_AXIS_SCAFFOLD_POINT_COUNT;
}

function latestTimestamp(bars = []) {
  const timestamp = Number(bars.at?.(-1)?.timestamp ?? bars.at?.(-1)?.time);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function addUtcMonths(timestamp, count) {
  const date = new Date(timestamp * 1000);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + count);
  return Math.floor(date.getTime() / 1000);
}

function nextTimestamp(timestamp, timeframeId, step) {
  const fixedMinutes = targetTimeframeToFixedMinutes(timeframeId);
  if (fixedMinutes) return timestamp + (fixedMinutes * 60 * step);
  if (timeframeId === '1D') return timestamp + (24 * 60 * 60 * step);
  if (timeframeId === '1W') return timestamp + (7 * 24 * 60 * 60 * step);
  return addUtcMonths(timestamp, step);
}

export function createTimeAxisScaffold({
  bars = [],
  count = DEFAULT_TIME_AXIS_SCAFFOLD_POINT_COUNT,
  timeframe = 1,
} = {}) {
  const start = latestTimestamp(bars);
  const pointCount = normalizeCount(count);
  if (start === null || pointCount === 0) return [];
  const timeframeId = normalizeTargetTimeframeId(timeframe, { fieldName: 'timeAxisTimeframe' });
  return Array.from({ length: pointCount }, (_, index) => Object.freeze({
    time: nextTimestamp(start, timeframeId, index + 1),
  }));
}
