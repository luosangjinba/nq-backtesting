// Render Setup Set order elements without full-height chart blockers.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { BarMarkerPrimitive, LiquidityPrimitive, RangePrimitive } from '../chart/primitives.js';
import { getBucketStart } from '../pda/pda-context.js';
import { ORDER_DIRECTIONS } from './order-review-store.js';
import { getActiveReviewSetId } from './order-review-active.js';
import { getSetupSets } from './setup-set.js';

const SETUP_COLOR = '#ffb74d';
const ENTRY_TEXT_COLOR = '#80cbc4';
const STOP_COLOR = '#ff4d6d';
const TARGET_COLORS = ['#3d7eff', '#4d8bff', '#7ea8ff', '#ab47bc'];
const ACTIVE_ENTRY_COLOR = '#b2dfdb';
const ACTIVE_TARGET_COLORS = ['#6fa0ff', '#82adff', '#a5c2ff', '#ce93d8'];
const REVERSAL_BULLISH_COLOR = '#26a69a';
const REVERSAL_BEARISH_COLOR = '#ef5350';
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

function renderReversalMarker(reversal, direction, isActive = false) {
  const time = mapTimestampToCurrentChartTime(reversal?.timestamp);
  if (time === null) return;

  const isBearish = direction === ORDER_DIRECTIONS.SHORT;
  const position = isBearish ? 'above' : 'below';
  const markerColor = isBearish ? REVERSAL_BEARISH_COLOR : REVERSAL_BULLISH_COLOR;
  const barIndex = getDisplayBarIndexForTimestamp(reversal?.timestamp);
  const bar = barIndex >= 0 ? store.getDisplayBars()[barIndex] : null;
  const markerPrice = Number(isBearish ? bar?.high : bar?.low);
  const fallbackPrice = Number(reversal?.price);
  const anchorPrice = Number.isFinite(markerPrice) ? markerPrice : fallbackPrice;
  if (!Number.isFinite(anchorPrice)) return;

  attachPrimitive(
    new BarMarkerPrimitive(
      chart.getChart(),
      chart.getSeries(),
      time,
      anchorPrice,
      {
        color: markerColor,
        textColor: markerColor,
        direction: isBearish ? 'down' : 'up',
        label: 'Reversal',
        position,
        size: isActive ? 7 : 6,
        offset: isActive ? 24 : 22,
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

function renderPlanLine(timestamp, price, label, color, position = 'above', lineLength = PLAN_LINE_LENGTH_BARS, lineWidth = 2) {
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
        lineWidth,
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

function addTarget(targets, target, label) {
  const price = target?.price;
  const parsed = Number(price);
  if (!Number.isFinite(parsed)) return;
  const duplicate = targets.some((target) => Math.abs(Number(target.price) - parsed) < 0.00001);
  if (!duplicate) targets.push({ ...target, price: parsed, label });
}

function getTargetLines(targetElements = []) {
  const targets = [];
  targetElements.forEach((target) => {
    const label = target.role === 'finalTarget'
      ? (targets.length ? 'Final Target' : 'Target')
      : target.role.replace(/^target/, 'Target');
    addTarget(targets, target, label);
  });
  return targets;
}

function getLineLabelDirection(direction) {
  return direction === ORDER_DIRECTIONS.SHORT ? 'Short' : 'Long';
}

function renderSetupSet(setupSet, isActive = false) {
  if (setupSet.display?.hidden) return;

  const elements = setupSet.orderElements || {};
  const reversal = elements.reversal || {};
  const entry = elements.entry || {};
  const stopLoss = elements.stopLoss || {};
  const result = elements.result || {};
  const entryTimestamp = entry.timestamp || reversal.timestamp;
  const direction = entry.direction || setupSet.direction;
  const lineWidth = isActive ? 3 : 2;
  const entryColor = isActive ? ACTIVE_ENTRY_COLOR : ENTRY_TEXT_COLOR;
  const targetColors = isActive ? ACTIVE_TARGET_COLORS : TARGET_COLORS;

  renderReversalMarker(reversal, direction, isActive);

  if (Number.isFinite(Number(entry.price))) {
    renderPlanLine(
      entryTimestamp,
      entry.price,
      `${getLineLabelDirection(direction)} Entry`,
      entryColor,
      direction === ORDER_DIRECTIONS.SHORT ? 'below' : 'above',
      PLAN_LINE_LENGTH_BARS,
      lineWidth
    );
  }

  renderRiskZone(entryTimestamp, entry.price, stopLoss.price, direction);

  renderPlanLine(
    stopLoss.timestamp || entryTimestamp,
    stopLoss.price,
    'Stop-loss',
    STOP_COLOR,
    direction === ORDER_DIRECTIONS.SHORT ? 'above' : 'below',
    PLAN_LINE_LENGTH_BARS + 6,
    lineWidth
  );

  getTargetLines(elements.targets).forEach((target, index) => {
    renderPlanLine(
      target.timestamp || entryTimestamp,
      target.price,
      target.label,
      targetColors[index % targetColors.length],
      direction === ORDER_DIRECTIONS.SHORT ? 'below' : 'above',
      PLAN_LINE_LENGTH_BARS + index * 6,
      lineWidth
    );
  });

  if (Number.isFinite(Number(result.price))) {
    renderPriceHelper(result.timestamp || entryTimestamp, result.price, 'Exit', '#90caf9', 'right');
  }
}

export function renderOrderReviews() {
  clearRenderedPrimitives();
  if (!hasRenderableChart()) return;

  const activeId = getActiveReviewSetId();
  getSetupSets().forEach((setupSet) => renderSetupSet(setupSet, setupSet.id === activeId));
}

export function initOrderReviewRenderer() {
  bus.on('order-review:changed', renderOrderReviews);
  bus.on('order-review-active:changed', renderOrderReviews);
  bus.on('bars:loaded', renderOrderReviews);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
