// K 线数据存储 — 管理加载的 K 线数据，发布事件

import * as bus from '../event-bus.js';

let bars = [];
let currentStart = null;
let currentEnd = null;
let currentTimeframe = 1;

export function setBars(newBars, start, end, tf) {
  bars = newBars;
  currentStart = start;
  currentEnd = end;
  currentTimeframe = tf;
  bus.emit('bars:loaded', { bars, start, end, tf });
}

export function getBars() {
  return bars;
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
  currentTimeframe = 1;
  bus.emit('bars:cleared');
}