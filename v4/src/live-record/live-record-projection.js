import {
  getBucketStart,
  mapTimestampToChartTime,
} from '../chart/time-projection.js';

export const LIVE_RECORD_LINE_LENGTH_BARS = 34;

export function mapTimestampToLiveRecordChartTime(timestamp, context = {}) {
  if (timestamp === undefined || timestamp === null) return null;
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return null;
  const timeframe = Number(context.timeframe);
  return mapTimestampToChartTime(parsed, timeframe, context.getDisplayBars?.() || []);
}

export function getLiveRecordDisplayBarIndexForTimestamp(timestamp, context = {}) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return -1;
  const timeframe = Number(context.timeframe);
  const bucketStart = Number.isFinite(timeframe) ? getBucketStart(parsed, timeframe) : parsed;
  return (context.getDisplayBars?.() || []).findIndex((bar) => {
    if (timeframe === 1440) return Number(bar.timestamp) === parsed || Number(bar.timestamp) === bucketStart;
    return Number(bar.timestamp) === bucketStart;
  });
}

export function getLiveRecordElementLineLength(element, fallback = LIVE_RECORD_LINE_LENGTH_BARS) {
  const length = Number(element?.lineLengthBars);
  return Number.isFinite(length) && length >= 0 ? length : fallback;
}
