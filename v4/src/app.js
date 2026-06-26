// V4 入口模块 — 初始化所有模块，连接事件

import * as bus from './event-bus.js';
import * as chart from './chart/chart-manager.js';
import { getBarChartTime } from './chart/time-projection.js';
import { initChartPaneDom } from './chart-panes/chart-pane-dom.js';
import { CHART_PANE_LAYOUTS, getChartPaneState } from './chart-panes/chart-pane-store.js';
import { initChartPaneRangeSync } from './chart-panes/chart-pane-range-sync.js';
import * as store from './data/bar-store.js';
import { initPrimaryInstrumentStore } from './data/primary-instrument-store.js';
import { initToolbar } from './ui/toolbar.js';
import { initComparisonWindowController } from './ui/comparison-window-controller.js';
import { initComparisonWindowPersistence } from './comparison/comparison-window-persistence.js';
import { initComparisonOverlayPolicy } from './comparison/comparison-overlay-policy.js';
import { initComparisonContextMenu } from './comparison/comparison-context-menu.js';
import {
  getReplayRestoreSnapshot,
  initReplayControls,
  syncReplayData,
} from './ui/replay-controls.js';
import { initReplayHistoryPersistence } from './ui/replay-history-persistence.js';
import { initViewportControls } from './ui/viewport-controls.js';
import { initReplayProgressivePrefixLoader } from './data/replay-progressive-prefix-loader.js';
import { initReplayProgressiveForwardLoader } from './data/replay-progressive-forward-loader.js';
import { initInspectorSidebar } from './ui/inspector-sidebar.js';
import { initDisplayMode } from './display/display-mode.js';
import { initDisplayPreferences } from './display/display-preferences.js';
import { initEntryContextCatalogStore } from './entry-context/entry-context-catalog-store.js';
import { initImportBatchAudit } from './import/import-batch-audit.js';
import { initManualAnnotation } from './pda/manual-annotation.js';
import { initPdaPersistence } from './pda/pda-persistence.js';
import { initPdaRenderer } from './pda/pda-renderer.js';
import { initComparisonPdaRenderer } from './pda/comparison-pda-renderer.js';
import { initPdaSelection } from './pda/pda-selection.js';
import { initManualSegment } from './segment/manual-segment.js';
import { initSegmentPersistence } from './segment/segment-persistence.js';
import { initSegmentRenderer } from './segment/segment-renderer.js';
import { initComparisonSegmentRenderer } from './segment/comparison-segment-renderer.js';
import { initSegmentSelection } from './segment/segment-selection.js';
import { initSegmentGroups } from './segment/segment-group-store.js';
import { initManualSmt } from './smt/manual-smt.js';
import { initSmtRenderer } from './smt/smt-renderer.js';
import { initSmtSelection } from './smt/smt-selection.js';
import { initOrderReviewActive } from './order/order-review-active.js';
import { initOrderReviewPersistence } from './order/order-review-persistence.js';
import { initOrderReviewRenderer } from './order/order-review-renderer.js';
import { initOrderSetupElementSelection } from './order/order-setup-selection.js';
import { initLiveRecordActive } from './live-record/live-record-active.js';
import { initLiveRecordPersistence } from './live-record/live-record-persistence.js';
import { initLiveRecordRenderer } from './live-record/live-record-renderer.js';
import { initLiveRecordElementSelection } from './live-record/live-record-selection.js';
import { initDailyTimeReviewPersistence } from './time-reaction/daily-time-review-persistence.js';
import { initTimeOverlayPersistence } from './time-overlays/time-overlay-persistence.js';
import { initTimeOverlayRenderer } from './time-overlays/time-overlay-renderer.js';
import { initChartNotePersistence } from './chart-notes/chart-note-persistence.js';
import { initChartNoteRenderer } from './chart-notes/chart-note-renderer.js';
import { initChartNoteSelection } from './chart-notes/chart-note-selection.js';
import { initEconomicEventNotePersistence } from './economic-calendar/economic-event-note-persistence.js';
import { initHistoryManager } from './history/history-manager.js';
import { initEconomicCalendarLoader } from './economic-calendar/economic-calendar-loader.js';
import { initDailyRegimeVixLoader } from './daily-regime/daily-regime-vix-loader.js';

let pendingReplayActivation = null;

function normalizePendingReplayActivation(payload = {}) {
  const timestamp = Number(payload?.timestamp);
  if (!Number.isFinite(timestamp)) return null;
  const replayStartTimestamp = Number(payload?.replayStartTimestamp);
  return {
    timestamp: Math.floor(timestamp),
    replayStartTimestamp: Number.isFinite(replayStartTimestamp)
      ? Math.floor(replayStartTimestamp)
      : Math.floor(timestamp),
  };
}

