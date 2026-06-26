import * as bus from '../event-bus.js';
import * as primaryChart from '../chart/chart-manager.js';
import { getComparisonChart } from '../chart/comparison-chart-manager.js';
import {
  CHART_PANE_IDS,
  updatePaneVisibleRange,
} from './chart-pane-store.js';

let primaryBound = false;
let comparisonBound = false;
const pendingRangeFrames = new Map();
const pendingRanges = new Map();

function isValidRange(range) {
  return Number.isFinite(range?.from) && Number.isFinite(range?.to) && range.from < range.to;
}

function requestNextFrame(callback) {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
  return setTimeout(callback, 16);
}

function schedulePaneVisibleRangeUpdate(paneId, range) {
  if (!isValidRange(range)) return;
  pendingRanges.set(paneId, range);
  if (pendingRangeFrames.has(paneId)) return;
  const frameId = requestNextFrame(() => {
    pendingRangeFrames.delete(paneId);
    const pendingRange = pendingRanges.get(paneId);
    pendingRanges.delete(paneId);
    if (isValidRange(pendingRange)) {
      updatePaneVisibleRange(paneId, pendingRange);
    }
  });
  pendingRangeFrames.set(paneId, frameId);
}

function bindPrimaryRangeSync() {
  const chart = primaryChart.getChart();
  if (!chart || primaryBound) return;
  primaryBound = true;
  chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    schedulePaneVisibleRangeUpdate(CHART_PANE_IDS.PRIMARY, range);
  });
}

function bindComparisonRangeSync() {
  const chart = getComparisonChart();
  if (!chart || comparisonBound) return;
  comparisonBound = true;
  chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    schedulePaneVisibleRangeUpdate(CHART_PANE_IDS.COMPARISON, range);
  });
}

function scheduleComparisonBind() {
  requestAnimationFrame(() => bindComparisonRangeSync());
}

export function initChartPaneRangeSync() {
  bindPrimaryRangeSync();
  bus.on('comparison-window:dom-ready', scheduleComparisonBind);
  bus.on('comparison-window:changed', scheduleComparisonBind);
  bus.on('comparison-bars:loaded', scheduleComparisonBind);
}
