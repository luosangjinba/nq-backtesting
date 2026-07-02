import { computeRenderedBars } from './chart-runtime-viewport.js';

export function createChartRuntimeHostSync({
  state,
  mountedHosts,
  mountedHostList,
  mountedHostByPaneId,
  chartAdapters,
} = {}) {
  let applyingRuntimeVisibleRange = false;
  let pendingChartSyncAfterNativeInteraction = false;

  function buildChartMetadata(renderedBars = computeRenderedBars(state)) {
    return {
      viewportFollow: state.viewportFollow.enabled ? 'true' : 'false',
      interactionMode: state.interaction.mode,
      renderedBarCount: renderedBars.length,
      fullBarCount: state.bars.length,
      crosshairActive: state.crosshair.active ? 'true' : 'false',
      crosshairTime: state.crosshair.time || '',
      crosshairPrice: state.crosshair.price == null ? '' : state.crosshair.price,
      nativeInteractionActive: state.nativeInteraction.active ? 'true' : 'false',
      nativeInteractionType: state.nativeInteraction.type || '',
    };
  }

  function syncChartHost(host, { deferDuringNativeInteraction = true } = {}) {
    const adapter = chartAdapters.get(host);
    if (!adapter) return;
    if (deferDuringNativeInteraction && state.nativeInteraction.active) {
      pendingChartSyncAfterNativeInteraction = true;
      adapter.setMetadata?.(buildChartMetadata());
      return;
    }
    const renderedBars = computeRenderedBars(state);
    applyingRuntimeVisibleRange = true;
    try {
      adapter.setPresentation(state.displayContext);
      adapter.setBars(renderedBars, {
        fullBarCount: state.bars.length,
        displayContext: state.displayContext,
        metadata: buildChartMetadata(renderedBars),
        followViewport: state.interaction.mode === 'follow' && state.viewportFollow.enabled,
      });
      if (state.interaction.mode === 'manual') {
        adapter.setVisibleRange(state.visibleRange);
      }
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
    const metadata = buildChartMetadata();
    for (const host of mountedHostList) {
      if (!host.isConnected) continue;
      chartAdapters.get(host)?.setMetadata?.(metadata);
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
