import { registerCommand } from './commands.js';
import { subscribeEvent } from './events.js';
import { CHART_COMMANDS, CHART_EVENTS } from '../contracts/chart-contracts.js';
import { DISPLAY_TIMEZONE_EVENTS } from '../contracts/timezone-contracts.js';
import { CHART_PRESENTATION_EVENTS } from '../contracts/chart-presentation-contracts.js';
import { createChartEngineAdapter } from './chart-engine-adapter.js';
import { buildChartDisplayContext } from './chart-runtime-display-context.js';
import { createChartRuntimeHostSync } from './chart-runtime-host-sync.js';
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

export { CHART_COMMANDS, CHART_EVENTS };

const DEFAULT_CHART_PANE_ID = 'primary';

function normalizePaneId(value) {
  const paneId = String(value || DEFAULT_CHART_PANE_ID).trim();
  return paneId || DEFAULT_CHART_PANE_ID;
}

function cloneChartStateSnapshot(sourceState) {
  return {
    ...sourceState,
    bars: [...(sourceState.bars || [])],
    visibleRange: sourceState.visibleRange ? { ...sourceState.visibleRange } : null,
    prefixDemand: sourceState.prefixDemand ? { ...sourceState.prefixDemand } : null,
    viewportDemand: sourceState.viewportDemand ? structuredClone(sourceState.viewportDemand) : null,
    viewportFollow: { ...(sourceState.viewportFollow || {}) },
    interaction: structuredClone(sourceState.interaction || {}),
    nativeInteraction: structuredClone(sourceState.nativeInteraction || {}),
    crosshair: structuredClone(sourceState.crosshair || {}),
    displayContext: structuredClone(sourceState.displayContext || {}),
  };
}

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
    const normalizedPaneId = normalizePaneId(paneId);
    if (normalizedPaneId === DEFAULT_CHART_PANE_ID) return state;
    const paneState = paneDisplayStateByPaneId.get(normalizedPaneId);
    if (!paneState) return state;
    return {
      ...state,
      bars: paneState.bars || state.bars,
      visibleRange: paneState.visibleRange || state.visibleRange,
      prefixDemand: paneState.prefixDemand || null,
      viewportDemand: paneState.viewportDemand || null,
      viewportFollow: paneState.viewportFollow || state.viewportFollow,
      interaction: paneState.interaction || state.interaction,
      displayContext: paneState.displayContext || state.displayContext,
    };
  }

  function paneHasDisplayOverride(paneId = DEFAULT_CHART_PANE_ID) {
    const normalizedPaneId = normalizePaneId(paneId);
    return normalizedPaneId !== DEFAULT_CHART_PANE_ID && paneDisplayStateByPaneId.has(normalizedPaneId);
  }

  function updatePaneDisplayState(paneId, patch = {}) {
    const normalizedPaneId = normalizePaneId(paneId);
    const currentPaneState = paneDisplayStateByPaneId.get(normalizedPaneId) || {};
    const nextPaneState = {
      ...currentPaneState,
      ...patch,
    };
    paneDisplayStateByPaneId.set(normalizedPaneId, nextPaneState);
    return stateForPane(normalizedPaneId);
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
      displayContext: state.displayContext,
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

  function retainedPaneIdSet(values = []) {
    const retainedPaneIds = new Set([DEFAULT_CHART_PANE_ID]);
    if (!Array.isArray(values)) return retainedPaneIds;
    values.forEach((value) => {
      retainedPaneIds.add(normalizePaneId(value));
    });
    return retainedPaneIds;
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
      return;
    }
    hostSync.rerenderMountedHosts();
  }

  function syncGlobalDisplayHosts() {
    hostSync.pruneDisconnectedHosts();
    for (const host of mountedHostList) {
      if (!host.isConnected) continue;
      const paneId = normalizePaneId(host.dataset?.chartPaneId);
      if (paneId === DEFAULT_CHART_PANE_ID || !paneHasDisplayOverride(paneId)) {
        hostSync.syncChartHost(host);
      }
    }
  }

  function syncPaneHostsAppended(paneId, previousPaneState, nextPaneState) {
    const normalizedPaneId = normalizePaneId(paneId);
    const host = mountedHostByPaneId.get(normalizedPaneId);
    if (host?.isConnected) {
      hostSync.syncChartHostAppend(host, previousPaneState, nextPaneState);
      return;
    }
    hostSync.rerenderMountedHosts();
  }

  function syncGlobalDisplayHostsAppended(previousState, nextState) {
    hostSync.pruneDisconnectedHosts();
    for (const host of mountedHostList) {
      if (!host.isConnected) continue;
      const paneId = normalizePaneId(host.dataset?.chartPaneId);
      if (paneId === DEFAULT_CHART_PANE_ID || !paneHasDisplayOverride(paneId)) {
        hostSync.syncChartHostAppend(host, previousState, nextState);
      }
    }
  }

  function updateBars(nextBars, { paneId } = {}) {
    const normalizedPaneId = normalizePaneId(paneId);
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

  function appendBars(nextBars, { paneId, viewportFollow } = {}) {
    const normalizedPaneId = normalizePaneId(paneId);
    const normalizedBars = normalizeBars(nextBars);
    if (!normalizedBars.length) {
      return {
        paneId: normalizedPaneId,
        bars: [...stateForPane(normalizedPaneId).bars],
      };
    }
    if (normalizedPaneId !== DEFAULT_CHART_PANE_ID) {
      const previousPaneState = cloneChartStateSnapshot(stateForPane(normalizedPaneId));
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
      syncPaneHostsAppended(
        normalizedPaneId,
        previousPaneState,
        cloneChartStateSnapshot(nextPaneState)
      );
      emit(CHART_EVENTS.BARS_CHANGED, { paneId: normalizedPaneId, bars: [...nextPaneState.bars] });
      return { paneId: normalizedPaneId, bars: [...nextPaneState.bars] };
    }
    const previousState = cloneChartStateSnapshot(state);
    if (viewportFollow) {
      applyViewportFollowState(viewportFollow, { sync: false });
    }
    state.bars = [
      ...state.bars,
      ...normalizedBars,
    ];
    state.prefixDemand = computePrefixDemand(state);
    state.viewportDemand = computeViewportDemand(state, { paneId: DEFAULT_CHART_PANE_ID });
    syncGlobalDisplayHostsAppended(previousState, cloneChartStateSnapshot(state));
    emit(CHART_EVENTS.BARS_CHANGED, { paneId: normalizedPaneId, bars: [...state.bars] });
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
    hostSync.rerenderMountedHosts();
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
    const goTo = normalizeGoToPayload(payload);
    const visibleRange = deriveGoToRange(state, goTo);
    const result = setManualVisibleRange(visibleRange);
    return {
      ...result,
      targetTimestamp: goTo.targetTimestamp,
    };
  }

  function zoomVisibleRange(payload = {}) {
    const visibleRange = deriveZoomRange(state, payload);
    return setManualVisibleRange(visibleRange);
  }

  function panVisibleRange(payload = {}) {
    const visibleRange = derivePanRange(state, payload);
    return setManualVisibleRange(visibleRange);
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
    hostSync.rerenderMountedHosts();
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

  function getRenderedBars() {
    return {
      viewportFollow: { ...state.viewportFollow },
      interaction: structuredClone(state.interaction),
      renderedBars: computeRenderedBars(state),
      fullBarCount: state.bars.length,
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
      const displayContext = buildChartDisplayContext(payload, stateForPane(normalizedPaneId).displayContext);
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
    state.displayContext = buildChartDisplayContext(payload, state.displayContext);
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
      registerCommand(CHART_COMMANDS.REPLACE_BARS, ({ bars, paneId } = {}) => updateBars(normalizeBars(bars), { paneId })),
      registerCommand(CHART_COMMANDS.APPEND_BARS, ({ bars, paneId, viewportFollow } = {}) => appendBars(bars, {
        paneId,
        viewportFollow,
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
      registerCommand(CHART_COMMANDS.GET_RENDERED_BARS, () => getRenderedBars()),
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
