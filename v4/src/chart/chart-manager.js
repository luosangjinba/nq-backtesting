// LightweightCharts v5 图表管理器

import { CHART_THEME, CANDLESTICK_STYLE, TIME_SCALE_DISPLAY } from '../config.js';

let chart = null;
let series = null;
let legendEl = null;

function updateLegend(param) {
  if (!legendEl || !param || !param.time || !param.seriesData) {
    return;
  }
  const data = param.seriesData.get(series);
  if (!data) return;

  const isUp = data.close >= data.open;
  const cls = isUp ? 'ohlc-up' : 'ohlc-down';
  const fmt = (v) => v.toFixed(2);

  legendEl.innerHTML =
    `<span class="ohlc-label">O</span><span class="ohlc-value ${cls}">${fmt(data.open)}</span>` +
    `<span class="ohlc-label">H</span><span class="ohlc-value ${cls}">${fmt(data.high)}</span>` +
    `<span class="ohlc-label">L</span><span class="ohlc-value ${cls}">${fmt(data.low)}</span>` +
    `<span class="ohlc-label">C</span><span class="ohlc-value ${cls}">${fmt(data.close)}</span>`;
}

export function initChart(containerId) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Chart container #${containerId} not found`);

  legendEl = document.getElementById('ohlc-legend');

  chart = LightweightCharts.createChart(container, {
    ...CHART_THEME,
    timeScale: {
      ...CHART_THEME.timeScale,
      ...TIME_SCALE_DISPLAY,
    },
    width: container.clientWidth,
    height: container.clientHeight,
    crosshair: {
      mode: 0,
      vertLine: { labelVisible: true },
      horzLine: { labelVisible: true },
    },
  });

  // v5 API: addSeries(CandlestickSeries, options)
  series = chart.addSeries(LightweightCharts.CandlestickSeries, {
    ...CANDLESTICK_STYLE,
    lastValueVisible: true,
    priceLineVisible: true,
  });

  // 鼠标悬停更新 OHLCV legend
  chart.subscribeCrosshairMove(updateLegend);

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

// 根据数据量选择显示策略：少量 bar 用 fitContent，大量 bar 从起始位置显示
export function showStartOfData(dataCount) {
  if (!chart || !series) return;
  const container = document.getElementById('chart');
  const width = container ? container.clientWidth : 800;
  const barSpacing = chart.timeScale().options().barSpacing || 6;
  const barsVisible = Math.ceil(width / barSpacing);

  if (dataCount <= barsVisible) {
    chart.timeScale().fitContent();
  } else {
    chart.timeScale().setVisibleLogicalRange({ from: 0, to: barsVisible });
  }
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
