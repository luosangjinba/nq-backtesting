// Readonly secondary chart manager for split-screen experiments.

import {
  CANDLESTICK_STYLE,
  CHART_CROSSHAIR_OPTIONS,
  CHART_SYNC_CROSSHAIR_CURSOR,
  CHART_THEME,
  TIMEFRAME_MAP,
  TIME_SCALE_DISPLAY,
  VIEWPORT_RIGHT_OFFSET_BARS,
} from '../config.js';
import { formatTickPrice, getInstrumentTickSize } from '../price-utils.js';
import { getGridOptions } from './grid-visibility.js';
import { VerticalLinePrimitive } from './primitives.js';

let secondaryChart = null;
let secondarySeries = null;
let secondaryContainer = null;
let resizeObserver = null;
let cursorPrimitive = null;
let hoverCursorPrimitive = null;
let pickPreviewPrimitive = null;
let syncCrosshairPrimitive = null;
let infoEl = null;
let legendEl = null;
let lastLegendKey = '';
let activeInstrument = 'NQ';
let activeTimeframe = 60;
let activeDataCount = 0;
let activeLastTime = null;
const crosshairMoveCallbacks = new Set();

function notifySecondaryCrosshairMove(param) {
  updateSecondaryLegend(param);
  crosshairMoveCallbacks.forEach((callback) => callback(param));
}

function formatChartTime(time) {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (typeof time === 'string') {
    const d = new Date(`${time}T00:00:00Z`);
    return `${time} ${weekdays[d.getUTCDay()]}`;
  }

  const dt = new Date(Number(time) * 1000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  const h = String(dt.getUTCHours()).padStart(2, '0');
  const min = String(dt.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min} ${weekdays[dt.getUTCDay()]}`;
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

function renderInfoLabel() {
  if (!infoEl) return;
  infoEl.textContent = `${activeInstrument} ${TIMEFRAME_MAP[activeTimeframe] || `${activeTimeframe}M`}`;
}

function updateSecondaryLegend(param) {
  if (!legendEl || !param || !param.time || !param.seriesData) {
    return;
  }
  const data = param.seriesData.get(secondarySeries);
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

export function initSecondaryChart(containerId = 'secondary-chart') {
  if (secondaryChart && secondarySeries) return { chart: secondaryChart, series: secondarySeries };

  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Secondary chart container #${containerId} not found`);
  secondaryContainer = container;
  infoEl = document.getElementById('secondary-chart-info');
  legendEl = document.getElementById('secondary-ohlc-legend');
  renderInfoLabel();

  secondaryChart = LightweightCharts.createChart(container, {
    ...CHART_THEME,
    grid: getGridOptions(),
    timeScale: {
      ...CHART_THEME.timeScale,
      ...TIME_SCALE_DISPLAY,
    },
    localization: {
      priceFormatter: (price) => formatTickPrice(price),
      timeFormatter: formatChartTime,
    },
    width: container.clientWidth,
    height: container.clientHeight,
    crosshair: CHART_CROSSHAIR_OPTIONS,
  });

  secondarySeries = secondaryChart.addSeries(LightweightCharts.CandlestickSeries, {
    ...CANDLESTICK_STYLE,
    lastValueVisible: true,
    priceLineVisible: true,
    priceFormat: {
      type: 'price',
      precision: 2,
      minMove: getInstrumentTickSize(),
    },
  });
  secondaryChart.subscribeCrosshairMove(notifySecondaryCrosshairMove);

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      secondaryChart?.applyOptions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  resizeObserver.observe(container);

  return { chart: secondaryChart, series: secondarySeries };
}

export function applyGridVisibility() {
  secondaryChart?.applyOptions({ grid: getGridOptions() });
}

export function setSecondaryChartInfo({ instrument = activeInstrument, timeframe = activeTimeframe } = {}) {
  activeInstrument = instrument;
  activeTimeframe = Number(timeframe) || activeTimeframe;
  lastLegendKey = '';
  renderInfoLabel();
}

export function getSecondaryChart() {
  return secondaryChart;
}

export function getSecondarySeries() {
  return secondarySeries;
}

export function getSecondaryVisibleLogicalRange() {
  return secondaryChart?.timeScale().getVisibleLogicalRange() || null;
}

