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
      viewportCursorTimestamp: sourceState.viewportFollow.cursorTimestamp || '',
      interactionMode: sourceState.interaction.mode,
      renderedBarCount: renderedBars.length,
      fullBarCount: sourceState.bars.length,
      displayTimeframe: sourceState.displayContext.displayTimeframe || '',
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

  function barsEqual(left, right) {
    return left?.time === right?.time
      && left?.open === right?.open
      && left?.high === right?.high
      && left?.low === right?.low
      && left?.close === right?.close;
  }

  function splitRenderedAppend(previousRenderedBars = [], nextRenderedBars = []) {
    if (nextRenderedBars.length < previousRenderedBars.length) return null;
    for (let index = 0; index < previousRenderedBars.length; index += 1) {
      if (!barsEqual(previousRenderedBars[index], nextRenderedBars[index])) {
        return null;
      }
    }
    return nextRenderedBars.slice(previousRenderedBars.length);
  }

  function syncChartHostAppend(host, previousSourceState, nextSourceState, { deferDuringNativeInteraction = true } = {}) {
    const adapter = chartAdapters.get(host);
    if (!adapter) return;
    if (typeof adapter.appendBars !== 'function') {
      syncChartHost(host, { deferDuringNativeInteraction });
      return;
    }
    if (deferDuringNativeInteraction && state.nativeInteraction.active) {
      pendingChartSyncAfterNativeInteraction = true;
      adapter.setMetadata?.(buildChartMetadata(computeRenderedBars(nextSourceState), nextSourceState));
      return;
    }
    const previousRenderedBars = computeRenderedBars(previousSourceState);
    const nextRenderedBars = computeRenderedBars(nextSourceState);
    const appendedBars = splitRenderedAppend(previousRenderedBars, nextRenderedBars);
    if (!appendedBars || !appendedBars.length) {
      syncChartHost(host, { deferDuringNativeInteraction });
      return;
    }
    applyingRuntimeVisibleRange = true;
    try {
      adapter.resizeToHost?.();
      adapter.appendBars(appendedBars, {
        fullBarCount: nextSourceState.bars.length,
        displayContext: nextSourceState.displayContext,
        metadata: buildChartMetadata(nextRenderedBars, nextSourceState),
        followViewport: nextSourceState.interaction.mode === 'follow' && nextSourceState.viewportFollow.enabled,
      });
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

  function resetPriceScaleForHost(host) {
    if (!host?.isConnected) return;
    chartAdapters.get(host)?.resetPriceScale?.();
  }

  function resetPriceScales({ paneId } = {}) {
    if (paneId) {
      resetPriceScaleForHost(mountedHostByPaneId?.get(paneId));
      return;
    }
    for (const host of mountedHostList) {
      resetPriceScaleForHost(host);
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
    syncChartHostAppend,
    pruneDisconnectedHosts,
    rerenderMountedHosts,
    syncMetadataToMountedHosts,
    resetPriceScales,
    flushPendingAfterNativeInteraction,
    getSyncState,
  };
}
