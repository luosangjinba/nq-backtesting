export const DEFAULT_CHART_PANE_ID = 'primary';

export function normalizePaneId(value) {
  const paneId = String(value || DEFAULT_CHART_PANE_ID).trim();
  return paneId || DEFAULT_CHART_PANE_ID;
}

export function cloneChartStateSnapshot(sourceState) {
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

export function stateForPane({
  paneId = DEFAULT_CHART_PANE_ID,
  primaryState,
  paneDisplayStateByPaneId,
} = {}) {
  const normalizedPaneId = normalizePaneId(paneId);
  if (normalizedPaneId === DEFAULT_CHART_PANE_ID) return primaryState;
  const paneState = paneDisplayStateByPaneId?.get(normalizedPaneId);
  if (!paneState) return primaryState;
  return {
    ...primaryState,
    bars: paneState.bars || primaryState.bars,
    visibleRange: paneState.visibleRange || primaryState.visibleRange,
    prefixDemand: paneState.prefixDemand || null,
    viewportDemand: paneState.viewportDemand || null,
    viewportFollow: paneState.viewportFollow || primaryState.viewportFollow,
    interaction: paneState.interaction || primaryState.interaction,
    displayContext: paneState.displayContext || primaryState.displayContext,
  };
}

export function updatePaneDisplayState({
  paneId,
  patch = {},
  primaryState,
  paneDisplayStateByPaneId,
} = {}) {
  const normalizedPaneId = normalizePaneId(paneId);
  const currentPaneState = paneDisplayStateByPaneId.get(normalizedPaneId) || {};
  const nextPaneState = {
    ...currentPaneState,
    ...patch,
  };
  paneDisplayStateByPaneId.set(normalizedPaneId, nextPaneState);
  return stateForPane({
    paneId: normalizedPaneId,
    primaryState,
    paneDisplayStateByPaneId,
  });
}

export function retainedPaneIdSet(values = []) {
  const retainedPaneIds = new Set([DEFAULT_CHART_PANE_ID]);
  if (!Array.isArray(values)) return retainedPaneIds;
  values.forEach((value) => {
    retainedPaneIds.add(normalizePaneId(value));
  });
  return retainedPaneIds;
}
