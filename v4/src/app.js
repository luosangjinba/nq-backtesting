// V4 入口模块 — 初始化所有模块，连接事件

import * as bus from './event-bus.js';
import * as chart from './chart/chart-manager.js';
import { getBarChartTime } from './chart/time-projection.js';
import * as store from './data/bar-store.js';
import { initToolbar } from './ui/toolbar.js';
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
import { initOrderReviewActive } from './order/order-review-active.js';
import { initOrderReviewPersistence } from './order/order-review-persistence.js';
import { initOrderReviewRenderer } from './order/order-review-renderer.js';
import { initOrderSetupElementSelection } from './order/order-setup-selection.js';
import { initDailyTimeReviewPersistence } from './time-reaction/daily-time-review-persistence.js';
import { initTimeOverlayRenderer } from './time-overlays/time-overlay-renderer.js';
import { initHistoryManager } from './history/history-manager.js';
import { initEconomicCalendarLoader } from './economic-calendar/economic-calendar-loader.js';
import { initDailyRegimeVixLoader } from './daily-regime/daily-regime-vix-loader.js';

console.log('[V4] app.js loaded');

// 初始化图表
chart.initChart('chart');
console.log('[V4] Chart initialized');

// 初始化工具栏
initDisplayMode();
console.log('[V4] Display mode initialized');

initToolbar();
console.log('[V4] Toolbar initialized');

initSecondaryChartController();
console.log('[V4] Secondary chart controller initialized');

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

initSmtRenderer();
initManualSmt();
console.log('[V4] SMT controls initialized');

initOrderReviewPersistence();
initOrderReviewActive();
initOrderSetupElementSelection();
initOrderReviewRenderer();
console.log('[V4] Order Review controls initialized');

initDailyTimeReviewPersistence();
console.log('[V4] Daily Time Reaction controls initialized');

initTimeOverlayRenderer();
console.log('[V4] Time Overlay controls initialized');

initEconomicCalendarLoader();
console.log('[V4] Economic Calendar loader initialized');

initDailyRegimeVixLoader();
console.log('[V4] Daily Regime VIX loader initialized');

initHistoryManager();
console.log('[V4] History controls initialized');