export function setSecondaryVisibleLogicalRange(from, to) {
  if (!secondaryChart || !Number.isFinite(from) || !Number.isFinite(to) || from >= to) return;
  secondaryChart.timeScale().setVisibleLogicalRange({ from, to });
}

export function getSecondaryActiveDataCount() {
  return activeDataCount;
}

export function resetSecondaryPriceScale() {
  try {
    secondarySeries?.priceScale?.().applyOptions({ autoScale: true });
  } catch (e) {
    // price scale may be unavailable during chart reset
  }
  try {
    secondaryChart?.priceScale?.('right')?.applyOptions({ autoScale: true });
  } catch (e) {
    // fallback for chart-level price scale API differences
  }
}

export function setSecondaryData(data = []) {
  if (!secondarySeries) return;
  lastLegendKey = '';
  secondarySeries.setData(data);
  activeDataCount = data.length;
  activeLastTime = data.length > 0 ? data[data.length - 1].time : null;
}

export function updateSecondaryBar(bar) {
  if (!secondarySeries || !bar) return;
  secondarySeries.update(bar);
  if (bar.time !== activeLastTime) {
    activeDataCount += 1;
    activeLastTime = bar.time;
  }
}

export function clearSecondaryData() {
  hideSecondaryCursor();
  hideSecondaryHoverCursor();
  hideSecondarySyncCrosshairCursor();
  if (legendEl) legendEl.innerHTML = '';
  lastLegendKey = '';
  setSecondaryData([]);
}

export function showSecondaryStartOfData(dataCount = activeDataCount) {
  if (!secondaryChart || dataCount <= 0) return;
  const width = secondaryContainer?.clientWidth || 800;
  const barSpacing = secondaryChart.timeScale().options().barSpacing || TIME_SCALE_DISPLAY.barSpacing || 6;
  const barsVisible = Math.ceil(width / barSpacing);

  if (dataCount <= barsVisible) {
    secondaryChart.timeScale().fitContent();
  } else {
    secondaryChart.timeScale().setVisibleLogicalRange({ from: 0, to: barsVisible });
  }
}

export function showSecondaryEndOfData(dataCount = activeDataCount, previousRange = null, previousDataCount = null) {
  if (!secondaryChart || dataCount <= 0) return;
  const width = secondaryContainer?.clientWidth || 800;
  const barSpacing = secondaryChart.timeScale().options().barSpacing || TIME_SCALE_DISPLAY.barSpacing || 6;
  const barsVisible = Math.ceil(width / barSpacing);
  const rangeWidth =
    previousRange && Number.isFinite(previousRange.to - previousRange.from)
      ? previousRange.to - previousRange.from
      : barsVisible;
  const anchorOffset =
    previousRange && previousDataCount !== null
      ? previousRange.to - previousDataCount
      : VIEWPORT_RIGHT_OFFSET_BARS;

  secondaryChart.timeScale().setVisibleLogicalRange({
    from: dataCount - rangeWidth + anchorOffset,
    to: dataCount + anchorOffset,
  });
}

