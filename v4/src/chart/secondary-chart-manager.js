// Readonly secondary chart manager for split-screen experiments.

import {
  CANDLESTICK_STYLE,
  CHART_THEME,
  TIME_SCALE_DISPLAY,
  VIEWPORT_RIGHT_OFFSET_BARS,
} from '../config.js';
import { formatTickPrice, getInstrumentTickSize } from '../price-utils.js';
import { VerticalLinePrimitive } from './primitives.js';

let secondaryChart = null;
let secondarySeries = null;
let secondaryContainer = null;
let resizeObserver = null;
let cursorPrimitive = null;
let hoverCursorPrimitive = null;
let activeDataCount = 0;
let activeLastTime = null;

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

export function initSecondaryChart(containerId = 'secondary-chart') {
  if (secondaryChart && secondarySeries) return { chart: secondaryChart, series: secondarySeries };

  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Secondary chart container #${containerId} not found`);
  secondaryContainer = container;

  secondaryChart = LightweightCharts.createChart(container, {
    ...CHART_THEME,
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
    crosshair: {
      mode: 0,
      vertLine: { labelVisible: true },
      horzLine: { labelVisible: true },
    },
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

export function getSecondaryChart() {
  return secondaryChart;
}

export function getSecondarySeries() {
  return secondarySeries;
}

export function setSecondaryData(data = []) {
  if (!secondarySeries) return;
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

export function showSecondaryEndOfData(dataCount = activeDataCount) {
  if (!secondaryChart || dataCount <= 0) return;
  const width = secondaryContainer?.clientWidth || 800;
  const barSpacing = secondaryChart.timeScale().options().barSpacing || TIME_SCALE_DISPLAY.barSpacing || 6;
  const barsVisible = Math.ceil(width / barSpacing);

  secondaryChart.timeScale().setVisibleLogicalRange({
    from: dataCount - barsVisible + VIEWPORT_RIGHT_OFFSET_BARS,
    to: dataCount + VIEWPORT_RIGHT_OFFSET_BARS,
  });
}

export function showSecondaryCursor(time) {
  if (!secondaryChart || !secondarySeries || time === undefined || time === null) return;

  if (!cursorPrimitive) {
    cursorPrimitive = new VerticalLinePrimitive(secondaryChart, time, {
      color: 'rgba(240, 243, 250, 0.34)',
      lineWidth: 1,
    });
    secondarySeries.attachPrimitive(cursorPrimitive);
    return;
  }

  cursorPrimitive.setTime(time);
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
      color: 'rgba(240, 243, 250, 0.16)',
      lineWidth: 1,
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

export function destroySecondaryChart() {
  hideSecondaryCursor();
  hideSecondaryHoverCursor();
  resizeObserver?.disconnect();
  resizeObserver = null;
  activeDataCount = 0;
  activeLastTime = null;

  secondaryChart?.remove();
  secondaryChart = null;
  secondarySeries = null;
  secondaryContainer = null;
}
