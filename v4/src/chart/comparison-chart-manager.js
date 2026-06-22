import {
  CANDLESTICK_STYLE,
  CHART_CROSSHAIR_OPTIONS,
  CHART_THEME,
  TIMEFRAME_MAP,
  TIME_SCALE_DISPLAY,
} from '../config.js';
import { formatTickPrice, getInstrumentTickSize } from '../price-utils.js';
import { getGridOptions } from './grid-visibility.js';
import { VerticalLinePrimitive } from './primitives.js';

let comparisonChart = null;
let comparisonSeries = null;
let comparisonContainer = null;
let resizeObserver = null;
let infoEl = null;
let legendEl = null;
let activeInstrument = 'ES';
let activeTimeframe = 60;
let lastLegendKey = '';
let cursorPrimitive = null;
let syncCrosshairPrimitive = null;
let pickPreviewPrimitive = null;
const crosshairMoveCallbacks = new Set();

function formatChartTime(time) {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (typeof time === 'string') {
    const date = new Date(`${time}T00:00:00Z`);
    return `${time} ${weekdays[date.getUTCDay()]}`;
  }

  const date = new Date(Number(time) * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min} ${weekdays[date.getUTCDay()]}`;
}

function formatCursorTime(time) {
  if (typeof time === 'string') return time;
  if (!Number.isFinite(Number(time))) return '';
  const date = new Date(Number(time) * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

function renderInfoLabel() {
  if (!infoEl) return;
  infoEl.textContent = `${activeInstrument} ${TIMEFRAME_MAP[activeTimeframe] || `${activeTimeframe}M`}`;
}

function updateLegend(param) {
  if (!legendEl || !param?.time || !param.seriesData || !comparisonSeries) return;
  const data = param.seriesData.get(comparisonSeries);
  if (!data) return;

  const isUp = data.close >= data.open;
  const cls = isUp ? 'ohlc-up' : 'ohlc-down';
  const fmt = (value) => formatTickPrice(value, activeInstrument);
  const legendKey = [
    activeInstrument,
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

function notifyCrosshairMove(param) {
  updateLegend(param);
  crosshairMoveCallbacks.forEach((callback) => callback(param));
}

export function initComparisonChart(containerId = 'comparison-chart-canvas') {
  if (comparisonChart && comparisonSeries) return { chart: comparisonChart, series: comparisonSeries };
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Comparison chart container #${containerId} not found`);

  comparisonContainer = container;
  infoEl = document.getElementById('comparison-chart-info');
  legendEl = document.getElementById('comparison-ohlc-legend');
  renderInfoLabel();

  comparisonChart = LightweightCharts.createChart(container, {
    ...CHART_THEME,
    grid: getGridOptions(),
    timeScale: {
      ...CHART_THEME.timeScale,
      ...TIME_SCALE_DISPLAY,
    },
    localization: {
      priceFormatter: (price) => formatTickPrice(price, activeInstrument),
      timeFormatter: formatChartTime,
    },
    width: container.clientWidth,
    height: container.clientHeight,
    crosshair: CHART_CROSSHAIR_OPTIONS,
  });

  comparisonSeries = comparisonChart.addSeries(LightweightCharts.CandlestickSeries, {
    ...CANDLESTICK_STYLE,
    lastValueVisible: true,
    priceLineVisible: true,
    priceFormat: {
      type: 'price',
      precision: 2,
      minMove: getInstrumentTickSize(activeInstrument),
    },
  });
  comparisonChart.subscribeCrosshairMove(notifyCrosshairMove);

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      comparisonChart?.applyOptions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  resizeObserver.observe(container);

  return { chart: comparisonChart, series: comparisonSeries };
}

export function setComparisonChartInfo({ instrument = activeInstrument, timeframe = activeTimeframe } = {}) {
  activeInstrument = instrument;
  activeTimeframe = Number(timeframe) || activeTimeframe;
  lastLegendKey = '';
  renderInfoLabel();
  comparisonSeries?.applyOptions({
    priceFormat: {
      type: 'price',
      precision: 2,
      minMove: getInstrumentTickSize(activeInstrument),
    },
  });
}

export function setComparisonData(data = []) {
  if (!comparisonSeries) return;
  lastLegendKey = '';
  legendEl.innerHTML = '';
  comparisonSeries.setData(data);
}

export function clearComparisonData() {
  hideComparisonCursor();
  hideComparisonSyncCrosshairCursor();
  hideComparisonPickPreviewCursor();
  setComparisonData([]);
}

export function getComparisonChart() {
  return comparisonChart;
}

export function getComparisonSeries() {
  return comparisonSeries;
}

export function getComparisonVisibleLogicalRange() {
  return comparisonChart?.timeScale?.().getVisibleLogicalRange?.() ?? null;
}

export function setComparisonVisibleLogicalRange(from, to) {
  if (!comparisonChart || !Number.isFinite(from) || !Number.isFinite(to) || from >= to) return;
  comparisonChart.timeScale().setVisibleLogicalRange({ from, to });
}

export function getComparisonActiveDataCount() {
  return comparisonSeries?.data?.()?.length ?? 0;
}

