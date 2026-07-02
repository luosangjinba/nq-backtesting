import { formatCandleTitle, formatPrice } from '../domain/chart-formatting.js';
import {
  formatDisplayDate,
  formatDisplayDateFromParts,
  formatDisplayTimestamp,
} from '../domain/timezone-format.js';
import { timestampSeconds } from './chart-engine-context.js';

export const LIGHTWEIGHT_REPLAY_TIMESCALE = Object.freeze({
  barSpacing: 10,
  minBarSpacing: 3,
  lockVisibleTimeRangeOnResize: true,
  rightBarStaysOnScroll: true,
  shiftVisibleRangeOnNewBar: false,
  fixLeftEdge: false,
  fixRightEdge: false,
});

export const LIGHTWEIGHT_REPLAY_SCROLL = Object.freeze({
  mouseWheel: false,
  pressedMouseMove: true,
  horzTouchDrag: true,
  vertTouchDrag: false,
});

export const LIGHTWEIGHT_REPLAY_SCALE = Object.freeze({
  axisPressedMouseMove: true,
  mouseWheel: true,
  pinch: true,
});

export const LIGHTWEIGHT_PRICE_FORMAT = Object.freeze({
  type: 'price',
  precision: 2,
  minMove: 0.01,
});

const LIGHTWEIGHT_PRICE_SCALE_MARGIN_LIMITS = Object.freeze({
  minTop: 0.04,
  maxTop: 0.24,
  minBottom: 0.08,
  maxBottom: 0.28,
});

const LIGHTWEIGHT_GRID = Object.freeze({
  vertLines: {
    color: 'rgba(55, 65, 81, 0.28)',
    style: 0,
    visible: true,
  },
  horzLines: {
    color: 'rgba(55, 65, 81, 0.28)',
    style: 0,
    visible: true,
  },
});

const LIGHTWEIGHT_CROSSHAIR = Object.freeze({
  vertLine: {
    color: 'rgba(148, 163, 184, 0.42)',
    width: 1,
    style: 2,
    labelBackgroundColor: '#334155',
  },
  horzLine: {
    color: 'rgba(148, 163, 184, 0.42)',
    width: 1,
    style: 2,
    labelBackgroundColor: '#334155',
  },
});

export function applyFallbackPresentation(canvas, context) {
  canvas.dataset.crosshairReadout = context.showCrosshairReadout ? 'true' : 'false';
  canvas.dataset.rightOffsetBars = String(context.rightOffsetBars);
  canvas.dataset.candleBodyUp = context.candleStyle.body.up;
  canvas.dataset.candleBodyDown = context.candleStyle.body.down;
  canvas.dataset.candleBorderUp = context.candleStyle.border.up;
  canvas.dataset.candleBorderDown = context.candleStyle.border.down;
  canvas.dataset.candleWickUp = context.candleStyle.wick.up;
  canvas.dataset.candleWickDown = context.candleStyle.wick.down;
  canvas.dataset.gridVerticalVisible = String(context.gridStyle.verticalVisible);
  canvas.dataset.gridHorizontalVisible = String(context.gridStyle.horizontalVisible);
  canvas.dataset.gridVerticalColor = context.gridStyle.verticalColor;
  canvas.dataset.gridHorizontalColor = context.gridStyle.horizontalColor;
  canvas.dataset.crosshairVerticalVisible = String(context.crosshairStyle.verticalVisible);
  canvas.dataset.crosshairHorizontalVisible = String(context.crosshairStyle.horizontalVisible);
  canvas.dataset.crosshairVerticalColor = context.crosshairStyle.verticalColor;
  canvas.dataset.crosshairHorizontalColor = context.crosshairStyle.horizontalColor;
  canvas.dataset.crosshairLabelBackgroundColor = context.crosshairStyle.labelBackgroundColor;
  canvas.dataset.backgroundColor = context.backgroundStyle.color;
  canvas.dataset.scaleTextColor = context.scaleStyle.textColor;
  canvas.dataset.scaleLineColor = context.scaleStyle.lineColor;
  canvas.dataset.scaleFontSize = String(context.scaleStyle.fontSize);
  canvas.dataset.priceScaleSide = context.scaleStyle.priceScaleSide;
  canvas.dataset.priceScaleVisible = String(context.scaleStyle.priceScaleVisible);
  canvas.dataset.timeScaleVisible = String(context.scaleStyle.timeScaleVisible);
  canvas.dataset.scaleBordersVisible = String(context.scaleStyle.scaleBordersVisible);
  canvas.dataset.watermarkVisible = String(context.watermarkStyle.visible);
  canvas.dataset.watermarkText = context.watermarkStyle.text;
  canvas.dataset.watermarkColor = context.watermarkStyle.color;
  canvas.dataset.watermarkFontSize = String(context.watermarkStyle.fontSize);
  canvas.dataset.dateFormat = context.dateFormat;
  canvas.dataset.showDayOfWeekLabels = String(context.showDayOfWeekLabels);
  canvas.style.backgroundColor = context.backgroundStyle.color;
  canvas.style.color = context.scaleStyle.textColor;
  canvas.style.paddingTop = `${context.margins.topPercent}%`;
  canvas.style.paddingBottom = `${context.margins.bottomPercent}%`;
  canvas.style.paddingRight = `${context.rightOffsetBars * 10}px`;
}

