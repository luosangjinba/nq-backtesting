// LightweightCharts v5 图表管理器

import { CHART_THEME, CANDLESTICK_STYLE } from '../config.js';

let chart = null;
let series = null;

export function initChart(containerId) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Chart container #${containerId} not found`);

  chart = LightweightCharts.createChart(container, {
    ...CHART_THEME,
    width: container.clientWidth,
    height: container.clientHeight,
  });

  // v5 API: addSeries(CandlestickSeries, options)
  series = chart.addSeries(LightweightCharts.CandlestickSeries, CANDLESTICK_STYLE);

  // 响应式
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      chart.applyOptions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  observer.observe(container);

  return { chart, series };
}

export function getChart() {
  return chart;
}

export function getSeries() {
  return series;
}

export function setData(data) {
  if (!series) return;
  series.setData(data);
}

export function fitContent() {
  if (!chart) return;
  chart.timeScale().fitContent();
}

export function getVisibleRange() {
  if (!chart) return null;
  return chart.timeScale().getVisibleRange();
}

export function setVisibleRange(from, to) {
  if (!chart) return;
  chart.timeScale().setVisibleRange({ from, to });
}

export function coordinateToTime(x) {
  if (!chart) return null;
  return chart.timeScale().coordinateToTime(x);
}

export function coordinateToPrice(y) {
  if (!series) return null;
  return series.coordinateToPrice(y);
}

export function timeToCoordinate(time) {
  if (!chart) return null;
  return chart.timeScale().timeToCoordinate(time);
}

export function priceToCoordinate(price) {
  if (!series) return null;
  return series.priceToCoordinate(price);
}

export function attachPrimitive(p) {
  if (!series) return;
  series.attachPrimitive(p);
}

export function detachPrimitive(p) {
  if (!series) return;
  series.detachPrimitive(p);
}

export function clearPrimitives(primitives) {
  if (!series || !primitives) return;
  primitives.forEach((p) => {
    try {
      series.detachPrimitive(p);
    } catch (e) {
      // primitive 可能已分离
    }
  });
  return [];
}

// 图表交互事件
export function onCrosshairMove(callback) {
  if (!chart) return;
  chart.subscribeCrosshairMove(callback);
}

export function onClick(callback) {
  if (!chart) return;
  chart.subscribeClick(callback);
}