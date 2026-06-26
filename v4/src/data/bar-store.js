// K 线数据存储 — 管理加载的 K 线数据，发布事件

import * as bus from '../event-bus.js';
import { DEFAULT_TIMEFRAME } from '../config.js';
import { getPrimaryInstrument } from './primary-instrument-store.js';

let bars = [];
let currentStart = null;
let currentEnd = null;
let currentTimeframe = DEFAULT_TIMEFRAME;
let requestedRange = null;
let requestedOuterRange = null;
let displayBars = [];

function deriveDisplayBars(sourceBars, range) {
  if (!range || sourceBars.length === 0) return sourceBars;
  const { startTs, endTs } = range;
  return sourceBars.filter((bar) => bar.timestamp >= startTs && bar.timestamp <= endTs);
}

function mergeBarsByTimestamp(leftBars = [], rightBars = []) {
  const byTimestamp = new Map();
  for (const bar of [...leftBars, ...rightBars]) {
    const timestamp = Number(bar?.timestamp);
    if (!Number.isFinite(timestamp)) continue;
    byTimestamp.set(timestamp, { ...bar });
  }
  return [...byTimestamp.values()].sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
}

export function setBars(newBars, start, end, tf, range = null, options = {}) {
  const instrument = options.instrument || getPrimaryInstrument();
  bars = newBars;
  currentStart = start;
  currentEnd = end;
  currentTimeframe = tf;
  requestedRange = range;
  requestedOuterRange = options.outerRange || null;
  displayBars = deriveDisplayBars(bars, requestedRange);
  bus.emit('bars:loaded', {
    bars,
    start,
    end,
    tf,
    requestedRange: range,
    requestedOuterRange,
    instrument,
    isWindowedRange: Boolean(requestedOuterRange),
  });
}

export function prependBarsToCurrentRange(prefixBars = [], start = currentStart, options = {}) {
  const instrument = options.instrument || getPrimaryInstrument();
  const previousCount = bars.length;
  const mergedBars = mergeBarsByTimestamp(prefixBars, bars);
  setBars(mergedBars, start, currentEnd, currentTimeframe, requestedRange, {
    outerRange: requestedOuterRange,
    instrument,
  });
  return {
    bars: mergedBars,
    addedBars: Math.max(0, mergedBars.length - previousCount),
    start,
    end: currentEnd,
  };
}

export function getBars() {
  return bars;
}

export function getRequestedRange() {
  return requestedRange;
}

export function getRequestedOuterRange() {
  return requestedOuterRange;
}

// 只返回用户请求时间范围内的 bar（不含 padding），用于图表显示
// getBars() 返回全量数据（含 padding），供指标计算用
export function getDisplayBars() {
  return displayBars;
}

export function getBarAtTime(time) {
  return bars.find((b) => b.time === time) || null;
}

export function getBarAtIndex(index) {
  return bars[index] || null;
}

export function getBarCount() {
  return bars.length;
}

export function getCurrentRange() {
  return { start: currentStart, end: currentEnd };
}

export function getCurrentTimeframe() {
  return currentTimeframe;
}

export function getBarsUpTo(index) {
  return bars.slice(0, index + 1);
}

export function clearBars() {
  bars = [];
  displayBars = [];
  currentStart = null;
  currentEnd = null;
  currentTimeframe = DEFAULT_TIMEFRAME;
  requestedRange = null;
  requestedOuterRange = null;
  bus.emit('bars:cleared');
}
