import { createChartAdapterVisibleReceipt } from '../chart-snapshot-application/public.js';
import { readViewportIntent } from '../viewport-runtime/public.js';
import { createAdapterSnapshot } from './adapter-snapshot.js';
import { failLightweightAdapter } from './adapter-error.js';
import { maximumDisplayGapMs } from './chart-data.js';
import { createChartStagePlanner } from './chart-stage-planner.js';
import { createLightweightChartSurface } from './chart-surface.js';
import { createAdapterCrosshairInteraction } from './crosshair-interaction.js';
import { createCrosshairPresentationIndex } from './crosshair-presentation.js';
import { planVisibleLogicalRange } from './logical-range-plan.js';
import { createNativeViewportInteraction } from './native-viewport-interaction.js';
import { requirePaintedCandles, requireTailUpdatePaint } from './paint-gate.js';
import { createPaneTimeLocationChartPort } from './pane-time-location-adapter.js';
import { createSegmentedCandleSeriesWriter } from './segmented-candle-series.js';
import {
  captureAdapterVisibleState,
  restoreAdapterScaleState,
  restoreAdapterVisibleState,
} from './visible-state-rollback.js';
import { createWorkstationPresentationController } from './workstation-presentation-controller.js';

function requirePort(port) {
  for (const method of ['captureManual', 'project', 'reset', 'snapshot']) {
    if (typeof port?.[method] !== 'function') {
      failLightweightAdapter('CHART_VIEWPORT_PORT_INVALID', `Viewport port requires ${method}().`);
    }
  }
  return port;
}