function createPendingReplaySnapshot(pending) {
  if (!pending || !Number.isFinite(Number(pending.timestamp))) return null;
  return {
    enabled: true,
    cursorTimestamp: Math.floor(Number(pending.timestamp)),
    lastTimestamp: null,
    replayStartTimestamp: Math.floor(Number(pending.replayStartTimestamp)),
    sourceTimeframe: store.getCurrentTimeframe(),
    sourceBars: store.getDisplayBars(),
    visibleRange: chart.getVisibleLogicalRange(),
    dataCount: 1,
    anchorReplayStart: true,
  };
}

console.log('[V4] app.js loaded');

initDisplayPreferences();
console.log('[V4] Display preferences initialized');

initPrimaryInstrumentStore();
console.log('[V4] Primary instrument initialized');

initEntryContextCatalogStore();
console.log('[V4] Entry context catalog initialized');

initImportBatchAudit();
console.log('[V4] Import batch audit initialized');

// 初始化图表
chart.initChart('chart');
console.log('[V4] Chart initialized');

// 初始化工具栏
initDisplayMode();
console.log('[V4] Display mode initialized');

initComparisonWindowPersistence();
console.log('[V4] Pane 1 workspace initialized');

initToolbar();
console.log('[V4] Toolbar initialized');

initChartPaneDom();
console.log('[V4] Chart pane DOM initialized');

initChartPaneRangeSync();
console.log('[V4] Chart pane range sync initialized');

// 初始化 Replay 控制条
initReplayControls();
initReplayHistoryPersistence();
initReplayProgressivePrefixLoader();
initReplayProgressiveForwardLoader();
console.log('[V4] Replay controls initialized');

// 初始化图表视口控制条
initViewportControls();
console.log('[V4] Viewport controls initialized');

// 绑定 bars:loaded → chart.setData（用显示数据，不含 padding）
bus.on('bars:loaded', ({ bars }) => {
  const replaySnapshot =
    getReplayRestoreSnapshot() ||
    createPendingReplaySnapshot(pendingReplayActivation);
  const displayBars = store.getDisplayBars();
  const tf = store.getCurrentTimeframe();
  // 日线用 tradingDay 日期字符串作为 LightweightCharts time（显示交易日日期）
  // 低周期用 timestamp 数值（显示精确时间）
  const chartData = displayBars.map((b) => ({
    time: getBarChartTime(b, tf),
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
  }));
  if (!replaySnapshot?.enabled) {
    chart.setData(chartData);
    chart.showStartOfData(chartData.length);
  }
  syncReplayData(replaySnapshot);
  console.log(
    `[V4] Chart updated with ${displayBars.length} display bars (${bars.length} total with padding)`
  );
});

bus.on('replay:pending-activate-at', (payload) => {
  pendingReplayActivation = normalizePendingReplayActivation(payload);
});

bus.on('replay:activate-at', () => {
  pendingReplayActivation = null;
});

bus.on('bars:cleared', () => {
  pendingReplayActivation = null;
});

bus.on('chart-panes:changed', (state = getChartPaneState()) => {
  if (state.reason !== 'layout' || state.layout !== CHART_PANE_LAYOUTS.TWO_COLUMN) return;
  requestAnimationFrame(() => chart.normalizeVisibleLogicalRange());
});

// 初始化 PDA 手动标注和渲染
initPdaRenderer();
initComparisonPdaRenderer();
initPdaPersistence();
initManualAnnotation();
initPdaSelection();
initInspectorSidebar();
console.log('[V4] PDA controls initialized');

initSegmentRenderer();
initComparisonSegmentRenderer();
initSegmentGroups();
initSegmentPersistence();
initManualSegment();
initSegmentSelection();
console.log('[V4] Segment controls initialized');

initComparisonWindowController();
initComparisonOverlayPolicy();
initComparisonContextMenu();
console.log('[V4] Pane 1 controller initialized');

initSmtRenderer();
initManualSmt();
initSmtSelection();
console.log('[V4] SMT controls initialized');

initOrderReviewPersistence();
initOrderReviewActive();
initOrderSetupElementSelection();
initOrderReviewRenderer();
console.log('[V4] Order Review controls initialized');

initLiveRecordPersistence();
initLiveRecordActive();
initLiveRecordRenderer();
initLiveRecordElementSelection();
console.log('[V4] Live Record controls initialized');

initDailyTimeReviewPersistence();
console.log('[V4] Daily Time Reaction controls initialized');

initTimeOverlayPersistence();
initTimeOverlayRenderer();
console.log('[V4] Time Overlay controls initialized');

initChartNotePersistence();
initChartNoteRenderer();
initChartNoteSelection();
console.log('[V4] Chart Notes controls initialized');

initEconomicCalendarLoader();
initEconomicEventNotePersistence();
console.log('[V4] Economic Calendar loader initialized');

initDailyRegimeVixLoader();
console.log('[V4] Daily Regime VIX loader initialized');

initHistoryManager();
console.log('[V4] History controls initialized');
