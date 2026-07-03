import {
  normalizeContext,
  timestampSeconds,
  toEngineBar,
} from './chart-engine-context.js';
import { createLightweightCrosshairBridge } from './chart-engine-lightweight-crosshair.js';
import { createLightweightInteractionTracker } from './chart-engine-lightweight-interaction.js';
import {
  applyFallbackMetadata,
  applyLightweightPresentation,
} from './chart-engine-dom-metadata.js';
import {
  crosshairOptionsForContext,
  gridOptionsForContext,
  lightweightOptionsForContext,
  lightweightSeriesOptionsForContext,
  priceScaleMarginsForContext,
  watermarkOptionsForContext,
} from './chart-engine-lightweight-options.js';
import {
  followLogicalRangeForBars,
  manualLogicalRangeForVisibleRange,
  visibleRangeWithLogicalWhitespace,
} from './chart-engine-range-projection.js';
import {
  createRuntimeCanvas,
  renderHiddenDebugBars,
} from './chart-engine-fallback-rendering.js';

function createSeries(engine, nextChart, displayContext) {
  const seriesOptions = lightweightSeriesOptionsForContext(displayContext);
  if (typeof nextChart.addCandlestickSeries === 'function') {
    return nextChart.addCandlestickSeries(seriesOptions);
  }
  if (typeof nextChart.addSeries === 'function' && engine.CandlestickSeries) {
    return nextChart.addSeries(engine.CandlestickSeries, seriesOptions);
  }
  throw new Error('Lightweight Charts candlestick series API is unavailable.');
}

