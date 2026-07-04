export const DEFAULT_CHART_PANE_ID = 'primary';

export function normalizePaneId(value) {
  const paneId = String(value || DEFAULT_CHART_PANE_ID).trim();
  return paneId || DEFAULT_CHART_PANE_ID;
}

function cloneDisplayContext(context = {}) {
  return structuredClone(context || {});
}

function defaultPaneState(primaryState = {}) {
  return {
    bars: [],
    visibleRange: null,
    prefixDemand: null,
    viewportDemand: null,
    viewportFollow: {
      enabled: false,
      cursorTimestamp: null,
      estimatedVisibleBars: null,
      rightOffsetBars: primaryState.displayContext?.rightOffsetBars
        ?? primaryState.viewportFollow?.rightOffsetBars
        ?? null,
    },
    interaction: {
      mode: 'follow',
      manualVisibleRange: null,
    },
    nativeInteraction: structuredClone(primaryState.nativeInteraction || {
      active: false,
      type: null,
      source: null,
    }),
    crosshair: structuredClone(primaryState.crosshair || {
      active: false,
      time: null,
      price: null,
      bar: null,
      point: null,
    }),
    displayContext: {
      ...cloneDisplayContext(primaryState.displayContext),
      displayRevision: 0,
    },
  };
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
  const defaults = defaultPaneState(primaryState);
  if (!paneState) return defaults;
  return {
    ...defaults,
    ...paneState,
    bars: Array.isArray(paneState.bars) ? paneState.bars : defaults.bars,
    visibleRange: paneState.visibleRange || defaults.visibleRange,
    prefixDemand: paneState.prefixDemand || defaults.prefixDemand,
    viewportDemand: paneState.viewportDemand || defaults.viewportDemand,
    viewportFollow: paneState.viewportFollow || defaults.viewportFollow,
    interaction: paneState.interaction || defaults.interaction,
    nativeInteraction: paneState.nativeInteraction || defaults.nativeInteraction,
    crosshair: paneState.crosshair || defaults.crosshair,
    displayContext: paneState.displayContext || defaults.displayContext,
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
