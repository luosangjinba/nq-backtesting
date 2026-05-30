// Pixel hit testing for Order Setup chart elements.

import { getPrimaryChartContext } from '../chart/chart-context.js';
import { getBucketStart } from '../pda/pda-context.js';
import { ORDER_DIRECTIONS } from './order-review-store.js';
import { getSetupSets } from './setup-set.js';

const REVERSAL_HIT_TOLERANCE_PX = 16;
const REVERSAL_MARKER_OFFSET_PX = 22;

function getHitContext(context) {
  return context || getPrimaryChartContext();
}

function mapTimestampToContextTime(timestamp, context) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return null;
  const timeframe = Number(context?.timeframe);
  const bucketStart = Number.isFinite(timeframe) ? getBucketStart(parsed, timeframe) : parsed;
  if (timeframe === 1440) {
    const exactBar = context.getDisplayBars?.().find((bar) => Number(bar.timestamp) === parsed);
    if (exactBar?.tradingDay) return exactBar.tradingDay;
    const date = new Date((bucketStart + 24 * 60 * 60) * 1000);
    return date.toISOString().slice(0, 10);
  }
  return bucketStart;
}

function getDisplayBarForTimestamp(timestamp, context) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return null;
  const timeframe = Number(context?.timeframe);
  const bucketStart = Number.isFinite(timeframe) ? getBucketStart(parsed, timeframe) : parsed;
  return context.getDisplayBars?.().find((bar) => {
    if (timeframe === 1440) return Number(bar.timestamp) === parsed || Number(bar.timestamp) === bucketStart;
    return Number(bar.timestamp) === bucketStart;
  }) || null;
}

function hitReversal(setupSet, x, y, context) {
  const reversal = setupSet?.orderElements?.reversal || {};
  const time = mapTimestampToContextTime(reversal.timestamp, context);
  if (time === null) return null;

  const direction = setupSet?.direction;
  const isBearish = direction === ORDER_DIRECTIONS.SHORT;
  const bar = getDisplayBarForTimestamp(reversal.timestamp, context);
  const markerPrice = Number(isBearish ? bar?.high : bar?.low);
  const fallbackPrice = Number(reversal.price);
  const anchorPrice = Number.isFinite(markerPrice) ? markerPrice : fallbackPrice;
  if (!Number.isFinite(anchorPrice)) return null;

  const markerX = context.timeToCoordinate?.(time);
  const anchorY = context.priceToCoordinate?.(anchorPrice);
  if (markerX === null || markerX === undefined || anchorY === null || anchorY === undefined) return null;

  const markerY = Number(anchorY) + (isBearish ? -REVERSAL_MARKER_OFFSET_PX : REVERSAL_MARKER_OFFSET_PX);
  const distance = Math.hypot(Number(x) - Number(markerX), Number(y) - markerY);
  if (distance > REVERSAL_HIT_TOLERANCE_PX) return null;

  return {
    setupId: setupSet.id,
    element: 'reversal',
    distance,
    direction,
    timestamp: reversal.timestamp,
  };
}

export function hitTestOrderSetupElements({ x, y, context = null } = {}) {
  const activeContext = getHitContext(context);
  const hits = [];
  getSetupSets().forEach((setupSet) => {
    if (setupSet.display?.hidden) return;
    const reversalHit = hitReversal(setupSet, x, y, activeContext);
    if (reversalHit) hits.push(reversalHit);
  });
  hits.sort((a, b) => a.distance - b.distance);
  return {
    hits,
    primaryHit: hits[0] || null,
  };
}
