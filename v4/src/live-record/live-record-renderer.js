import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as store from '../data/bar-store.js';
import { BarMarkerPrimitive, LiquidityPrimitive, RangePrimitive } from '../chart/primitives.js';
import { getChartLabelFont } from '../display/display-preferences.js';
import { getActiveLiveRecordId } from './live-record-active.js';
import { getSelectedLiveRecordElement } from './live-record-selection.js';
import { LIVE_RECORD_DIRECTIONS } from './live-record-types.js';
import { getLiveRecordSets } from './live-record-set.js';
import {
  LIVE_RECORD_LINE_LENGTH_BARS,
  LIVE_RECORD_ZONE_WIDTH_BARS,
  getLiveRecordDisplayBarIndexForTimestamp,
  getLiveRecordElementLineLength,
  getLiveRecordProjectedChartTime,
  mapTimestampToLiveRecordChartTime,
} from './live-record-projection.js';

const ACTIVE_ANCHOR_COLOR = '#ffd54f';
const LONG_ENTRY_COLOR = '#26a69a';
const SHORT_ENTRY_COLOR = '#ef5350';
const MSS_COLOR = '#b0bec5';
const STOP_COLOR = '#64b5f6';
const TARGET_COLOR = '#ba68c8';
const RESULT_COLOR = '#90caf9';
const SELECTED_ELEMENT_COLOR = '#ffd54f';
const PLAN_LINE_WIDTH = 1;
const ACTIVE_PLAN_LINE_WIDTH = 1.35;
const SELECTED_PLAN_LINE_WIDTH = 1.85;
const EXECUTION_TICK_HEIGHT = 13;
const RISK_ZONE = {
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
  return mapTimestampToLiveRecordChartTime(timestamp, getRenderContext());
}

function hasRenderableChart() {
  return Boolean(chart.getChart() && chart.getSeries() && store.getDisplayBars().length);
}

function getLineLabelDirection(direction) {
  return direction === LIVE_RECORD_DIRECTIONS.SHORT ? 'Short' : 'Long';
}

function getEntryLineColor(direction) {
  return direction === LIVE_RECORD_DIRECTIONS.SHORT ? SHORT_ENTRY_COLOR : LONG_ENTRY_COLOR;
}

function isElementVisible(liveSet, role, element = {}) {
  return liveSet?.display?.elementVisibility?.[role] !== false && element.visible !== false;
}

function getAnchorMarkerPrice(anchor = {}, direction = '') {
  const barIndex = getLiveRecordDisplayBarIndexForTimestamp(anchor.timestamp, getRenderContext());
  const bar = barIndex >= 0 ? store.getDisplayBars()[barIndex] : null;
  const markerPrice = Number(direction === LIVE_RECORD_DIRECTIONS.SHORT ? bar?.high : bar?.low);
  const fallbackPrice = Number(anchor.price);
  return Number.isFinite(markerPrice) ? markerPrice : fallbackPrice;
}

function renderAnchorMarker(anchor = {}, direction = '', isActive = false) {
  const time = mapTimestampToCurrentChartTime(anchor.timestamp);
  const price = getAnchorMarkerPrice(anchor, direction);
  if (time === null || !Number.isFinite(price)) return;
  const isShort = direction === LIVE_RECORD_DIRECTIONS.SHORT;
  const color = isActive ? ACTIVE_ANCHOR_COLOR : getEntryLineColor(direction);
  attachPrimitive(
    new BarMarkerPrimitive(
      chart.getChart(),
      chart.getSeries(),
      time,
      price,
      {
        color,
        textColor: color,
        direction: isShort ? 'down' : 'up',
        label: 'Live',
        position: isShort ? 'above' : 'below',
        size: isActive ? 7 : 6,
        offset: isActive ? 26 : 22,
        labelFont: getChartLabelFont(11),
        showLabel: true,
      }
    )
  );
}

function renderPlanLine(
  timestamp,
  price,
  label,
  color,
  position = 'above',
  lineLength = LIVE_RECORD_LINE_LENGTH_BARS,
  lineWidth = PLAN_LINE_WIDTH,
  lineStyle = 'solid',
  endTimestamp = null
) {
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
        labelFont: getChartLabelFont(11, 'sans-serif', 'italic'),
        labelPadding: 5,
        lineStyle,
        endTime,
        showStartTick: true,
        tickHeight: EXECUTION_TICK_HEIGHT,
        tickColor: color,
        showLabel: true,
      }
    )
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
        showStartTick: true,
        tickHeight: EXECUTION_TICK_HEIGHT + 2,
        tickLineWidth: 1.75,
        tickColor: color,
        labelFont: getChartLabelFont(11),
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
    : getLiveRecordProjectedChartTime(timestamp, getRenderContext(), LIVE_RECORD_ZONE_WIDTH_BARS);
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

function getRewardTargetFromResult(result = {}) {
  const isProfit = result.exitType === 'profit' || result.status === 'win';
  if (!isProfit || !Number.isFinite(Number(result.exitPrice))) return null;
  return {
    price: result.exitPrice,
    endTimestamp: result.exitTimestamp,
  };
}

function renderRiskRewardBox(liveSet, entry, stopLoss, targets, result = {}) {
  if (liveSet.display?.showRiskRewardBox === false) return;
  if (!entry.complete) return;

  const entryTimestamp = entry.timestamp || liveSet.anchor?.timestamp || liveSet.primaryTimestamp;
  const visibleTargets = (Array.isArray(targets) ? targets : [])
    .filter((target) => isElementVisible(liveSet, target.role || target.id, target) && target.complete);
  const rewardTarget = visibleTargets.find((target) => Number.isFinite(Number(target.price)))
    || getRewardTargetFromResult(result);
  const endTimestamp = getZoneEndTimestamp(entry, stopLoss, rewardTarget);

  if (stopLoss.complete && Number.isFinite(Number(stopLoss.price))) {
    renderRangeZone(entryTimestamp, endTimestamp, entry.price, stopLoss.price, 'Risk', RISK_ZONE);
  }
  if (rewardTarget) {
    renderRangeZone(entryTimestamp, rewardTarget.endTimestamp || endTimestamp, entry.price, rewardTarget.price, 'Reward', REWARD_ZONE);
  }
}

