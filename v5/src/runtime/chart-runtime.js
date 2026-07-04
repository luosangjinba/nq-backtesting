import { registerCommand } from './commands.js';
import { subscribeEvent } from './events.js';
import { CHART_COMMANDS, CHART_EVENTS } from '../contracts/chart-contracts.js';
import { DISPLAY_TIMEZONE_EVENTS } from '../contracts/timezone-contracts.js';
import { CHART_PRESENTATION_EVENTS } from '../contracts/chart-presentation-contracts.js';
import { createChartEngineAdapter } from './chart-engine-adapter.js';
import { buildChartDisplayContext } from './chart-runtime-display-context.js';
import { createChartRuntimeHostSync } from './chart-runtime-host-sync.js';
import {
  DEFAULT_CHART_PANE_ID,
  cloneChartStateSnapshot,
  createChartPaneStateStore,
  normalizePaneId,
} from './chart-runtime-pane-state.js';
import {
  normalizeBars,
  normalizeCrosshair,
  normalizeGoToPayload,
  normalizeRange,
  normalizeViewportFollow,
  rangesEqual,
  readHostMetrics,
  timestampSeconds,
} from './chart-runtime-state.js';
import {
  clampVisibleRange,
  computePrefixDemand,
  computeRenderedBars,
  computeViewportDemand,
  deriveGoToRange,
  deriveManualAnchorRange,
  derivePanRange,
  deriveZoomRange,
} from './chart-runtime-viewport.js';
import { markReplayTrace } from './replay-trace.js';

export { CHART_COMMANDS, CHART_EVENTS };

