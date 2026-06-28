// LightweightCharts v5 图表管理器

import {
  CHART_CROSSHAIR_OPTIONS,
  CHART_SYNC_CROSSHAIR_CURSOR,
  CHART_THEME,
  CANDLESTICK_STYLE,
  TIME_SCALE_DISPLAY,
  VIEWPORT_RIGHT_OFFSET_BARS,
} from '../config.js';
import { formatTickPrice, getInstrumentTickSize } from '../price-utils.js';
import { VerticalLinePrimitive } from './primitives.js';
import { getGridOptions } from './grid-visibility.js';

let chart = null;
let series = null;
let legendEl = null;
let lastLegendKey = '';
let replayCursorPrimitive = null;
let pickPreviewPrimitive = null;
let syncCrosshairPrimitive = null;
let activeDataCount = 0;
let activeLastTime = null;

function getChartContainerWidth(fallback = 800) {
  const container = document.getElementById('chart');
  const width = Number(container?.clientWidth);
  if (Number.isFinite(width) && width > 0) return width;
  const viewportWidth = typeof window === 'undefined' ? NaN : Number(window.innerWidth);
  return Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : fallback;
}

function getVisibleBarsForContainer(fallback = 80) {
  const barSpacing = chart?.timeScale?.().options?.().barSpacing || TIME_SCALE_DISPLAY.barSpacing || 6;
  const width = getChartContainerWidth();
  const count = Math.ceil(width / Math.max(1, Number(barSpacing)));
  return Number.isFinite(count) && count > 0 ? count : fallback;
}

export function getVisibleBarCapacity(fallback = 80) {
  return getVisibleBarsForContainer(fallback);
}

function updateLegend(param) {
  if (!legendEl || !param || !param.time || !param.seriesData) {
    return;
  }
  const data = param.seriesData.get(series);
  if (!data) return;

  const isUp = data.close >= data.open;
  const cls = isUp ? 'ohlc-up' : 'ohlc-down';
  const fmt = (v) => formatTickPrice(v);
  const legendKey = [
    param.time,
    data.open,
    data.high,
    data.low,
    data.close,
  ].join('|');
  if (legendKey === lastLegendKey) return;
  lastLegendKey = legendKey;

  legendEl.innerHTML =
    `<span class="ohlc-label">O</span><span class="ohlc-value ${cls}">${fmt(data.open)}</span>` +
    `<span class="ohlc-label">H</span><span class="ohlc-value ${cls}">${fmt(data.high)}</span>` +
    `<span class="ohlc-label">L</span><span class="ohlc-value ${cls}">${fmt(data.low)}</span>` +
    `<span class="ohlc-label">C</span><span class="ohlc-value ${cls}">${fmt(data.close)}</span>`;
}

