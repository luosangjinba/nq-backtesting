import { createEmptyChartState } from './chart-runtime-state.js';

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

function cloneDisplayContext(context = {}) {
  return structuredClone(context || {});
}

function createPaneRecord(seedContext = {}) {
  const nextState = createEmptyChartState();
  if (seedContext && Object.keys(seedContext).length) {
    nextState.displayContext = {
      ...nextState.displayContext,
      ...cloneDisplayContext(seedContext),
      displayRevision: 0,
    };
    nextState.viewportFollow = {
      ...nextState.viewportFollow,
      rightOffsetBars: nextState.displayContext.rightOffsetBars,
    };
  }
  return nextState;
}

export function createChartPaneStateStore({
  defaultPaneId = DEFAULT_CHART_PANE_ID,
} = {}) {
  const normalizedDefaultPaneId = normalizePaneId(defaultPaneId);
  const paneStateById = new Map();
  paneStateById.set(normalizedDefaultPaneId, createPaneRecord());

  function defaultDisplayContext() {
    return paneStateById.get(normalizedDefaultPaneId)?.displayContext || {};
  }

  function ensurePaneState(paneId = normalizedDefaultPaneId) {
    const normalizedPaneId = normalizePaneId(paneId);
    if (!paneStateById.has(normalizedPaneId)) {
      paneStateById.set(normalizedPaneId, createPaneRecord(defaultDisplayContext()));
    }
    return paneStateById.get(normalizedPaneId);
  }

  function updatePaneState(paneId, producer) {
    const normalizedPaneId = normalizePaneId(paneId);
    const currentState = ensurePaneState(normalizedPaneId);
    const patch = typeof producer === 'function'
      ? producer(currentState)
      : producer;
    if (patch && typeof patch === 'object') {
      Object.assign(currentState, patch);
    }
    return currentState;
  }

  function releaseUnretained(paneIds = []) {
    const retainedPaneIds = new Set([normalizedDefaultPaneId]);
    if (Array.isArray(paneIds)) {
      paneIds.forEach((paneId) => retainedPaneIds.add(normalizePaneId(paneId)));
    }
    const releasedPaneIds = [];
    for (const paneId of paneStateById.keys()) {
      if (retainedPaneIds.has(paneId)) continue;
      paneStateById.delete(paneId);
      releasedPaneIds.push(paneId);
    }
    return {
      retainedPaneIds: [...retainedPaneIds],
      releasedPaneIds,
    };
  }

  function clear() {
    paneStateById.clear();
    paneStateById.set(normalizedDefaultPaneId, createPaneRecord());
  }

  return {
    clear,
    defaultPaneId: normalizedDefaultPaneId,
    ensurePaneState,
    entries: () => [...paneStateById.entries()],
    get: (paneId) => ensurePaneState(paneId),
    releaseUnretained,
    updatePaneState,
  };
}
