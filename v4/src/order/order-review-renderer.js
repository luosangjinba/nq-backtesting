// Render Order Review setup/entry/risk/target helpers without full-height chart blockers.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { LiquidityPrimitive, RangePrimitive } from '../chart/primitives.js';
import { getBucketStart } from '../pda/pda-context.js';
import { getOrderReviews, ORDER_DIRECTIONS } from './order-review-store.js';

const SETUP_COLOR = '#ffb74d';
const ENTRY_TEXT_COLOR = '#80cbc4';
const STOP_COLOR = '#ff4d6d';
const TARGET_COLORS = ['#3d7eff', '#4d8bff', '#7ea8ff', '#ab47bc'];
const RISK_ZONE_LONG = {
  fillColor: 'rgba(38, 166, 154, 0.13)',
  borderColor: 'rgba(38, 166, 154, 0.35)',
  textColor: '#80cbc4',
};
const RISK_ZONE_SHORT = {
  fillColor: 'rgba(239, 83, 80, 0.13)',
  borderColor: 'rgba(239, 83, 80, 0.35)',
  textColor: '#ffcdd2',
};
const PLAN_LINE_LENGTH_BARS = 38;
const PLAN_ZONE_WIDTH_BARS = 28;

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

function getDisplayBarIndexForTimestamp(timestamp) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) return -1;
  const timeframe = store.getCurrentTimeframe();
  const bucketStart = getBucketStart(parsed, timeframe);
  return store.getDisplayBars().findIndex((bar) => {
    if (timeframe === 1440) return Number(bar.timestamp) === parsed || Number(bar.timestamp) === bucketStart;
    return Number(bar.timestamp) === bucketStart;
  });
}

function getProjectedChartTime(timestamp, barsAhead = PLAN_ZONE_WIDTH_BARS) {
  const bars = store.getDisplayBars();
  if (!bars.length) return mapTimestampToCurrentChartTime(timestamp);
  const index = getDisplayBarIndexForTimestamp(timestamp);
  if (index < 0) return mapTimestampToCurrentChartTime(timestamp);
  const next = bars[Math.min(bars.length - 1, index + barsAhead)];
  return next ? mapTimestampToCurrentChartTime(next.timestamp) : mapTimestampToCurrentChartTime(timestamp);
}

function renderPlanLine(timestamp, price, label, color, position = 'above', lineLength = PLAN_LINE_LENGTH_BARS) {
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
        lineLength,
        lineWidth: 2,
        labelFont: 'italic 11px sans-serif',
        labelPadding: 5,
        showLabel: true,
      }
    )
  );
}

function renderRiskZone(timestamp, entryPrice, stopLoss, direction) {
  const startTime = mapTimestampToCurrentChartTime(timestamp);
  const endTime = getProjectedChartTime(timestamp);
  const parsedEntry = Number(entryPrice);
  const parsedStop = Number(stopLoss);
  if (startTime === null || endTime === null || !Number.isFinite(parsedEntry) || !Number.isFinite(parsedStop)) return;

  const topPrice = Math.max(parsedEntry, parsedStop);
  const bottomPrice = Math.min(parsedEntry, parsedStop);
  const colors = direction === ORDER_DIRECTIONS.SHORT ? RISK_ZONE_SHORT : RISK_ZONE_LONG;

  attachPrimitive(
    new RangePrimitive(
      chart.getChart(),
      chart.getSeries(),
      startTime,
      endTime,
      topPrice,
      bottomPrice,
      'Risk',
      {
        ...colors,
        showMidline: false,
        showLabel: false,
        lineWidth: 1,
        minWidth: 24,
      }
    )
  );
}

function addTarget(targets, price, label) {
  const parsed = Number(price);
  if (!Number.isFinite(parsed)) return;
  const duplicate = targets.some((target) => Math.abs(Number(target.price) - parsed) < 0.00001);
  if (!duplicate) targets.push({ price: parsed, label });
}

function getTargetLines(entry = {}) {
  const targets = [];
  addTarget(targets, entry.targetInternal, 'Target1');
  addTarget(targets, entry.targetSwing, 'Target2');
  addTarget(targets, entry.targetExternal, 'Target3');
  addTarget(targets, entry.finalTarget, targets.length ? 'Final Target' : 'Target');
  return targets;
}

function getLineLabelDirection(order) {
  return order.entryPlan?.direction === ORDER_DIRECTIONS.SHORT ? 'Short' : 'Long';
}

export function renderOrderReviews() {
  clearRenderedPrimitives();
  if (!hasRenderableChart()) return;

  getOrderReviews().forEach((order) => {
    const setup = order.setupThesis || {};
    const entry = order.entryPlan || {};
    const result = order.resultReview || {};
    const entryTimestamp = entry.entryTimestamp || setup.primaryEventTimestamp;
    const direction = entry.direction;
    const entryPrice = Number(entry.entryPrice);
    const setupPrice = Number(setup.primaryEventPrice);

    if (Number.isFinite(setupPrice) && setup.primaryEventTimestamp !== entryTimestamp) {
      renderPriceHelper(setup.primaryEventTimestamp, setupPrice, 'Setup Event', SETUP_COLOR, 'above');
    }

    if (Number.isFinite(entryPrice)) {
      renderPlanLine(
        entryTimestamp,
        entryPrice,
        `${getLineLabelDirection(order)} Entry`,
        ENTRY_TEXT_COLOR,
        direction === ORDER_DIRECTIONS.SHORT ? 'below' : 'above'
      );
    }

    renderRiskZone(entryTimestamp, entry.entryPrice, entry.stopLoss, direction);

    renderPlanLine(
      entryTimestamp,
      entry.stopLoss,
      'Stop-loss',
      STOP_COLOR,
      direction === ORDER_DIRECTIONS.SHORT ? 'above' : 'below',
      PLAN_LINE_LENGTH_BARS + 6
    );

    getTargetLines(entry).forEach((target, index) => {
      renderPlanLine(
        entryTimestamp,
        target.price,
        target.label,
        TARGET_COLORS[index % TARGET_COLORS.length],
        direction === ORDER_DIRECTIONS.SHORT ? 'below' : 'above',
        PLAN_LINE_LENGTH_BARS + index * 6
      );
    });

    if (Number.isFinite(Number(result.exitPrice))) {
      renderPriceHelper(result.exitTimestamp || entryTimestamp, result.exitPrice, 'Exit', '#90caf9', 'right');
    }
  });
}

export function initOrderReviewRenderer() {
  bus.on('order-review:changed', renderOrderReviews);
  bus.on('bars:loaded', renderOrderReviews);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