function formatCursorTime(time) {
  if (typeof time === 'string') return time;
  if (!Number.isFinite(Number(time))) return '';
  const dt = new Date(Number(time) * 1000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  const h = String(dt.getUTCHours()).padStart(2, '0');
  const min = String(dt.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function initChart(containerId) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Chart container #${containerId} not found`);

  legendEl = document.getElementById('ohlc-legend');

  chart = LightweightCharts.createChart(container, {
    ...CHART_THEME,
    grid: getGridOptions(),
    timeScale: {
      ...CHART_THEME.timeScale,
      ...TIME_SCALE_DISPLAY,
    },
    localization: {
      priceFormatter: (price) => formatTickPrice(price),
      timeFormatter: (time) => {
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        // 日线 time 是 "YYYY-MM-DD" 字符串
        if (typeof time === 'string') {
          const d = new Date(time + 'T00:00:00Z');
          return `${time} ${weekdays[d.getUTCDay()]}`;
        }
        // 低周期 time 是 UTC epoch 承载的图表墙钟时间，必须用 UTC getter 避免浏览器时区偏移
        const dt = new Date(time * 1000);
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const day = String(dt.getUTCDate()).padStart(2, '0');
        const h = String(dt.getUTCHours()).padStart(2, '0');
        const min = String(dt.getUTCMinutes()).padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min} ${weekdays[dt.getUTCDay()]}`;
      },
    },
    width: container.clientWidth,
    height: container.clientHeight,
    crosshair: CHART_CROSSHAIR_OPTIONS,
  });

  // v5 API: addSeries(CandlestickSeries, options)
  series = chart.addSeries(LightweightCharts.CandlestickSeries, {
    ...CANDLESTICK_STYLE,
    lastValueVisible: true,
    priceLineVisible: true,
    priceFormat: {
      type: 'price',
      precision: 2,
      minMove: getInstrumentTickSize(),
    },
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

export function applyGridVisibility() {
  chart?.applyOptions({ grid: getGridOptions() });
}

export function getChart() {
  return chart;
}

export function getSeries() {
  return series;
}

export function setData(data) {
  if (!series) return;
  lastLegendKey = '';
  series.setData(data);
  activeDataCount = data.length;
  activeLastTime = data.length > 0 ? data[data.length - 1].time : null;
}

export function updateBar(bar) {
  if (!series) return;
  series.update(bar);
  if (bar.time !== activeLastTime) {
    activeDataCount += 1;
    activeLastTime = bar.time;
  }
}

export function getActiveDataCount() {
  return activeDataCount;
}

export function showReplayCursor(time) {
  if (!chart || !series || time === undefined || time === null) return;
  hideSyncCrosshairCursor();
  const label = formatCursorTime(time);

  if (!replayCursorPrimitive) {
    replayCursorPrimitive = new VerticalLinePrimitive(chart, time, { label });
    series.attachPrimitive(replayCursorPrimitive);
    return;
  }

  replayCursorPrimitive.setTime(time, { label });
}

export function hideReplayCursor() {
  if (!series || !replayCursorPrimitive) return;

  try {
    series.detachPrimitive(replayCursorPrimitive);
  } catch (e) {
    // primitive may already be detached during chart/data reset
  }
  replayCursorPrimitive = null;
}

export function showPickPreviewCursor(time) {
  if (!chart || !series || time === undefined || time === null) return;
  hideSyncCrosshairCursor();

  if (!pickPreviewPrimitive) {
    pickPreviewPrimitive = new VerticalLinePrimitive(chart, time, {
      color: 'rgba(240, 243, 250, 0.18)',
      lineWidth: 8,
    });
    series.attachPrimitive(pickPreviewPrimitive);
    return;
  }

  pickPreviewPrimitive.setTime(time);
}

export function hidePickPreviewCursor() {
  if (!series || !pickPreviewPrimitive) return;

  try {
    series.detachPrimitive(pickPreviewPrimitive);
  } catch (e) {
    // primitive may already be detached during chart/data reset
  }
  pickPreviewPrimitive = null;
}

export function hasPickPreviewCursor() {
  return Boolean(pickPreviewPrimitive);
}

export function showSyncCrosshairCursor(time) {
  if (!chart || !series || time === undefined || time === null) return;
  if (pickPreviewPrimitive) return;

  if (!syncCrosshairPrimitive) {
    syncCrosshairPrimitive = new VerticalLinePrimitive(chart, time, {
      ...CHART_SYNC_CROSSHAIR_CURSOR,
    });
    series.attachPrimitive(syncCrosshairPrimitive);
    return;
  }

  syncCrosshairPrimitive.setTime(time);
}

export function hideSyncCrosshairCursor() {
  if (!series || !syncCrosshairPrimitive) return;

  try {
    series.detachPrimitive(syncCrosshairPrimitive);
  } catch (e) {
    // primitive may already be detached during chart/data reset
  }
  syncCrosshairPrimitive = null;
}

export function fitContent() {
  if (!chart) return;
  chart.timeScale().fitContent();
}

// 根据数据量选择显示策略：少量 bar 用 fitContent，大量 bar 从起始位置显示
export function showStartOfData(dataCount) {
  if (!chart || !series) return;
  const barsVisible = getVisibleBarsForContainer();

  if (dataCount <= barsVisible) {
    chart.timeScale().fitContent();
  } else {
    chart.timeScale().setVisibleLogicalRange({ from: 0, to: barsVisible });
  }
}

export function showEndOfData(dataCount, previousRange = null, previousDataCount = null) {
  if (!chart || !series || dataCount <= 0) return;
  const barsVisible = getVisibleBarsForContainer();
  const rangeWidth =
    previousRange && Number.isFinite(previousRange.to - previousRange.from)
      ? previousRange.to - previousRange.from
      : barsVisible;
  const anchorOffset =
    previousRange && previousDataCount !== null
      ? previousRange.to - previousDataCount
      : VIEWPORT_RIGHT_OFFSET_BARS;

  chart.timeScale().setVisibleLogicalRange({
    from: dataCount - rangeWidth + anchorOffset,
    to: dataCount + anchorOffset,
  });
}

export function normalizeVisibleLogicalRange(minBars = 12) {
  if (!chart || !series || activeDataCount <= 0) return false;
  const range = chart.timeScale().getVisibleLogicalRange?.();
  const width = Number(range?.to) - Number(range?.from);
  if (range && Number.isFinite(width) && width >= minBars) return false;
  showStartOfData(activeDataCount);
  resetPriceScale();
  return true;
}

export function getVisibleRange() {
  if (!chart) return null;
  return chart.timeScale().getVisibleRange();
}

export function getVisibleLogicalRange() {
  if (!chart) return null;
  return chart.timeScale().getVisibleLogicalRange();
}

export function onVisibleLogicalRangeChange(handler) {
  if (!chart || typeof handler !== 'function') return () => {};
  const timeScale = chart.timeScale();
  timeScale.subscribeVisibleLogicalRangeChange(handler);
  return () => timeScale.unsubscribeVisibleLogicalRangeChange?.(handler);
}

export function setVisibleRange(from, to) {
  if (!chart) return;
  chart.timeScale().setVisibleRange({ from, to });
}

export function setVisibleLogicalRange(from, to) {
  if (!chart) return;
  chart.timeScale().setVisibleLogicalRange({ from, to });
}

export function resetTimeScale() {
  if (!chart) return;
  chart.timeScale().resetTimeScale();
}

export function resetPriceScale() {
  try {
    series?.priceScale?.().applyOptions({ autoScale: true });
  } catch (e) {
    // price scale may be unavailable during chart reset
  }
  try {
    chart?.priceScale?.('right')?.applyOptions({ autoScale: true });
  } catch (e) {
    // fallback for chart-level price scale API differences
  }
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
