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
  normalizePaneId,
  retainedPaneIdSet,
  stateForPane as projectStateForPane,
  updatePaneDisplayState as patchPaneDisplayState,
} from './chart-runtime-pane-state.js';
import {
  createEmptyChartState,
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
  const paneDisplayStateByPaneId = new Map();
  const unregisterCallbacks = [];
  const state = createEmptyChartState();
  let rootElement = null;
  let observer = null;
  let emit = () => {};
  const hostSync = createChartRuntimeHostSync({
    state,
    mountedHosts,
    mountedHostList,
    mountedHostByPaneId,
    chartAdapters,
    resolveStateForHost: (host) => stateForPane(host?.dataset?.chartPaneId),
  });

  function stateForPane(paneId = DEFAULT_CHART_PANE_ID) {
    return projectStateForPane({
      paneId,
      primaryState: state,
      paneDisplayStateByPaneId,
    });
  }

  function updatePaneDisplayState(paneId, patch = {}) {
    return patchPaneDisplayState({
      paneId,
      patch,
      primaryState: state,
      paneDisplayStateByPaneId,
    });
  }

  function mountHost(host, { paneId } = {}) {
    if (!host) {
      throw new Error('chart host element is required.');
    }
    const nextPaneId = normalizePaneId(paneId || host.dataset?.chartPaneId);
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
        updateCrosshair(crosshair);
      },
      onNativeInteractionChange: (interaction) => {
        updateNativeInteraction(interaction);
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
    const retainedPaneIds = retainedPaneIdSet(paneIds);
    const releasedPaneIds = [];
    const releasedHostPaneIds = [];

    for (const paneId of paneDisplayStateByPaneId.keys()) {
      const normalizedPaneId = normalizePaneId(paneId);
      if (normalizedPaneId === DEFAULT_CHART_PANE_ID || retainedPaneIds.has(normalizedPaneId)) continue;
      paneDisplayStateByPaneId.delete(normalizedPaneId);
      releasedPaneIds.push(normalizedPaneId);
    }

    for (const [paneId, host] of mountedHostByPaneId) {
      const normalizedPaneId = normalizePaneId(paneId);
      if (normalizedPaneId === DEFAULT_CHART_PANE_ID || retainedPaneIds.has(normalizedPaneId)) continue;
      if (destroyMountedHost(host, normalizedPaneId)) {
        releasedHostPaneIds.push(normalizedPaneId);
      }
    }

    hostSync.pruneDisconnectedHosts();
    return {
      retainedPaneIds: [...retainedPaneIds],
      releasedPaneIds,
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

  function syncPaneHosts(paneId) {
    const normalizedPaneId = normalizePaneId(paneId);
    const host = mountedHostByPaneId.get(normalizedPaneId);
    if (host?.isConnected) {
      hostSync.syncChartHost(host);
    }
  }

  function syncGlobalDisplayHosts() {
    hostSync.pruneDisconnectedHosts();
    for (const host of mountedHostList) {
      if (!host.isConnected) continue;
      const paneId = normalizePaneId(host.dataset?.chartPaneId);
      if (paneId === DEFAULT_CHART_PANE_ID) {
        hostSync.syncChartHost(host);
      }
    }
  }

  function syncPaneHostsAppended(paneId, previousPaneState, nextPaneState) {
    const normalizedPaneId = normalizePaneId(paneId);
    const host = mountedHostByPaneId.get(normalizedPaneId);
    if (host?.isConnected) {
      hostSync.syncChartHostAppend(host, previousPaneState, nextPaneState);
    }
  }

  function syncGlobalDisplayHostsAppended(previousState, nextState) {
    hostSync.pruneDisconnectedHosts();
    for (const host of mountedHostList) {
      if (!host.isConnected) continue;
      const paneId = normalizePaneId(host.dataset?.chartPaneId);
      if (paneId === DEFAULT_CHART_PANE_ID) {
        hostSync.syncChartHostAppend(host, previousState, nextState);
      }
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

  function updateBars(nextBars, { paneId, expectedDisplayRevision } = {}) {
    const normalizedPaneId = normalizePaneId(paneId);
    const sourceState = stateForPane(normalizedPaneId);
    if (!expectedDisplayRevisionMatches(sourceState, expectedDisplayRevision)) {
      return stalePaneWriteResult(normalizedPaneId, sourceState, expectedDisplayRevision);
    }
    if (normalizedPaneId !== DEFAULT_CHART_PANE_ID) {
      const paneState = updatePaneDisplayState(normalizedPaneId, { bars: nextBars });
      updatePaneDisplayState(normalizedPaneId, {
        prefixDemand: computePrefixDemand(paneState),
        viewportDemand: computeViewportDemand(paneState, { paneId: normalizedPaneId }),
      });
      syncPaneHosts(normalizedPaneId);
      emit(CHART_EVENTS.BARS_CHANGED, { paneId: normalizedPaneId, bars: [...nextBars] });
      return { paneId: normalizedPaneId, bars: [...nextBars] };
    }
    state.bars = nextBars;
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state, { paneId: DEFAULT_CHART_PANE_ID });
    syncGlobalDisplayHosts();
    emit(CHART_EVENTS.BARS_CHANGED, { paneId: normalizedPaneId, bars: [...state.bars] });
    return { paneId: normalizedPaneId, bars: [...state.bars] };
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
        bars: [...stateForPane(normalizedPaneId).bars],
      };
    }
    if (normalizedPaneId !== DEFAULT_CHART_PANE_ID) {
      const previousPaneState = cloneChartStateSnapshot(stateForPane(normalizedPaneId));
      markReplayTrace('chartRuntime.append.state.start', { paneId: normalizedPaneId });
      if (viewportFollow) {
        updatePaneDisplayState(normalizedPaneId, {
          viewportFollow: normalizeViewportFollow(viewportFollow, previousPaneState),
        });
      }
      const paneState = updatePaneDisplayState(normalizedPaneId, {
        bars: [
          ...previousPaneState.bars,
          ...normalizedBars,
        ],
      });
      const nextPaneState = updatePaneDisplayState(normalizedPaneId, {
        prefixDemand: computePrefixDemand(paneState),
        viewportDemand: computeViewportDemand(paneState, { paneId: normalizedPaneId }),
      });
      markReplayTrace('chartRuntime.append.state.end', {
        paneId: normalizedPaneId,
        fullBarCount: nextPaneState.bars.length,
      });
      markReplayTrace('chartRuntime.append.hostSync.start', { paneId: normalizedPaneId });
      syncPaneHostsAppended(
        normalizedPaneId,
        previousPaneState,
        cloneChartStateSnapshot(nextPaneState)
      );
      markReplayTrace('chartRuntime.append.hostSync.end', { paneId: normalizedPaneId });
      emit(CHART_EVENTS.BARS_CHANGED, { paneId: normalizedPaneId, bars: [...nextPaneState.bars] });
      markReplayTrace('chartRuntime.append.end', {
        paneId: normalizedPaneId,
        fullBarCount: nextPaneState.bars.length,
      });
      return { paneId: normalizedPaneId, bars: [...nextPaneState.bars] };
    }
    const previousState = cloneChartStateSnapshot(state);
    markReplayTrace('chartRuntime.append.state.start', { paneId: normalizedPaneId });
    if (Number.isFinite(normalizedRightEdgeLimit)) {
      state.rightEdgeLimit = normalizedRightEdgeLimit;
      if (state.visibleRange && state.interaction.mode !== 'manual') {
        state.visibleRange = clampVisibleRange(state.visibleRange, state.rightEdgeLimit);
      }
    }
    if (viewportFollow) {
      applyViewportFollowState(viewportFollow, { sync: false });
    }
    state.bars = [
      ...state.bars,
      ...normalizedBars,
    ];
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state, { paneId: DEFAULT_CHART_PANE_ID });
    markReplayTrace('chartRuntime.append.state.end', {
      paneId: normalizedPaneId,
      fullBarCount: state.bars.length,
    });
    markReplayTrace('chartRuntime.append.hostSync.start', { paneId: normalizedPaneId });
    syncGlobalDisplayHostsAppended(previousState, cloneChartStateSnapshot(state));
    markReplayTrace('chartRuntime.append.hostSync.end', { paneId: normalizedPaneId });
    emit(CHART_EVENTS.BARS_CHANGED, { paneId: normalizedPaneId, bars: [...state.bars] });
    markReplayTrace('chartRuntime.append.end', {
      paneId: normalizedPaneId,
      fullBarCount: state.bars.length,
    });
    return { paneId: normalizedPaneId, bars: [...state.bars] };
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

  function updateVisibleRange(range) {
    const visibleRange = clampVisibleRange(normalizeRange(range), state.rightEdgeLimit);
    state.visibleRange = visibleRange;
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state, { paneId: DEFAULT_CHART_PANE_ID });
    syncGlobalDisplayHosts();
    emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...visibleRange } });
    if (state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: { ...state.viewportDemand } });
    }
    if (state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }
    return {
      visibleRange: { ...visibleRange },
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
    };
  }

  function setRightEdgeLimit({ rightEdge } = {}) {
    state.rightEdgeLimit = timestampSeconds(rightEdge, 'chart right edge limit');
    let visibleRangeChanged = false;

    if (state.visibleRange && state.interaction.mode !== 'manual') {
      const visibleRange = clampVisibleRange(state.visibleRange, state.rightEdgeLimit);
      visibleRangeChanged = !rangesEqual(state.visibleRange, visibleRange);
      state.visibleRange = visibleRange;
    }

    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state, { paneId: DEFAULT_CHART_PANE_ID });
    syncGlobalDisplayHosts();

    if (state.visibleRange && visibleRangeChanged) {
      emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...state.visibleRange } });
    }
    if (state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(state.viewportDemand) });
    }
    if (state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }

    return {
      rightEdgeLimit: state.rightEdgeLimit,
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
      interaction: structuredClone(state.interaction),
      renderedBars: computeRenderedBars(state),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
    };
  }

  function getVisibleRange() {
    return {
      rightEdgeLimit: state.rightEdgeLimit,
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
    };
  }

  function getPrefixDemand() {
    state.prefixDemand = computePrefixDemand(state);
    return {
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
    };
  }

  function applyViewportFollowState(payload = {}, { sync = true } = {}) {
    const nextViewportFollow = normalizeViewportFollow(payload, state);
    let visibleRangeChanged = false;
    if (payload.resume) {
      state.visibleRange = null;
      state.interaction = {
        mode: 'follow',
        manualVisibleRange: null,
      };
    } else {
      const manualAnchorRange = deriveManualAnchorRange(state, nextViewportFollow);
      if (manualAnchorRange) {
        visibleRangeChanged = !rangesEqual(state.visibleRange, manualAnchorRange)
          || !rangesEqual(state.interaction.manualVisibleRange, manualAnchorRange);
        state.visibleRange = { ...manualAnchorRange };
        state.interaction = {
          mode: 'manual',
          manualVisibleRange: { ...manualAnchorRange },
        };
        state.prefixDemand = computePrefixDemand(state);
        state.viewportDemand = computeViewportDemand(state, { paneId: DEFAULT_CHART_PANE_ID });
      }
    }
    state.viewportFollow = state.interaction.mode === 'manual' && !payload.resume
      ? {
        ...nextViewportFollow,
        enabled: false,
      }
      : nextViewportFollow;
    if (!sync) {
      return { visibleRangeChanged };
    }
    syncGlobalDisplayHosts();
    if (visibleRangeChanged && state.visibleRange) {
      emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...state.visibleRange } });
    }
    if (visibleRangeChanged && state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(state.viewportDemand) });
    }
    if (visibleRangeChanged && state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }
    return {
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function setViewportFollow(payload = {}) {
    const normalizedPaneId = normalizePaneId(payload.paneId);
    if (normalizedPaneId !== DEFAULT_CHART_PANE_ID) {
      const sourceState = stateForPane(normalizedPaneId);
      const nextViewportFollow = normalizeViewportFollow(payload, sourceState);
      let visibleRange = sourceState.visibleRange;
      let interaction = sourceState.interaction;
      let visibleRangeChanged = false;
      if (payload.resume) {
        visibleRange = null;
        interaction = {
          mode: 'follow',
          manualVisibleRange: null,
        };
      } else {
        const manualAnchorRange = deriveManualAnchorRange(sourceState, nextViewportFollow);
        if (manualAnchorRange) {
          visibleRangeChanged = !rangesEqual(sourceState.visibleRange, manualAnchorRange)
            || !rangesEqual(sourceState.interaction.manualVisibleRange, manualAnchorRange);
          visibleRange = { ...manualAnchorRange };
          interaction = {
            mode: 'manual',
            manualVisibleRange: { ...manualAnchorRange },
          };
        }
      }
      const viewportFollow = interaction.mode === 'manual' && !payload.resume
        ? {
          ...nextViewportFollow,
          enabled: false,
        }
        : nextViewportFollow;
      const paneState = updatePaneDisplayState(normalizedPaneId, {
        visibleRange,
        interaction,
        viewportFollow,
      });
      const prefixDemand = computePrefixDemand(paneState);
      const viewportDemand = computeViewportDemand(paneState, { paneId: normalizedPaneId });
      updatePaneDisplayState(normalizedPaneId, { prefixDemand, viewportDemand });
      syncPaneHosts(normalizedPaneId);
      if (visibleRangeChanged && visibleRange) {
        emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { paneId: normalizedPaneId, visibleRange: { ...visibleRange } });
      }
      if (visibleRangeChanged && viewportDemand) {
        emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(viewportDemand) });
      }
      return {
        paneId: normalizedPaneId,
        viewportFollow: { ...viewportFollow },
        interaction: structuredClone(interaction),
        visibleRange: visibleRange ? { ...visibleRange } : null,
        renderedBars: computeRenderedBars(paneState),
        fullBarCount: paneState.bars.length,
      };
    }
    return applyViewportFollowState(payload);
  }

  function setManualVisibleRange(payload = {}, { paneId } = {}) {
    const normalizedPaneId = normalizePaneId(paneId);
    const visibleRange = normalizeRange(payload);
    if (normalizedPaneId !== DEFAULT_CHART_PANE_ID) {
      const sourceState = stateForPane(normalizedPaneId);
      const nextPaneState = updatePaneDisplayState(normalizedPaneId, {
        visibleRange,
        interaction: {
          mode: 'manual',
          manualVisibleRange: { ...visibleRange },
        },
        viewportFollow: {
          ...sourceState.viewportFollow,
          enabled: false,
        },
      });
      const prefixDemand = computePrefixDemand(nextPaneState);
      const viewportDemand = computeViewportDemand(nextPaneState, { paneId: normalizedPaneId });
      updatePaneDisplayState(normalizedPaneId, { prefixDemand, viewportDemand });
      syncPaneHosts(normalizedPaneId);
      emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { paneId: normalizedPaneId, visibleRange: { ...visibleRange } });
      if (viewportDemand) {
        emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(viewportDemand) });
      }
      return {
        paneId: normalizedPaneId,
        visibleRange: { ...visibleRange },
        viewportFollow: { ...nextPaneState.viewportFollow },
        interaction: structuredClone(nextPaneState.interaction),
        renderedBars: computeRenderedBars(nextPaneState),
        viewportDemand: viewportDemand ? structuredClone(viewportDemand) : null,
        prefixDemand: prefixDemand ? { ...prefixDemand } : null,
      };
    }
    state.visibleRange = visibleRange;
    state.interaction = {
      mode: 'manual',
      manualVisibleRange: { ...visibleRange },
    };
    state.viewportFollow = {
      ...state.viewportFollow,
      enabled: false,
    };
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state, { paneId: DEFAULT_CHART_PANE_ID });
    syncPaneHosts(DEFAULT_CHART_PANE_ID);
    emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...visibleRange } });
    if (state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: { ...state.viewportDemand } });
    }
    if (state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }
    return {
      visibleRange: { ...visibleRange },
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      renderedBars: computeRenderedBars(state),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
    };
  }

  function observeNativeVisibleRange(payload = {}, { paneId } = {}) {
    const normalizedPaneId = normalizePaneId(paneId);
    const visibleRange = normalizeRange(payload);
    if (normalizedPaneId !== DEFAULT_CHART_PANE_ID) {
      const sourceState = stateForPane(normalizedPaneId);
      const nextPaneState = updatePaneDisplayState(normalizedPaneId, {
        visibleRange,
        interaction: {
          mode: 'manual',
          manualVisibleRange: { ...visibleRange },
        },
        viewportFollow: {
          ...sourceState.viewportFollow,
          enabled: false,
        },
      });
      const prefixDemand = computePrefixDemand(nextPaneState);
      const viewportDemand = computeViewportDemand(nextPaneState, { paneId: normalizedPaneId });
      updatePaneDisplayState(normalizedPaneId, { prefixDemand, viewportDemand });
      chartAdapters.get(mountedHostByPaneId.get(normalizedPaneId))?.setMetadata?.({
        viewportFollow: 'false',
        interactionMode: 'manual',
        renderedBarCount: computeRenderedBars(nextPaneState).length,
        fullBarCount: nextPaneState.bars.length,
      });
      emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { paneId: normalizedPaneId, visibleRange: { ...visibleRange } });
      if (viewportDemand) {
        emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(viewportDemand) });
      }
      return {
        paneId: normalizedPaneId,
        visibleRange: { ...visibleRange },
        viewportFollow: { ...nextPaneState.viewportFollow },
        interaction: structuredClone(nextPaneState.interaction),
        renderedBars: computeRenderedBars(nextPaneState),
        viewportDemand: viewportDemand ? structuredClone(viewportDemand) : null,
        prefixDemand: prefixDemand ? { ...prefixDemand } : null,
        clamped: false,
      };
    }
    state.visibleRange = visibleRange;
    state.interaction = {
      mode: 'manual',
      manualVisibleRange: { ...visibleRange },
    };
    state.viewportFollow = {
      ...state.viewportFollow,
      enabled: false,
    };
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state, { paneId: DEFAULT_CHART_PANE_ID });
    hostSync.syncMetadataToMountedHosts();
    emit(CHART_EVENTS.VISIBLE_RANGE_CHANGED, { visibleRange: { ...visibleRange } });
    if (state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: { ...state.viewportDemand } });
    }
    if (state.prefixDemand) {
      emit(CHART_EVENTS.PREFIX_DEMAND, { prefixDemand: { ...state.prefixDemand } });
    }
    return {
      visibleRange: { ...visibleRange },
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      renderedBars: computeRenderedBars(state),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
      prefixDemand: state.prefixDemand ? { ...state.prefixDemand } : null,
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
    if (normalizedPaneId !== DEFAULT_CHART_PANE_ID) {
      const sourceState = stateForPane(normalizedPaneId);
      const nextPaneState = updatePaneDisplayState(normalizedPaneId, {
        visibleRange: null,
        interaction: {
          mode: 'follow',
          manualVisibleRange: null,
        },
        viewportFollow: {
          ...sourceState.viewportFollow,
          enabled: true,
        },
        prefixDemand: null,
        viewportDemand: null,
      });
      syncPaneHosts(normalizedPaneId);
      hostSync.resetPriceScales({ paneId: normalizedPaneId });
      return {
        paneId: normalizedPaneId,
        viewportFollow: { ...nextPaneState.viewportFollow },
        interaction: structuredClone(nextPaneState.interaction),
        visibleRange: null,
        renderedBars: computeRenderedBars(nextPaneState),
        fullBarCount: nextPaneState.bars.length,
      };
    }
    state.visibleRange = null;
    state.interaction = {
      mode: 'follow',
      manualVisibleRange: null,
    };
    state.viewportFollow = {
      ...state.viewportFollow,
      enabled: true,
    };
    state.prefixDemand = null;
    state.viewportDemand = null;
    syncPaneHosts(DEFAULT_CHART_PANE_ID);
    hostSync.resetPriceScales({ paneId: DEFAULT_CHART_PANE_ID });
    return {
      paneId: normalizedPaneId,
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      visibleRange: null,
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
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

  function getInteractionState() {
    return {
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      nativeInteraction: structuredClone(state.nativeInteraction),
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function updateCrosshair(payload = {}) {
    state.crosshair = normalizeCrosshair(payload);
    emit(CHART_EVENTS.CROSSHAIR_CHANGED, { crosshair: structuredClone(state.crosshair) });
    return {
      crosshair: structuredClone(state.crosshair),
      interaction: structuredClone(state.interaction),
      viewportFollow: { ...state.viewportFollow },
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
    };
  }

  function updateNativeInteraction(payload = {}) {
    const wasActive = state.nativeInteraction.active;
    state.nativeInteraction = {
      active: Boolean(payload.active),
      type: payload.active && payload.type ? String(payload.type) : null,
      source: payload.source ? String(payload.source) : null,
    };
    hostSync.syncMetadataToMountedHosts();
    if (wasActive && !state.nativeInteraction.active) {
      hostSync.flushPendingAfterNativeInteraction();
    }
    if (wasActive && !state.nativeInteraction.active && state.viewportDemand) {
      emit(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand: structuredClone(state.viewportDemand) });
    }
    return {
      nativeInteraction: structuredClone(state.nativeInteraction),
      pendingChartSyncAfterNativeInteraction: hostSync.getSyncState().pendingChartSyncAfterNativeInteraction,
    };
  }

  function getCrosshairState() {
    return {
      crosshair: structuredClone(state.crosshair),
      interaction: structuredClone(state.interaction),
      viewportFollow: { ...state.viewportFollow },
      visibleRange: state.visibleRange ? { ...state.visibleRange } : null,
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
    };
  }

  function setDisplayContext(payload = {}) {
    const normalizedPaneId = normalizePaneId(payload.paneId);
    if (normalizedPaneId !== DEFAULT_CHART_PANE_ID) {
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
      const displayContext = buildChartDisplayContext({
        ...payload,
        displayRevision: nextRevision,
      }, currentContext);
      const paneState = updatePaneDisplayState(normalizedPaneId, { displayContext });
      updatePaneDisplayState(normalizedPaneId, {
        viewportDemand: computeViewportDemand(paneState, { paneId: normalizedPaneId }),
      });
      syncPaneHosts(normalizedPaneId);
      return {
        paneId: normalizedPaneId,
        displayContext: structuredClone(displayContext),
        viewportDemand: null,
      };
    }
    if (!expectedDisplayRevisionMatches(state, payload.expectedDisplayRevision)) {
      return {
        paneId: normalizedPaneId,
        staleWrite: true,
        displayContext: structuredClone(state.displayContext),
      };
    }
    const nextRevision = payload.bumpDisplayRevision
      || (
        payload.displayTimeframe != null
        && Number(payload.displayTimeframe) !== Number(state.displayContext.displayTimeframe || 0)
      )
      || (
        payload.instrument != null
        && String(payload.instrument) !== String(state.displayContext.instrument || '')
      )
      ? Math.max(0, Number(state.displayContext.displayRevision || 0)) + 1
      : Math.max(0, Number(state.displayContext.displayRevision || 0));
    state.displayContext = buildChartDisplayContext({
      ...payload,
      displayRevision: nextRevision,
    }, state.displayContext);
    state.viewportFollow = {
      ...state.viewportFollow,
      rightOffsetBars: state.displayContext.rightOffsetBars,
    };
    state.viewportDemand = computeViewportDemand(state, { paneId: DEFAULT_CHART_PANE_ID });
    syncGlobalDisplayHosts();
    return {
      paneId: normalizedPaneId,
      displayContext: structuredClone(state.displayContext),
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
    };
  }

  function updateDisplayTimezoneContext(payload = {}) {
    return setDisplayContext({
      displayTimezone: payload.displayTimezone,
      exchangeTimezone: payload.exchangeTimezone,
    });
  }

  function updatePresentationContext(payload = {}) {
    return setDisplayContext({
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

  function getViewportDemand() {
    state.viewportDemand = computeViewportDemand(state, { paneId: DEFAULT_CHART_PANE_ID });
    return {
      viewportDemand: state.viewportDemand ? structuredClone(state.viewportDemand) : null,
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
      registerCommand(CHART_COMMANDS.CLEAR_BARS, () => updateBars([])),
      registerCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS, (payload) => getViewportMetrics(payload)),
      registerCommand(CHART_COMMANDS.SET_RIGHT_EDGE_LIMIT, (payload) => setRightEdgeLimit(payload)),
      registerCommand(CHART_COMMANDS.SET_VISIBLE_RANGE, (payload) => updateVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.GET_VISIBLE_RANGE, () => getVisibleRange()),
      registerCommand(CHART_COMMANDS.SET_DISPLAY_CONTEXT, (payload) => setDisplayContext(payload)),
      registerCommand(CHART_COMMANDS.SET_VIEWPORT_FOLLOW, (payload) => setViewportFollow(payload)),
      registerCommand(CHART_COMMANDS.SET_MANUAL_VISIBLE_RANGE, (payload = {}) => setManualVisibleRange(payload, { paneId: payload.paneId })),
      registerCommand(CHART_COMMANDS.GO_TO_TIME, (payload) => goToTime(payload)),
      registerCommand(CHART_COMMANDS.ZOOM_VISIBLE_RANGE, (payload) => zoomVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.PAN_VISIBLE_RANGE, (payload) => panVisibleRange(payload)),
      registerCommand(CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW, (payload = {}) => resumeViewportFollow(payload)),
      registerCommand(CHART_COMMANDS.GET_RENDERED_BARS, (payload) => getRenderedBars(payload)),
      registerCommand(CHART_COMMANDS.GET_INTERACTION_STATE, () => getInteractionState()),
      registerCommand(CHART_COMMANDS.GET_CROSSHAIR_STATE, () => getCrosshairState()),
      registerCommand(CHART_COMMANDS.GET_VIEWPORT_DEMAND, () => getViewportDemand()),
      registerCommand(CHART_COMMANDS.GET_PREFIX_DEMAND, () => getPrefixDemand()),
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
    paneDisplayStateByPaneId.clear();
    observer = null;
    rootElement = null;
  }

  return {
    id: 'runtime.chart',
    start,
    stop,
  };
}
