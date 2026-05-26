// TradingView-style viewport operations for the active chart.

import * as chart from './chart-manager.js';
import * as store from '../data/bar-store.js';
import { VIEWPORT_RIGHT_OFFSET_BARS } from '../config.js';

const ZOOM_FACTOR = 0.8;
const SCROLL_FACTOR = 0.25;
const LOCATE_PADDING_BARS = 8;

function getRange() {
  return chart.getVisibleLogicalRange();
}

function getDisplayCount() {
  return chart.getActiveDataCount();
}

function hasData() {
  return store.getDisplayBars().length > 0;
}

function applyRange(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return;
  chart.setVisibleLogicalRange(from, to);
}

function getTimestamp(bar) {
  const value = Number(bar?.timestamp);
  return Number.isFinite(value) ? value : null;
}

function findNearestBarIndex(timestamp) {
  const target = Number(timestamp);
  const bars = store.getDisplayBars();
  if (!Number.isFinite(target) || bars.length === 0) return -1;

  let bestIndex = -1;
  let bestDistance = Infinity;
  bars.forEach((bar, index) => {
    const barTs = getTimestamp(bar);
    if (barTs === null) return;
    const distance = Math.abs(barTs - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function zoomIn() {
  const range = getRange();
  if (!range) return;

  const center = (range.from + range.to) / 2;
  const width = (range.to - range.from) * ZOOM_FACTOR;
  applyRange(center - width / 2, center + width / 2);
}

export function zoomOut() {
  const range = getRange();
  if (!range) return;

  const center = (range.from + range.to) / 2;
  const width = (range.to - range.from) / ZOOM_FACTOR;
  applyRange(center - width / 2, center + width / 2);
}

export function scrollLeft() {
  const range = getRange();
  if (!range) return;

  const width = range.to - range.from;
  const step = width * SCROLL_FACTOR;
  applyRange(range.from - step, range.to - step);
}

export function scrollRight() {
  const range = getRange();
  if (!range) return;

  const width = range.to - range.from;
  const step = width * SCROLL_FACTOR;
  applyRange(range.from + step, range.to + step);
}

export function scrollToLatest() {
  const range = getRange();
  const dataCount = getDisplayCount();
  if (!range || dataCount <= 0) return;

  const width = range.to - range.from;
  const to = dataCount + VIEWPORT_RIGHT_OFFSET_BARS;
  applyRange(to - width, to);
  chart.resetPriceScale();
}

export function resetChartView() {
  scrollToLatest();
}

export function locateTimestampRange(startTimestamp, endTimestamp) {
  const bars = store.getDisplayBars();
  if (bars.length === 0) return;

  const leftIndex = findNearestBarIndex(startTimestamp);
  const rightIndex = findNearestBarIndex(endTimestamp);
  if (leftIndex < 0 || rightIndex < 0) return;

  const minIndex = Math.min(leftIndex, rightIndex);
  const maxIndex = Math.max(leftIndex, rightIndex);
  const range = getRange();
  const currentWidth = range && Number.isFinite(range.to - range.from) ? range.to - range.from : 0;
  const targetWidth = Math.max(currentWidth, maxIndex - minIndex + LOCATE_PADDING_BARS * 2);
  const center = (minIndex + maxIndex) / 2;
  applyRange(center - targetWidth / 2, center + targetWidth / 2);
  chart.resetPriceScale();
}

export function maximizeChart() {
  // Reserved for the future multi-chart layout manager.
}

export function restoreChart() {
  // Reserved for the future multi-chart layout manager.
}

export function canControlViewport() {
  return hasData();
}
