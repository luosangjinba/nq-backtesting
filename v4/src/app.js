// V4 入口模块 — 初始化所有模块，连接事件

import * as bus from './event-bus.js';
import * as chart from './chart/chart-manager.js';
import { initToolbar } from './ui/toolbar.js';

console.log('[V4] app.js loaded');

// 初始化图表
chart.initChart('chart');
console.log('[V4] Chart initialized');

// 初始化工具栏
initToolbar();
console.log('[V4] Toolbar initialized');

// 绑定 bars:loaded → chart.setData
bus.on('bars:loaded', ({ bars }) => {
  // API 返回格式: { time: "YYYY-MM-DD HH:MM", timestamp: unix_seconds, open, high, low, close, volume }
  // LightweightCharts v5 需要: { time: unix_seconds, open, high, low, close }
  const chartData = bars.map((b) => ({
    time: b.timestamp,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
  }));
  chart.setData(chartData);
  chart.fitContent();
  console.log(`[V4] Chart updated with ${bars.length} bars`);
});