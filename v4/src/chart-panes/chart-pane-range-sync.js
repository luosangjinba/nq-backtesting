import * as bus from '../event-bus.js';
import * as primaryChart from '../chart/chart-manager.js';
import {
  getComparisonChart,
  setComparisonVisibleLogicalRange,
} from '../chart/comparison-chart-manager.js';
import {
  CHART_PANE_IDS,
  getSyncPeerPanes,
  updatePaneDescriptor,
} from './chart-pane-store.js';

let primaryBound = false;
let comparisonBound = false;
let applyingSource = null;

function isValidRange(range) {
  return Number.isFinite(range?.from) && Number.isFinite(range?.to) && range.from < range.to;
}

function canSyncTo(sourcePaneId, targetPaneId) {
  return getSyncPeerPanes(sourcePaneId).some((pane) => pane.id === targetPaneId);
}

function applyPrimaryRange(range) {
  if (!isValidRange(range)) return;
  applyingSource = CHART_PANE_IDS.COMPARISON;
  primaryChart.setVisibleLogicalRange(range.from, range.to);
  applyingSource = null;
}

function applyComparisonRange(range) {
  if (!isValidRange(range)) return;
  applyingSource = CHART_PANE_IDS.PRIMARY;
  setComparisonVisibleLogicalRange(range.from, range.to);
  applyingSource = null;
}

function bindPrimaryRangeSync() {
  const chart = primaryChart.getChart();
  if (!chart || primaryBound) return;
  primaryBound = true;
  chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (!isValidRange(range) || applyingSource === CHART_PANE_IDS.COMPARISON) return;
    updatePaneDescriptor(CHART_PANE_IDS.PRIMARY, { visibleRange: range });
    if (canSyncTo(CHART_PANE_IDS.PRIMARY, CHART_PANE_IDS.COMPARISON)) {
      applyComparisonRange(range);
    }
  });
}

function bindComparisonRangeSync() {
  const chart = getComparisonChart();
  if (!chart || comparisonBound) return;
  comparisonBound = true;
  chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (!isValidRange(range) || applyingSource === CHART_PANE_IDS.PRIMARY) return;
    updatePaneDescriptor(CHART_PANE_IDS.COMPARISON, { visibleRange: range });
    if (canSyncTo(CHART_PANE_IDS.COMPARISON, CHART_PANE_IDS.PRIMARY)) {
      applyPrimaryRange(range);
    }
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
