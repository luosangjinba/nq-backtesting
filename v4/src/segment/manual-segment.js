// Manual 1H market segment creation workflow.

import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { timeframeToString } from '../config.js';
import { addSegment, clearSegments } from './segment-store.js';

const SEGMENT_TIMEFRAME = 60;

let segmentSelectionState = null;

function getBarChartTime(bar) {
  return store.getCurrentTimeframe() === 1440 ? bar.tradingDay : bar.timestamp;
}

function normalizeSwingKind(kind) {
  return kind === 'swing-high' ? 'swing-high' : 'swing-low';
}

function getSwingKindLabel(kind) {
  return normalizeSwingKind(kind) === 'swing-high' ? 'High' : 'Low';
}

function getPointPrice(bar, kind) {
  if (!bar) return null;
  return normalizeSwingKind(kind) === 'swing-low' ? bar.low : bar.high;
}

function getDirection(startPrice, endPrice) {
  if (endPrice > startPrice) return 'up';
  if (endPrice < startPrice) return 'down';
  return 'flat';
}

function ensureOneHourContext() {
  const timeframe = store.getCurrentTimeframe();
  if (timeframe === SEGMENT_TIMEFRAME) return true;
  bus.emit('status:update', {
    text: `1H 行情段只能在 1H 图表创建，当前是 ${timeframeToString(timeframe)}`,
    isError: true,
  });
  return false;
}

export function getSegmentSelectionSummary() {
  if (!segmentSelectionState) return null;
  return {
    label: '1H Segment',
    startTime: segmentSelectionState.startBar?.tradingDay || segmentSelectionState.startBar?.time,
    startKind: segmentSelectionState.startKind,
    startKindLabel: getSwingKindLabel(segmentSelectionState.startKind),
  };
}

export function startSegment(bar, startKind = 'swing-low') {
  if (!bar || !ensureOneHourContext()) return;

  const normalizedStartKind = normalizeSwingKind(startKind);
  const startPrice = getPointPrice(bar, normalizedStartKind);
  if (!Number.isFinite(Number(startPrice))) {
    bus.emit('status:update', { text: '1H 行情段起点无效：无法读取 High/Low', isError: true });
    return;
  }

  segmentSelectionState = {
    startBar: bar,
    startKind: normalizedStartKind,
  };

  bus.emit('status:update', {
    text: `1H 行情段起点已选择：${bar.tradingDay || bar.time} ${getSwingKindLabel(normalizedStartKind)} ${Number(startPrice).toFixed(2)}，右键选择终点`,
    isError: false,
  });
}

export function finishSegment(endBar, endKind = 'swing-high') {
  if (!segmentSelectionState || !endBar || !ensureOneHourContext()) return;

  const startBar = segmentSelectionState.startBar;
  if (startBar.timestamp === endBar.timestamp) {
    bus.emit('status:update', { text: '行情段起点和终点不能是同一根 K 线', isError: true });
    return;
  }

  const startKind = normalizeSwingKind(segmentSelectionState.startKind);
  const normalizedEndKind = normalizeSwingKind(endKind);
  const startPrice = getPointPrice(startBar, startKind);
  const endPrice = getPointPrice(endBar, normalizedEndKind);
  if (!Number.isFinite(Number(startPrice)) || !Number.isFinite(Number(endPrice))) {
    bus.emit('status:update', { text: '1H 行情段终点无效：无法读取 High/Low', isError: true });
    return;
  }

  const direction = getDirection(startPrice, endPrice);
  const segment = {
    id: `manual_segment_1h_${startBar.timestamp}_${endBar.timestamp}_${Date.now()}`,
    instrument: 'NQ',
    timeframe: '1H',
    source: 'manual',
    direction,
    start: {
      time: getBarChartTime(startBar),
      timestamp: startBar.timestamp,
      price: startPrice,
      kind: startKind,
      barTime: startBar.time,
    },
    end: {
      time: getBarChartTime(endBar),
      timestamp: endBar.timestamp,
      price: endPrice,
      kind: normalizedEndKind,
      barTime: endBar.time,
    },
    pdaResponses: [],
    narrative: '',
    tags: [],
    display: {
      showLabel: false,
    },
  };

  addSegment(segment);
  segmentSelectionState = null;

  bus.emit('status:update', {
    text: `1H ${direction.toUpperCase()} 行情段：${getSwingKindLabel(startKind)} ${Number(startPrice).toFixed(2)} → ${getSwingKindLabel(normalizedEndKind)} ${Number(endPrice).toFixed(2)}`,
    isError: false,
  });
}

export function cancelSegmentSelection({ silent = false } = {}) {
  if (!segmentSelectionState) return;
  segmentSelectionState = null;
  if (!silent) {
    bus.emit('status:update', { text: '1H 行情段选择已取消', isError: false });
  }
}

export function clearManualSegments() {
  clearSegments();
  cancelSegmentSelection({ silent: true });
  bus.emit('status:update', { text: '1H 行情段已清除', isError: false });
}

export function initManualSegment() {
  bus.on('bars:loaded', () => cancelSegmentSelection({ silent: true }));
  bus.on('bars:cleared', () => cancelSegmentSelection({ silent: true }));
}