export function applyFallbackMetadata(canvas, metadata = {}) {
  Object.entries(metadata).forEach(([key, value]) => {
    canvas.dataset[key] = String(value);
  });
}

export function gridOptionsForContext(context) {
  return {
    vertLines: {
      ...LIGHTWEIGHT_GRID.vertLines,
      color: context.gridStyle.verticalColor,
      visible: context.gridStyle.verticalVisible,
    },
    horzLines: {
      ...LIGHTWEIGHT_GRID.horzLines,
      color: context.gridStyle.horizontalColor,
      visible: context.gridStyle.horizontalVisible,
    },
  };
}

export function crosshairOptionsForContext(context) {
  return {
    vertLine: {
      ...LIGHTWEIGHT_CROSSHAIR.vertLine,
      color: context.crosshairStyle.verticalColor,
      visible: context.crosshairStyle.verticalVisible,
      labelBackgroundColor: context.crosshairStyle.labelBackgroundColor,
    },
    horzLine: {
      ...LIGHTWEIGHT_CROSSHAIR.horzLine,
      color: context.crosshairStyle.horizontalColor,
      visible: context.crosshairStyle.horizontalVisible,
      labelBackgroundColor: context.crosshairStyle.labelBackgroundColor,
    },
  };
}

export function lightweightOptionsForContext(context) {
  const priceScaleSide = context.scaleStyle.priceScaleSide || 'right';
  const priceScaleOptions = {
    visible: context.scaleStyle.priceScaleVisible,
    borderVisible: context.scaleStyle.scaleBordersVisible,
    borderColor: context.scaleStyle.lineColor,
  };
  const hiddenPriceScaleOptions = {
    ...priceScaleOptions,
    visible: false,
  };
  return {
    handleScroll: { ...LIGHTWEIGHT_REPLAY_SCROLL },
    handleScale: { ...LIGHTWEIGHT_REPLAY_SCALE },
    layout: {
      background: { type: 'solid', color: context.backgroundStyle.color },
      textColor: context.scaleStyle.textColor,
      fontSize: context.scaleStyle.fontSize,
    },
    grid: gridOptionsForContext(context),
    crosshair: crosshairOptionsForContext(context),
    localization: {
      priceFormatter: (price) => formatPrice(price),
    },
    timeScale: {
      ...LIGHTWEIGHT_REPLAY_TIMESCALE,
      rightOffset: context.rightOffsetBars,
      visible: context.scaleStyle.timeScaleVisible,
      borderVisible: context.scaleStyle.scaleBordersVisible,
      borderColor: context.scaleStyle.lineColor,
      tickMarkFormatter: (time) => formatLightweightTick(time, context),
    },
    leftPriceScale: priceScaleSide === 'left' ? priceScaleOptions : hiddenPriceScaleOptions,
    rightPriceScale: priceScaleSide === 'right' ? priceScaleOptions : hiddenPriceScaleOptions,
  };
}

export function watermarkOptionsForContext(context) {
  return {
    visible: context.watermarkStyle.visible,
    horzAlign: 'center',
    vertAlign: 'center',
    lines: context.watermarkStyle.visible && context.watermarkStyle.text
      ? [{
        text: context.watermarkStyle.text,
        color: context.watermarkStyle.color,
        fontSize: context.watermarkStyle.fontSize,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }]
      : [],
  };
}

