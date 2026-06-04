// Render Setup Set order elements without full-height chart blockers.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { BarMarkerPrimitive, LiquidityPrimitive, RangePrimitive } from '../chart/primitives.js';
import { ORDER_DIRECTIONS } from './order-review-types.js';
import { getActiveReviewSetId } from './order-review-active.js';
import { getSelectedOrderSetupElement } from './order-setup-selection.js';
import { getSetupSets } from './setup-set.js';
import {
  ORDER_SETUP_LINE_LENGTH_BARS,
  ORDER_SETUP_ZONE_WIDTH_BARS,
  getOrderSetupDisplayBarIndexForTimestamp,
  getOrderSetupElementLineLength,
  getOrderSetupProjectedChartTime,
  mapTimestampToOrderSetupChartTime,
} from './order-setup-projection.js';

const SETUP_COLOR = '#ffb74d';
const LONG_ENTRY_COLOR = '#4db6ac';
const SHORT_ENTRY_COLOR = '#ff8a80';
const STOP_COLOR = '#42a5f5';
const TARGET_COLOR = '#ab47bc';
const REVERSAL_BULLISH_COLOR = '#26a69a';
const REVERSAL_BEARISH_COLOR = '#ef5350';
const ACTIVE_REVERSAL_COLOR = '#ffd54f';
const SELECTED_ELEMENT_COLOR = '#ffd54f';
const PLAN_LINE_WIDTH = 1;
const ACTIVE_PLAN_LINE_WIDTH = 1.25;
const SELECTED_PLAN_LINE_WIDTH = 1.75;
const RISK_ZONE_LONG = {
  fillColor: 'rgba(239, 83, 80, 0.15)',
  borderColor: 'rgba(239, 83, 80, 0.38)',
  textColor: '#ffcdd2',
};
const RISK_ZONE_SHORT = {
  fillColor: 'rgba(239, 83, 80, 0.15)',
  borderColor: 'rgba(239, 83, 80, 0.38)',
  textColor: '#ffcdd2',
};
const REWARD_ZONE = {
  fillColor: 'rgba(38, 166, 154, 0.16)',
  borderColor: 'rgba(38, 166, 154, 0.4)',
  textColor: '#80cbc4',
};
let renderedPrimitives = [];

function getRenderContext() {
  return {
    timeframe: store.getCurrentTimeframe(),
    getDisplayBars: store.getDisplayBars,
  };
}

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
  return mapTimestampToOrderSetupChartTime(timestamp, getRenderContext());
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
  const markerColor = isActive
    ? ACTIVE_REVERSAL_COLOR
    : isBearish
      ? REVERSAL_BEARISH_COLOR
      : REVERSAL_BULLISH_COLOR;
  const barIndex = getOrderSetupDisplayBarIndexForTimestamp(reversal?.timestamp, getRenderContext());
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

function renderPlanLine(timestamp, price, label, color, position = 'above', lineLength = ORDER_SETUP_LINE_LENGTH_BARS, lineWidth = 2, lineStyle = 'solid', endTimestamp = null) {
  const time = mapTimestampToCurrentChartTime(timestamp);
  const endTime = mapTimestampToCurrentChartTime(endTimestamp);
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
        lineStyle,
        endTime,
        showLabel: true,
      }
    )
  );
}

function getZoneEndTimestamp(...elements) {
  return elements.find((element) => element?.endTimestamp)?.endTimestamp || null;
}

