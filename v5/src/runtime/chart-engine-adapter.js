import { DEFAULT_DISPLAY_TIMEZONE, DEFAULT_EXCHANGE_TIMEZONE } from '../contracts/timezone-contracts.js';
import { DEFAULT_CHART_PRESENTATION_SETTINGS } from '../contracts/chart-presentation-contracts.js';
import { formatCandleTitle, formatPrice } from '../domain/chart-formatting.js';
import {
  formatDisplayDate,
  formatDisplayDateFromParts,
  formatDisplayTimestamp,
} from '../domain/timezone-format.js';

const LIGHTWEIGHT_REPLAY_TIMESCALE = Object.freeze({
  barSpacing: 10,
  minBarSpacing: 3,
  lockVisibleTimeRangeOnResize: true,
  rightBarStaysOnScroll: true,
  shiftVisibleRangeOnNewBar: false,
  fixLeftEdge: false,
  fixRightEdge: false,
});

const LIGHTWEIGHT_REPLAY_SCROLL = Object.freeze({
  mouseWheel: false,
  pressedMouseMove: true,
  horzTouchDrag: true,
  vertTouchDrag: false,
});

const LIGHTWEIGHT_REPLAY_SCALE = Object.freeze({
  axisPressedMouseMove: true,
  mouseWheel: true,
  pinch: true,
});

