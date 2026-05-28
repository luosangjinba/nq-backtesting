// Render Order Review setup/entry/exit markers and basic risk/target helper lines.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { LiquidityPrimitive, VerticalLinePrimitive } from '../chart/primitives.js';
import { getBucketStart } from '../pda/pda-context.js';
import { getOrderReviews, ORDER_DIRECTIONS } from './order-review-store.js';

const SETUP_COLOR = '#ffb74d';
const ENTRY_COLOR = '#26a69a';
const EXIT_COLOR = '#90caf9';
const STOP_COLOR = '#ef5350';
const TARGET_COLOR = '#ab47bc';

let renderedPrimitives = [];

function clearRenderedPrimitives() {
  renderedPrimitives = chart.clearPrimitives(renderedPrimitives) || [];
}

function attachPrimitive(primitive) {
  if (!primitive) return;
  chart.attachPrimitive(primitive);
  primitive.requestUpdate?.();
  renderedPrimitives.push(primitive);
}

function mapTimestampToCurrentChartTime(timestamp) {
  if (timestamp === undefined || timestamp === null) return null;
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return null;

  const timeframe = store.getCurrentTimeframe();
  const bucketStart = getBucketStart(parsed, timeframe);
  if (timeframe === 1440) {
    const exactBar = store.getDisplayBars().find((bar) => Number(bar.timestamp) === parsed);
    if (exactBar?.tradingDay) return exactBar.tradingDay;
    const date = new Date((bucketStart + 24 * 60 * 60) * 1000);
    return date.toISOString().slice(0, 10);
  }
  return bucketStart;
}

function hasRenderableChart() {
  return Boolean(chart.getChart() && chart.getSeries() && store.getDisplayBars().length);
}

function renderVerticalMarker(timestamp, label, color, lineWidth = 2) {
  const time = mapTimestampToCurrentChartTime(timestamp);
  if (time === null) return;
  attachPrimitive(
    new VerticalLinePrimitive(chart.getChart(), time, {
      color,
      label,
      lineWidth,
    })
  );
}

function renderPriceHelper(timestamp, price, label, color, position = 'right') {
  const time = mapTimestampToCurrentChartTime(timestamp);
  const parsedPrice = Number(price);
  if (time === null || !Number.isFinite(parsedPrice)) return;

  attachPrimitive(
    new LiquidityPrimitive(
      chart.getChart(),
      chart.getSeries(),
      time,
      parsedPrice,
      color,
      color,
      label,
      position,
      {
        lineLength: 10,
        lineWidth: 1,
        labelFont: '11px sans-serif',
        showLabel: true,
      }
    )
  );
}

function getEntryMarkerColor(order) {
  const direction = order.entryPlan?.direction;
  if (direction === ORDER_DIRECTIONS.SHORT) return STOP_COLOR;
  if (direction === ORDER_DIRECTIONS.LONG) return ENTRY_COLOR;
  return '#d1d4dc';
}

function getTargetPrice(entry = {}) {
  if (Number.isFinite(Number(entry.finalTarget))) return entry.finalTarget;
  if (entry.selectedTargetType === 'internal') return entry.targetInternal;
  if (entry.selectedTargetType === 'external') return entry.targetExternal;
  return entry.targetSwing;
}

export function renderOrderReviews() {
  clearRenderedPrimitives();
  if (!hasRenderableChart()) return;

  getOrderReviews().forEach((order) => {
    const setup = order.setupThesis || {};
    const entry = order.entryPlan || {};
    const result = order.resultReview || {};
    const entryTimestamp = entry.entryTimestamp || setup.primaryEventTimestamp;

    renderVerticalMarker(setup.primaryEventTimestamp, 'OR Setup', SETUP_COLOR, 2);
    renderVerticalMarker(entry.entryTimestamp, 'OR Entry', getEntryMarkerColor(order), 3);
    renderVerticalMarker(result.exitTimestamp, 'OR Exit', EXIT_COLOR, 2);

    renderPriceHelper(entryTimestamp, entry.stopLoss, 'OR SL', STOP_COLOR, 'right');
    renderPriceHelper(entryTimestamp, getTargetPrice(entry), 'OR Target', TARGET_COLOR, 'right');
  });
}

export function initOrderReviewRenderer() {
  bus.on('order-review:changed', renderOrderReviews);
  bus.on('bars:loaded', renderOrderReviews);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