export function resetComparisonPriceScale() {
  comparisonChart?.priceScale?.('right')?.applyOptions?.({ autoScale: true });
}

export function attachComparisonPrimitive(primitive) {
  if (!comparisonSeries || !primitive) return;
  comparisonSeries.attachPrimitive(primitive);
}

export function detachComparisonPrimitive(primitive) {
  if (!comparisonSeries || !primitive) return;
  comparisonSeries.detachPrimitive(primitive);
}

export function clearComparisonPrimitives(primitives) {
  if (!comparisonSeries || !primitives) return [];
  primitives.forEach((primitive) => {
    try {
      comparisonSeries.detachPrimitive(primitive);
    } catch (e) {
      // primitive may already be detached during comparison chart reset
    }
  });
  return [];
}

export function showComparisonCursor(time) {
  if (!comparisonChart || !comparisonSeries || time === undefined || time === null) return;
  const label = formatCursorTime(time);
  if (!cursorPrimitive) {
    cursorPrimitive = new VerticalLinePrimitive(comparisonChart, time, { label });
    comparisonSeries.attachPrimitive(cursorPrimitive);
    return;
  }
  cursorPrimitive.setTime(time, { label });
}

export function hideComparisonCursor() {
  if (!comparisonSeries || !cursorPrimitive) return;
  try {
    comparisonSeries.detachPrimitive(cursorPrimitive);
  } catch (e) {
    // primitive may already be detached during comparison chart reset
  }
  cursorPrimitive = null;
}

export function showComparisonSyncCrosshairCursor(time) {
  if (!comparisonChart || !comparisonSeries || time === undefined || time === null) return;
  if (pickPreviewPrimitive) return;
  if (!syncCrosshairPrimitive) {
    syncCrosshairPrimitive = new VerticalLinePrimitive(comparisonChart, time, {
      color: 'rgba(186, 151, 255, 0.22)',
      lineWidth: 6,
      lineDash: [],
    });
    comparisonSeries.attachPrimitive(syncCrosshairPrimitive);
    return;
  }
  syncCrosshairPrimitive.setTime(time);
}

export function hideComparisonSyncCrosshairCursor() {
  if (!comparisonSeries || !syncCrosshairPrimitive) return;
  try {
    comparisonSeries.detachPrimitive(syncCrosshairPrimitive);
  } catch (e) {
    // primitive may already be detached during comparison chart reset
  }
  syncCrosshairPrimitive = null;
}

export function showComparisonPickPreviewCursor(time) {
  if (!comparisonChart || !comparisonSeries || time === undefined || time === null) return;
  hideComparisonSyncCrosshairCursor();

  if (!pickPreviewPrimitive) {
    pickPreviewPrimitive = new VerticalLinePrimitive(comparisonChart, time, {
      color: 'rgba(240, 243, 250, 0.18)',
      lineWidth: 8,
    });
    comparisonSeries.attachPrimitive(pickPreviewPrimitive);
    return;
  }

  pickPreviewPrimitive.setTime(time);
}

export function hideComparisonPickPreviewCursor() {
  if (!comparisonSeries || !pickPreviewPrimitive) return;

  try {
    comparisonSeries.detachPrimitive(pickPreviewPrimitive);
  } catch (e) {
    // primitive may already be detached during comparison chart reset
  }
  pickPreviewPrimitive = null;
}

export function hasComparisonPickPreviewCursor() {
  return Boolean(pickPreviewPrimitive);
}

export function onComparisonCrosshairMove(callback) {
  if (typeof callback !== 'function') return () => {};
  crosshairMoveCallbacks.add(callback);
  return () => crosshairMoveCallbacks.delete(callback);
}

export function showComparisonEndOfData(dataCount, previousRange = null, previousDataCount = null) {
  if (!comparisonChart || !comparisonContainer || dataCount <= 0) return;
  const width = comparisonContainer.clientWidth || 800;
  const barSpacing = comparisonChart.timeScale().options().barSpacing || TIME_SCALE_DISPLAY.barSpacing || 6;
  const barsVisible = Math.ceil(width / barSpacing);
  const rangeWidth =
    previousRange && Number.isFinite(previousRange.to - previousRange.from)
      ? previousRange.to - previousRange.from
      : barsVisible;
  const anchorOffset =
    previousRange && previousDataCount !== null
      ? previousRange.to - previousDataCount
      : 7;

  comparisonChart.timeScale().setVisibleLogicalRange({
    from: dataCount - rangeWidth + anchorOffset,
    to: dataCount + anchorOffset,
  });
}

export function showComparisonStartOfData(dataCount) {
  if (!comparisonChart || !comparisonContainer) return;
  const width = comparisonContainer.clientWidth || 800;
  const barSpacing = comparisonChart.timeScale().options().barSpacing || 6;
  const barsVisible = Math.ceil(width / barSpacing);

  if (dataCount <= barsVisible) {
    comparisonChart.timeScale().fitContent();
    return;
  }
  comparisonChart.timeScale().setVisibleLogicalRange({
    from: 0,
    to: barsVisible,
  });
}
