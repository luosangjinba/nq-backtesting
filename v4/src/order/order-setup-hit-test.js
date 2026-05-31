// Pixel hit testing for Order Setup chart elements.

import { getPrimaryChartContext } from '../chart/chart-context.js';
import { ORDER_DIRECTIONS } from './order-review-store.js';
import { getSetupSets } from './setup-set.js';
import {
  ORDER_SETUP_LINE_LENGTH_BARS,
  getOrderSetupDisplayBarForTimestamp,
  getOrderSetupElementLineLength,
  getOrderSetupLineEndCoordinate,
  mapTimestampToOrderSetupChartTime,
} from './order-setup-projection.js';

const REVERSAL_HIT_TOLERANCE_PX = 16;
const REVERSAL_MARKER_OFFSET_PX = 22;
const PLAN_LINE_HIT_TOLERANCE_PX = 8;

function getHitContext(context) {
  return context || getPrimaryChartContext();
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

  const time = mapTimestampToOrderSetupChartTime(timestamp, context);
  if (time === null) return null;
  const startX = context.timeToCoordinate?.(time);
  const lineY = context.priceToCoordinate?.(price);
  if (startX === null || startX === undefined || lineY === null || lineY === undefined) return null;

  const lengthBars = getOrderSetupElementLineLength(element, fallbackLength);
  const endX = getOrderSetupLineEndCoordinate(context, startX, element, fallbackLength);
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
  const time = mapTimestampToOrderSetupChartTime(reversal.timestamp, context);
  if (time === null) return null;

  const direction = setupSet?.direction;
  const isBearish = direction === ORDER_DIRECTIONS.SHORT;
  const bar = getOrderSetupDisplayBarForTimestamp(reversal.timestamp, context);
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

function isOrderSetupElementVisible(setupSet, role) {
  return setupSet?.display?.elementVisibility?.[role] !== false;
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
    if (isOrderSetupElementVisible(setupSet, 'entry')) {
      const entryHit = hitHorizontalLine(setupSet, elements.entry, 'entry', x, y, activeContext, entryTimestamp, ORDER_SETUP_LINE_LENGTH_BARS);
      if (entryHit) hits.push(entryHit);
    }
    if (isOrderSetupElementVisible(setupSet, 'stopLoss')) {
      const stopHit = hitHorizontalLine(setupSet, elements.stopLoss, 'stopLoss', x, y, activeContext, entryTimestamp, ORDER_SETUP_LINE_LENGTH_BARS + 6);
      if (stopHit) hits.push(stopHit);
    }
    const visibleTargets = (Array.isArray(elements.targets) ? elements.targets : [])
      .filter((target) => isOrderSetupElementVisible(setupSet, target.role));
    visibleTargets.forEach((target, index) => {
      const targetHit = hitHorizontalLine(
        setupSet,
        target,
        target.role,
        x,
        y,
        activeContext,
        entryTimestamp,
        ORDER_SETUP_LINE_LENGTH_BARS + index * 6
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
