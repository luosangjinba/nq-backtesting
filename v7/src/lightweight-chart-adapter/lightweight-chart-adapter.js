import {
  CandlestickSeries,
  createChart,
  version as lightweightChartsVersion,
} from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import { createChartAdapterVisibleReceipt } from '../chart-snapshot-application/public.js';
import { readViewportIntent } from '../viewport-runtime/public.js';
import { failLightweightAdapter } from './adapter-error.js';
import { CANDLE_OPTIONS, CHART_OPTIONS } from './chart-options.js';
import { requirePaintedCandles, requireTailUpdatePaint } from './paint-gate.js';
import { applyPriceScaleWheel } from './price-scale-wheel.js';
import { planSeriesMutation } from './series-update-plan.js';

function requirePort(port) {
  for (const method of ['captureManual', 'project', 'reset', 'snapshot']) {
    if (typeof port?.[method] !== 'function') {
      failLightweightAdapter('CHART_VIEWPORT_PORT_INVALID', `Viewport port requires ${method}().`);
    }
  }
  return port;
}

function chartData(workspaceSnapshot) {
  return Object.freeze(workspaceSnapshot.bars.map((bar) => Object.freeze({
    close: bar.close,
    high: bar.high,
    low: bar.low,
    open: bar.open,
    time: bar.displayEpochMs / 1_000,
  })));
}