export function lightweightSeriesOptionsForContext(context) {
  return {
    priceFormat: { ...LIGHTWEIGHT_PRICE_FORMAT },
    priceScaleId: context.scaleStyle.priceScaleSide === 'left' ? 'left' : 'right',
    upColor: context.candleStyle.body.up,
    downColor: context.candleStyle.body.down,
    borderUpColor: context.candleStyle.border.up,
    borderDownColor: context.candleStyle.border.down,
    wickUpColor: context.candleStyle.wick.up,
    wickDownColor: context.candleStyle.wick.down,
  };
}

function clampRatio(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function priceScaleMarginsForContext(context) {
  return {
    top: clampRatio(
      context.margins.topPercent / 100,
      LIGHTWEIGHT_PRICE_SCALE_MARGIN_LIMITS.minTop,
      LIGHTWEIGHT_PRICE_SCALE_MARGIN_LIMITS.maxTop
    ),
    bottom: clampRatio(
      context.margins.bottomPercent / 100,
      LIGHTWEIGHT_PRICE_SCALE_MARGIN_LIMITS.minBottom,
      LIGHTWEIGHT_PRICE_SCALE_MARGIN_LIMITS.maxBottom
    ),
  };
}

function formatLightweightTick(time, context) {
  if (time && typeof time === 'object' && 'year' in time && 'month' in time && 'day' in time) {
    return formatDisplayDateFromParts(time, {
      dateFormat: context.dateFormat,
      showDayOfWeekLabels: context.showDayOfWeekLabels,
      compactIso: true,
    });
  }
  const formatted = formatDisplayTimestamp(time, {
    displayTimezone: context.displayTimezone,
    exchangeTimezone: context.exchangeTimezone,
    timeFormat: context.timeFormat,
    dateFormat: context.dateFormat,
    showDayOfWeekLabels: context.showDayOfWeekLabels,
  });
  const match = formatted.match(/^(.+) (.+)$/);
  if (!match) return formatted;
  const [, , timeText] = match;
  return timeText.startsWith('00:00') || timeText.startsWith('12:00 AM')
    ? formatDisplayDate(time, {
      displayTimezone: context.displayTimezone,
      exchangeTimezone: context.exchangeTimezone,
      dateFormat: context.dateFormat,
      showDayOfWeekLabels: context.showDayOfWeekLabels,
      compactIso: true,
    })
    : timeText;
}

export function applyLightweightMetadata(canvas, context) {
  canvas.dataset.timeScaleBarSpacing = String(LIGHTWEIGHT_REPLAY_TIMESCALE.barSpacing);
  canvas.dataset.timeScaleMinBarSpacing = String(LIGHTWEIGHT_REPLAY_TIMESCALE.minBarSpacing);
  canvas.dataset.timeScaleLockOnResize = String(LIGHTWEIGHT_REPLAY_TIMESCALE.lockVisibleTimeRangeOnResize);
  canvas.dataset.timeScaleRightBarStaysOnScroll = String(LIGHTWEIGHT_REPLAY_TIMESCALE.rightBarStaysOnScroll);
  canvas.dataset.timeScaleShiftOnNewBar = String(LIGHTWEIGHT_REPLAY_TIMESCALE.shiftVisibleRangeOnNewBar);
  canvas.dataset.handleScrollMouseWheel = String(LIGHTWEIGHT_REPLAY_SCROLL.mouseWheel);
  canvas.dataset.handleScrollPressedMouseMove = String(LIGHTWEIGHT_REPLAY_SCROLL.pressedMouseMove);
  canvas.dataset.handleScaleMouseWheel = String(LIGHTWEIGHT_REPLAY_SCALE.mouseWheel);
  canvas.dataset.timeScaleRightOffset = String(context.rightOffsetBars);
  canvas.dataset.lightweightMarginTopPercent = String(context.margins.topPercent);
  canvas.dataset.lightweightMarginBottomPercent = String(context.margins.bottomPercent);
  const priceScaleMargins = priceScaleMarginsForContext(context);
  canvas.dataset.priceScaleMarginTop = String(priceScaleMargins.top);
  canvas.dataset.priceScaleMarginBottom = String(priceScaleMargins.bottom);
  canvas.dataset.pricePrecision = String(LIGHTWEIGHT_PRICE_FORMAT.precision);
  canvas.dataset.priceMinMove = String(LIGHTWEIGHT_PRICE_FORMAT.minMove);
  canvas.dataset.candleBodyUp = context.candleStyle.body.up;
  canvas.dataset.candleBodyDown = context.candleStyle.body.down;
  canvas.dataset.candleBorderUp = context.candleStyle.border.up;
  canvas.dataset.candleBorderDown = context.candleStyle.border.down;
  canvas.dataset.candleWickUp = context.candleStyle.wick.up;
  canvas.dataset.candleWickDown = context.candleStyle.wick.down;
  canvas.dataset.gridVerticalVisible = String(context.gridStyle.verticalVisible);
  canvas.dataset.gridHorizontalVisible = String(context.gridStyle.horizontalVisible);
  canvas.dataset.gridVerticalColor = context.gridStyle.verticalColor;
  canvas.dataset.gridHorizontalColor = context.gridStyle.horizontalColor;
  canvas.dataset.crosshairVerticalVisible = String(context.crosshairStyle.verticalVisible);
  canvas.dataset.crosshairHorizontalVisible = String(context.crosshairStyle.horizontalVisible);
  canvas.dataset.crosshairVerticalColor = context.crosshairStyle.verticalColor;
  canvas.dataset.crosshairHorizontalColor = context.crosshairStyle.horizontalColor;
  canvas.dataset.crosshairLabelBackgroundColor = context.crosshairStyle.labelBackgroundColor;
  canvas.dataset.backgroundColor = context.backgroundStyle.color;
  canvas.dataset.scaleTextColor = context.scaleStyle.textColor;
  canvas.dataset.scaleLineColor = context.scaleStyle.lineColor;
  canvas.dataset.scaleFontSize = String(context.scaleStyle.fontSize);
  canvas.dataset.priceScaleSide = context.scaleStyle.priceScaleSide;
  canvas.dataset.priceScaleVisible = String(context.scaleStyle.priceScaleVisible);
  canvas.dataset.timeScaleVisible = String(context.scaleStyle.timeScaleVisible);
  canvas.dataset.scaleBordersVisible = String(context.scaleStyle.scaleBordersVisible);
  canvas.dataset.watermarkVisible = String(context.watermarkStyle.visible);
  canvas.dataset.watermarkText = context.watermarkStyle.text;
  canvas.dataset.watermarkColor = context.watermarkStyle.color;
  canvas.dataset.watermarkFontSize = String(context.watermarkStyle.fontSize);
  canvas.dataset.dateFormat = context.dateFormat;
  canvas.dataset.showDayOfWeekLabels = String(context.showDayOfWeekLabels);
}

export function applyLightweightPresentation(canvas, context) {
  canvas.style.paddingTop = '';
  canvas.style.paddingBottom = '';
  canvas.style.paddingRight = '';
  canvas.style.backgroundColor = '';
  canvas.style.color = '';
  applyLightweightMetadata(canvas, context);
}

export function followLogicalRangeForBars(bars, context) {
  if (!bars.length) return null;
  const rightOffset = Math.max(0, Number(context.rightOffsetBars || 0));
  return {
    from: 0,
    to: Math.max(0, bars.length - 1 + rightOffset),
  };
}

function estimateRenderedBarSpacingSeconds(bars) {
  const timestamps = bars
    .map((bar) => timestampSeconds(bar.time, 'chart engine visible range bar time'))
    .sort((left, right) => left - right);
  const gaps = timestamps
    .slice(1)
    .map((timestamp, index) => timestamp - timestamps[index])
    .filter((gap) => gap > 0);
  return gaps[0] || 60;
}

export function manualLogicalRangeForVisibleRange(range, bars) {
  if (!range || !bars.length) return null;
  const first = timestampSeconds(bars[0].time, 'chart engine visible range first bar time');
  const last = timestampSeconds(bars[bars.length - 1].time, 'chart engine visible range last bar time');
  if (range.to <= last) return null;
  const spacing = estimateRenderedBarSpacingSeconds(bars);
  const leftOffsetBars = Math.max(0, Math.floor((first - range.from) / spacing));
  const rightOffsetBars = Math.max(1, Math.ceil((range.to - last) / spacing));
  return {
    from: -leftOffsetBars,
    to: bars.length - 1 + rightOffsetBars,
  };
}

export function visibleRangeWithLogicalWhitespace(range, logicalRange, bars) {
  if (!range || !logicalRange || !bars.length) return range;
  const logicalFrom = Number(logicalRange.from);
  const logicalTo = Number(logicalRange.to);
  if (!Number.isFinite(logicalFrom) || !Number.isFinite(logicalTo)) return range;
  const spacing = estimateRenderedBarSpacingSeconds(bars);
  const firstLogicalIndex = 0;
  const lastLogicalIndex = bars.length - 1;
  const leftWhitespaceBars = Math.max(0, firstLogicalIndex - logicalFrom);
  const rightWhitespaceBars = Math.max(0, logicalTo - lastLogicalIndex);
  if (!leftWhitespaceBars && !rightWhitespaceBars) return range;
  return {
    from: Math.floor(range.from - (leftWhitespaceBars * spacing)),
    to: Math.ceil(range.to + (rightWhitespaceBars * spacing)),
  };
}

export function createRuntimeCanvas(documentRef) {
  const canvas = documentRef.createElement('div');
  canvas.className = 'chart-runtime-canvas';
  canvas.dataset.chartCanvas = 'true';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Chart runtime canvas');
  return canvas;
}

export function formatChartBarTime(bar, context) {
  if (typeof bar.time === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bar.time)) {
    return bar.time;
  }
  return formatDisplayTimestamp(bar.time, {
    displayTimezone: context.displayTimezone,
    exchangeTimezone: context.exchangeTimezone,
    timeFormat: context.timeFormat,
    dateFormat: context.dateFormat,
    showDayOfWeekLabels: context.showDayOfWeekLabels,
  });
}

