// K 线数据存储 — 管理加载的 K 线数据，发布事件

import * as bus from '../event-bus.js';
import { DEFAULT_TIMEFRAME } from '../config.js';

let bars = [];
let currentStart = null;
let currentEnd = null;
let currentTimeframe = DEFAULT_TIMEFRAME;
let requestedRange = null;

export function setBars(newBars, start, end, tf, range = null) {
  bars = newBars;
  currentStart = start;
  currentEnd = end;
  currentTimeframe = tf;
  requestedRange = range;
  bus.emit('bars:loaded', { bars, start, end, tf, requestedRange: range });
}

export function getBars() {
  return bars;
}

export function getRequestedRange() {
  return requestedRange;
}

// 只返回用户请求时间范围内的 bar（不含 padding），用于图表显示
// getBars() 返回全量数据（含 padding），供指标计算用
export function getDisplayBars() {
  if (!requestedRange || bars.length === 0) return bars;
  const { startTs, endTs } = requestedRange;
  return bars.filter((b) => b.timestamp >= startTs && b.timestamp <= endTs);
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
  currentStart = null;
  currentEnd = null;
  currentTimeframe = DEFAULT_TIMEFRAME;
  bus.emit('bars:cleared');
}
