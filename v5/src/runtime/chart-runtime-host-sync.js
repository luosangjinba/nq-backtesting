import { computeRenderedBars } from './chart-runtime-viewport.js';
import { markReplayTrace } from './replay-trace.js';

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

  function followViewportForHost(host, sourceState = state) {
    if (!sourceState.viewportFollow.enabled) {
      return false;
    }
    if (sourceState.viewportFollow.estimatedVisibleBars) {
      return { ...sourceState.viewportFollow };
    }
    const width = Number(host?.dataset?.chartResizeWidth || 0);
    const estimatedVisibleBars = width > 0 ? Math.floor(width / 10) : null;
    return {
      ...sourceState.viewportFollow,
      estimatedVisibleBars: estimatedVisibleBars || sourceState.viewportFollow.estimatedVisibleBars,
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
        followViewport: sourceState.interaction.mode === 'follow'
          ? followViewportForHost(host, sourceState)
          : false,
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

  function barsOverlap(previousRenderedBars = [], nextRenderedBars = [], overlapCount = 0) {
    if (overlapCount <= 0) return false;
    const previousStart = previousRenderedBars.length - overlapCount;
    for (let index = 0; index < overlapCount; index += 1) {
      if (!barsEqual(previousRenderedBars[previousStart + index], nextRenderedBars[index])) {
        return false;
      }
    }
    return true;
  }

  function splitRenderedAppend(previousRenderedBars = [], nextRenderedBars = []) {
    if (!nextRenderedBars.length) return null;
    if (!previousRenderedBars.length) {
      return {
        mode: 'initial',
        appendedBars: [...nextRenderedBars],
        renderedBars: [...nextRenderedBars],
      };
    }
    const maxOverlap = Math.min(previousRenderedBars.length, nextRenderedBars.length);
    for (let overlapCount = maxOverlap; overlapCount > 0; overlapCount -= 1) {
      if (!barsOverlap(previousRenderedBars, nextRenderedBars, overlapCount)) continue;
      return {
        mode: overlapCount === previousRenderedBars.length ? 'tail' : 'sliding-tail',
        appendedBars: nextRenderedBars.slice(overlapCount),
        renderedBars: [...nextRenderedBars],
      };
    }
    return null;
  }

  function syncChartHostAppend(host, previousSourceState, nextSourceState, { deferDuringNativeInteraction = true } = {}) {
    const adapter = chartAdapters.get(host);
    if (!adapter) return;
    const paneId = host.dataset?.chartPaneId || '';
    markReplayTrace('chartHostSync.append.start', { paneId });
    if (typeof adapter.appendBars !== 'function') {
      syncChartHost(host, { deferDuringNativeInteraction });
      markReplayTrace('chartHostSync.append.end', { paneId, mode: 'replace' });
      return;
    }
    if (deferDuringNativeInteraction && state.nativeInteraction.active) {
      pendingChartSyncAfterNativeInteraction = true;
      adapter.setMetadata?.(buildChartMetadata(computeRenderedBars(nextSourceState), nextSourceState));
      markReplayTrace('chartHostSync.append.end', { paneId, mode: 'deferred' });
      return;
    }
    markReplayTrace('chartHostSync.append.compute.start', { paneId });
    const previousRenderedBars = computeRenderedBars(previousSourceState);
    const nextRenderedBars = computeRenderedBars(nextSourceState);
    const appendPlan = splitRenderedAppend(previousRenderedBars, nextRenderedBars);
    markReplayTrace('chartHostSync.append.compute.end', {
      paneId,
      previousRenderedCount: previousRenderedBars.length,
      nextRenderedCount: nextRenderedBars.length,
      appendedCount: appendPlan?.appendedBars?.length || 0,
      mode: appendPlan?.mode || 'replace',
    });
    if (!appendPlan || !appendPlan.appendedBars.length) {
      syncChartHost(host, { deferDuringNativeInteraction });
      markReplayTrace('chartHostSync.append.end', { paneId, mode: 'fallback-replace' });
      return;
    }
    applyingRuntimeVisibleRange = true;
    try {
      markReplayTrace('chartHostSync.append.resizeBefore.start', { paneId });
      adapter.resizeToHost?.();
      markReplayTrace('chartHostSync.append.resizeBefore.end', { paneId });
      markReplayTrace('chartHostSync.append.adapter.start', { paneId });
      adapter.appendBars(appendPlan.appendedBars, {
        fullBarCount: nextSourceState.bars.length,
        displayContext: nextSourceState.displayContext,
        metadata: buildChartMetadata(nextRenderedBars, nextSourceState),
        renderedBars: appendPlan.renderedBars,
        appendMode: appendPlan.mode,
        followViewport: nextSourceState.interaction.mode === 'follow'
          ? followViewportForHost(host, nextSourceState)
          : false,
      });
      markReplayTrace('chartHostSync.append.adapter.end', { paneId });
      markReplayTrace('chartHostSync.append.resizeAfter.start', { paneId });
      adapter.resizeToHost?.();
      markReplayTrace('chartHostSync.append.resizeAfter.end', { paneId });
    } finally {
      applyingRuntimeVisibleRange = false;
    }
    markReplayTrace('chartHostSync.append.end', { paneId, mode: 'append' });
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
