import {
  normalizeContext,
  timestampSeconds,
  toChartBar,
  toEngineBar,
} from './chart-engine-context.js';
import { createFallbackInstance } from './chart-engine-fallback-adapter.js';
import {
  applyFallbackMetadata,
  applyLightweightPresentation,
  crosshairOptionsForContext,
  createRuntimeCanvas,
  gridOptionsForContext,
  LIGHTWEIGHT_REPLAY_TIMESCALE,
  lightweightOptionsForContext,
  lightweightSeriesOptionsForContext,
  manualLogicalRangeForVisibleRange,
  priceScaleMarginsForContext,
  renderHiddenDebugBars,
  visibleRangeWithLogicalWhitespace,
  followLogicalRangeForBars,
  watermarkOptionsForContext,
} from './chart-engine-presentation.js';

const LIGHTWEIGHT_WHEEL_SETTLE_MS = 260;

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