function renderLiveRecordSet(liveSet, isActive = false) {
  if (liveSet.display?.hidden) return;
  const execution = liveSet.execution || {};
  const entry = execution.entry || {};
  const marketStructureShift = execution.marketStructureShift || {};
  const stopLoss = execution.stopLoss || {};
  const targets = Array.isArray(execution.targets) ? execution.targets : [];
  const result = liveSet.result || {};
  const anchor = liveSet.anchor || {};
  const direction = liveSet.direction;
  const entryTimestamp = entry.timestamp || anchor.timestamp;
  const lineWidth = isActive ? ACTIVE_PLAN_LINE_WIDTH : PLAN_LINE_WIDTH;
  const entryColor = getEntryLineColor(direction);
  const targetPosition = direction === LIVE_RECORD_DIRECTIONS.SHORT ? 'below' : 'above';
  const selected = getSelectedLiveRecordElement();
  const isSelectedElement = (role) => selected?.liveRecordId === liveSet.id && selected?.element === role;

  renderAnchorMarker(anchor, direction, isActive);

  if (isElementVisible(liveSet, 'entry', entry)) {
    renderRiskRewardBox(liveSet, entry, stopLoss, targets, result);
  }

  if (isElementVisible(liveSet, 'entry', entry) && entry.complete) {
    const selectedEntry = isSelectedElement('entry');
    renderPlanLine(
      entryTimestamp,
      entry.price,
      `${getLineLabelDirection(direction)} Entry`,
      selectedEntry ? SELECTED_ELEMENT_COLOR : entryColor,
      targetPosition,
      getLiveRecordElementLineLength(entry),
      selectedEntry ? SELECTED_PLAN_LINE_WIDTH : lineWidth,
      selectedEntry ? 'dashed' : 'solid',
      entry.endTimestamp
    );
  }

  if (isElementVisible(liveSet, 'marketStructureShift', marketStructureShift) && marketStructureShift.complete) {
    const selectedMss = isSelectedElement('marketStructureShift');
    renderPlanLine(
      marketStructureShift.timestamp || entryTimestamp,
      marketStructureShift.price,
      'Live MSS',
      selectedMss ? SELECTED_ELEMENT_COLOR : MSS_COLOR,
      'above',
      getLiveRecordElementLineLength(marketStructureShift, LIVE_RECORD_LINE_LENGTH_BARS + 4),
      selectedMss ? SELECTED_PLAN_LINE_WIDTH : lineWidth,
      selectedMss ? 'dashed' : 'solid',
      marketStructureShift.endTimestamp
    );
  }

  if (isElementVisible(liveSet, 'stopLoss', stopLoss) && stopLoss.complete) {
    const selectedStop = isSelectedElement('stopLoss');
    renderPlanLine(
      stopLoss.timestamp || entryTimestamp,
      stopLoss.price,
      'Stop-loss',
      selectedStop ? SELECTED_ELEMENT_COLOR : STOP_COLOR,
      direction === LIVE_RECORD_DIRECTIONS.SHORT ? 'above' : 'below',
      getLiveRecordElementLineLength(stopLoss, LIVE_RECORD_LINE_LENGTH_BARS + 6),
      selectedStop ? SELECTED_PLAN_LINE_WIDTH : lineWidth,
      selectedStop ? 'dashed' : 'solid',
      stopLoss.endTimestamp
    );
  }

  targets
    .filter((target) => isElementVisible(liveSet, target.role || target.id, target) && target.complete)
    .forEach((target, index) => {
      const selectedTarget = isSelectedElement(target.role || target.id);
      renderPlanLine(
        target.timestamp || entryTimestamp,
        target.price,
        target.label || 'Live Target',
        selectedTarget ? SELECTED_ELEMENT_COLOR : TARGET_COLOR,
        targetPosition,
        getLiveRecordElementLineLength(target, LIVE_RECORD_LINE_LENGTH_BARS + index * 6),
        selectedTarget ? SELECTED_PLAN_LINE_WIDTH : lineWidth,
        selectedTarget ? 'dashed' : 'solid',
        target.endTimestamp
      );
    });

  if (result.exitTimestamp && Number.isFinite(Number(result.exitPrice))) {
    renderPriceHelper(result.exitTimestamp, result.exitPrice, 'Exit', RESULT_COLOR, 'right');
  }
}

export function renderLiveRecords() {
  clearRenderedPrimitives();
  if (!hasRenderableChart()) return;

  const activeId = getActiveLiveRecordId();
  getLiveRecordSets().forEach((liveSet) => renderLiveRecordSet(liveSet, liveSet.id === activeId));
}

export function initLiveRecordRenderer() {
  bus.on('live-record:changed', renderLiveRecords);
  bus.on('live-record-active:changed', renderLiveRecords);
  bus.on('live-record-element:selected', renderLiveRecords);
  bus.on('live-record-element:selection-cleared', renderLiveRecords);
  bus.on('bars:loaded', renderLiveRecords);
  bus.on('display-preferences:changed', renderLiveRecords);
  bus.on('primary-instrument:changed', renderLiveRecords);
  bus.on('bars:cleared', clearRenderedPrimitives);
}