function renderRangeZone(timestamp, endTimestamp, entryPrice, targetPrice, label, colors) {
  const startTime = mapTimestampToCurrentChartTime(timestamp);
  const endTime = endTimestamp
    ? mapTimestampToCurrentChartTime(endTimestamp)
    : getOrderSetupProjectedChartTime(timestamp, getRenderContext(), ORDER_SETUP_ZONE_WIDTH_BARS);
  const parsedEntry = Number(entryPrice);
  const parsedTarget = Number(targetPrice);
  if (startTime === null || endTime === null || !Number.isFinite(parsedEntry) || !Number.isFinite(parsedTarget)) return;

  const topPrice = Math.max(parsedEntry, parsedTarget);
  const bottomPrice = Math.min(parsedEntry, parsedTarget);

  attachPrimitive(
    new RangePrimitive(
      chart.getChart(),
      chart.getSeries(),
      startTime,
      endTime,
      topPrice,
      bottomPrice,
      label,
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

function renderRiskRewardBox(setupSet, entry, stopLoss, targets, result, direction) {
  if (setupSet.display?.showRiskRewardBox === false) return;
  const entryTimestamp = entry.timestamp || setupSet.primaryTimestamp;
  const endTimestamp = getZoneEndTimestamp(entry, stopLoss, ...targets);
  const riskColors = direction === ORDER_DIRECTIONS.SHORT ? RISK_ZONE_SHORT : RISK_ZONE_LONG;
  renderRangeZone(entryTimestamp, endTimestamp, entry.price, stopLoss.price, 'Risk', riskColors);

  const resultTarget = getResultTarget(targets, result.status);
  if (!resultTarget) return;
  renderRangeZone(entryTimestamp, resultTarget.endTimestamp || endTimestamp, entry.price, resultTarget.price, 'Reward', REWARD_ZONE);
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

function getResultTarget(targetElements = [], resultStatus = '') {
  if (resultStatus !== 'target1' && resultStatus !== 'target2' && resultStatus !== 'target3') return null;
  return targetElements.find((target) => target.role === resultStatus && Number.isFinite(Number(target.price))) || null;
}

function getLineLabelDirection(direction) {
  return direction === ORDER_DIRECTIONS.SHORT ? 'Short' : 'Long';
}

function getEntryLineColor(direction) {
  return direction === ORDER_DIRECTIONS.SHORT ? SHORT_ENTRY_COLOR : LONG_ENTRY_COLOR;
}

function isOrderSetupElementVisible(setupSet, role) {
  return setupSet?.display?.elementVisibility?.[role] !== false;
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
  const lineWidth = isActive ? ACTIVE_PLAN_LINE_WIDTH : PLAN_LINE_WIDTH;
  const entryColor = getEntryLineColor(direction);
  const selected = getSelectedOrderSetupElement();
  const isSelectedElement = (role) => selected?.setupId === setupSet.id && selected?.element === role;

  renderReversalMarker(reversal, direction, isActive);

  if (isOrderSetupElementVisible(setupSet, 'entry') && entry.complete) {
    const selectedEntry = isSelectedElement('entry');
    renderPlanLine(
      entryTimestamp,
      entry.price,
      `${getLineLabelDirection(direction)} Entry`,
      selectedEntry ? SELECTED_ELEMENT_COLOR : entryColor,
      direction === ORDER_DIRECTIONS.SHORT ? 'below' : 'above',
      getOrderSetupElementLineLength(entry, ORDER_SETUP_LINE_LENGTH_BARS),
      selectedEntry ? SELECTED_PLAN_LINE_WIDTH : lineWidth,
      selectedEntry ? 'dashed' : 'solid',
      entry.endTimestamp
    );
  }

  const visibleTargets = (elements.targets || []).filter((target) => isOrderSetupElementVisible(setupSet, target.role));
  const targetLines = getTargetLines(visibleTargets);
  const canRenderRiskRewardBox =
    isOrderSetupElementVisible(setupSet, 'entry') &&
    isOrderSetupElementVisible(setupSet, 'stopLoss') &&
    (result.status !== 'target1' && result.status !== 'target2' && result.status !== 'target3'
      ? true
      : isOrderSetupElementVisible(setupSet, result.status));
  if (canRenderRiskRewardBox) {
    renderRiskRewardBox(setupSet, entry, stopLoss, visibleTargets, result, direction);
  }

  if (isOrderSetupElementVisible(setupSet, 'stopLoss') && stopLoss.complete) {
    const selectedStop = isSelectedElement('stopLoss');
    renderPlanLine(
      stopLoss.timestamp || entryTimestamp,
      stopLoss.price,
      'Stop-loss',
      selectedStop ? SELECTED_ELEMENT_COLOR : STOP_COLOR,
      direction === ORDER_DIRECTIONS.SHORT ? 'above' : 'below',
      getOrderSetupElementLineLength(stopLoss, ORDER_SETUP_LINE_LENGTH_BARS + 6),
      selectedStop ? SELECTED_PLAN_LINE_WIDTH : lineWidth,
      selectedStop ? 'dashed' : 'solid',
      stopLoss.endTimestamp
    );
  }

  targetLines.forEach((target, index) => {
    const selectedTarget = isSelectedElement(target.role);
    renderPlanLine(
      target.timestamp || entryTimestamp,
      target.price,
      target.label,
      selectedTarget ? SELECTED_ELEMENT_COLOR : TARGET_COLOR,
      direction === ORDER_DIRECTIONS.SHORT ? 'below' : 'above',
      getOrderSetupElementLineLength(target, ORDER_SETUP_LINE_LENGTH_BARS + index * 6),
      selectedTarget ? SELECTED_PLAN_LINE_WIDTH : lineWidth,
      selectedTarget ? 'dashed' : 'solid',
      target.endTimestamp
    );
  });

  if (result.timestamp && Number.isFinite(Number(result.price))) {
    renderPriceHelper(result.timestamp, result.price, 'Exit', '#90caf9', 'right');
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
  bus.on('order-setup-element:selected', renderOrderReviews);
  bus.on('order-setup-element:selection-cleared', renderOrderReviews);
  bus.on('bars:loaded', renderOrderReviews);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
