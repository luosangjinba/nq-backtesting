import { DEFAULT_DISPLAY_TIMEZONE, DEFAULT_EXCHANGE_TIMEZONE } from '../contracts/timezone-contracts.js';
import { DEFAULT_CHART_PRESENTATION_SETTINGS } from '../contracts/chart-presentation-contracts.js';
import { formatDisplayTimestamp } from '../domain/timezone-format.js';

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

function createFallbackInstance({ documentRef }) {
  let host = null;
  let canvas = null;
  let bars = [];
  let fullBarCount = 0;
  let displayContext = normalizeContext();
  let visibleRange = null;

  function render() {
    if (!host || !canvas) return;
    canvas.replaceChildren();
    applyFallbackPresentation(canvas, displayContext);
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
      canvas = documentRef.createElement('div');
      canvas.className = 'chart-runtime-canvas';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Chart runtime canvas');
      host.replaceChildren();
      host.dataset.chartRuntimeMounted = 'true';
      host.dataset.chartEngine = 'dom-fallback';
      host.append(canvas);
      render();
    },
    setBars(nextBars = [], options = {}) {
      bars = [...nextBars];
      fullBarCount = Number(options.fullBarCount ?? bars.length);
      if (options.displayContext) {
        displayContext = normalizeContext(options.displayContext);
      }
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
      host?.replaceChildren();
      host = null;
      canvas = null;
      bars = [];
      visibleRange = null;
    },
  };
}

function createLightweightInstance({ engine }) {
  let chart = null;
  let series = null;
  let host = null;
  let bars = [];
  let fullBarCount = 0;
  let visibleRange = null;
  let unsubscribeVisibleRange = null;

  function createSeries(nextChart) {
    if (typeof nextChart.addCandlestickSeries === 'function') {
      return nextChart.addCandlestickSeries();
    }
    if (typeof nextChart.addSeries === 'function' && engine.CandlestickSeries) {
      return nextChart.addSeries(engine.CandlestickSeries);
    }
    throw new Error('Lightweight Charts candlestick series API is unavailable.');
  }

  return {
    engineType: 'lightweight-charts',
    mount(nextHost, options = {}) {
      host = nextHost;
      host.replaceChildren?.();
      host.dataset.chartRuntimeMounted = 'true';
      host.dataset.chartEngine = 'lightweight-charts';
      chart = engine.createChart(host, {
        autoSize: true,
        layout: {
          background: { color: '#111' },
          textColor: '#d8dde8',
        },
        rightPriceScale: {
          borderColor: '#2b2f36',
        },
        timeScale: {
          borderColor: '#2b2f36',
          rightOffset: normalizeContext(options.displayContext).rightOffsetBars,
        },
      });
      series = createSeries(chart);
      const timeScale = chart.timeScale?.();
      if (typeof timeScale?.subscribeVisibleTimeRangeChange === 'function') {
        const handler = (range) => {
          if (!range || !options.onVisibleRangeChange) return;
          options.onVisibleRangeChange({
            from: timestampSeconds(range.from, 'chart engine visible range from'),
            to: timestampSeconds(range.to, 'chart engine visible range to'),
          });
        };
        timeScale.subscribeVisibleTimeRangeChange(handler);
        unsubscribeVisibleRange = () => timeScale.unsubscribeVisibleTimeRangeChange?.(handler);
      }
    },
    setBars(nextBars = [], options = {}) {
      bars = [...nextBars];
      fullBarCount = Number(options.fullBarCount ?? bars.length);
      series?.setData(bars.map(toEngineBar));
    },
    setVisibleRange(range) {
      visibleRange = range ? { ...range } : null;
      if (visibleRange && typeof chart?.timeScale?.().setVisibleRange === 'function') {
        chart.timeScale().setVisibleRange({ ...visibleRange });
      }
    },
    setPresentation(context = {}) {
      const displayContext = normalizeContext(context);
      chart?.applyOptions?.({
        timeScale: {
          rightOffset: displayContext.rightOffsetBars,
        },
      });
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
      unsubscribeVisibleRange?.();
      unsubscribeVisibleRange = null;
      chart?.remove?.();
      chart = null;
      series = null;
      host = null;
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
    return createLightweightInstance({ engine });
  }
  if (!documentRef?.createElement) {
    throw new Error('Chart engine adapter requires a document for DOM fallback.');
  }
  return createFallbackInstance({ documentRef });
}

