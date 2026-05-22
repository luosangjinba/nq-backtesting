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

function getSwingKindForStart(startBar, endBar) {
  if (!startBar || !endBar) return 'swing-low';
  return Number(endBar.close) >= Number(startBar.close) ? 'swing-low' : 'swing-high';
}

function getSwingKindForEnd(startKind) {
  return startKind === 'swing-low' ? 'swing-high' : 'swing-low';
}

function getPointPrice(bar, kind) {
  if (!bar) return null;
  return kind === 'swing-low' ? bar.low : bar.high;
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
  };
}

export function startSegment(bar) {
  if (!bar || !ensureOneHourContext()) return;

  segmentSelectionState = {
    startBar: bar,
  };

  bus.emit('status:update', {
    text: `1H 行情段起点已选择：${bar.tradingDay || bar.time}，右键选择终点`,
    isError: false,
  });
}

export function finishSegment(endBar) {
  if (!segmentSelectionState || !endBar || !ensureOneHourContext()) return;

  const startBar = segmentSelectionState.startBar;
  if (startBar.timestamp === endBar.timestamp) {
    bus.emit('status:update', { text: '行情段起点和终点不能是同一根 K 线', isError: true });
    return;
  }

  const startKind = getSwingKindForStart(startBar, endBar);
  const endKind = getSwingKindForEnd(startKind);
  const startPrice = getPointPrice(startBar, startKind);
  const endPrice = getPointPrice(endBar, endKind);
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
      kind: endKind,
      barTime: endBar.time,
    },
    pdaResponses: [],
    narrative: '',
    tags: [],
    display: {
      showLabel: true,
    },
  };

  addSegment(segment);
  segmentSelectionState = null;

  bus.emit('status:update', {
    text: `1H ${direction.toUpperCase()} 行情段：${startPrice.toFixed(2)} → ${endPrice.toFixed(2)}`,
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