export function createLightweightInstance({ engine, documentRef }) {
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
  let suppressRuntimeVisibleRangeEcho = false;

  const crosshairBridge = createLightweightCrosshairBridge({
    getBars: () => bars,
    getHost: () => host,
    getSeries: () => series,
  });

  const interactionTracker = createLightweightInteractionTracker({
    getCanvas: () => canvas,
    getDocument: () => documentRef,
    getHost: () => host,
    onCrosshairLeave: crosshairBridge.clear,
    onUserInput: () => {
      suppressRuntimeVisibleRangeEcho = false;
    },
  });

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

  function applyHostMetadata(nextMetadata = {}) {
    Object.entries(nextMetadata).forEach(([key, value]) => {
      if (host?.dataset) {
        host.dataset[key] = String(value);
      }
    });
  }

  function applyCanvasMetadata() {
    if (!canvas) return;
    applyLightweightPresentation(canvas, displayContext);
    applyFallbackMetadata(canvas, metadata);
    canvas.dataset.renderedBarCount = String(bars.length);
    canvas.dataset.fullBarCount = String(fullBarCount);
    renderHiddenDebugBars(documentRef, debugPlot, bars, displayContext, fullBarCount);
  }

  function readHostSize() {
    const target = canvas || host;
    const box = target?.getBoundingClientRect?.();
    const width = Math.floor(Number(box?.width || target?.clientWidth || host?.clientWidth || 0));
    const height = Math.floor(Number(box?.height || target?.clientHeight || host?.clientHeight || 0));
    return { width, height };
  }

  function recordResizeMetadata({ width, height }) {
    if (host?.dataset) {
      host.dataset.chartResizeWidth = String(width);
      host.dataset.chartResizeHeight = String(height);
    }
    if (canvas?.dataset) {
      canvas.dataset.chartResizeWidth = String(width);
      canvas.dataset.chartResizeHeight = String(height);
    }
    if (engineSurface?.dataset) {
      engineSurface.dataset.chartResizeWidth = String(width);
      engineSurface.dataset.chartResizeHeight = String(height);
    }
  }

  function resizeToHost() {
    const size = readHostSize();
    recordResizeMetadata(size);
    if (!chart || size.width <= 0 || size.height <= 0) return false;
    chart.resize?.(size.width, size.height, true);
    return true;
  }

  function queueResizeToHost() {
    const schedule = typeof globalThis.requestAnimationFrame === 'function'
      ? globalThis.requestAnimationFrame
      : (callback) => setTimeout(callback, 0);
    schedule(() => resizeToHost());
  }

  function recordVisibleLogicalRange(logicalRange) {
    if (!canvas) return;
    canvas.dataset.visibleLogicalRangeFrom = String(logicalRange.from);
    canvas.dataset.visibleLogicalRangeTo = String(logicalRange.to);
  }

  function clearVisibleLogicalRange() {
    if (!canvas) return;
    delete canvas.dataset.visibleLogicalRangeFrom;
    delete canvas.dataset.visibleLogicalRangeTo;
  }

  function bindVisibleRangeSubscription(options, timeScale) {
    if (typeof timeScale?.subscribeVisibleTimeRangeChange !== 'function') return;
    const handler = (range) => {
      if (
        !range
        || !options.onVisibleRangeChange
        || suppressRuntimeVisibleRangeEcho
        || !interactionTracker.hasRecentUserInput()
      ) {
        return;
      }
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

  function bindCrosshairSubscription(options) {
    if (typeof chart?.subscribeCrosshairMove !== 'function' || typeof options.onCrosshairChange !== 'function') {
      return;
    }
    const handler = crosshairBridge.handleCrosshairMove;
    chart.subscribeCrosshairMove(handler);
    unsubscribeCrosshair = () => chart.unsubscribeCrosshairMove?.(handler);
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
      interactionTracker.bind();
      host.replaceChildren?.();
      host.dataset.chartRuntimeMounted = 'true';
      host.dataset.chartEngine = 'lightweight-charts';
      host.append(canvas);
      const replayOptions = lightweightOptionsForContext(displayContext);
      const initialSize = readHostSize();
      chart = engine.createChart(engineSurface, {
        autoSize: false,
        width: Math.max(1, initialSize.width),
        height: Math.max(1, initialSize.height),
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
      series = createSeries(engine, chart, displayContext);
      applySeriesPriceScale(displayContext);
      applyWatermarkOptions(displayContext);
      bindVisibleRangeSubscription(options, chart.timeScale?.());
      bindCrosshairSubscription(options);
      resizeToHost();
      queueResizeToHost();
    },
    resizeToHost,
    requestResizeToHost: queueResizeToHost,
    setBars(nextBars = [], options = {}) {
      bars = [...nextBars];
      fullBarCount = Number(options.fullBarCount ?? bars.length);
      if (options.displayContext) {
        displayContext = normalizeContext(options.displayContext);
      }
      metadata = options.metadata ? { ...options.metadata } : metadata;
      applyHostMetadata(metadata);
      applyCanvasMetadata();
      applySeriesOptions(displayContext);
      applySeriesPriceScale(displayContext);
      resizeToHost();
      series?.setData(bars.map(toEngineBar));
      if (options.followViewport) {
        const logicalRange = followLogicalRangeForBars(bars, displayContext);
        if (logicalRange && typeof chart?.timeScale?.().setVisibleLogicalRange === 'function') {
          suppressRuntimeVisibleRangeEcho = true;
          chart.timeScale().setVisibleLogicalRange(logicalRange);
          recordVisibleLogicalRange(logicalRange);
        }
      } else {
        clearVisibleLogicalRange();
      }
      queueResizeToHost();
    },
    appendBars(nextBars = [], options = {}) {
      const appendedBars = [...nextBars];
      if (!appendedBars.length) {
        return;
      }
      bars = [
        ...bars,
        ...appendedBars,
      ];
      fullBarCount = Number(options.fullBarCount ?? fullBarCount + appendedBars.length);
      if (options.displayContext) {
        displayContext = normalizeContext(options.displayContext);
      }
      metadata = options.metadata ? { ...options.metadata } : metadata;
      applyHostMetadata(metadata);
      applyCanvasMetadata();
      applySeriesOptions(displayContext);
      applySeriesPriceScale(displayContext);
      resizeToHost();
      appendedBars.forEach((bar) => series?.update?.(toEngineBar(bar)));
      if (options.followViewport) {
        const logicalRange = followLogicalRangeForBars(bars, displayContext);
        if (logicalRange && typeof chart?.timeScale?.().setVisibleLogicalRange === 'function') {
          suppressRuntimeVisibleRangeEcho = true;
          chart.timeScale().setVisibleLogicalRange(logicalRange);
          recordVisibleLogicalRange(logicalRange);
        }
      }
      queueResizeToHost();
    },
    setMetadata(nextMetadata = {}) {
      metadata = { ...metadata, ...nextMetadata };
      applyHostMetadata(metadata);
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
        recordVisibleLogicalRange(logicalRange);
        return;
      }
      if (typeof chart?.timeScale?.().setVisibleRange === 'function') {
        chart.timeScale().setVisibleRange({ ...visibleRange });
        clearVisibleLogicalRange();
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
      resizeToHost();
      queueResizeToHost();
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
      interactionTracker.reset();
      interactionTracker.unbind();
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
      crosshairBridge.reset();
    },
  };
}
