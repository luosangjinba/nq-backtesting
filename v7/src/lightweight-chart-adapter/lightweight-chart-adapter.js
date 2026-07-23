import {
  CandlestickSeries,
  createChart,
  LineSeries,
  version as lightweightChartsVersion,
} from '../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.mjs';
import { createChartAdapterVisibleReceipt } from '../chart-snapshot-application/public.js';
import { readViewportIntent } from '../viewport-runtime/public.js';
import { createWorkstationSettings, readWorkstationSettings } from '../workstation-settings/public.js';
import { failLightweightAdapter } from './adapter-error.js';
import { createCandleSeriesPresentation } from './candle-presentation.js';
import { CANDLE_OPTIONS, CHART_OPTIONS } from './chart-options.js';
import { createCrosshairPresentationIndex } from './crosshair-presentation.js';
import {
  createCurrentPriceNamePrimitive,
  createCurrentPriceSeriesPresentation,
} from './current-price-presentation.js';
import { createFutureTimeAxisData } from './future-time-axis.js';
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
  const currentPriceName = createCurrentPriceNamePrimitive();
  series.attachPrimitive(currentPriceName.primitive);
  const futureTimeAxisSeries = chart.addSeries(LineSeries, Object.freeze({
    crosshairMarkerVisible: false,
    lastValueVisible: false,
    lineVisible: false,
    priceLineVisible: false,
  }));
  const priceScale = chart.priceScale('right');
  const crosshairPresentation = createCrosshairPresentationIndex();
  const truncationInteraction = createReplayTruncationInteraction({
    chart, host, onSelect: onTruncationSelect,
  });
  host.dataset.libraryVersion = lightweightChartsVersion();
  host.dataset.gridVisible = 'true';
  let adapterRevision = 0;
  let appliedBars = Object.freeze([]);
  let appliedData = Object.freeze([]);
  let appliedFutureTimeAxisData = Object.freeze([]);
  let barCount = 0;
  let disposed = false;
  let captureToken = 0;
  let nativePointerActive = false;
  let pointerWithinHost = false;
  let seriesDataRevision = 0;
  let maximumAppliedDisplayGapMs = 0;
  let presentationInstrumentLabel = '';
  let presentationPriceIncrement = '0.01';
  let presentationSettings = createWorkstationSettings();
  let visibleMutationToken = 0;
  const stagedApplications = new WeakMap();
  const onSeriesDataChanged = () => { seriesDataRevision += 1; };
  series.subscribeDataChanged(onSeriesDataChanged);

  function syncCurrentPrice(data = appliedData) {
    currentPriceName.update({
      bar: data.at(-1) ?? null,
      instrumentLabel: presentationInstrumentLabel,
      settings: presentationSettings,
    });
  }

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
      appliedFutureTimeAxisData,
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
    const restored = restoreAdapterVisibleState({
      chart,
      futureTimeAxisSeries,
      host,
      priceScale,
      series,
      state: record.previous,
    });
    adapterRevision = restored.adapterRevision;
    appliedBars = restored.appliedBars;
    appliedData = restored.appliedData;
    appliedFutureTimeAxisData = restored.appliedFutureTimeAxisData;
    barCount = restored.barCount;
    maximumAppliedDisplayGapMs = restored.maximumDisplayGapMs;
    if (record.presentationMutated) {
      applyWorkstationSettings(
        record.previousSettings,
        record.previousPriceIncrement,
        record.previousInstrumentLabel,
      );
    }
    syncCurrentPrice();
    truncationInteraction.setBars(appliedBars);
    crosshairPresentation.setBars(appliedBars);
    await requireTailUpdatePaint({ changed: () => seriesDataRevision > dataRevisionBefore, requestFrame });
    if (disposed || record.token !== visibleMutationToken) return;
    restoreAdapterScaleState({ chart, priceScale, state: record.previous });
  }

  async function mutateAndPaint(data, futureTimeAxisData, expectCandles = true) {
    const startedAt = performance.now();
    const mutation = planSeriesMutation(appliedData, data);
    const dataRevisionBefore = seriesDataRevision;
    futureTimeAxisSeries.setData(futureTimeAxisData);
    if (mutation.kind === 'tail-update') series.update({ ...mutation.bar });
    else series.setData(data);
    syncCurrentPrice(data);
    const mutationEndedAt = performance.now();
    barCount = data.length;
    applyViewport();
    if (!expectCandles) {
      await requireTailUpdatePaint({ changed: () => seriesDataRevision > dataRevisionBefore, requestFrame });
      host.dataset.lastPaintProof = 'series-empty-two-frame';
    } else if (mutation.kind === 'tail-update') {
      await requireTailUpdatePaint({ changed: () => seriesDataRevision > dataRevisionBefore, requestFrame });
      host.dataset.lastPaintProof = 'series-change-two-frame';
    } else {
      host.dataset.lastPaintProof = await requirePaintedCandles(chart, requestFrame, {
        changed: () => seriesDataRevision > dataRevisionBefore,
        latestBar: data.at(-1),
        latestLogicalIndex: data.length - 1,
        series,
      });
    }
    return Object.freeze({ mutation, mutationEndedAt, paintedAt: performance.now(), startedAt });
  }

  function commitEmpty(timing) {
    const { mutation, mutationEndedAt, paintedAt, startedAt } = timing;
    adapterRevision += 1;
    appliedBars = Object.freeze([]);
    appliedData = Object.freeze([]);
    appliedFutureTimeAxisData = Object.freeze([]);
    barCount = 0;
    maximumAppliedDisplayGapMs = 0;
    truncationInteraction.setBars(appliedBars);
    crosshairPresentation.setBars(appliedBars);
    host.dataset.barCount = '0';
    host.dataset.futureTimeAxisPointCount = '0';
    host.dataset.lastApplyMs = (paintedAt - startedAt).toFixed(3);
    host.dataset.lastMutationMode = mutation.kind;
    host.dataset.lastMutationMs = (mutationEndedAt - startedAt).toFixed(3);
    host.dataset.lastPaintMs = (paintedAt - mutationEndedAt).toFixed(3);
    host.dataset.maximumDisplayGapMs = '0';
    host.dataset.painted = 'true';
    host.dataset.visibleRevision = String(adapterRevision);
    for (const field of [
      'displayTimeframeId', 'instrumentId', 'latestDisplayEpochMs',
      'latestFutureTimeAxisEpochMs', 'sessionHoursMode', 'visibleThroughEpochMs',
    ]) delete host.dataset[field];
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
    appliedFutureTimeAxisData = context.staged.futureTimeAxisData;
    truncationInteraction.setBars(appliedBars);
    crosshairPresentation.setBars(appliedBars);
    host.dataset.barCount = String(barCount);
    host.dataset.futureTimeAxisPointCount = String(appliedFutureTimeAxisData.length);
    host.dataset.displayTimeframeId = context.workspaceSnapshot.provenance.displayTimeframeId;
    host.dataset.instrumentId = context.workspaceSnapshot.provenance.instrumentId;
    host.dataset.lastApplyMs = (paintedAt - startedAt).toFixed(3);
    host.dataset.lastMutationMode = mutation.kind;
    host.dataset.lastMutationMs = (mutationEndedAt - startedAt).toFixed(3);
    host.dataset.lastPaintMs = (paintedAt - mutationEndedAt).toFixed(3);
    host.dataset.maximumDisplayGapMs = String(maximumAppliedDisplayGapMs);
    host.dataset.latestDisplayEpochMs = String(context.staged.data.at(-1).time * 1_000);
    const latestFutureTime = context.staged.futureTimeAxisData.at(-1)?.time ?? null;
    if (latestFutureTime === null) delete host.dataset.latestFutureTimeAxisEpochMs;
    else host.dataset.latestFutureTimeAxisEpochMs = String(latestFutureTime * 1_000);
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

  function registerStage(value) {
    const staged = Object.freeze(value);
    stagedApplications.set(staged, { mutated: false, previous: null, rolledBack: false, token: null });
    return staged;
  }

  async function applyStaged(context, { commit, expectCandles, kind }) {
    if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
    if (!context.isCurrent()) failLightweightAdapter('CHART_ADAPTER_STALE', 'Chart application is stale.');
    const record = stagedApplications.get(context.staged);
    if (!record || record.mutated || context.staged.kind !== kind) {
      failLightweightAdapter('CHART_ADAPTER_STAGE_INVALID', 'Chart stage is missing, mismatched, or already applied.');
    }
    record.previous = captureVisibleState();
    record.previousPriceIncrement = presentationPriceIncrement;
    record.previousInstrumentLabel = presentationInstrumentLabel;
    record.previousSettings = presentationSettings;
    record.token = ++visibleMutationToken;
    record.mutated = true;
    try {
      record.presentationMutated = context.staged.priceIncrement !== null
        && (context.staged.priceIncrement !== presentationPriceIncrement
          || context.staged.instrumentLabel !== presentationInstrumentLabel);
      if (record.presentationMutated) {
        applyWorkstationSettings(
          presentationSettings,
          context.staged.priceIncrement,
          context.staged.instrumentLabel,
        );
      }
      const timing = await mutateAndPaint(
        context.staged.data,
        context.staged.futureTimeAxisData,
        expectCandles,
      );
      if (!context.isCurrent()) failLightweightAdapter('CHART_ADAPTER_STALE', 'Chart application is stale.');
      const result = commit(context, timing);
      delete host.dataset.lastApplyError;
      return result;
    } catch (error) {
      try { await rollback(context.staged); } catch { /* The original apply failure remains authoritative. */ }
      host.dataset.lastApplyError = `${error?.code ?? error?.name ?? 'error'}:${error?.message ?? error}`;
      throw error;
    }
  }

  function applyWorkstationSettings(
    settings,
    priceIncrement = presentationPriceIncrement,
    instrumentLabel = presentationInstrumentLabel,
  ) {
    if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
    const value = readWorkstationSettings(settings);
    const previousSettings = presentationSettings;
    const previousIncrement = presentationPriceIncrement;
    try {
      chart.applyOptions({
        grid: {
          horzLines: { visible: value.canvas.gridVisible },
          vertLines: { visible: value.canvas.gridVisible },
        },
      });
      const { customNameOnlyVisible: _customNameOnlyVisible, ...currentPriceOptions }
        = createCurrentPriceSeriesPresentation(settings, instrumentLabel);
      series.applyOptions({
        ...createCandleSeriesPresentation(settings, priceIncrement),
        ...currentPriceOptions,
      });
    } catch (error) {
      try {
        const previous = readWorkstationSettings(previousSettings);
        chart.applyOptions({
          grid: {
            horzLines: { visible: previous.canvas.gridVisible },
            vertLines: { visible: previous.canvas.gridVisible },
          },
        });
        const { customNameOnlyVisible: _customNameOnlyVisible, ...previousCurrentPriceOptions }
          = createCurrentPriceSeriesPresentation(previousSettings, presentationInstrumentLabel);
        series.applyOptions({
          ...createCandleSeriesPresentation(previousSettings, previousIncrement),
          ...previousCurrentPriceOptions,
        });
        syncCurrentPrice();
      } catch { /* Preserve the first native option failure. */ }
      throw error;
    }
    presentationSettings = settings;
    presentationPriceIncrement = priceIncrement;
    presentationInstrumentLabel = instrumentLabel;
    syncCurrentPrice();
    host.dataset.bodyVisible = String(value.candles.bodyVisible);
    host.dataset.bordersVisible = String(value.candles.bordersVisible);
    host.dataset.gridVisible = String(value.canvas.gridVisible);
    host.dataset.pricePrecision = String(value.candles.pricePrecision);
    host.dataset.currentPriceLineVisible = String(value.currentPrice.lineVisible);
    host.dataset.currentPriceNameVisible = String(value.currentPrice.nameVisible);
    host.dataset.currentPriceValueVisible = String(value.currentPrice.valueVisible);
    host.dataset.wicksVisible = String(value.candles.wicksVisible);
  }

  return Object.freeze({
    applyEmpty: (context) => applyStaged(context, {
      commit: (_context, timing) => commitEmpty(timing), expectCandles: false, kind: 'empty',
    }),
    applyVisible: (context) => applyStaged(context, {
      commit: commitVisible, expectCandles: true, kind: 'ready',
    }),
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
      series.detachPrimitive(currentPriceName.primitive);
      chart.remove();
    },
    resetView(latestOffsetBars) {
      viewport.reset(latestOffsetBars);
      priceScale.setAutoScale(true);
      const projection = applyViewport();
      if (projection) onViewportIntent(readViewportIntent(viewport.snapshot()));
    },
    applyWorkstationSettings,
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
      const latestCandleTime = appliedData.at(-1)?.time ?? null;
      const firstFutureTime = appliedFutureTimeAxisData[0]?.time ?? null;
      const seriesOptions = series.options();
      return Object.freeze({
        adapterRevision,
        barCount,
        firstFutureTimeAxisCoordinate: firstFutureTime === null
          ? null : chart.timeScale().timeToCoordinate(firstFutureTime),
        futureTimeAxisPointCount: appliedFutureTimeAxisData.length,
        lastApplyMs: Number(host.dataset.lastApplyMs || 0),
        lastMutationMode: host.dataset.lastMutationMode ?? null,
        lastMutationMs: Number(host.dataset.lastMutationMs || 0),
        lastPaintMs: Number(host.dataset.lastPaintMs || 0),
        lastPaintProof: host.dataset.lastPaintProof ?? null,
        libraryVersion: lightweightChartsVersion(),
        latestCandleCoordinate: latestCandleTime === null
          ? null : chart.timeScale().timeToCoordinate(latestCandleTime),
        latestFutureTimeAxisEpochMs: appliedFutureTimeAxisData.at(-1)?.time * 1_000 ?? null,
        logicalRange: chart.timeScale().getVisibleLogicalRange(),
        painted: host.dataset.painted === 'true',
        priceRange: priceScale.getVisibleRange(),
        gridVisible: host.dataset.gridVisible === 'true',
        bodyVisible: host.dataset.bodyVisible === 'true',
        bordersVisible: host.dataset.bordersVisible === 'true',
        pricePrecision: host.dataset.pricePrecision ?? 'auto',
        seriesDataRevision,
        seriesPresentation: Object.freeze({
          borderDownColor: seriesOptions.borderDownColor,
          borderUpColor: seriesOptions.borderUpColor,
          borderVisible: seriesOptions.borderVisible,
          downColor: seriesOptions.downColor,
          currentPriceNameOnly: currentPriceName.snapshot(),
          lastValueVisible: seriesOptions.lastValueVisible,
          priceFormat: Object.freeze({
            minMove: seriesOptions.priceFormat.minMove,
            precision: seriesOptions.priceFormat.precision ?? null,
            type: seriesOptions.priceFormat.type,
          }),
          priceLineColor: seriesOptions.priceLineColor,
          priceLineVisible: seriesOptions.priceLineVisible,
          title: seriesOptions.title,
          upColor: seriesOptions.upColor,
          wickDownColor: seriesOptions.wickDownColor,
          wickUpColor: seriesOptions.wickUpColor,
          wickVisible: seriesOptions.wickVisible,
        }),
        wicksVisible: host.dataset.wicksVisible === 'true',
        viewportIntent: viewport.snapshot(),
      });
    },
    async stage({
      identity,
      instrumentLabel = presentationInstrumentLabel,
      priceIncrement = presentationPriceIncrement,
      signal,
      workspaceSnapshot,
    }) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
      const data = chartData(workspaceSnapshot);
      return registerStage({
        data,
        futureTimeAxisData: createFutureTimeAxisData({
          durationMs: workspaceSnapshot.provenance.displayTimeframeDurationMs,
          latestDisplayEpochMs: data.at(-1).time * 1_000,
        }),
        identity,
        instrumentLabel,
        kind: 'ready',
        priceIncrement,
        signal,
        workspaceSnapshot,
      });
    },
    async stageEmpty({
      identity,
      instrumentLabel = presentationInstrumentLabel,
      priceIncrement = presentationPriceIncrement,
      signal,
    }) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
      return registerStage({
        data: Object.freeze([]),
        futureTimeAxisData: Object.freeze([]),
        identity,
        instrumentLabel,
        kind: 'empty',
        priceIncrement,
        signal,
        workspaceSnapshot: null,
      });
    },
  });
}
