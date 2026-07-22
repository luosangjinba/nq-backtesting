import {
  CandlestickSeries,
  createChart,
  version as lightweightChartsVersion,
} from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import { createChartAdapterVisibleReceipt } from '../chart-snapshot-application/public.js';
import { readViewportIntent } from '../viewport-runtime/public.js';
import { failLightweightAdapter } from './adapter-error.js';
import { CANDLE_OPTIONS, CHART_OPTIONS } from './chart-options.js';
import { createCrosshairPresentationIndex } from './crosshair-presentation.js';
import { planVisibleLogicalRange } from './logical-range-plan.js';
import { requirePaintedCandles, requireTailUpdatePaint } from './paint-gate.js';
import { applyPriceScaleWheel } from './price-scale-wheel.js';
import { createReplayTruncationInteraction } from './replay-truncation-interaction.js';
import { planSeriesMutation } from './series-update-plan.js';
import {
  captureAdapterVisibleState,
  restoreAdapterScaleState,
  restoreAdapterVisibleState,
} from './visible-state-rollback.js';

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

function maximumDisplayGapMs(data) {
  let maximum = 0;
  for (let index = 1; index < data.length; index += 1) {
    maximum = Math.max(maximum, (data[index].time - data[index - 1].time) * 1_000);
  }
  return maximum;
}