function requireAdapterEnvironment(host, viewportPort) {
  if (!(host instanceof HTMLElement)) {
    failLightweightAdapter('CHART_HOST_INVALID', 'Chart host must be an HTMLElement.');
  }
  return requirePort(viewportPort);
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
  const viewport = requireAdapterEnvironment(host, viewportPort);
  const interactionIndex = createCrosshairPresentationIndex();
  const surface = createLightweightChartSurface({ host, interactionIndex, onTruncationSelect });
  const { chart, currentPriceName, futureTimeAxisSeries, priceScale, series, truncationInteraction } = surface;
  let adapterRevision = 0;
  let appliedBars = Object.freeze([]), appliedData = Object.freeze([]);
  let appliedFutureTimeAxisData = Object.freeze([]), appliedTimeframeDurationMs = null;
  let barCount = 0, maximumAppliedDisplayGapMs = 0, seriesDataRevision = 0;
  let disposed = false, visibleMutationToken = 0;
  const stagedApplications = new WeakMap();
  const onSeriesDataChanged = () => { seriesDataRevision += 1; };
  const candleSeriesWriter = createSegmentedCandleSeriesWriter({
    chart, onDataChanged: onSeriesDataChanged, primarySeries: series,
  });
  const presentation = createWorkstationPresentationController({
    candleSeriesWriter, chart, currentPriceName, host, priceScale, truncationInteraction,
  });

  const crosshairInteraction = createAdapterCrosshairInteraction({
    candleSeriesWriter, chart, host, onCrosshairMove, presentation: interactionIndex, series,
  });
  const stagePlanner = createChartStagePlanner({
    readAccepted: () => Object.freeze({ bars: appliedBars, data: appliedData }),
    readPresentation: presentation.snapshot,
  });

  function applyViewport() {
    if (barCount < 1) return null;
    const projection = viewport.project(barCount - 1);
    const visibleRange = planVisibleLogicalRange(projection, barCount);
    chart.timeScale().setVisibleLogicalRange(visibleRange);
    candleSeriesWriter.setVisibleLogicalRange(visibleRange, projection.origin);
    host.dataset.logicalFrom = String(visibleRange.from);
    host.dataset.logicalTo = String(visibleRange.to);
    host.dataset.latestOffsetBars = String(projection.latestOffsetBars);
    host.dataset.spanBars = String(projection.spanBars);
    host.dataset.viewportOrigin = projection.origin;
    host.dataset.viewportRevision = String(projection.revision);
    return projection;
  }

  function applyPaneTimeLocationRange(range, plan) {
    candleSeriesWriter.showAll();
    chart.timeScale().setVisibleLogicalRange(range);
    viewport.captureManual({ latestLogicalIndex: barCount - 1, range });
    priceScale.setAutoScale(true);
    const value = readViewportIntent(viewport.snapshot());
    host.dataset.logicalFrom = String(range.from);
    host.dataset.logicalTo = String(range.to);
    host.dataset.latestOffsetBars = String(value.latestOffsetBars);
    host.dataset.spanBars = String(value.spanBars);
    host.dataset.viewportOrigin = value.origin;
    host.dataset.viewportRevision = String(value.revision);
    host.dataset.lastLocatedDisplayEpochMs = String(plan.displayEpochMs);
    host.dataset.lastLocatedMarketEpochMs = String(plan.marketEpochMs);
    onViewportIntent(value);
    // Programmatic location can expose unloaded history just like a native
    // drag. Publish the accepted range through the same owner boundary so the
    // caller can fill it without waiting for a later mouse event.
    onHistoryBoundary(Object.freeze({ from: range.from, to: range.to }));
  }

  const paneTimeLocation = createPaneTimeLocationChartPort({
    applyVisibleRange: applyPaneTimeLocationRange,
    chart,
    readBars: () => appliedBars,
    readTimeframeDurationMs: () => appliedTimeframeDurationMs,
  });

  const nativeViewportInteraction = createNativeViewportInteraction({
    chart,
    host,
    isDisposed: () => disposed,
    onHistoryBoundary,
    onNativeViewportGesture: candleSeriesWriter.showAll,
    onViewportIntent,
    priceScale,
    readBarCount: () => barCount,
    requestFrame,
    viewport,
  });

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
    if (!record || record.state === 'rolled-back') return;
    if (record.state === 'finalized') {
      failLightweightAdapter(
        'CHART_ADAPTER_STAGE_INVALID',
        'A finalized Chart stage cannot roll back.',
      );
    }
    if (record.state === 'staged') {
      record.state = 'rolled-back';
      return;
    }
    if (disposed || record.token !== visibleMutationToken) {
      record.state = 'rolled-back';
      return;
    }
    const dataRevisionBefore = seriesDataRevision;
    candleSeriesWriter.rollback(record.writerMutation);
    const restored = restoreAdapterVisibleState({
      chart,
      futureTimeAxisSeries,
      host,
      priceScale,
      state: record.previous,
    });
    adapterRevision = restored.adapterRevision;
    appliedBars = restored.appliedBars;
    appliedData = restored.appliedData;
    appliedFutureTimeAxisData = restored.appliedFutureTimeAxisData;
    appliedTimeframeDurationMs = record.previousTimeframeDurationMs;
    barCount = restored.barCount;
    maximumAppliedDisplayGapMs = restored.maximumDisplayGapMs;
    if (record.presentationMutated) {
      presentation.apply(
        record.previousSettings,
        record.previousPriceIncrement,
        record.previousInstrumentLabel,
        appliedData,
      );
    }
    presentation.syncCurrentPrice(appliedData);
    interactionIndex.setBars(appliedBars);
    await requireTailUpdatePaint({ changed: () => seriesDataRevision > dataRevisionBefore, requestFrame });
    if (disposed || record.token !== visibleMutationToken) {
      record.state = 'rolled-back';
      return;
    }
    restoreAdapterScaleState({ chart, priceScale, state: record.previous });
    record.state = 'rolled-back';
  }

  async function mutateAndPaint(data, futureTimeAxisData, mutation, record, expectCandles = true) {
    const startedAt = performance.now();
    const dataRevisionBefore = seriesDataRevision;
    futureTimeAxisSeries.setData(futureTimeAxisData);
    record.writerMutation = candleSeriesWriter.mutate(data, mutation);
    presentation.syncCurrentPrice(data);
    const mutationEndedAt = performance.now();
    barCount = data.length;
    applyViewport();
    if (!expectCandles) {
      await requireTailUpdatePaint({ changed: () => seriesDataRevision > dataRevisionBefore, requestFrame });
      host.dataset.lastPaintProof = 'series-empty-two-frame';
    } else if (mutation.kind === 'tail-update' || mutation.kind === 'append-replace') {
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
    appliedTimeframeDurationMs = null;
    barCount = 0;
    maximumAppliedDisplayGapMs = 0;
    interactionIndex.setBars(appliedBars);
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
    if (mutation.kind === 'full-replace') {
      maximumAppliedDisplayGapMs = maximumDisplayGapMs(context.staged.data);
    } else if (mutation.kind === 'append-replace') {
      maximumAppliedDisplayGapMs = Math.max(
        maximumAppliedDisplayGapMs,
        maximumDisplayGapMs(context.staged.data, appliedData.length - 1),
      );
    } else {
      maximumAppliedDisplayGapMs = Math.max(
        maximumAppliedDisplayGapMs,
        context.staged.data.length > appliedData.length
          ? (context.staged.data.at(-1).time - appliedData.at(-1).time) * 1_000
          : 0,
      );
    }
    appliedBars = context.workspaceSnapshot.bars;
    appliedData = context.staged.data;
    appliedFutureTimeAxisData = context.staged.futureTimeAxisData;
    appliedTimeframeDurationMs = context.workspaceSnapshot.provenance.displayTimeframeDurationMs;
    interactionIndex.setBars(appliedBars);
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
    stagedApplications.set(staged, {
      previous: null, state: 'staged', token: null, writerMutation: null,
    });
    return staged;
  }

  async function applyStaged(context, { commit, expectCandles, kind }) {
    if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
    if (!context.isCurrent()) failLightweightAdapter('CHART_ADAPTER_STALE', 'Chart application is stale.');
    const record = stagedApplications.get(context.staged);
    if (!record || record.state !== 'staged' || context.staged.kind !== kind) {
      failLightweightAdapter('CHART_ADAPTER_STAGE_INVALID', 'Chart stage is missing, mismatched, or already applied.');
    }
    const previousPresentation = presentation.snapshot();
    record.previous = captureVisibleState();
    record.previousPriceIncrement = previousPresentation.priceIncrement;
    record.previousInstrumentLabel = previousPresentation.instrumentLabel;
    record.previousSettings = previousPresentation.settings;
    record.previousTimeframeDurationMs = appliedTimeframeDurationMs;
    record.token = ++visibleMutationToken;
    record.state = 'applying';
    try {
      record.presentationMutated = context.staged.priceIncrement !== null
        && (context.staged.priceIncrement !== previousPresentation.priceIncrement
          || context.staged.instrumentLabel !== previousPresentation.instrumentLabel);
      if (record.presentationMutated) {
        presentation.apply(
          previousPresentation.settings,
          context.staged.priceIncrement,
          context.staged.instrumentLabel,
          appliedData,
        );
      }
      const timing = await mutateAndPaint(
        context.staged.data,
        context.staged.futureTimeAxisData,
        context.staged.mutation,
        record,
        expectCandles,
      );
      if (!context.isCurrent()) failLightweightAdapter('CHART_ADAPTER_STALE', 'Chart application is stale.');
      const result = commit(context, timing);
      record.state = 'applied';
      delete host.dataset.lastApplyError;
      return result;
    } catch (error) {
      try { await rollback(context.staged); } catch { /* The original apply failure remains authoritative. */ }
      host.dataset.lastApplyError = `${error?.code ?? error?.name ?? 'error'}:${error?.message ?? error}`;
      throw error;
    }
  }

  return Object.freeze({
    applyEmpty: (context) => applyStaged(context, {
      commit: (_context, timing) => commitEmpty(timing), expectCandles: false, kind: 'empty',
    }),
    applyVisible: (context) => applyStaged(context, {
      commit: commitVisible, expectCandles: true, kind: 'ready',
    }),
    finalizeVisible(staged) {
      const record = stagedApplications.get(staged);
      if (!record || record.state !== 'applied') {
        failLightweightAdapter(
          'CHART_ADAPTER_STAGE_INVALID',
          'Only an applied Chart stage can finalize.',
        );
      }
      candleSeriesWriter.finalize(record.writerMutation);
      record.state = 'finalized';
      record.previous = null;
    },
    async rollbackVisible(staged) { await rollback(staged); },
    dispose() {
      if (disposed) return;
      disposed = true;
      visibleMutationToken += 1;
      nativeViewportInteraction.dispose();
      candleSeriesWriter.dispose();
      crosshairInteraction.dispose();
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
    applyWorkstationSettings(settings, priceIncrement, instrumentLabel) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
      const current = presentation.snapshot();
      presentation.apply(
        settings,
        priceIncrement === undefined ? current.priceIncrement : priceIncrement,
        instrumentLabel === undefined ? current.instrumentLabel : instrumentLabel,
        appliedData,
      );
    },
    clearCrosshairPosition() {
      return crosshairInteraction.clear();
    },
    crosshairObservation: crosshairInteraction.observe,
    projectCrosshair: crosshairInteraction.project,
    locateMarketTime: paneTimeLocation.locateMarketTime,
    resolveTimeLocationSelection: paneTimeLocation.resolveSelection,
    setTruncationSelection(active) { truncationInteraction.setActive(active); },
    snapshot: () => createAdapterSnapshot({
      adapterRevision,
      appliedData,
      appliedFutureTimeAxisData,
      barCount,
      chart,
      currentPriceName,
      host,
      libraryVersion: surface.libraryVersion,
      priceScale,
      series,
      seriesDataRevision,
      seriesWriterSnapshot: candleSeriesWriter.snapshot(),
      viewport,
    }),
    async stage({
      chartDataCache = null,
      futureTimeAxisDataCache = null,
      identity,
      instrumentLabel,
      priceIncrement,
      signal,
      seriesMutationPlanMemo = null,
      workspaceSnapshot,
    }) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
      return registerStage(stagePlanner.ready({
        chartDataCache,
        futureTimeAxisDataCache,
        identity,
        instrumentLabel,
        priceIncrement,
        seriesMutationPlanMemo,
        signal,
        workspaceSnapshot,
      }));
    },
    async stageEmpty({
      identity,
      instrumentLabel,
      priceIncrement,
      signal,
    }) {
      if (disposed) failLightweightAdapter('CHART_ADAPTER_DISPOSED', 'Chart adapter is disposed.');
      return registerStage(stagePlanner.empty({ identity, instrumentLabel, priceIncrement, signal }));
    },
  });
}
