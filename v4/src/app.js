// V4 入口模块 — 初始化所有模块，连接事件

import * as bus from './event-bus.js';
import * as chart from './chart/chart-manager.js';
import * as store from './data/bar-store.js';
import { initToolbar } from './ui/toolbar.js';
import {
  getReplayRestoreSnapshot,
  initReplayControls,
  syncReplayData,
} from './ui/replay-controls.js';
import { initViewportControls } from './ui/viewport-controls.js';
import { initInspectorSidebar } from './ui/inspector-sidebar.js';
import { initManualAnnotation } from './pda/manual-annotation.js';
import { initPdaPersistence } from './pda/pda-persistence.js';
import { initPdaRenderer } from './pda/pda-renderer.js';
import { initPdaSelection } from './pda/pda-selection.js';
import { initManualSegment } from './segment/manual-segment.js';
import { initSegmentRenderer } from './segment/segment-renderer.js';

console.log('[V4] app.js loaded');

// 初始化图表
chart.initChart('chart');
console.log('[V4] Chart initialized');

// 初始化工具栏
initToolbar();
console.log('[V4] Toolbar initialized');

// 初始化 Replay 控制条
initReplayControls();
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
    time: tf === 1440 ? b.tradingDay : b.timestamp,
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
initPdaPersistence();
initManualAnnotation();
initPdaSelection();
initInspectorSidebar();
console.log('[V4] PDA controls initialized');

initSegmentRenderer();
initManualSegment();
console.log('[V4] Segment controls initialized');
