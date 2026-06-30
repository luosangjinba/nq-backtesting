import { DEFAULT_DISPLAY_TIMEZONE, DEFAULT_EXCHANGE_TIMEZONE } from '../contracts/timezone-contracts.js';
import { DEFAULT_CHART_PRESENTATION_SETTINGS } from '../contracts/chart-presentation-contracts.js';
import { formatDisplayTimestamp } from '../domain/timezone-format.js';

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
  return {
    displayTimezone: context.displayTimezone || DEFAULT_DISPLAY_TIMEZONE,
    exchangeTimezone: context.exchangeTimezone || DEFAULT_EXCHANGE_TIMEZONE,
    timeFormat: context.timeFormat || DEFAULT_CHART_PRESENTATION_SETTINGS.timeFormat,
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
  };
}

function applyFallbackPresentation(canvas, context) {
  canvas.dataset.crosshairReadout = context.showCrosshairReadout ? 'true' : 'false';
  canvas.dataset.rightOffsetBars = String(context.rightOffsetBars);
  canvas.style.paddingTop = `${context.margins.topPercent}%`;
  canvas.style.paddingBottom = `${context.margins.bottomPercent}%`;
  canvas.style.paddingRight = `${context.rightOffsetBars * 10}px`;
}

function applyFallbackMetadata(canvas, metadata = {}) {
  Object.entries(metadata).forEach(([key, value]) => {
    canvas.dataset[key] = String(value);
  });
}

function lightweightOptionsForContext(context) {
  return {
    handleScroll: { ...LIGHTWEIGHT_REPLAY_SCROLL },
    handleScale: { ...LIGHTWEIGHT_REPLAY_SCALE },
    timeScale: {
      ...LIGHTWEIGHT_REPLAY_TIMESCALE,
      rightOffset: context.rightOffsetBars,
    },
  };
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
    candle.className = `chart-candle ${bar.close >= bar.open ? 'is-up' : 'is-down'}`;
    candle.style.top = `${top}%`;
    candle.style.height = `${height}%`;
    candle.title = `${formatChartBarTime(bar, context)} O:${bar.open} H:${bar.high} L:${bar.low} C:${bar.close}`;
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

  function createSeries(nextChart) {
    if (typeof nextChart.addCandlestickSeries === 'function') {
      return nextChart.addCandlestickSeries();
    }
    if (typeof nextChart.addSeries === 'function' && engine.CandlestickSeries) {
      return nextChart.addSeries(engine.CandlestickSeries);
    }
    throw new Error('Lightweight Charts candlestick series API is unavailable.');
  }

  function markUserInput() {
    lastUserInputAt = Date.now();
  }

  function emitShellCrosshair(event) {
    const candidates = visibleBarsForRange(bars, visibleRange);
    if (!candidates.length || typeof host?.dataset === 'undefined') return;
    const rect = canvas?.getBoundingClientRect?.();
    const left = Number(rect?.left || 0);
    const width = Math.max(1, Number(rect?.width || canvas?.clientWidth || 1));
    const ratio = Math.min(1, Math.max(0, (Number(event.clientX || left) - left) / width));
    const index = Math.min(candidates.length - 1, Math.max(0, Math.round(ratio * (candidates.length - 1))));
    const bar = candidates[index];
    host.__v5OnCrosshairChange?.({
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
    canvas.addEventListener('mousemove', emitShellCrosshair);
    canvas.addEventListener('mouseleave', clearShellCrosshair);
  }

  function unbindEngineInputMarkers() {
    if (!canvas?.removeEventListener) return;
    canvas.removeEventListener('mousedown', markUserInput, true);
    canvas.removeEventListener('touchstart', markUserInput, true);
    canvas.removeEventListener('wheel', markUserInput, true);
    canvas.removeEventListener('mousemove', emitShellCrosshair);
    canvas.removeEventListener('mouseleave', clearShellCrosshair);
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

  return {
    engineType: 'lightweight-charts',
    mount(nextHost, options = {}) {
      host = nextHost;
      displayContext = normalizeContext(options.displayContext);
      host.__v5OnCrosshairChange = typeof options.onCrosshairChange === 'function'
        ? options.onCrosshairChange
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
          background: { color: '#111' },
          textColor: '#d8dde8',
        },
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
      const timeScale = chart.timeScale?.();
      if (typeof timeScale?.subscribeVisibleTimeRangeChange === 'function') {
        const handler = (range) => {
          if (!range || !options.onVisibleRangeChange || !hasRecentUserInput()) return;
          options.onVisibleRangeChange({
            from: timestampSeconds(range.from, 'chart engine visible range from'),
            to: timestampSeconds(range.to, 'chart engine visible range to'),
          });
        };
        timeScale.subscribeVisibleTimeRangeChange(handler);
        unsubscribeVisibleRange = () => timeScale.unsubscribeVisibleTimeRangeChange?.(handler);
      }
      if (typeof chart.subscribeCrosshairMove === 'function' && typeof options.onCrosshairChange === 'function') {
        const handler = (param = {}) => {
          if (!param?.time) {
            options.onCrosshairChange({ active: false });
            return;
          }
          const seriesBar = param.seriesData?.get?.(series);
          const bar = toChartBar(seriesBar || barForEngineTime(param.time));
          options.onCrosshairChange({
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
        applyFallbackPresentation(canvas, displayContext);
        applyLightweightMetadata(canvas, displayContext);
        applyFallbackMetadata(canvas, metadata);
        canvas.dataset.renderedBarCount = String(bars.length);
        canvas.dataset.fullBarCount = String(fullBarCount);
        renderHiddenDebugBars(documentRef, debugPlot, bars, displayContext, fullBarCount);
      }
      series?.setData(bars.map(toEngineBar));
    },
    setVisibleRange(range) {
      visibleRange = range ? { ...range } : null;
      if (visibleRange && typeof chart?.timeScale?.().setVisibleRange === 'function') {
        chart.timeScale().setVisibleRange({ ...visibleRange });
      }
    },
    setPresentation(context = {}) {
      displayContext = normalizeContext(context);
      if (canvas) {
        applyFallbackPresentation(canvas, displayContext);
        applyLightweightMetadata(canvas, displayContext);
      }
      chart?.applyOptions?.(lightweightOptionsForContext(displayContext));
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
      unbindEngineInputMarkers();
      unsubscribeVisibleRange?.();
      unsubscribeCrosshair?.();
      unsubscribeVisibleRange = null;
      unsubscribeCrosshair = null;
      chart?.remove?.();
      host?.replaceChildren?.();
      if (host) {
        delete host.__v5OnCrosshairChange;
      }
      chart = null;
      series = null;
      host = null;
      canvas = null;
      engineSurface = null;
      debugPlot = null;
      bars = [];
      visibleRange = null;
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
