// TradingView-style viewport operations for the active chart.

import * as chart from './chart-manager.js';
import * as store from '../data/bar-store.js';
import { VIEWPORT_RIGHT_OFFSET_BARS } from '../config.js';

const ZOOM_FACTOR = 0.8;
const SCROLL_FACTOR = 0.25;

function getRange() {
  return chart.getVisibleLogicalRange();
}

function getDisplayCount() {
  return store.getDisplayBars().length;
}

function hasData() {
  return getDisplayCount() > 0;
}

function applyRange(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return;
  chart.setVisibleLogicalRange(from, to);
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
}

export function resetChartView() {
  scrollToLatest();
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