/** Construct the only real Lightweight Charts series writer for one pane. */
export function createLightweightChartAdapter({
  host,
  onHistoryBoundary = () => {},
  onViewportIntent = () => {},
  requestFrame = window.requestAnimationFrame.bind(window),
  viewportPort,
}) {
  if (!(host instanceof HTMLElement)) {
    failLightweightAdapter('CHART_HOST_INVALID', 'Chart host must be an HTMLElement.');
  }
  const viewport = requirePort(viewportPort);
  const chart = createChart(host, CHART_OPTIONS);
  const series = chart.addSeries(CandlestickSeries, CANDLE_OPTIONS);
  const priceScale = chart.priceScale('right');
  host.dataset.libraryVersion = lightweightChartsVersion();
  let adapterRevision = 0;
  let appliedData = Object.freeze([]);
  let barCount = 0;
  let disposed = false;
  let captureToken = 0;
  let nativePointerActive = false;
  let seriesDataRevision = 0;
  const onSeriesDataChanged = () => { seriesDataRevision += 1; };
  series.subscribeDataChanged(onSeriesDataChanged);

  function applyViewport() {
    if (barCount < 1) return null;
    const projection = viewport.project(barCount - 1);
    const visibleFrom = Math.max(-0.5, projection.from);
    chart.timeScale().setVisibleLogicalRange({ from: visibleFrom, to: projection.to });
    host.dataset.logicalFrom = String(visibleFrom);
    host.dataset.logicalTo = String(projection.to);
    host.dataset.latestOffsetBars = String(projection.latestOffsetBars);
    host.dataset.spanBars = String(projection.spanBars);
    host.dataset.viewportOrigin = projection.origin;
    host.dataset.viewportRevision = String(projection.revision);
    return projection;
  }

  async function captureNativeViewport() {
    const token = ++captureToken;
    await new Promise((resolve) => requestFrame(resolve));
    if (disposed || token !== captureToken || barCount < 1) return;
    const range = chart.timeScale().getVisibleLogicalRange();
    if (!range) return;
    host.dataset.logicalFrom = String(range.from);
    host.dataset.logicalTo = String(range.to);
    viewport.captureManual({ latestLogicalIndex: barCount - 1, range });
    const value = readViewportIntent(viewport.snapshot());
    host.dataset.latestOffsetBars = String(value.latestOffsetBars);
    host.dataset.spanBars = String(value.spanBars);
    host.dataset.viewportOrigin = value.origin;
    host.dataset.viewportRevision = String(value.revision);
    onViewportIntent(value);
    onHistoryBoundary(Object.freeze({ from: range.from, to: range.to }));
  }

  const onPointerDown = (event) => {
    if (host.contains(event.target)) nativePointerActive = true;
  };
  const onPointerUp = () => {
    if (!nativePointerActive) return;
    nativePointerActive = false;
    void captureNativeViewport();
  };
  const onWheel = (event) => {
    if (applyPriceScaleWheel({ event, host, priceScale })) return;
    void captureNativeViewport();
  };
  host.addEventListener('wheel', onWheel, { capture: true, passive: false });
  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('mousedown', onPointerDown, true);
  window.addEventListener('pointerup', onPointerUp, true);
  window.addEventListener('mouseup', onPointerUp, true);

  return Object.freeze({
    async applyVisible(context) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
      if (!context.isCurrent()) failLightweightAdapter('CHART_ADAPTER_STALE', 'Chart application is stale.');
      let mutation;
      let mutationEndedAt;
      let paintedAt;
      const startedAt = performance.now();
      try {
        mutation = planSeriesMutation(appliedData, context.staged.data);
        const dataRevisionBefore = seriesDataRevision;
        if (mutation.kind === 'tail-update') series.update({ ...mutation.bar });
        else series.setData(context.staged.data);
        mutationEndedAt = performance.now();
        barCount = context.staged.data.length;
        applyViewport();
        if (mutation.kind === 'tail-update') {
          await requireTailUpdatePaint({
            changed: () => seriesDataRevision > dataRevisionBefore,
            requestFrame,
          });
          host.dataset.lastPaintProof = 'series-change-two-frame';
        } else {
          await requirePaintedCandles(chart, requestFrame);
          host.dataset.lastPaintProof = 'screenshot-candle-pixels';
        }
        paintedAt = performance.now();
        delete host.dataset.lastApplyError;
      } catch (error) {
        host.dataset.lastApplyError = `${error?.code ?? error?.name ?? 'error'}:${error?.message ?? error}`;
        throw error;
      }
      if (!context.isCurrent()) failLightweightAdapter('CHART_ADAPTER_STALE', 'Chart application is stale.');
      adapterRevision += 1;
      appliedData = context.staged.data;
      host.dataset.barCount = String(barCount);
      host.dataset.lastApplyMs = (paintedAt - startedAt).toFixed(3);
      host.dataset.lastMutationMode = mutation.kind;
      host.dataset.lastMutationMs = (mutationEndedAt - startedAt).toFixed(3);
      host.dataset.lastPaintMs = (paintedAt - mutationEndedAt).toFixed(3);
      host.dataset.latestDisplayEpochMs = String(context.staged.data.at(-1).time * 1_000);
      host.dataset.painted = 'true';
      host.dataset.visibleRevision = String(adapterRevision);
      return createChartAdapterVisibleReceipt({
        adapterRevision,
        identity: context.identity,
        workspaceSnapshot: context.workspaceSnapshot,
      });
    },
    async discard() {},
    dispose() {
      if (disposed) return;
      disposed = true;
      captureToken += 1;
      host.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('mousedown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('mouseup', onPointerUp, true);
      series.unsubscribeDataChanged(onSeriesDataChanged);
      chart.remove();
    },
    resetView(latestOffsetBars) {
      viewport.reset(latestOffsetBars);
      priceScale.setAutoScale(true);
      const projection = applyViewport();
      if (projection) onViewportIntent(readViewportIntent(viewport.snapshot()));
    },
    snapshot() {
      return Object.freeze({
        adapterRevision,
        barCount,
        lastApplyMs: Number(host.dataset.lastApplyMs || 0),
        lastMutationMode: host.dataset.lastMutationMode ?? null,
        lastMutationMs: Number(host.dataset.lastMutationMs || 0),
        lastPaintMs: Number(host.dataset.lastPaintMs || 0),
        lastPaintProof: host.dataset.lastPaintProof ?? null,
        libraryVersion: lightweightChartsVersion(),
        logicalRange: chart.timeScale().getVisibleLogicalRange(),
        painted: host.dataset.painted === 'true',
        priceRange: priceScale.getVisibleRange(),
        viewportIntent: viewport.snapshot(),
      });
    },
    async stage({ identity, signal, workspaceSnapshot }) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
      return Object.freeze({ data: chartData(workspaceSnapshot), identity, signal, workspaceSnapshot });
    },
  });
}
