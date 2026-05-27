// Viewport operations for the readonly secondary split-screen chart.

import * as secondaryChart from './secondary-chart-manager.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { VIEWPORT_RIGHT_OFFSET_BARS } from '../config.js';

const ZOOM_FACTOR = 0.8;
const SCROLL_FACTOR = 0.25;

function getRange() {
  return secondaryChart.getSecondaryVisibleLogicalRange();
}

function hasData() {
  return secondaryStore.isSecondaryEnabled() && secondaryStore.getSecondaryDisplayBars().length > 0;
}

function applyRange(from, to) {
  secondaryChart.setSecondaryVisibleLogicalRange(from, to);
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
  const dataCount = secondaryChart.getSecondaryActiveDataCount();
  if (!range || dataCount <= 0) return;

  const width = range.to - range.from;
  const to = dataCount + VIEWPORT_RIGHT_OFFSET_BARS;
  applyRange(to - width, to);
  secondaryChart.resetSecondaryPriceScale();
}

export function resetChartView() {
  scrollToLatest();
}

export function canControlViewport() {
  return hasData();
}