/** Construct the only real Lightweight Charts series writer for one pane. */
export function createLightweightChartAdapter({
  host,
  onHistoryBoundary = () => {},
  onCrosshairMove = () => {},
  onTruncationSelect = () => {},
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
  const crosshairPresentation = createCrosshairPresentationIndex();
  const truncationInteraction = createReplayTruncationInteraction({
    chart, host, onSelect: onTruncationSelect,
  });
  host.dataset.libraryVersion = lightweightChartsVersion();
  let adapterRevision = 0;
  let appliedBars = Object.freeze([]);
  let appliedData = Object.freeze([]);
  let barCount = 0;
  let disposed = false;
  let captureToken = 0;
  let nativePointerActive = false;
  let pointerWithinHost = false;
  let seriesDataRevision = 0;
  let maximumAppliedDisplayGapMs = 0;
  let visibleMutationToken = 0;
  const stagedApplications = new WeakMap();
  const onSeriesDataChanged = () => { seriesDataRevision += 1; };
  series.subscribeDataChanged(onSeriesDataChanged);

  function recordCrosshairObservation(value, origin) {
    host.dataset.crosshairDisplayEpochMs = value.displayEpochMs === null
      ? 'none' : String(value.displayEpochMs);
    host.dataset.crosshairOrigin = origin;
    host.dataset.crosshairState = value.state;
    return value;
  }

  const onChartCrosshairMove = (event) => {
    if (!pointerWithinHost && !host.matches(':hover')) return;
    const displayEpochMs = typeof event.time === 'number' ? Math.round(event.time * 1_000) : null;
    const hasSeriesBar = displayEpochMs !== null && event.seriesData?.has(series) === true;
    const value = hasSeriesBar
      ? crosshairPresentation.selectedAt(displayEpochMs)
      : crosshairPresentation.latest();
    onCrosshairMove(recordCrosshairObservation(value, 'native'));
  };
  chart.subscribeCrosshairMove(onChartCrosshairMove);

  const onCrosshairEnter = () => { pointerWithinHost = true; };
  const onCrosshairLeave = () => {
    pointerWithinHost = false;
    onCrosshairMove(recordCrosshairObservation(crosshairPresentation.latest(), 'native'));
  };
  host.addEventListener('pointerenter', onCrosshairEnter);
  host.addEventListener('pointerleave', onCrosshairLeave);

  function applyViewport() {
    if (barCount < 1) return null;
    const projection = viewport.project(barCount - 1);
    const visibleRange = planVisibleLogicalRange(projection, barCount);
    chart.timeScale().setVisibleLogicalRange(visibleRange);
    host.dataset.logicalFrom = String(visibleRange.from);
    host.dataset.logicalTo = String(visibleRange.to);
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
    host.dataset.wheelEventCount = String(Number(host.dataset.wheelEventCount || 0) + 1);
    if (applyPriceScaleWheel({ event, host, priceScale })) return;
    void captureNativeViewport();
  };
  host.addEventListener('wheel', onWheel, { capture: true, passive: false });
  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('mousedown', onPointerDown, true);
  window.addEventListener('pointerup', onPointerUp, true);
  window.addEventListener('mouseup', onPointerUp, true);

  function captureVisibleState() {
    return captureAdapterVisibleState({
      adapterRevision,
      appliedBars,
      appliedData,
      barCount,
      chart,
      host,
      maximumDisplayGapMs: maximumAppliedDisplayGapMs,
      priceScale,
    });
  }

  async function rollback(staged) {
    const record = stagedApplications.get(staged);
    if (!record || !record.mutated || record.rolledBack) return;
    record.rolledBack = true;
    if (disposed || record.token !== visibleMutationToken) return;
    const dataRevisionBefore = seriesDataRevision;
    const restored = restoreAdapterVisibleState({ chart, host, priceScale, series, state: record.previous });
    adapterRevision = restored.adapterRevision;
    appliedBars = restored.appliedBars;
    appliedData = restored.appliedData;
    barCount = restored.barCount;
    maximumAppliedDisplayGapMs = restored.maximumDisplayGapMs;
    truncationInteraction.setBars(appliedBars);
    crosshairPresentation.setBars(appliedBars);
    await requireTailUpdatePaint({ changed: () => seriesDataRevision > dataRevisionBefore, requestFrame });
    if (disposed || record.token !== visibleMutationToken) return;
    restoreAdapterScaleState({ chart, priceScale, state: record.previous });
  }

  async function mutateAndPaint(data) {
    const startedAt = performance.now();
    const mutation = planSeriesMutation(appliedData, data);
    const dataRevisionBefore = seriesDataRevision;
    if (mutation.kind === 'tail-update') series.update({ ...mutation.bar });
    else series.setData(data);
    const mutationEndedAt = performance.now();
    barCount = data.length;
    applyViewport();
    if (mutation.kind === 'tail-update') {
      await requireTailUpdatePaint({ changed: () => seriesDataRevision > dataRevisionBefore, requestFrame });
      host.dataset.lastPaintProof = 'series-change-two-frame';
    } else {
      await requirePaintedCandles(chart, requestFrame);
      host.dataset.lastPaintProof = 'screenshot-candle-pixels';
    }
    return Object.freeze({ mutation, mutationEndedAt, paintedAt: performance.now(), startedAt });
  }

  function commitVisible(context, timing) {
    const { mutation, mutationEndedAt, paintedAt, startedAt } = timing;
    adapterRevision += 1;
    maximumAppliedDisplayGapMs = mutation.kind === 'full-replace'
      ? maximumDisplayGapMs(context.staged.data)
      : Math.max(maximumAppliedDisplayGapMs, context.staged.data.length > appliedData.length
        ? (context.staged.data.at(-1).time - appliedData.at(-1).time) * 1_000
        : 0);
    appliedBars = context.workspaceSnapshot.bars;
    appliedData = context.staged.data;
    truncationInteraction.setBars(appliedBars);
    crosshairPresentation.setBars(appliedBars);
    host.dataset.barCount = String(barCount);
    host.dataset.displayTimeframeId = context.workspaceSnapshot.provenance.displayTimeframeId;
    host.dataset.instrumentId = context.workspaceSnapshot.provenance.instrumentId;
    host.dataset.lastApplyMs = (paintedAt - startedAt).toFixed(3);
    host.dataset.lastMutationMode = mutation.kind;
    host.dataset.lastMutationMs = (mutationEndedAt - startedAt).toFixed(3);
    host.dataset.lastPaintMs = (paintedAt - mutationEndedAt).toFixed(3);
    host.dataset.maximumDisplayGapMs = String(maximumAppliedDisplayGapMs);
    host.dataset.latestDisplayEpochMs = String(context.staged.data.at(-1).time * 1_000);
    host.dataset.painted = 'true';
    host.dataset.sessionHoursMode = context.workspaceSnapshot.provenance.sessionHoursMode;
    host.dataset.visibleThroughEpochMs = String(context.workspaceSnapshot.provenance.visibleThroughEpochMs);
    host.dataset.visibleRevision = String(adapterRevision);
    return createChartAdapterVisibleReceipt({
      adapterRevision,
      identity: context.identity,
      workspaceSnapshot: context.workspaceSnapshot,
    });
  }

  return Object.freeze({
    async applyVisible(context) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
      if (!context.isCurrent()) failLightweightAdapter('CHART_ADAPTER_STALE', 'Chart application is stale.');
      const record = stagedApplications.get(context.staged);
      if (!record || record.mutated) {
        failLightweightAdapter('CHART_ADAPTER_STAGE_INVALID', 'Chart stage is missing or was already applied.');
      }
      record.previous = captureVisibleState();
      record.token = ++visibleMutationToken;
      record.mutated = true;
      try {
        const timing = await mutateAndPaint(context.staged.data);
        if (!context.isCurrent()) failLightweightAdapter('CHART_ADAPTER_STALE', 'Chart application is stale.');
        const receipt = commitVisible(context, timing);
        delete host.dataset.lastApplyError;
        return receipt;
      } catch (error) {
        try { await rollback(context.staged); } catch { /* The original apply failure remains authoritative. */ }
        host.dataset.lastApplyError = `${error?.code ?? error?.name ?? 'error'}:${error?.message ?? error}`;
        throw error;
      }
    },
    async discard(staged) { await rollback(staged); },
    dispose() {
      if (disposed) return;
      disposed = true;
      captureToken += 1;
      visibleMutationToken += 1;
      host.removeEventListener('wheel', onWheel, true);
      host.removeEventListener('pointerenter', onCrosshairEnter);
      host.removeEventListener('pointerleave', onCrosshairLeave);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('mousedown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('mouseup', onPointerUp, true);
      series.unsubscribeDataChanged(onSeriesDataChanged);
      chart.unsubscribeCrosshairMove(onChartCrosshairMove);
      truncationInteraction.dispose();
      chart.remove();
    },
    resetView(latestOffsetBars) {
      viewport.reset(latestOffsetBars);
      priceScale.setAutoScale(true);
      const projection = applyViewport();
      if (projection) onViewportIntent(readViewportIntent(viewport.snapshot()));
    },
    clearCrosshairPosition() {
      chart.clearCrosshairPosition();
      return recordCrosshairObservation(crosshairPresentation.latest(), 'cleared');
    },
    crosshairObservation(displayEpochMs = null) {
      return displayEpochMs === null
        ? crosshairPresentation.latest()
        : crosshairPresentation.selectedAt(displayEpochMs);
    },
    projectCrosshair(displayEpochMs) {
      const value = crosshairPresentation.selectedAt(displayEpochMs);
      if (!value.bar || !Number.isSafeInteger(displayEpochMs)) return value;
      chart.setCrosshairPosition(value.bar.close, displayEpochMs / 1_000, series);
      return recordCrosshairObservation(value, 'projected');
    },
    setTruncationSelection(active) { truncationInteraction.setActive(active); },
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
      const staged = Object.freeze({ data: chartData(workspaceSnapshot), identity, signal, workspaceSnapshot });
      stagedApplications.set(staged, { mutated: false, previous: null, rolledBack: false, token: null });
      return staged;
    },
  });
}
