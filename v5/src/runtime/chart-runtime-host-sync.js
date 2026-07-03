import { computeRenderedBars } from './chart-runtime-viewport.js';

export function createChartRuntimeHostSync({
  state,
  mountedHosts,
  mountedHostList,
  mountedHostByPaneId,
  chartAdapters,
  resolveStateForHost = () => state,
} = {}) {
  let applyingRuntimeVisibleRange = false;
  let pendingChartSyncAfterNativeInteraction = false;

  function buildChartMetadata(renderedBars = computeRenderedBars(state), sourceState = state) {
    return {
      viewportFollow: sourceState.viewportFollow.enabled ? 'true' : 'false',
      interactionMode: sourceState.interaction.mode,
      renderedBarCount: renderedBars.length,
      fullBarCount: sourceState.bars.length,
      crosshairActive: sourceState.crosshair.active ? 'true' : 'false',
      crosshairTime: sourceState.crosshair.time || '',
      crosshairPrice: sourceState.crosshair.price == null ? '' : sourceState.crosshair.price,
      nativeInteractionActive: sourceState.nativeInteraction.active ? 'true' : 'false',
      nativeInteractionType: sourceState.nativeInteraction.type || '',
    };
  }

  function syncChartHost(host, { deferDuringNativeInteraction = true } = {}) {
    const adapter = chartAdapters.get(host);
    if (!adapter) return;
    const sourceState = resolveStateForHost(host) || state;
    if (deferDuringNativeInteraction && state.nativeInteraction.active) {
      pendingChartSyncAfterNativeInteraction = true;
      adapter.setMetadata?.(buildChartMetadata(computeRenderedBars(sourceState), sourceState));
      return;
    }
    const renderedBars = computeRenderedBars(sourceState);
    applyingRuntimeVisibleRange = true;
    try {
      adapter.resizeToHost?.();
      adapter.setPresentation(sourceState.displayContext);
      adapter.setBars(renderedBars, {
        fullBarCount: sourceState.bars.length,
        displayContext: sourceState.displayContext,
        metadata: buildChartMetadata(renderedBars, sourceState),
        followViewport: sourceState.interaction.mode === 'follow' && sourceState.viewportFollow.enabled,
      });
      if (sourceState.interaction.mode === 'manual') {
        adapter.setVisibleRange(sourceState.visibleRange);
      }
      adapter.resizeToHost?.();
    } finally {
      applyingRuntimeVisibleRange = false;
    }
  }

  function pruneDisconnectedHosts() {
    for (const host of mountedHostList) {
      if (host.isConnected) continue;
      const paneId = host.dataset?.chartPaneId || '';
      chartAdapters.get(host)?.destroy();
      chartAdapters.delete(host);
      mountedHosts.delete(host);
      mountedHostList.delete(host);
      if (paneId && mountedHostByPaneId?.get(paneId) === host) {
        mountedHostByPaneId.delete(paneId);
      }
    }
  }

  function rerenderMountedHosts(options = {}) {
    pruneDisconnectedHosts();
    for (const host of mountedHostList) {
      syncChartHost(host, options);
    }
  }

  function syncMetadataToMountedHosts() {
    for (const host of mountedHostList) {
      if (!host.isConnected) continue;
      const sourceState = resolveStateForHost(host) || state;
      chartAdapters.get(host)?.setMetadata?.(buildChartMetadata(computeRenderedBars(sourceState), sourceState));
    }
  }

  function flushPendingAfterNativeInteraction() {
    if (!pendingChartSyncAfterNativeInteraction) return false;
    pendingChartSyncAfterNativeInteraction = false;
    rerenderMountedHosts({ deferDuringNativeInteraction: false });
    return true;
  }

  function getSyncState() {
    return {
      applyingRuntimeVisibleRange,
      pendingChartSyncAfterNativeInteraction,
    };
  }

  return {
    syncChartHost,
    pruneDisconnectedHosts,
    rerenderMountedHosts,
    syncMetadataToMountedHosts,
    flushPendingAfterNativeInteraction,
    getSyncState,
  };
}
