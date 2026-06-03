import { getBucketStart } from '../chart/time-projection.js';

export const ORDER_SETUP_LINE_LENGTH_BARS = 38;
export const ORDER_SETUP_ZONE_WIDTH_BARS = 28;

export function mapTimestampToOrderSetupChartTime(timestamp, context = {}) {
  if (timestamp === undefined || timestamp === null) return null;
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return null;
  const timeframe = Number(context.timeframe);
  const bucketStart = Number.isFinite(timeframe) ? getBucketStart(parsed, timeframe) : parsed;
  if (timeframe === 1440) {
    const exactBar = context.getDisplayBars?.().find((bar) => Number(bar.timestamp) === parsed);
    if (exactBar?.tradingDay) return exactBar.tradingDay;
    const date = new Date((bucketStart + 24 * 60 * 60) * 1000);
    return date.toISOString().slice(0, 10);
  }
  return bucketStart;
}

export function getOrderSetupDisplayBarForTimestamp(timestamp, context = {}) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return null;
  const timeframe = Number(context.timeframe);
  const bucketStart = Number.isFinite(timeframe) ? getBucketStart(parsed, timeframe) : parsed;
  return context.getDisplayBars?.().find((bar) => {
    if (timeframe === 1440) return Number(bar.timestamp) === parsed || Number(bar.timestamp) === bucketStart;
    return Number(bar.timestamp) === bucketStart;
  }) || null;
}

export function getOrderSetupDisplayBarIndexForTimestamp(timestamp, context = {}) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return -1;
  const timeframe = Number(context.timeframe);
  const bucketStart = Number.isFinite(timeframe) ? getBucketStart(parsed, timeframe) : parsed;
  return (context.getDisplayBars?.() || []).findIndex((bar) => {
    if (timeframe === 1440) return Number(bar.timestamp) === parsed || Number(bar.timestamp) === bucketStart;
    return Number(bar.timestamp) === bucketStart;
  });
}

export function getOrderSetupElementLineLength(element, fallback = ORDER_SETUP_LINE_LENGTH_BARS) {
  const length = Number(element?.lineLengthBars);
  return Number.isFinite(length) && length >= 0 ? length : fallback;
}

export function getOrderSetupProjectedChartTime(timestamp, context = {}, barsAhead = ORDER_SETUP_ZONE_WIDTH_BARS) {
  const bars = context.getDisplayBars?.() || [];
  if (!bars.length) return mapTimestampToOrderSetupChartTime(timestamp, context);
  const index = getOrderSetupDisplayBarIndexForTimestamp(timestamp, context);
  if (index < 0) return mapTimestampToOrderSetupChartTime(timestamp, context);
  const next = bars[Math.min(bars.length - 1, index + barsAhead)];
  return next ? mapTimestampToOrderSetupChartTime(next.timestamp, context) : mapTimestampToOrderSetupChartTime(timestamp, context);
}

export function getOrderSetupBarSpacing(context = {}) {
  const chart = context.getChart?.();
  const spacing = Number(chart?.timeScale?.().options?.().barSpacing);
  return Number.isFinite(spacing) && spacing > 0 ? spacing : 6;
}

export function getOrderSetupLineEndCoordinate(context = {}, startX, element, fallbackLength = ORDER_SETUP_LINE_LENGTH_BARS) {
  const endTime = mapTimestampToOrderSetupChartTime(element?.endTimestamp, context);
  if (endTime !== null) {
    const endX = context.timeToCoordinate?.(endTime);
    if (endX !== null && endX !== undefined) return Number(endX);
  }
  return Number(startX) + getOrderSetupBarSpacing(context) * getOrderSetupElementLineLength(element, fallbackLength);
}