export function locateSecondaryTimestamp(timestamp, displayBars = []) {
  if (!secondaryChart || !Number.isFinite(Number(timestamp)) || !Array.isArray(displayBars) || !displayBars.length) {
    return false;
  }

  let bestIndex = -1;
  let bestDistance = Infinity;
  displayBars.forEach((bar, index) => {
    const barTimestamp = Number(bar?.timestamp);
    if (!Number.isFinite(barTimestamp)) return;
    const distance = Math.abs(barTimestamp - Number(timestamp));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  if (bestIndex < 0) return null;

  const range = secondaryChart.timeScale().getVisibleLogicalRange();
  const width = range && Number.isFinite(range.to - range.from) ? range.to - range.from : 60;
  secondaryChart.timeScale().setVisibleLogicalRange({
    from: bestIndex - width / 2,
    to: bestIndex + width / 2,
  });
  return displayBars[bestIndex] || null;
}

export function showSecondaryCursor(time) {
  if (!secondaryChart || !secondarySeries || time === undefined || time === null) return;
  const label = formatCursorTime(time);

  if (!cursorPrimitive) {
    cursorPrimitive = new VerticalLinePrimitive(secondaryChart, time, { label });
    secondarySeries.attachPrimitive(cursorPrimitive);
    return;
  }

  cursorPrimitive.setTime(time, { label });
}

export function hideSecondaryCursor() {
  if (!secondarySeries || !cursorPrimitive) return;

  try {
    secondarySeries.detachPrimitive(cursorPrimitive);
  } catch (e) {
    // primitive may already be detached during chart reset
  }
  cursorPrimitive = null;
}

export function showSecondaryHoverCursor(time) {
  if (!secondaryChart || !secondarySeries || time === undefined || time === null) return;

  if (!hoverCursorPrimitive) {
    hoverCursorPrimitive = new VerticalLinePrimitive(secondaryChart, time, {
      ...CHART_SYNC_CROSSHAIR_CURSOR,
    });
    secondarySeries.attachPrimitive(hoverCursorPrimitive);
    return;
  }

  hoverCursorPrimitive.setTime(time);
}

export function hideSecondaryHoverCursor() {
  if (!secondarySeries || !hoverCursorPrimitive) return;

  try {
    secondarySeries.detachPrimitive(hoverCursorPrimitive);
  } catch (e) {
    // primitive may already be detached during chart reset
  }
  hoverCursorPrimitive = null;
}

export function showSecondaryPickPreviewCursor(time) {
  if (!secondaryChart || !secondarySeries || time === undefined || time === null) return;
  hideSecondarySyncCrosshairCursor();

  if (!pickPreviewPrimitive) {
    pickPreviewPrimitive = new VerticalLinePrimitive(secondaryChart, time, {
      color: 'rgba(240, 243, 250, 0.18)',
      lineWidth: 8,
    });
    secondarySeries.attachPrimitive(pickPreviewPrimitive);
    return;
  }

  pickPreviewPrimitive.setTime(time);
}

export function hideSecondaryPickPreviewCursor() {
  if (!secondarySeries || !pickPreviewPrimitive) return;

  try {
    secondarySeries.detachPrimitive(pickPreviewPrimitive);
  } catch (e) {
    // primitive may already be detached during chart reset
  }
  pickPreviewPrimitive = null;
}

export function showSecondarySyncCrosshairCursor(time) {
  if (!secondaryChart || !secondarySeries || time === undefined || time === null) return;

  if (!syncCrosshairPrimitive) {
    syncCrosshairPrimitive = new VerticalLinePrimitive(secondaryChart, time, {
      ...CHART_SYNC_CROSSHAIR_CURSOR,
    });
    secondarySeries.attachPrimitive(syncCrosshairPrimitive);
    return;
  }

  syncCrosshairPrimitive.setTime(time);
}

export function hideSecondarySyncCrosshairCursor() {
  if (!secondarySeries || !syncCrosshairPrimitive) return;

  try {
    secondarySeries.detachPrimitive(syncCrosshairPrimitive);
  } catch (e) {
    // primitive may already be detached during chart reset
  }
  syncCrosshairPrimitive = null;
}

export function onSecondaryCrosshairMove(callback) {
  if (typeof callback !== 'function') return () => {};
  crosshairMoveCallbacks.add(callback);
  return () => crosshairMoveCallbacks.delete(callback);
}

export function attachSecondaryPrimitive(primitive) {
  if (!secondarySeries || !primitive) return;
  secondarySeries.attachPrimitive(primitive);
}

export function detachSecondaryPrimitive(primitive) {
  if (!secondarySeries || !primitive) return;
  secondarySeries.detachPrimitive(primitive);
}

export function clearSecondaryPrimitives(primitives) {
  if (!secondarySeries || !primitives) return [];
  primitives.forEach((primitive) => {
    try {
      secondarySeries.detachPrimitive(primitive);
    } catch (e) {
      // primitive may already be detached during secondary chart reset
    }
  });
  return [];
}

export function destroySecondaryChart() {
  hideSecondaryCursor();
  hideSecondaryHoverCursor();
  hideSecondaryPickPreviewCursor();
  hideSecondarySyncCrosshairCursor();
  resizeObserver?.disconnect();
  resizeObserver = null;
  activeDataCount = 0;
  activeLastTime = null;

  secondaryChart?.remove();
  secondaryChart = null;
  secondarySeries = null;
  secondaryContainer = null;
  infoEl = null;
  legendEl = null;
}
