import { CHART_CONTEXT_IDS, getPrimaryChartContext } from '../chart/chart-context.js';
import { canRenderObjectOnChartTarget } from '../comparison/comparison-overlay-policy.js';
import { LIVE_RECORD_DIRECTIONS } from './live-record-types.js';
import { getLiveRecordSets } from './live-record-set.js';
import {
  LIVE_RECORD_LINE_LENGTH_BARS,
  getLiveRecordDisplayBarIndexForTimestamp,
  getLiveRecordElementLineLength,
  getLiveRecordLineEndCoordinate,
  mapTimestampToLiveRecordChartTime,
} from './live-record-projection.js';

const ANCHOR_HIT_TOLERANCE_PX = 16;
const ANCHOR_MARKER_OFFSET_PX = 22;
const PLAN_LINE_HIT_TOLERANCE_PX = 8;

function getHitContext(context) {
  return context || getPrimaryChartContext();
}

function canHitLiveSetInContext(liveSet, context) {
  const targetChartId = getHitContext(context)?.chartId || CHART_CONTEXT_IDS.PRIMARY;
  return canRenderObjectOnChartTarget(liveSet, targetChartId).ok;
}

function lineDistance(x, y, x1, x2, lineY) {
  const left = Math.min(Number(x1), Number(x2));
  const right = Math.max(Number(x1), Number(x2));
  const clampedX = Math.min(Math.max(Number(x), left), right);
  return Math.hypot(Number(x) - clampedX, Number(y) - Number(lineY));
}

function isElementVisible(liveSet, role, element = {}) {
  return liveSet?.display?.elementVisibility?.[role] !== false && element.visible !== false;
}

function hitHorizontalLine(liveSet, element, role, x, y, context, fallbackTimestamp, fallbackLength) {
  const price = Number(element?.price);
  const timestamp = element?.timestamp || fallbackTimestamp;
  if (!Number.isFinite(price) || !timestamp) return null;

  const time = mapTimestampToLiveRecordChartTime(timestamp, context);
  if (time === null) return null;
  const startX = context.timeToCoordinate?.(time);
  const lineY = context.priceToCoordinate?.(price);
  if (startX === null || startX === undefined || lineY === null || lineY === undefined) return null;

  const lengthBars = getLiveRecordElementLineLength(element, fallbackLength);
  const endX = getLiveRecordLineEndCoordinate(context, startX, element, fallbackLength);
  const distance = lineDistance(x, y, startX, endX, lineY);
  if (distance > PLAN_LINE_HIT_TOLERANCE_PX) return null;

  return {
    liveRecordId: liveSet.id,
    element: role,
    distance,
    timestamp,
    price,
    lengthBars,
  };
}

function hitAnchor(liveSet, x, y, context) {
  const anchor = liveSet?.anchor || {};
  const time = mapTimestampToLiveRecordChartTime(anchor.timestamp, context);
  if (time === null) return null;

  const direction = liveSet?.direction;
  const isShort = direction === LIVE_RECORD_DIRECTIONS.SHORT;
  const barIndex = getLiveRecordDisplayBarIndexForTimestamp(anchor.timestamp, context);
  const bar = barIndex >= 0 ? context.getDisplayBars?.()[barIndex] : null;
  const markerPrice = Number(isShort ? bar?.high : bar?.low);
  const fallbackPrice = Number(anchor.price);
  const anchorPrice = Number.isFinite(markerPrice) ? markerPrice : fallbackPrice;
  if (!Number.isFinite(anchorPrice)) return null;

  const markerX = context.timeToCoordinate?.(time);
  const anchorY = context.priceToCoordinate?.(anchorPrice);
  if (markerX === null || markerX === undefined || anchorY === null || anchorY === undefined) return null;

  const markerY = Number(anchorY) + (isShort ? -ANCHOR_MARKER_OFFSET_PX : ANCHOR_MARKER_OFFSET_PX);
  const distance = Math.hypot(Number(x) - Number(markerX), Number(y) - markerY);
  if (distance > ANCHOR_HIT_TOLERANCE_PX) return null;

  return {
    liveRecordId: liveSet.id,
    element: 'anchor',
    distance,
    direction,
    timestamp: anchor.timestamp,
  };
}

export function hitTestLiveRecordElements({ x, y, context = null } = {}) {
  const activeContext = getHitContext(context);
  const hits = [];
  getLiveRecordSets().forEach((liveSet) => {
    if (!canHitLiveSetInContext(liveSet, activeContext)) return;
    if (liveSet.display?.hidden) return;
    const execution = liveSet.execution || {};
    const entryTimestamp = execution.entry?.timestamp || liveSet.anchor?.timestamp;
    const anchorHit = hitAnchor(liveSet, x, y, activeContext);
    if (anchorHit) hits.push(anchorHit);
    if (isElementVisible(liveSet, 'entry', execution.entry)) {
      const entryHit = hitHorizontalLine(liveSet, execution.entry, 'entry', x, y, activeContext, entryTimestamp, LIVE_RECORD_LINE_LENGTH_BARS);
      if (entryHit) hits.push(entryHit);
    }
    if (isElementVisible(liveSet, 'marketStructureShift', execution.marketStructureShift)) {
      const mssHit = hitHorizontalLine(liveSet, execution.marketStructureShift, 'marketStructureShift', x, y, activeContext, entryTimestamp, LIVE_RECORD_LINE_LENGTH_BARS + 4);
      if (mssHit) hits.push(mssHit);
    }
    if (isElementVisible(liveSet, 'stopLoss', execution.stopLoss)) {
      const stopHit = hitHorizontalLine(liveSet, execution.stopLoss, 'stopLoss', x, y, activeContext, entryTimestamp, LIVE_RECORD_LINE_LENGTH_BARS + 6);
      if (stopHit) hits.push(stopHit);
    }
    (Array.isArray(execution.targets) ? execution.targets : [])
      .filter((target) => isElementVisible(liveSet, target.role || target.id, target))
      .forEach((target, index) => {
        const role = target.role || target.id;
        const targetHit = hitHorizontalLine(
          liveSet,
          target,
          role,
          x,
          y,
          activeContext,
          entryTimestamp,
          LIVE_RECORD_LINE_LENGTH_BARS + index * 6
        );
        if (targetHit) hits.push(targetHit);
      });
    const result = liveSet.result || {};
    if (result.exitTimestamp && result.exitPrice !== null && result.exitPrice !== undefined) {
      const resultHit = hitHorizontalLine(liveSet, {
        timestamp: result.exitTimestamp,
        price: result.exitPrice,
      }, 'result', x, y, activeContext, result.exitTimestamp, 10);
      if (resultHit) hits.push(resultHit);
    }
  });
  hits.sort((a, b) => a.distance - b.distance);
  return {
    hits,
    primaryHit: hits[0] || null,
  };
}
