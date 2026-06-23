import * as bus from '../event-bus.js';
import * as primaryChart from '../chart/chart-manager.js';
import { getComparisonChart } from '../chart/comparison-chart-manager.js';
import {
  CHART_PANE_IDS,
  updatePaneDescriptor,
} from './chart-pane-store.js';

let primaryBound = false;
let comparisonBound = false;

function isValidRange(range) {
  return Number.isFinite(range?.from) && Number.isFinite(range?.to) && range.from < range.to;
}

function bindPrimaryRangeSync() {
  const chart = primaryChart.getChart();
  if (!chart || primaryBound) return;
  primaryBound = true;
  chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (!isValidRange(range)) return;
    updatePaneDescriptor(CHART_PANE_IDS.PRIMARY, { visibleRange: range });
  });
}

function bindComparisonRangeSync() {
  const chart = getComparisonChart();
  if (!chart || comparisonBound) return;
  comparisonBound = true;
  chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (!isValidRange(range)) return;
    updatePaneDescriptor(CHART_PANE_IDS.COMPARISON, { visibleRange: range });
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
