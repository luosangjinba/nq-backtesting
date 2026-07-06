import { CHART_VIEWPORT_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';

function findPaneSnapshot(chartSurface, paneId) {
  return chartSurface.getState?.().panes
    ?.find((pane) => pane.paneId === paneId)?.snapshot || null;
}

function findAppliedChartData(chartSurface, paneId) {
  return chartSurface.getState?.().appliedChartData
    ?.find((record) => record.paneId === paneId) || null;
}

function resolvePaneId(chartSurface, fallbackPaneId) {
  const state = chartSurface.getState?.() || {};
  const paneId = String(fallbackPaneId || state.panes?.[0]?.paneId || '').trim();
  if (!paneId) {
    throw new Error('Reset view control requires a chart pane.');
  }
  return paneId;
}

export function connectResetViewControl({
  button,
  chartSurface,
  dispatchCommand = dispatchRuntimeCommand,
  paneId = 'main',
} = {}) {
  if (!button || typeof button.addEventListener !== 'function') {
    throw new Error('Reset view control requires a button.');
  }
  if (!chartSurface || typeof chartSurface.getState !== 'function') {
    throw new Error('Reset view control requires a chart surface.');
  }
  if (typeof dispatchCommand !== 'function') {
    throw new Error('Reset view control requires dispatchCommand.');
  }

  const abortController = new AbortController();
  const signal = abortController.signal;

  async function resetView() {
    const targetPaneId = resolvePaneId(chartSurface, paneId);
    const paneSnapshot = findPaneSnapshot(chartSurface, targetPaneId);
    const latestLogicalIndex = Number(paneSnapshot?.dataLength) - 1;
    if (!Number.isFinite(latestLogicalIndex) || latestLogicalIndex < 0) {
      return null;
    }
    const appliedChartData = findAppliedChartData(chartSurface, targetPaneId);
    return dispatchCommand(CHART_VIEWPORT_COMMANDS.RESET_VIEW, {
      chartBarsRevision: Number(appliedChartData?.revision) || 0,
      latestLogicalIndex,
      paneId: targetPaneId,
    });
  }

  button.addEventListener('click', () => {
    void Promise.resolve(resetView()).catch((error) => {
      button.dataset.lastError = error?.message || String(error);
    });
  }, { signal });

  return {
    destroy() {
      abortController.abort();
    },
    resetView,
  };
}
