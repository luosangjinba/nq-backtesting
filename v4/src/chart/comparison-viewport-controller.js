// Viewport operations for the comparison chart.

import * as comparisonChart from './comparison-chart-manager.js';
import * as comparisonStore from '../comparison/comparison-window-store.js';
import { VIEWPORT_RIGHT_OFFSET_BARS } from '../config.js';
import { LocateFlashPrimitive } from './locate-flash-primitive.js';

const ZOOM_FACTOR = 0.8;
const SCROLL_FACTOR = 0.25;
const LOCATE_PADDING_BARS = 8;
const LOCATE_FLASH_DURATION_MS = 900;

let locateFlashPrimitive = null;
let locateFlashFrame = null;

function clearLocateFlash() {
  if (locateFlashFrame !== null) {
    cancelAnimationFrame(locateFlashFrame);
    locateFlashFrame = null;
  }
  if (locateFlashPrimitive) {
    try {
      comparisonChart.detachComparisonPrimitive(locateFlashPrimitive);
    } catch (e) {
      // Primitive may already be detached during comparison chart/data reset.
    }
    locateFlashPrimitive = null;
  }
}

function flashLocateRange(startTimestamp, endTimestamp, fallbackStartTimestamp = null, fallbackEndTimestamp = null) {
  const chartInstance = comparisonChart.getComparisonChart();
  const displayBars = comparisonStore.getComparisonDisplayBars();
  if (!chartInstance || !displayBars.length) return;

  clearLocateFlash();
  locateFlashPrimitive = new LocateFlashPrimitive(
    chartInstance,
    displayBars,
    comparisonStore.getComparisonViewDescriptor().timeframe,
    startTimestamp,
    endTimestamp,
    {
      fallbackStartTimestamp,
      fallbackEndTimestamp,
    }
  );
  comparisonChart.attachComparisonPrimitive(locateFlashPrimitive);

  const startedAt = performance.now();
  const tick = (now) => {
    if (!locateFlashPrimitive) return;
    const progress = Math.min(1, (now - startedAt) / LOCATE_FLASH_DURATION_MS);
    locateFlashPrimitive.setProgress(progress);
    if (progress < 1) {
      locateFlashFrame = requestAnimationFrame(tick);
      return;
    }
    clearLocateFlash();
  };
  locateFlashFrame = requestAnimationFrame(tick);
}

function getRange() {
  return comparisonChart.getComparisonVisibleLogicalRange();
}

function hasData() {
  return (
    comparisonStore.isComparisonWindowEnabled() &&
    Boolean(comparisonChart.getComparisonChart() && comparisonChart.getComparisonSeries()) &&
    comparisonStore.getComparisonDisplayBars().length > 0
  );
}

function applyRange(from, to) {
  comparisonChart.setComparisonVisibleLogicalRange(from, to);
}

function getTimestamp(bar) {
  const value = Number(bar?.timestamp);
  return Number.isFinite(value) ? value : null;
}

function findNearestBarIndex(timestamp) {
  const target = Number(timestamp);
  const bars = comparisonStore.getComparisonDisplayBars();
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
  const dataCount = comparisonChart.getComparisonActiveDataCount();
  if (!range || dataCount <= 0) return;

  const width = range.to - range.from;
  const to = dataCount + VIEWPORT_RIGHT_OFFSET_BARS;
  applyRange(to - width, to);
  comparisonChart.resetComparisonPriceScale();
}

export function resetChartView() {
  scrollToLatest();
}

export function locateComparisonTimestampRange(startTimestamp, endTimestamp, options = {}) {
  if (!hasData()) return false;

  const bars = comparisonStore.getComparisonDisplayBars();
  const leftIndex = findNearestBarIndex(startTimestamp);
  const rightIndex = findNearestBarIndex(endTimestamp);
  if (leftIndex < 0 || rightIndex < 0) return false;

  const minIndex = Math.min(leftIndex, rightIndex);
  const maxIndex = Math.max(leftIndex, rightIndex);
  const range = getRange();
  const currentWidth = range && Number.isFinite(range.to - range.from) ? range.to - range.from : 0;
  const targetWidth = Math.max(currentWidth, maxIndex - minIndex + LOCATE_PADDING_BARS * 2);
  const center = (minIndex + maxIndex) / 2;
  applyRange(center - targetWidth / 2, center + targetWidth / 2);
  comparisonChart.resetComparisonPriceScale();
  if (options.flash !== false) {
    flashLocateRange(
      startTimestamp,
      endTimestamp,
      getTimestamp(bars[minIndex]),
      getTimestamp(bars[maxIndex])
    );
  }
  return true;
}

export function canControlComparisonViewport() {
  return hasData();
}
