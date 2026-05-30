// Pixel hit testing for Order Setup chart elements.

import { getPrimaryChartContext } from '../chart/chart-context.js';
import { getBucketStart } from '../pda/pda-context.js';
import { ORDER_DIRECTIONS } from './order-review-store.js';
import { getSetupSets } from './setup-set.js';

const REVERSAL_HIT_TOLERANCE_PX = 16;
const REVERSAL_MARKER_OFFSET_PX = 22;
const PLAN_LINE_HIT_TOLERANCE_PX = 8;
const PLAN_LINE_LENGTH_BARS = 38;

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

function getBarSpacing(context) {
  const chart = context?.getChart?.();
  const spacing = Number(chart?.timeScale?.().options?.().barSpacing);
  return Number.isFinite(spacing) && spacing > 0 ? spacing : 6;
}

function getElementLengthBars(element, fallback = PLAN_LINE_LENGTH_BARS) {
  const length = Number(element?.lineLengthBars);
  return Number.isFinite(length) && length >= 0 ? length : fallback;
}

function getLineEndCoordinate(context, startX, element, fallbackLength) {
  const endTime = mapTimestampToContextTime(element?.endTimestamp, context);
  if (endTime !== null) {
    const endX = context.timeToCoordinate?.(endTime);
    if (endX !== null && endX !== undefined) return Number(endX);
  }
  return Number(startX) + getBarSpacing(context) * getElementLengthBars(element, fallbackLength);
}

function lineDistance(x, y, x1, x2, lineY) {
  const left = Math.min(Number(x1), Number(x2));
  const right = Math.max(Number(x1), Number(x2));
  const clampedX = Math.min(Math.max(Number(x), left), right);
  return Math.hypot(Number(x) - clampedX, Number(y) - Number(lineY));
}

function hitHorizontalLine(setupSet, element, role, x, y, context, fallbackTimestamp, fallbackLength) {
  const price = Number(element?.price);
  const timestamp = element?.timestamp || fallbackTimestamp;
  if (!Number.isFinite(price) || !timestamp) return null;

  const time = mapTimestampToContextTime(timestamp, context);
  if (time === null) return null;
  const startX = context.timeToCoordinate?.(time);
  const lineY = context.priceToCoordinate?.(price);
  if (startX === null || startX === undefined || lineY === null || lineY === undefined) return null;

  const lengthBars = getElementLengthBars(element, fallbackLength);
  const endX = getLineEndCoordinate(context, startX, element, fallbackLength);
  const distance = lineDistance(x, y, startX, endX, lineY);
  if (distance > PLAN_LINE_HIT_TOLERANCE_PX) return null;

  return {
    setupId: setupSet.id,
    element: role,
    distance,
    timestamp,
    price,
    lengthBars,
  };
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
    const elements = setupSet.orderElements || {};
    const entryTimestamp = elements.entry?.timestamp || elements.reversal?.timestamp;
    const reversalHit = hitReversal(setupSet, x, y, activeContext);
    if (reversalHit) hits.push(reversalHit);
    const entryHit = hitHorizontalLine(setupSet, elements.entry, 'entry', x, y, activeContext, entryTimestamp, PLAN_LINE_LENGTH_BARS);
    if (entryHit) hits.push(entryHit);
    const stopHit = hitHorizontalLine(setupSet, elements.stopLoss, 'stopLoss', x, y, activeContext, entryTimestamp, PLAN_LINE_LENGTH_BARS + 6);
    if (stopHit) hits.push(stopHit);
    (Array.isArray(elements.targets) ? elements.targets : []).forEach((target, index) => {
      const targetHit = hitHorizontalLine(
        setupSet,
        target,
        target.role,
        x,
        y,
        activeContext,
        entryTimestamp,
        PLAN_LINE_LENGTH_BARS + index * 6
      );
      if (targetHit) hits.push(targetHit);
    });
  });
  hits.sort((a, b) => a.distance - b.distance);
  return {
    hits,
    primaryHit: hits[0] || null,
  };
}