export function renderFallbackBars(documentRef, canvas, bars, context, fullBarCount = bars.length) {
  const plot = documentRef.createElement('div');
  plot.className = 'chart-bar-plot';
  plot.dataset.chartBarCount = String(bars.length);
  plot.dataset.fullChartBarCount = String(fullBarCount);

  const values = bars.flatMap((bar) => [bar.open, bar.high, bar.low, bar.close]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  bars.forEach((bar) => {
    const candle = documentRef.createElement('div');
    const top = ((max - bar.high) / range) * 100;
    const height = Math.max(((bar.high - bar.low) / range) * 100, 4);
    const isUp = bar.close >= bar.open;
    candle.className = `chart-candle ${isUp ? 'is-up' : 'is-down'}`;
    candle.style.top = `${top}%`;
    candle.style.height = `${height}%`;
    candle.style.backgroundColor = isUp ? context.candleStyle.body.up : context.candleStyle.body.down;
    candle.style.borderColor = isUp ? context.candleStyle.border.up : context.candleStyle.border.down;
    candle.title = formatCandleTitle(bar, {
      timeText: formatChartBarTime(bar, context),
    });
    plot.append(candle);
  });

  canvas.append(plot);
}

export function visibleBarsForRange(bars, range) {
  if (!range) return [...bars];
  return bars.filter((bar) => {
    const timestamp = timestampSeconds(bar.time, 'chart visible readout bar time');
    return timestamp >= range.from && timestamp <= range.to;
  });
}

export function renderHiddenDebugBars(documentRef, debugPlot, bars, context, fullBarCount = bars.length) {
  debugPlot.replaceChildren();
  if (!bars.length) return;
  renderFallbackBars(documentRef, debugPlot, bars, context, fullBarCount);
  const plot = debugPlot.children[0];
  plot.dataset.chartDebugPlot = 'true';
  plot.style.display = 'none';
}

export function inferVisibleRangeFromBars(bars) {
  const timestamps = bars
    .map((bar) => timestampSeconds(bar.time, 'chart fallback bar time'))
    .sort((left, right) => left - right);
  if (!timestamps.length) return null;
  return {
    from: timestamps[0],
    to: timestamps[timestamps.length - 1],
  };
}

export function rangeSpanSeconds(range) {
  if (!range) return 0;
  return Math.max(1, range.to - range.from);
}
