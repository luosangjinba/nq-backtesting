// V4 入口模块 — 初始化所有模块，连接事件

import * as bus from './event-bus.js';
import * as chart from './chart/chart-manager.js';
import * as store from './data/bar-store.js';
import { initToolbar } from './ui/toolbar.js';

console.log('[V4] app.js loaded');

// 初始化图表
chart.initChart('chart');
console.log('[V4] Chart initialized');

// 初始化工具栏
initToolbar();
console.log('[V4] Toolbar initialized');

// 绑定 bars:loaded → chart.setData（用显示数据，不含 padding）
bus.on('bars:loaded', ({ bars }) => {
  const displayBars = store.getDisplayBars();
  const chartData = displayBars.map((b) => ({
    time: b.timestamp,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
  }));
  chart.setData(chartData);
  chart.showStartOfData(chartData.length);
  console.log(
    `[V4] Chart updated with ${displayBars.length} display bars (${bars.length} total with padding)`
  );
});
