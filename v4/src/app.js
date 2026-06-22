// V4 入口模块 — 初始化所有模块，连接事件

import * as bus from './event-bus.js';
import * as chart from './chart/chart-manager.js';
import { getBarChartTime } from './chart/time-projection.js';
import * as store from './data/bar-store.js';
import { initPrimaryInstrumentStore } from './data/primary-instrument-store.js';
import { initToolbar } from './ui/toolbar.js';
import { initComparisonWindowController } from './ui/comparison-window-controller.js';
import {
  getReplayRestoreSnapshot,
  initReplayControls,
  syncReplayData,
} from './ui/replay-controls.js';
import { initReplayHistoryPersistence } from './ui/replay-history-persistence.js';
import { initSecondaryChartController } from './ui/secondary-chart-controller.js';
import { initViewportControls } from './ui/viewport-controls.js';
import { initInspectorSidebar } from './ui/inspector-sidebar.js';
import { initDisplayMode } from './display/display-mode.js';
import { initDisplayPreferences } from './display/display-preferences.js';
import { initEntryContextCatalogStore } from './entry-context/entry-context-catalog-store.js';
import { initManualAnnotation } from './pda/manual-annotation.js';
import { initPdaPersistence } from './pda/pda-persistence.js';
import { initPdaRenderer } from './pda/pda-renderer.js';
import { initSecondaryPdaRenderer } from './pda/secondary-pda-renderer.js';
import { initSecondaryContextMenu } from './pda/secondary-context-menu.js';
import { initPdaSelection } from './pda/pda-selection.js';
import { initManualSegment } from './segment/manual-segment.js';
import { initSegmentPersistence } from './segment/segment-persistence.js';
import { initSegmentRenderer } from './segment/segment-renderer.js';
import { initSecondarySegmentRenderer } from './segment/secondary-segment-renderer.js';
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

console.log('[V4] app.js loaded');

initDisplayPreferences();
console.log('[V4] Display preferences initialized');

initPrimaryInstrumentStore();
console.log('[V4] Primary instrument initialized');

initEntryContextCatalogStore();
console.log('[V4] Entry context catalog initialized');

// 初始化图表
chart.initChart('chart');
console.log('[V4] Chart initialized');

// 初始化工具栏
initDisplayMode();
console.log('[V4] Display mode initialized');

initToolbar();
console.log('[V4] Toolbar initialized');

// 初始化 Replay 控制条
initReplayControls();
initReplayHistoryPersistence();
console.log('[V4] Replay controls initialized');

// 初始化图表视口控制条
initViewportControls();
console.log('[V4] Viewport controls initialized');

// 绑定 bars:loaded → chart.setData（用显示数据，不含 padding）
bus.on('bars:loaded', ({ bars }) => {
  const replaySnapshot = getReplayRestoreSnapshot();
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
  chart.setData(chartData);
  if (!replaySnapshot?.enabled) {
    chart.showStartOfData(chartData.length);
  }
  syncReplayData(replaySnapshot);
  console.log(
    `[V4] Chart updated with ${displayBars.length} display bars (${bars.length} total with padding)`
  );
});

// 初始化 PDA 手动标注和渲染
initPdaRenderer();
initSecondaryPdaRenderer();
initPdaPersistence();
initManualAnnotation();
initSecondaryContextMenu();
initPdaSelection();
initInspectorSidebar();
console.log('[V4] PDA controls initialized');

initSegmentRenderer();
initSecondarySegmentRenderer();
initSegmentGroups();
initSegmentPersistence();
initManualSegment();
initSegmentSelection();
console.log('[V4] Segment controls initialized');

initSecondaryChartController();
console.log('[V4] Secondary chart controller initialized');

initComparisonWindowController();
console.log('[V4] Comparison window controller initialized');

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