const LIGHTWEIGHT_PRICE_FORMAT = Object.freeze({
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

const LIGHTWEIGHT_WHEEL_SETTLE_MS = 260;

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

function timestampSeconds(value, label) {
  const parsed = typeof value === 'number' ? value * 1000 : Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid chart timestamp.`);
  }
  return Math.floor(parsed / 1000);
}

function toEngineBar(bar) {
  return {
    time: timestampSeconds(bar.time, 'chart engine bar time'),
    open: Number(bar.open),
    high: Number(bar.high),
    low: Number(bar.low),
    close: Number(bar.close),
  };
}

function toChartBar(bar) {
  if (!bar) return null;
  return {
    time: typeof bar.time === 'number'
      ? new Date(timestampSeconds(bar.time, 'chart readout bar time') * 1000).toISOString()
      : bar.time,
    open: Number(bar.open),
    high: Number(bar.high),
    low: Number(bar.low),
    close: Number(bar.close),
  };
}

function normalizeContext(context = {}) {
  const defaultCandleStyle = DEFAULT_CHART_PRESENTATION_SETTINGS.candleStyle;
  const defaultGridStyle = DEFAULT_CHART_PRESENTATION_SETTINGS.gridStyle;
  const defaultCrosshairStyle = DEFAULT_CHART_PRESENTATION_SETTINGS.crosshairStyle;
  const defaultBackgroundStyle = DEFAULT_CHART_PRESENTATION_SETTINGS.backgroundStyle;
  const defaultScaleStyle = DEFAULT_CHART_PRESENTATION_SETTINGS.scaleStyle;
  const defaultWatermarkStyle = DEFAULT_CHART_PRESENTATION_SETTINGS.watermarkStyle;
  return {
    displayTimezone: context.displayTimezone || DEFAULT_DISPLAY_TIMEZONE,
    exchangeTimezone: context.exchangeTimezone || DEFAULT_EXCHANGE_TIMEZONE,
    timeFormat: context.timeFormat || DEFAULT_CHART_PRESENTATION_SETTINGS.timeFormat,
    dateFormat: context.dateFormat || DEFAULT_CHART_PRESENTATION_SETTINGS.dateFormat,
    showDayOfWeekLabels: context.showDayOfWeekLabels == null
      ? DEFAULT_CHART_PRESENTATION_SETTINGS.showDayOfWeekLabels
      : Boolean(context.showDayOfWeekLabels),
    showCrosshairReadout: context.showCrosshairReadout == null
      ? DEFAULT_CHART_PRESENTATION_SETTINGS.showCrosshairReadout
      : Boolean(context.showCrosshairReadout),
    margins: {
      topPercent: Number(
        context.margins?.topPercent ?? DEFAULT_CHART_PRESENTATION_SETTINGS.margins.topPercent
      ),
      bottomPercent: Number(
        context.margins?.bottomPercent ?? DEFAULT_CHART_PRESENTATION_SETTINGS.margins.bottomPercent
      ),
    },
    rightOffsetBars: Number(context.rightOffsetBars ?? DEFAULT_CHART_PRESENTATION_SETTINGS.rightOffsetBars),
    candleStyle: {
      body: {
        up: context.candleStyle?.body?.up || defaultCandleStyle.body.up,
        down: context.candleStyle?.body?.down || defaultCandleStyle.body.down,
      },
      border: {
        up: context.candleStyle?.border?.up || defaultCandleStyle.border.up,
        down: context.candleStyle?.border?.down || defaultCandleStyle.border.down,
      },
      wick: {
        up: context.candleStyle?.wick?.up || defaultCandleStyle.wick.up,
        down: context.candleStyle?.wick?.down || defaultCandleStyle.wick.down,
      },
    },
    gridStyle: {
      verticalVisible: context.gridStyle?.verticalVisible == null
        ? defaultGridStyle.verticalVisible
        : Boolean(context.gridStyle.verticalVisible),
      horizontalVisible: context.gridStyle?.horizontalVisible == null
        ? defaultGridStyle.horizontalVisible
        : Boolean(context.gridStyle.horizontalVisible),
      verticalColor: context.gridStyle?.verticalColor || defaultGridStyle.verticalColor,
      horizontalColor: context.gridStyle?.horizontalColor || defaultGridStyle.horizontalColor,
    },
    crosshairStyle: {
      verticalVisible: context.crosshairStyle?.verticalVisible == null
        ? defaultCrosshairStyle.verticalVisible
        : Boolean(context.crosshairStyle.verticalVisible),
      horizontalVisible: context.crosshairStyle?.horizontalVisible == null
        ? defaultCrosshairStyle.horizontalVisible
        : Boolean(context.crosshairStyle.horizontalVisible),
      verticalColor: context.crosshairStyle?.verticalColor || defaultCrosshairStyle.verticalColor,
      horizontalColor: context.crosshairStyle?.horizontalColor || defaultCrosshairStyle.horizontalColor,
      labelBackgroundColor: context.crosshairStyle?.labelBackgroundColor || defaultCrosshairStyle.labelBackgroundColor,
    },
    backgroundStyle: {
      color: context.backgroundStyle?.color || defaultBackgroundStyle.color,
    },
    scaleStyle: {
      textColor: context.scaleStyle?.textColor || defaultScaleStyle.textColor,
      lineColor: context.scaleStyle?.lineColor || defaultScaleStyle.lineColor,
      fontSize: Number(context.scaleStyle?.fontSize ?? defaultScaleStyle.fontSize),
      priceScaleVisible: context.scaleStyle?.priceScaleVisible == null
        ? defaultScaleStyle.priceScaleVisible
        : Boolean(context.scaleStyle.priceScaleVisible),
      timeScaleVisible: context.scaleStyle?.timeScaleVisible == null
        ? defaultScaleStyle.timeScaleVisible
        : Boolean(context.scaleStyle.timeScaleVisible),
      scaleBordersVisible: context.scaleStyle?.scaleBordersVisible == null
        ? defaultScaleStyle.scaleBordersVisible
        : Boolean(context.scaleStyle.scaleBordersVisible),
    },
    watermarkStyle: {
      visible: context.watermarkStyle?.visible == null
        ? defaultWatermarkStyle.visible
        : Boolean(context.watermarkStyle.visible),
      text: context.watermarkStyle?.text == null ? defaultWatermarkStyle.text : String(context.watermarkStyle.text),
      color: context.watermarkStyle?.color || defaultWatermarkStyle.color,
      fontSize: Number(context.watermarkStyle?.fontSize ?? defaultWatermarkStyle.fontSize),
    },
  };
}

function applyFallbackPresentation(canvas, context) {
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

function applyFallbackMetadata(canvas, metadata = {}) {
  Object.entries(metadata).forEach(([key, value]) => {
    canvas.dataset[key] = String(value);
  });
}

function gridOptionsForContext(context) {
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

function crosshairOptionsForContext(context) {
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

function lightweightOptionsForContext(context) {
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
    rightPriceScale: {
      visible: context.scaleStyle.priceScaleVisible,
      borderVisible: context.scaleStyle.scaleBordersVisible,
      borderColor: context.scaleStyle.lineColor,
    },
  };
}

function watermarkOptionsForContext(context) {
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

function lightweightSeriesOptionsForContext(context) {
  return {
    priceFormat: { ...LIGHTWEIGHT_PRICE_FORMAT },
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

function priceScaleMarginsForContext(context) {
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

function applyLightweightMetadata(canvas, context) {
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

function applyLightweightPresentation(canvas, context) {
  canvas.style.paddingTop = '';
  canvas.style.paddingBottom = '';
  canvas.style.paddingRight = '';
  canvas.style.backgroundColor = '';
  canvas.style.color = '';
  applyLightweightMetadata(canvas, context);
}

function followLogicalRangeForBars(bars, context) {
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

function manualLogicalRangeForVisibleRange(range, bars) {
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

function visibleRangeWithLogicalWhitespace(range, logicalRange, bars) {
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

function createRuntimeCanvas(documentRef) {
  const canvas = documentRef.createElement('div');
  canvas.className = 'chart-runtime-canvas';
  canvas.dataset.chartCanvas = 'true';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Chart runtime canvas');
  return canvas;
}

function formatChartBarTime(bar, context) {
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

function renderFallbackBars(documentRef, canvas, bars, context, fullBarCount = bars.length) {
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

function visibleBarsForRange(bars, range) {
  if (!range) return [...bars];
  return bars.filter((bar) => {
    const timestamp = timestampSeconds(bar.time, 'chart visible readout bar time');
    return timestamp >= range.from && timestamp <= range.to;
  });
}

function renderHiddenDebugBars(documentRef, debugPlot, bars, context, fullBarCount = bars.length) {
  debugPlot.replaceChildren();
  if (!bars.length) return;
  renderFallbackBars(documentRef, debugPlot, bars, context, fullBarCount);
  const plot = debugPlot.children[0];
  plot.dataset.chartDebugPlot = 'true';
  plot.style.display = 'none';
}

function inferVisibleRangeFromBars(bars) {
  const timestamps = bars
    .map((bar) => timestampSeconds(bar.time, 'chart fallback bar time'))
    .sort((left, right) => left - right);
  if (!timestamps.length) return null;
  return {
    from: timestamps[0],
    to: timestamps[timestamps.length - 1],
  };
}

function rangeSpanSeconds(range) {
  if (!range) return 0;
  return Math.max(1, range.to - range.from);
}

function createFallbackInstance({ documentRef }) {
  let host = null;
  let canvas = null;
  let bars = [];
  let fullBarCount = 0;
  let displayContext = normalizeContext();
  let visibleRange = null;
  let metadata = {};
  let onVisibleRangeChange = null;
  let onCrosshairChange = null;
  let dragState = null;

  function activeVisibleRange() {
    return visibleRange ? { ...visibleRange } : inferVisibleRangeFromBars(bars);
  }

  function emitVisibleRangeChange(range) {
    if (!range || !onVisibleRangeChange) return;
    visibleRange = { ...range };
    onVisibleRangeChange({ ...range });
  }

  function canvasWidth() {
    const rect = canvas?.getBoundingClientRect?.();
    return Math.max(1, Number(rect?.width || canvas?.clientWidth || 1));
  }

  function emitFallbackCrosshair(event) {
    if (!onCrosshairChange || dragState || !bars.length) return;
    const candidates = visibleBarsForRange(bars, activeVisibleRange());
    if (!candidates.length) return;
    const rect = canvas?.getBoundingClientRect?.();
    const left = Number(rect?.left || 0);
    const width = canvasWidth();
    const ratio = Math.min(1, Math.max(0, (Number(event.clientX || left) - left) / width));
    const index = Math.min(candidates.length - 1, Math.max(0, Math.round(ratio * (candidates.length - 1))));
    const bar = candidates[index];
    onCrosshairChange({
      active: true,
      time: bar.time,
      price: Number(bar.close),
      bar: toChartBar(bar),
      point: {
        x: Number(event.clientX || 0),
        y: Number(event.clientY || 0),
      },
    });
  }

  function clearFallbackCrosshair() {
    onCrosshairChange?.({ active: false });
  }

  function onPointerDown(event) {
    const range = activeVisibleRange();
    if (!range || event.button > 0) return;
    dragState = {
      startX: Number(event.clientX || 0),
      range,
    };
    event.preventDefault?.();
  }

  function onPointerMove(event) {
    if (!dragState) return;
    const deltaX = Number(event.clientX || 0) - dragState.startX;
    const secondsPerPixel = rangeSpanSeconds(dragState.range) / canvasWidth();
    const shiftSeconds = Math.round(-deltaX * secondsPerPixel);
    emitVisibleRangeChange({
      from: dragState.range.from + shiftSeconds,
      to: dragState.range.to + shiftSeconds,
    });
    event.preventDefault?.();
  }

  function onMouseMove(event) {
    if (dragState) {
      onPointerMove(event);
      return;
    }
    emitFallbackCrosshair(event);
  }

  function onPointerUp() {
    dragState = null;
  }

  function onWheel(event) {
    const range = activeVisibleRange();
    if (!range) return;
    const span = rangeSpanSeconds(range);
    const rect = canvas?.getBoundingClientRect?.();
    const left = Number(rect?.left || 0);
    const width = canvasWidth();
    const pointerRatio = Math.min(1, Math.max(0, (Number(event.clientX || left + (width / 2)) - left) / width));
    const anchor = range.from + (span * pointerRatio);
    const zoomFactor = Number(event.deltaY || 0) < 0 ? 0.8 : 1.25;
    const nextSpan = Math.max(60, Math.round(span * zoomFactor));
    emitVisibleRangeChange({
      from: Math.round(anchor - (nextSpan * pointerRatio)),
      to: Math.round(anchor + (nextSpan * (1 - pointerRatio))),
    });
    event.preventDefault?.();
  }

  function bindFallbackInput() {
    if (!canvas?.addEventListener) return;
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    canvas.addEventListener('mouseleave', clearFallbackCrosshair);
    canvas.addEventListener('wheel', onWheel, { passive: false });
  }

  function unbindFallbackInput() {
    if (!canvas?.removeEventListener) return;
    canvas.removeEventListener('mousedown', onPointerDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseup', onPointerUp);
    canvas.removeEventListener('mouseleave', onPointerUp);
    canvas.removeEventListener('mouseleave', clearFallbackCrosshair);
    canvas.removeEventListener('wheel', onWheel);
  }

  function render() {
    if (!host || !canvas) return;
    canvas.replaceChildren();
    applyFallbackPresentation(canvas, displayContext);
    applyFallbackMetadata(canvas, metadata);
    canvas.dataset.chartCanvas = 'true';
    canvas.dataset.renderedBarCount = String(bars.length);
    canvas.dataset.fullBarCount = String(fullBarCount);

    if (bars.length) {
      renderFallbackBars(documentRef, canvas, bars, displayContext, fullBarCount);
      return;
    }

    const empty = documentRef.createElement('span');
    empty.className = 'chart-empty-state';
    empty.textContent = 'Chart runtime ready';
    canvas.append(empty);
  }

  return {
    engineType: 'dom-fallback',
    mount(nextHost, options = {}) {
      host = nextHost;
      displayContext = normalizeContext(options.displayContext);
      onVisibleRangeChange = typeof options.onVisibleRangeChange === 'function'
        ? options.onVisibleRangeChange
        : null;
      onCrosshairChange = typeof options.onCrosshairChange === 'function'
        ? options.onCrosshairChange
        : null;
      canvas = createRuntimeCanvas(documentRef);
      canvas.style.cursor = 'grab';
      canvas.style.userSelect = 'none';
      host.replaceChildren();
      host.dataset.chartRuntimeMounted = 'true';
      host.dataset.chartEngine = 'dom-fallback';
      host.append(canvas);
      bindFallbackInput();
      render();
    },
    setBars(nextBars = [], options = {}) {
      bars = [...nextBars];
      fullBarCount = Number(options.fullBarCount ?? bars.length);
      if (options.displayContext) {
        displayContext = normalizeContext(options.displayContext);
      }
      metadata = options.metadata ? { ...options.metadata } : metadata;
      render();
    },
    setMetadata(nextMetadata = {}) {
      metadata = { ...metadata, ...nextMetadata };
      if (canvas) {
        applyFallbackMetadata(canvas, metadata);
      }
    },
    setVisibleRange(range) {
      visibleRange = range ? { ...range } : null;
    },
    setPresentation(context = {}) {
      displayContext = normalizeContext(context);
      render();
    },
    readState() {
      return {
        engineType: 'dom-fallback',
        mounted: Boolean(host),
        barCount: bars.length,
        fullBarCount,
        visibleRange: visibleRange ? { ...visibleRange } : null,
      };
    },
    destroy() {
      unbindFallbackInput();
      host?.replaceChildren();
      host = null;
      canvas = null;
      bars = [];
      visibleRange = null;
      onVisibleRangeChange = null;
      onCrosshairChange = null;
      dragState = null;
    },
  };
}

function createLightweightInstance({ engine, documentRef }) {
  let chart = null;
  let series = null;
  let watermark = null;
  let host = null;
  let canvas = null;
  let engineSurface = null;
  let debugPlot = null;
  let bars = [];
  let fullBarCount = 0;
  let displayContext = normalizeContext();
  let visibleRange = null;
  let metadata = {};
  let unsubscribeVisibleRange = null;
  let unsubscribeCrosshair = null;
  let lastUserInputAt = 0;
  let pendingCrosshair = null;
  let crosshairFrame = null;
  let lastCrosshairKey = '';
  let suppressRuntimeVisibleRangeEcho = false;
  let nativeInteractionActive = false;
  let nativeInteractionType = null;
  let nativeInteractionSettleTimer = null;

  function emitNativeInteraction(active, type = nativeInteractionType) {
    if (nativeInteractionActive === active && nativeInteractionType === type) return;
    nativeInteractionActive = active;
    nativeInteractionType = active ? type : null;
    host?.__v5OnNativeInteractionChange?.({
      active: nativeInteractionActive,
      type: nativeInteractionType,
      source: 'lightweight-native',
    });
  }

  function clearNativeInteractionSettleTimer() {
    if (nativeInteractionSettleTimer === null) return;
    clearTimeout(nativeInteractionSettleTimer);
    nativeInteractionSettleTimer = null;
  }

  function scheduleNativeInteractionSettle(type = nativeInteractionType, delayMs = 120) {
    clearNativeInteractionSettleTimer();
    nativeInteractionSettleTimer = setTimeout(() => {
      nativeInteractionSettleTimer = null;
      emitNativeInteraction(false, type);
    }, delayMs);
  }

  function createSeries(nextChart) {
    const seriesOptions = lightweightSeriesOptionsForContext(displayContext);
    if (typeof nextChart.addCandlestickSeries === 'function') {
      return nextChart.addCandlestickSeries(seriesOptions);
    }
    if (typeof nextChart.addSeries === 'function' && engine.CandlestickSeries) {
      return nextChart.addSeries(engine.CandlestickSeries, seriesOptions);
    }
    throw new Error('Lightweight Charts candlestick series API is unavailable.');
  }

  function applySeriesOptions(context) {
    if (typeof series?.applyOptions !== 'function') return;
    series.applyOptions(lightweightSeriesOptionsForContext(context));
  }

  function applySeriesPriceScale(context) {
    const priceScale = series?.priceScale?.();
    if (typeof priceScale?.applyOptions !== 'function') return;
    priceScale.applyOptions({
      scaleMargins: priceScaleMarginsForContext(context),
    });
  }

  function applyWatermarkOptions(context) {
    if (!series || typeof engine.createTextWatermark !== 'function') return;
    const options = watermarkOptionsForContext(context);
    if (!watermark) {
      watermark = engine.createTextWatermark(series, options);
      return;
    }
    watermark.applyOptions?.(options);
  }

  function markUserInput(event) {
    lastUserInputAt = Date.now();
    suppressRuntimeVisibleRangeEcho = false;
    const type = event?.type === 'wheel'
      ? 'wheel'
      : event?.type?.startsWith?.('touch')
        ? 'touch'
        : 'drag';
    emitNativeInteraction(true, type);
    if (type === 'wheel') {
      scheduleNativeInteractionSettle(type, LIGHTWEIGHT_WHEEL_SETTLE_MS);
    } else {
      clearNativeInteractionSettleTimer();
    }
  }

  function settleUserInput(event) {
    const type = event?.type?.startsWith?.('touch') ? 'touch' : nativeInteractionType;
    scheduleNativeInteractionSettle(type, 0);
  }

  function clearShellCrosshair() {
    host?.__v5OnCrosshairChange?.({ active: false });
  }

  function hasRecentUserInput() {
    return Date.now() - lastUserInputAt < 2_000;
  }

  function bindEngineInputMarkers() {
    if (!canvas?.addEventListener) return;
    canvas.addEventListener('mousedown', markUserInput, true);
    canvas.addEventListener('touchstart', markUserInput, true);
    canvas.addEventListener('wheel', markUserInput, true);
    canvas.addEventListener('mouseleave', clearShellCrosshair);
    documentRef.addEventListener?.('mouseup', settleUserInput, true);
    documentRef.addEventListener?.('touchend', settleUserInput, true);
    documentRef.addEventListener?.('touchcancel', settleUserInput, true);
  }

  function unbindEngineInputMarkers() {
    if (!canvas?.removeEventListener) return;
    canvas.removeEventListener('mousedown', markUserInput, true);
    canvas.removeEventListener('touchstart', markUserInput, true);
    canvas.removeEventListener('wheel', markUserInput, true);
    canvas.removeEventListener('mouseleave', clearShellCrosshair);
    documentRef.removeEventListener?.('mouseup', settleUserInput, true);
    documentRef.removeEventListener?.('touchend', settleUserInput, true);
    documentRef.removeEventListener?.('touchcancel', settleUserInput, true);
  }

  function barForEngineTime(time) {
    if (time == null) return null;
    const timestamp = timestampSeconds(time, 'chart engine crosshair time');
    return bars.find((bar) => timestampSeconds(bar.time, 'chart readout bar time') === timestamp) || null;
  }

  function crosshairPrice(param, seriesBar, bar) {
    const price = Number(param?.price ?? seriesBar?.close ?? bar?.close);
    return Number.isFinite(price) ? price : null;
  }

  function crosshairKey(crosshair) {
    if (!crosshair?.active) return 'inactive';
    return [
      crosshair.time || '',
      crosshair.price == null ? '' : crosshair.price,
      crosshair.point?.x ?? '',
      crosshair.point?.y ?? '',
    ].join('|');
  }

  function scheduleCrosshairChange(crosshair) {
    if (typeof host?.__v5OnCrosshairChange !== 'function') return;
    pendingCrosshair = crosshair;
    if (crosshairFrame !== null) return;
    const schedule = globalThis.requestAnimationFrame || ((callback) => setTimeout(callback, 16));
    crosshairFrame = schedule(() => {
      crosshairFrame = null;
      const nextCrosshair = pendingCrosshair;
      pendingCrosshair = null;
      const nextKey = crosshairKey(nextCrosshair);
      if (nextKey === lastCrosshairKey) return;
      lastCrosshairKey = nextKey;
      host?.__v5OnCrosshairChange?.(nextCrosshair);
    });
  }

  return {
    engineType: 'lightweight-charts',
    mount(nextHost, options = {}) {
      host = nextHost;
      displayContext = normalizeContext(options.displayContext);
      host.__v5OnCrosshairChange = typeof options.onCrosshairChange === 'function'
        ? options.onCrosshairChange
        : null;
      host.__v5OnNativeInteractionChange = typeof options.onNativeInteractionChange === 'function'
        ? options.onNativeInteractionChange
        : null;
      canvas = createRuntimeCanvas(documentRef);
      engineSurface = documentRef.createElement('div');
      engineSurface.className = 'chart-engine-surface';
      engineSurface.dataset.chartEngineSurface = 'true';
      engineSurface.style.width = '100%';
      engineSurface.style.height = '100%';
      debugPlot = documentRef.createElement('div');
      debugPlot.dataset.chartDebugContainer = 'true';
      debugPlot.style.display = 'none';
      canvas.append(engineSurface);
      canvas.append(debugPlot);
      bindEngineInputMarkers();
      host.replaceChildren?.();
      host.dataset.chartRuntimeMounted = 'true';
      host.dataset.chartEngine = 'lightweight-charts';
      host.append(canvas);
      const replayOptions = lightweightOptionsForContext(displayContext);
      chart = engine.createChart(engineSurface, {
        autoSize: true,
        layout: {
          background: { color: '#0d1219' },
          textColor: '#d8dde8',
        },
        grid: gridOptionsForContext(displayContext),
        crosshair: crosshairOptionsForContext(displayContext),
        rightPriceScale: {
          borderColor: '#2b2f36',
        },
        ...replayOptions,
        timeScale: {
          borderColor: '#2b2f36',
          ...replayOptions.timeScale,
        },
      });
      series = createSeries(chart);
      applySeriesPriceScale(displayContext);
      applyWatermarkOptions(displayContext);
      const timeScale = chart.timeScale?.();
      if (typeof timeScale?.subscribeVisibleTimeRangeChange === 'function') {
        const handler = (range) => {
          if (!range || !options.onVisibleRangeChange || suppressRuntimeVisibleRangeEcho || !hasRecentUserInput()) return;
          const timeRange = {
            from: timestampSeconds(range.from, 'chart engine visible range from'),
            to: timestampSeconds(range.to, 'chart engine visible range to'),
          };
          const logicalRange = typeof timeScale.getVisibleLogicalRange === 'function'
            ? timeScale.getVisibleLogicalRange()
            : null;
          options.onVisibleRangeChange(
            visibleRangeWithLogicalWhitespace(timeRange, logicalRange, bars),
            logicalRange
              ? { source: 'lightweight-native', logicalRange }
              : { source: 'lightweight-native' }
          );
        };
        timeScale.subscribeVisibleTimeRangeChange(handler);
        unsubscribeVisibleRange = () => timeScale.unsubscribeVisibleTimeRangeChange?.(handler);
      }
      if (typeof chart.subscribeCrosshairMove === 'function' && typeof options.onCrosshairChange === 'function') {
        const handler = (param = {}) => {
          if (!param?.time) {
            scheduleCrosshairChange({ active: false });
            return;
          }
          const seriesBar = param.seriesData?.get?.(series);
          const bar = toChartBar(seriesBar || barForEngineTime(param.time));
          scheduleCrosshairChange({
            active: true,
            time: param.time,
            price: crosshairPrice(param, seriesBar, bar),
            bar,
            point: param.point
              ? {
                x: Number(param.point.x || 0),
                y: Number(param.point.y || 0),
              }
              : null,
          });
        };
        chart.subscribeCrosshairMove(handler);
        unsubscribeCrosshair = () => chart.unsubscribeCrosshairMove?.(handler);
      }
    },
    setBars(nextBars = [], options = {}) {
      bars = [...nextBars];
      fullBarCount = Number(options.fullBarCount ?? bars.length);
      if (options.displayContext) {
        displayContext = normalizeContext(options.displayContext);
      }
      metadata = options.metadata ? { ...options.metadata } : metadata;
      Object.entries(metadata).forEach(([key, value]) => {
        if (host?.dataset) {
          host.dataset[key] = String(value);
        }
      });
      if (canvas) {
        applyLightweightPresentation(canvas, displayContext);
        applyFallbackMetadata(canvas, metadata);
        canvas.dataset.renderedBarCount = String(bars.length);
        canvas.dataset.fullBarCount = String(fullBarCount);
        renderHiddenDebugBars(documentRef, debugPlot, bars, displayContext, fullBarCount);
      }
      applySeriesOptions(displayContext);
      applySeriesPriceScale(displayContext);
      series?.setData(bars.map(toEngineBar));
      if (options.followViewport) {
        const logicalRange = followLogicalRangeForBars(bars, displayContext);
        if (logicalRange && typeof chart?.timeScale?.().setVisibleLogicalRange === 'function') {
          suppressRuntimeVisibleRangeEcho = true;
          chart.timeScale().setVisibleLogicalRange(logicalRange);
          if (canvas) {
            canvas.dataset.visibleLogicalRangeFrom = String(logicalRange.from);
            canvas.dataset.visibleLogicalRangeTo = String(logicalRange.to);
          }
        }
      } else if (canvas) {
        delete canvas.dataset.visibleLogicalRangeFrom;
        delete canvas.dataset.visibleLogicalRangeTo;
      }
    },
    setMetadata(nextMetadata = {}) {
      metadata = { ...metadata, ...nextMetadata };
      Object.entries(metadata).forEach(([key, value]) => {
        if (host?.dataset) {
          host.dataset[key] = String(value);
        }
      });
      if (canvas) {
        applyFallbackMetadata(canvas, metadata);
      }
    },
    setVisibleRange(range) {
      visibleRange = range ? { ...range } : null;
      if (!visibleRange) return;
      suppressRuntimeVisibleRangeEcho = true;
      const logicalRange = manualLogicalRangeForVisibleRange(visibleRange, bars);
      if (logicalRange && typeof chart?.timeScale?.().setVisibleLogicalRange === 'function') {
        chart.timeScale().setVisibleLogicalRange(logicalRange);
        if (canvas) {
          canvas.dataset.visibleLogicalRangeFrom = String(logicalRange.from);
          canvas.dataset.visibleLogicalRangeTo = String(logicalRange.to);
        }
        return;
      }
      if (typeof chart?.timeScale?.().setVisibleRange === 'function') {
        chart.timeScale().setVisibleRange({ ...visibleRange });
        if (canvas) {
          delete canvas.dataset.visibleLogicalRangeFrom;
          delete canvas.dataset.visibleLogicalRangeTo;
        }
      }
    },
    setPresentation(context = {}) {
      displayContext = normalizeContext(context);
      if (canvas) {
        applyLightweightPresentation(canvas, displayContext);
      }
      chart?.applyOptions?.(lightweightOptionsForContext(displayContext));
      applySeriesOptions(displayContext);
      applySeriesPriceScale(displayContext);
      applyWatermarkOptions(displayContext);
    },
    readState() {
      return {
        engineType: 'lightweight-charts',
        mounted: Boolean(chart),
        barCount: bars.length,
        fullBarCount,
        visibleRange: visibleRange ? { ...visibleRange } : null,
      };
    },
    destroy() {
      clearNativeInteractionSettleTimer();
      emitNativeInteraction(false);
      unbindEngineInputMarkers();
      unsubscribeVisibleRange?.();
      unsubscribeCrosshair?.();
      unsubscribeVisibleRange = null;
      unsubscribeCrosshair = null;
      watermark?.detach?.();
      chart?.remove?.();
      host?.replaceChildren?.();
      if (host) {
        delete host.__v5OnCrosshairChange;
        delete host.__v5OnNativeInteractionChange;
      }
      chart = null;
      series = null;
      watermark = null;
      host = null;
      canvas = null;
      engineSurface = null;
      debugPlot = null;
      bars = [];
      visibleRange = null;
      pendingCrosshair = null;
      crosshairFrame = null;
      lastCrosshairKey = '';
      nativeInteractionActive = false;
      nativeInteractionType = null;
    },
  };
}

export function createChartEngineAdapter({
  engine = globalThis.LightweightCharts,
  documentRef = globalThis.document,
} = {}) {
  if (engine?.createChart) {
    if (!documentRef?.createElement) {
      throw new Error('Chart engine adapter requires a document for Lightweight Charts shell.');
    }
    return createLightweightInstance({ engine, documentRef });
  }
  if (!documentRef?.createElement) {
    throw new Error('Chart engine adapter requires a document for DOM fallback.');
  }
  return createFallbackInstance({ documentRef });
}