export function createChartRuntime() {
  const mountedHosts = new Set();
  const mountedHostList = new Set();
  const mountedHostByPaneId = new Map();
  const chartAdapters = new Map();
  const paneStore = createChartPaneStateStore();
  const unregisterCallbacks = [];
  let rootElement = null;
  let observer = null;
  let emit = () => {};

  const hostSync = createChartRuntimeHostSync({
    state: paneStore.get(DEFAULT_CHART_PANE_ID),
    mountedHosts,
    mountedHostList,
    mountedHostByPaneId,
    chartAdapters,
    resolveStateForHost: (host) => stateForPane(host?.dataset?.chartPaneId),
  });

  function stateForPane(paneId = DEFAULT_CHART_PANE_ID) {
    return paneStore.get(paneId);
  }

  function updatePaneState(paneId, patch = {}) {
    return paneStore.updatePaneState(paneId, patch);
  }

  function recomputePaneDemands(paneId) {
    const normalizedPaneId = normalizePaneId(paneId);
    const sourceState = stateForPane(normalizedPaneId);
    sourceState.prefixDemand = computePrefixDemand(sourceState);
    sourceState.viewportDemand = computeViewportDemand(sourceState, { paneId: normalizedPaneId });
    return sourceState;
  }

  function emitPaneDemands(sourceState, paneId, { visibleRangeChanged = false } = {}) {
    const normalizedPaneId = normalizePaneId(paneId);
    if (visibleRangeChanged && sourceState.visibleRange) {
      emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, {
        paneId: normalizedPaneId,
        visibleRange: { ...sourceState.visibleRange },
      });
    }
    if (sourceState.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, {
        viewportDemand: structuredClone(sourceState.viewportDemand),
      });
    }
    if (sourceState.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, {
        prefixDemand: { ...sourceState.prefixDemand },
      });
    }
  }

  function syncPaneHosts(paneId) {
    const normalizedPaneId = normalizePaneId(paneId);
    const host = mountedHostByPaneId.get(normalizedPaneId);
    if (host?.isConnected) {
      hostSync.syncChartHost(host);
    }
  }

  function syncAllPaneHosts() {
    hostSync.pruneDisconnectedHosts();
    for (const host of mountedHostList) {
      if (host.isConnected) hostSync.syncChartHost(host);
    }
  }

  function syncPaneHostsAppended(paneId, previousPaneState, nextPaneState) {
    const normalizedPaneId = normalizePaneId(paneId);
    const host = mountedHostByPaneId.get(normalizedPaneId);
    if (host?.isConnected) {
      hostSync.syncChartHostAppend(host, previousPaneState, nextPaneState);
    }
  }

  function expectedDisplayRevisionMatches(sourceState, expectedDisplayRevision) {
    if (expectedDisplayRevision == null) return true;
    const expected = Math.floor(Number(expectedDisplayRevision));
    if (!Number.isFinite(expected)) return true;
    const current = Math.floor(Number(sourceState.displayContext?.displayRevision || 0));
    return current === expected;
  }

  function stalePaneWriteResult(normalizedPaneId, sourceState, expectedDisplayRevision) {
    return {
      paneId: normalizedPaneId,
      staleWrite: true,
      expectedDisplayRevision: Number(expectedDisplayRevision),
      displayRevision: Number(sourceState.displayContext?.displayRevision || 0),
      bars: [...(sourceState.bars || [])],
    };
  }

  function mountHost(host, { paneId } = {}) {
    if (!host) {
      throw new Error('chart host element is required.');
    }
    const nextPaneId = normalizePaneId(paneId || host.dataset?.chartPaneId);
    stateForPane(nextPaneId);
    const previousHost = mountedHostByPaneId.get(nextPaneId);
    if (previousHost && previousHost !== host) {
      chartAdapters.get(previousHost)?.destroy();
      chartAdapters.delete(previousHost);
      mountedHosts.delete(previousHost);
      mountedHostList.delete(previousHost);
    }
    for (const [existingPaneId, existingHost] of mountedHostByPaneId) {
      if (existingHost === host && existingPaneId !== nextPaneId) {
        mountedHostByPaneId.delete(existingPaneId);
      }
    }
    host.dataset.chartPaneId = nextPaneId;
    if (mountedHosts.has(host)) {
      mountedHostByPaneId.set(nextPaneId, host);
      hostSync.pruneDisconnectedHosts();
      const adapter = chartAdapters.get(host);
      adapter?.resizeToHost?.();
      adapter?.requestResizeToHost?.();
      return {
        paneId: nextPaneId,
        mounted: true,
        reused: true,
      };
    }
    mountedHosts.add(host);
    mountedHostList.add(host);
    mountedHostByPaneId.set(nextPaneId, host);
    const adapter = createChartEngineAdapter();
    chartAdapters.set(host, adapter);
    adapter.mount(host, {
      displayContext: stateForPane(nextPaneId).displayContext,
      onVisibleRangeChange: (visibleRange, metadata = {}) => {
        if (hostSync.getSyncState().applyingRuntimeVisibleRange) return;
        if (metadata.source === 'lightweight-native') {
          observeNativeVisibleRange(visibleRange, { paneId: nextPaneId });
          return;
        }
        setManualVisibleRange(visibleRange, { paneId: nextPaneId });
      },
      onCrosshairChange: (crosshair) => {
        updateCrosshair(crosshair, { paneId: nextPaneId });
      },
      onNativeInteractionChange: (interaction) => {
        updateNativeInteraction(interaction, { paneId: nextPaneId });
      },
    });
    hostSync.syncChartHost(host);
    emit(CHART_EVENTS.READY, { host, paneId: nextPaneId });
    return {
      paneId: nextPaneId,
      mounted: true,
      reused: false,
    };
  }

  function destroyMountedHost(host, paneId = host?.dataset?.chartPaneId) {
    if (!host) return false;
    const normalizedPaneId = normalizePaneId(paneId);
    chartAdapters.get(host)?.destroy();
    chartAdapters.delete(host);
    mountedHosts.delete(host);
    mountedHostList.delete(host);
    if (mountedHostByPaneId.get(normalizedPaneId) === host) {
      mountedHostByPaneId.delete(normalizedPaneId);
    }
    if (host.dataset) {
      delete host.dataset.chartRuntimeMounted;
    }
    return true;
  }

  function releasePanes({ paneIds } = {}) {
    const releaseResult = paneStore.releaseUnretained(paneIds);
    const retainedPaneIds = new Set(releaseResult.retainedPaneIds);
    const releasedHostPaneIds = [];

    for (const [paneId, host] of mountedHostByPaneId) {
      const normalizedPaneId = normalizePaneId(paneId);
      if (retainedPaneIds.has(normalizedPaneId)) continue;
      if (destroyMountedHost(host, normalizedPaneId)) {
        releasedHostPaneIds.push(normalizedPaneId);
      }
    }

    hostSync.pruneDisconnectedHosts();
    return {
      ...releaseResult,
      releasedHostPaneIds,
    };
  }

  function mountAvailableHosts() {
    rootElement
      ?.querySelectorAll('[data-chart-host]')
      .forEach((host) => mountHost(host, {
        paneId: host.dataset?.chartPaneId,
      }));
  }

  function updateBars(nextBars, { paneId, expectedDisplayRevision } = {}) {
    const normalizedPaneId = normalizePaneId(paneId);
    const sourceState = stateForPane(normalizedPaneId);
    if (!expectedDisplayRevisionMatches(sourceState, expectedDisplayRevision)) {
      return stalePaneWriteResult(normalizedPaneId, sourceState, expectedDisplayRevision);
    }
    sourceState.bars = [...nextBars];
    recomputePaneDemands(normalizedPaneId);
    syncPaneHosts(normalizedPaneId);
    emit(CHART_EVENTS.BARS_CHANGED, { paneId: normalizedPaneId, bars: [...sourceState.bars] });
    return { paneId: normalizedPaneId, bars: [...sourceState.bars] };
  }

  function appendBars(nextBars, { paneId, viewportFollow, rightEdgeLimit, expectedDisplayRevision } = {}) {
    const normalizedPaneId = normalizePaneId(paneId);
    const sourceState = stateForPane(normalizedPaneId);
    if (!expectedDisplayRevisionMatches(sourceState, expectedDisplayRevision)) {
      return stalePaneWriteResult(normalizedPaneId, sourceState, expectedDisplayRevision);
    }
    const normalizedBars = normalizeBars(nextBars);
    const normalizedRightEdgeLimit = rightEdgeLimit == null
      ? null
      : timestampSeconds(rightEdgeLimit, 'chart right edge limit');
    markReplayTrace('chartRuntime.append.start', {
      paneId: normalizedPaneId,
      appendedCount: normalizedBars.length,
      viewportFollow: Boolean(viewportFollow),
      rightEdgeLimit: normalizedRightEdgeLimit ?? '',
    });
    if (!normalizedBars.length) {
      markReplayTrace('chartRuntime.append.end', {
        paneId: normalizedPaneId,
        appendedCount: 0,
      });
      return {
        paneId: normalizedPaneId,
        bars: [...sourceState.bars],
      };
    }
    const previousPaneState = cloneChartStateSnapshot(sourceState);
    markReplayTrace('chartRuntime.append.state.start', { paneId: normalizedPaneId });
    if (Number.isFinite(normalizedRightEdgeLimit)) {
      sourceState.rightEdgeLimit = normalizedRightEdgeLimit;
      if (sourceState.visibleRange && sourceState.interaction.mode !== 'manual') {
        sourceState.visibleRange = clampVisibleRange(sourceState.visibleRange, sourceState.rightEdgeLimit);
      }
    }
    if (viewportFollow) {
      applyViewportFollowState(viewportFollow, { paneId: normalizedPaneId, sync: false });
    }
    sourceState.bars = [
      ...sourceState.bars,
      ...normalizedBars,
    ];
    recomputePaneDemands(normalizedPaneId);
    markReplayTrace('chartRuntime.append.state.end', {
      paneId: normalizedPaneId,
      fullBarCount: sourceState.bars.length,
    });
    markReplayTrace('chartRuntime.append.hostSync.start', { paneId: normalizedPaneId });
    syncPaneHostsAppended(
      normalizedPaneId,
      previousPaneState,
      cloneChartStateSnapshot(sourceState)
    );
    markReplayTrace('chartRuntime.append.hostSync.end', { paneId: normalizedPaneId });
    emit(CHART_EVENTS.BARS_CHANGED, { paneId: normalizedPaneId, bars: [...sourceState.bars] });
    markReplayTrace('chartRuntime.append.end', {
      paneId: normalizedPaneId,
      fullBarCount: sourceState.bars.length,
    });
    return { paneId: normalizedPaneId, bars: [...sourceState.bars] };
  }

  function connectedHostForPane(paneId = DEFAULT_CHART_PANE_ID) {
    const normalizedPaneId = normalizePaneId(paneId);
    const paneHost = mountedHostByPaneId.get(normalizedPaneId);
    if (paneHost?.isConnected) return paneHost;
    return [...mountedHostList].find((candidate) => candidate.isConnected);
  }

  function getViewportMetrics({ paneId } = {}) {
    const host = connectedHostForPane(paneId);
    return readHostMetrics(host);
  }

  function updateVisibleRange(payload = {}) {
    return setManualVisibleRange(payload, { paneId: payload.paneId });
  }

  function setRightEdgeLimit({ rightEdge, paneId } = {}) {
    const targetPaneIds = paneId
      ? [normalizePaneId(paneId)]
      : paneStore.entries().map(([currentPaneId]) => currentPaneId);
    const normalizedRightEdge = timestampSeconds(rightEdge, 'chart right edge limit');
    let result = null;
    for (const targetPaneId of targetPaneIds) {
      const sourceState = stateForPane(targetPaneId);
      sourceState.rightEdgeLimit = normalizedRightEdge;
      let visibleRangeChanged = false;

      if (sourceState.visibleRange && sourceState.interaction.mode !== 'manual') {
        const visibleRange = clampVisibleRange(sourceState.visibleRange, sourceState.rightEdgeLimit);
        visibleRangeChanged = !rangesEqual(sourceState.visibleRange, visibleRange);
        sourceState.visibleRange = visibleRange;
      }

      recomputePaneDemands(targetPaneId);
      syncPaneHosts(targetPaneId);
      emitPaneDemands(sourceState, targetPaneId, { visibleRangeChanged });

      result = {
        paneId: targetPaneId,
        rightEdgeLimit: sourceState.rightEdgeLimit,
        visibleRange: sourceState.visibleRange ? { ...sourceState.visibleRange } : null,
        interaction: structuredClone(sourceState.interaction),
        renderedBars: computeRenderedBars(sourceState),
        viewportDemand: sourceState.viewportDemand ? structuredClone(sourceState.viewportDemand) : null,
        prefixDemand: sourceState.prefixDemand ? { ...sourceState.prefixDemand } : null,
      };
    }
    return result;
  }

  function getVisibleRange(payload = {}) {
    const sourceState = stateForPane(payload.paneId);
    return {
      paneId: normalizePaneId(payload.paneId),
      rightEdgeLimit: sourceState.rightEdgeLimit,
      visibleRange: sourceState.visibleRange ? { ...sourceState.visibleRange } : null,
    };
  }

  function getPrefixDemand(payload = {}) {
    const normalizedPaneId = normalizePaneId(payload.paneId);
    const sourceState = recomputePaneDemands(normalizedPaneId);
    return {
      paneId: normalizedPaneId,
      prefixDemand: sourceState.prefixDemand ? { ...sourceState.prefixDemand } : null,
    };
  }

  function applyViewportFollowState(payload = {}, { paneId, sync = true } = {}) {
    const normalizedPaneId = normalizePaneId(paneId || payload.paneId);
    const sourceState = stateForPane(normalizedPaneId);
    const nextViewportFollow = normalizeViewportFollow(payload, sourceState);
    let visibleRangeChanged = false;
    if (payload.resume) {
      sourceState.visibleRange = null;
      sourceState.interaction = {
        mode: 'follow',
        manualVisibleRange: null,
      };
    } else {
      const manualAnchorRange = deriveManualAnchorRange(sourceState, nextViewportFollow);
      if (manualAnchorRange) {
        visibleRangeChanged = !rangesEqual(sourceState.visibleRange, manualAnchorRange)
          || !rangesEqual(sourceState.interaction.manualVisibleRange, manualAnchorRange);
        sourceState.visibleRange = { ...manualAnchorRange };
        sourceState.interaction = {
          mode: 'manual',
          manualVisibleRange: { ...manualAnchorRange },
        };
      }
    }
    sourceState.viewportFollow = sourceState.interaction.mode === 'manual' && !payload.resume
      ? {
        ...nextViewportFollow,
        enabled: false,
      }
      : nextViewportFollow;
    recomputePaneDemands(normalizedPaneId);
    if (!sync) {
      return { visibleRangeChanged };
    }
    syncPaneHosts(normalizedPaneId);
    emitPaneDemands(sourceState, normalizedPaneId, { visibleRangeChanged });
    return {
      paneId: normalizedPaneId,
      viewportFollow: { ...sourceState.viewportFollow },
      interaction: structuredClone(sourceState.interaction),
      visibleRange: sourceState.visibleRange ? { ...sourceState.visibleRange } : null,
      renderedBars: computeRenderedBars(sourceState),
      fullBarCount: sourceState.bars.length,
    };
  }

  function setViewportFollow(payload = {}) {
    return applyViewportFollowState(payload, { paneId: payload.paneId });
  }

  function setManualVisibleRange(payload = {}, { paneId } = {}) {
    const normalizedPaneId = normalizePaneId(paneId || payload.paneId);
    const sourceState = stateForPane(normalizedPaneId);
    const visibleRange = normalizeRange(payload);
    sourceState.visibleRange = visibleRange;
    sourceState.interaction = {
      mode: 'manual',
      manualVisibleRange: { ...visibleRange },
    };
    sourceState.viewportFollow = {
      ...sourceState.viewportFollow,
      enabled: false,
    };
    recomputePaneDemands(normalizedPaneId);
    syncPaneHosts(normalizedPaneId);
    emitPaneDemands(sourceState, normalizedPaneId, { visibleRangeChanged: true });
    return {
      paneId: normalizedPaneId,
      visibleRange: { ...visibleRange },
      viewportFollow: { ...sourceState.viewportFollow },
      interaction: structuredClone(sourceState.interaction),
      renderedBars: computeRenderedBars(sourceState),
      viewportDemand: sourceState.viewportDemand ? structuredClone(sourceState.viewportDemand) : null,
      prefixDemand: sourceState.prefixDemand ? { ...sourceState.prefixDemand } : null,
    };
  }

  function observeNativeVisibleRange(payload = {}, { paneId } = {}) {
    const result = setManualVisibleRange(payload, { paneId });
    const host = mountedHostByPaneId.get(result.paneId);
    chartAdapters.get(host)?.setMetadata?.({
      viewportFollow: 'false',
      interactionMode: 'manual',
      renderedBarCount: result.renderedBars.length,
      fullBarCount: stateForPane(result.paneId).bars.length,
    });
    return {
      ...result,
      clamped: false,
    };
  }

  function goToTime(payload = {}) {
    const normalizedPaneId = normalizePaneId(payload.paneId);
    const sourceState = stateForPane(normalizedPaneId);
    const goTo = normalizeGoToPayload(payload);
    const visibleRange = deriveGoToRange(sourceState, goTo);
    const result = setManualVisibleRange(visibleRange, { paneId: normalizedPaneId });
    return {
      ...result,
      paneId: normalizedPaneId,
      targetTimestamp: goTo.targetTimestamp,
    };
  }

  function zoomVisibleRange(payload = {}) {
    const normalizedPaneId = normalizePaneId(payload.paneId);
    const visibleRange = deriveZoomRange(stateForPane(normalizedPaneId), payload);
    return {
      ...setManualVisibleRange(visibleRange, { paneId: normalizedPaneId }),
      paneId: normalizedPaneId,
    };
  }

  function panVisibleRange(payload = {}) {
    const normalizedPaneId = normalizePaneId(payload.paneId);
    const visibleRange = derivePanRange(stateForPane(normalizedPaneId), payload);
    return {
      ...setManualVisibleRange(visibleRange, { paneId: normalizedPaneId }),
      paneId: normalizedPaneId,
    };
  }

  function resumeViewportFollow(payload = {}) {
    const normalizedPaneId = normalizePaneId(payload.paneId);
    const sourceState = stateForPane(normalizedPaneId);
    sourceState.visibleRange = null;
    sourceState.interaction = {
      mode: 'follow',
      manualVisibleRange: null,
    };
    sourceState.viewportFollow = {
      ...sourceState.viewportFollow,
      enabled: true,
    };
    sourceState.prefixDemand = null;
    sourceState.viewportDemand = null;
    syncPaneHosts(normalizedPaneId);
    hostSync.resetPriceScales({ paneId: normalizedPaneId });
    return {
      paneId: normalizedPaneId,
      viewportFollow: { ...sourceState.viewportFollow },
      interaction: structuredClone(sourceState.interaction),
      visibleRange: null,
      renderedBars: computeRenderedBars(sourceState),
      fullBarCount: sourceState.bars.length,
    };
  }

  function getRenderedBars(payload = {}) {
    const normalizedPaneId = normalizePaneId(payload.paneId);
    const sourceState = stateForPane(normalizedPaneId);
    const bars = sourceState.bars.map((bar) => ({
      ...bar,
      timestamp: timestampSeconds(bar.time, 'chart rendered bar time'),
    }));
    return {
      paneId: normalizedPaneId,
      viewportFollow: { ...sourceState.viewportFollow },
      interaction: structuredClone(sourceState.interaction),
      visibleRange: sourceState.visibleRange ? { ...sourceState.visibleRange } : null,
      bars,
      renderedBars: computeRenderedBars(sourceState),
      fullBarCount: sourceState.bars.length,
      displayContext: structuredClone(sourceState.displayContext),
    };
  }

  function getInteractionState(payload = {}) {
    const sourceState = stateForPane(payload.paneId);
    return {
      paneId: normalizePaneId(payload.paneId),
      viewportFollow: { ...sourceState.viewportFollow },
      interaction: structuredClone(sourceState.interaction),
      nativeInteraction: structuredClone(sourceState.nativeInteraction),
      visibleRange: sourceState.visibleRange ? { ...sourceState.visibleRange } : null,
      renderedBars: computeRenderedBars(sourceState),
      fullBarCount: sourceState.bars.length,
    };
  }

  function updateCrosshair(payload = {}, { paneId } = {}) {
    const normalizedPaneId = normalizePaneId(paneId || payload.paneId);
    const sourceState = updatePaneState(normalizedPaneId, {
      crosshair: normalizeCrosshair(payload),
    });
    emit(CHART_EVENTS.CROSSHAIR_CHANGED, {
      paneId: normalizedPaneId,
      crosshair: structuredClone(sourceState.crosshair),
    });
    return {
      paneId: normalizedPaneId,
      crosshair: structuredClone(sourceState.crosshair),
      interaction: structuredClone(sourceState.interaction),
      viewportFollow: { ...sourceState.viewportFollow },
      visibleRange: sourceState.visibleRange ? { ...sourceState.visibleRange } : null,
    };
  }

  function updateNativeInteraction(payload = {}, { paneId } = {}) {
    const normalizedPaneId = normalizePaneId(paneId || payload.paneId);
    const sourceState = stateForPane(normalizedPaneId);
    const wasActive = sourceState.nativeInteraction.active;
    const nativeInteraction = {
      active: Boolean(payload.active),
      type: payload.active && payload.type ? String(payload.type) : null,
      source: payload.source ? String(payload.source) : null,
    };
    updatePaneState(normalizedPaneId, { nativeInteraction });
    hostSync.syncMetadataToMountedHosts();
    if (wasActive && !nativeInteraction.active) {
      hostSync.flushPendingAfterNativeInteraction();
    }
    if (wasActive && !nativeInteraction.active && sourceState.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(sourceState.viewportDemand) });
    }
    return {
      paneId: normalizedPaneId,
      nativeInteraction: structuredClone(nativeInteraction),
      pendingChartSyncAfterNativeInteraction: hostSync.getSyncState().pendingChartSyncAfterNativeInteraction,
    };
  }

  function getCrosshairState(payload = {}) {
    const sourceState = stateForPane(payload.paneId);
    return {
      paneId: normalizePaneId(payload.paneId),
      crosshair: structuredClone(sourceState.crosshair),
      interaction: structuredClone(sourceState.interaction),
      viewportFollow: { ...sourceState.viewportFollow },
      visibleRange: sourceState.visibleRange ? { ...sourceState.visibleRange } : null,
      renderedBars: computeRenderedBars(sourceState),
      fullBarCount: sourceState.bars.length,
    };
  }

  function setDisplayContext(payload = {}) {
    const normalizedPaneId = normalizePaneId(payload.paneId);
    const sourceState = stateForPane(normalizedPaneId);
    if (!expectedDisplayRevisionMatches(sourceState, payload.expectedDisplayRevision)) {
      return {
        paneId: normalizedPaneId,
        staleWrite: true,
        displayContext: structuredClone(sourceState.displayContext),
      };
    }
    const currentContext = sourceState.displayContext;
    const nextRevision = payload.bumpDisplayRevision
      || (
        payload.displayTimeframe != null
        && Number(payload.displayTimeframe) !== Number(currentContext.displayTimeframe || 0)
      )
      || (
        payload.instrument != null
        && String(payload.instrument) !== String(currentContext.instrument || '')
      )
      ? Math.max(0, Number(currentContext.displayRevision || 0)) + 1
      : Math.max(0, Number(currentContext.displayRevision || 0));
    sourceState.displayContext = buildChartDisplayContext({
      ...payload,
      displayRevision: nextRevision,
    }, currentContext);
    sourceState.viewportFollow = {
      ...sourceState.viewportFollow,
      rightOffsetBars: sourceState.displayContext.rightOffsetBars,
    };
    sourceState.viewportDemand = computeViewportDemand(sourceState, { paneId: normalizedPaneId });
    syncPaneHosts(normalizedPaneId);
    return {
      paneId: normalizedPaneId,
      displayContext: structuredClone(sourceState.displayContext),
      viewportDemand: sourceState.viewportDemand ? structuredClone(sourceState.viewportDemand) : null,
    };
  }

  function updateAllDisplayContexts(payload = {}) {
    let result = null;
    for (const [paneId] of paneStore.entries()) {
      result = setDisplayContext({ ...payload, paneId });
    }
    return result;
  }

  function updateDisplayTimezoneContext(payload = {}) {
    return updateAllDisplayContexts({
      displayTimezone: payload.displayTimezone,
      exchangeTimezone: payload.exchangeTimezone,
    });
  }

  function updatePresentationContext(payload = {}) {
    return updateAllDisplayContexts({
      timeFormat: payload.timeFormat,
      dateFormat: payload.dateFormat,
      showDayOfWeekLabels: payload.showDayOfWeekLabels,
      showCrosshairReadout: payload.showCrosshairReadout,
      margins: payload.margins,
      rightOffsetBars: payload.rightOffsetBars,
      candleStyle: payload.candleStyle,
      gridStyle: payload.gridStyle,
      crosshairStyle: payload.crosshairStyle,
      backgroundStyle: payload.backgroundStyle,
      scaleStyle: payload.scaleStyle,
      watermarkStyle: payload.watermarkStyle,
    });
  }

  function getViewportDemand(payload = {}) {
    const normalizedPaneId = normalizePaneId(payload.paneId);
    const sourceState = recomputePaneDemands(normalizedPaneId);
    return {
      paneId: normalizedPaneId,
      viewportDemand: sourceState.viewportDemand ? structuredClone(sourceState.viewportDemand) : null,
    };
  }

  function start({ root, emitEvent } = {}) {
    rootElement = root;
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(CHART_COMMANDS.MOUNT_HOST, (payload = {}) => mountHost(payload.host, payload)),
      registerCommand(CHART_COMMANDS.RELEASE_PANES, (payload = {}) => releasePanes(payload)),
      registerCommand(CHART_COMMANDS.REPLACE_BARS, ({ bars, paneId, expectedDisplayRevision } = {}) => updateBars(normalizeBars(bars), {
        paneId,
        expectedDisplayRevision,
      })),
      registerCommand(CHART_COMMANDS.APPEND_BARS, ({ bars, paneId, viewportFollow, rightEdgeLimit, expectedDisplayRevision } = {}) => appendBars(bars, {
        paneId,
        viewportFollow,
        rightEdgeLimit,
        expectedDisplayRevision,
      })),
      registerCommand(CHART_COMMANDS.CLEAR_BARS, (payload = {}) => updateBars([], { paneId: payload.paneId })),
      registerCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS, (payload) => getViewportMetrics(payload)),
      registerCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, (payload) => setRightEdgeLimit(payload)),
      registerCommand(CHART_COMMANDS.SET_VISIBLE_RANGE, (payload) => updateVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.GET_VISIBLE_RANGE, (payload = {}) => getVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, (payload) => setDisplayContext(payload)),
      registerCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, (payload) => setViewportFollow(payload)),
      registerCommand(CHART_COMMANDS.SET_MANUAL_VISIBLE_RANGE, (payload = {}) => setManualVisibleRange(payload, { paneId: payload.paneId })),
      registerCommand(CHART_COMMANDS.GO_TO_TIME, (payload) => goToTime(payload)),
      registerCommand(CHART_COMMANDS.ZOOM_VISIBLE_RANGE, (payload) => zoomVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.PAN_VISIBLE_RANGE, (payload) => panVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW, (payload = {}) => resumeViewportFollow(payload)),
      registerCommand(CHART_COMMANDS.GET_RENDERED_BARS, (payload) => getRenderedBars(payload)),
      registerCommand(CHART_COMMANDS.GET_INTERACTION_STATE, (payload = {}) => getInteractionState(payload)),
      registerCommand(CHART_COMMANDS.GET_CROSSHAIR_STATE, (payload = {}) => getCrosshairState(payload)),
      registerCommand(CHART_COMMANDS.GET_VIEWPORT_DEMAND, (payload = {}) => getViewportDemand(payload)),
      registerCommand(CHART_COMMANDS.GET_PREFIX_DEMAND, (payload = {}) => getPrefixDemand(payload)),
      subscribeEvent(DISPLAY_TIMEZONE_EVENTS.CHANGED, (payload) => updateDisplayTimezoneContext(payload)),
      subscribeEvent(CHART_PRESENTATION_EVENTS.CHANGED, (payload) => updatePresentationContext(payload))
    );
    mountAvailableHosts();

    observer = new MutationObserver(() => {
      mountAvailableHosts();
    });
    observer.observe(rootElement, {
      childList: true,
      subtree: true,
    });
  }

  function stop() {
    observer?.disconnect();
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    for (const adapter of chartAdapters.values()) {
      adapter.destroy();
    }
    chartAdapters.clear();
    mountedHosts.clear();
    mountedHostList.clear();
    mountedHostByPaneId.clear();
    paneStore.clear();
    observer = null;
    rootElement = null;
  }

  return {
    id: 'runtime.chart',
    start,
    stop,
  };
}
