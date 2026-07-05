import { CHART_VIEWPORT_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { measureManualWallFromLogicalRange } from '../viewport/viewport-projection.js';

const RANGE_EPSILON = 0.000001;

function rangesEqual(left = {}, right = {}) {
  return (
    Math.abs(Number(left.from) - Number(right.from)) <= RANGE_EPSILON &&
    Math.abs(Number(left.to) - Number(right.to)) <= RANGE_EPSILON
  );
}

function findPaneSnapshot(chartSurface, paneId) {
  return chartSurface.getState?.().panes
    ?.find((pane) => pane.paneId === paneId)?.snapshot || null;
}

function findAppliedChartData(chartSurface, paneId) {
  return chartSurface.getState?.().appliedChartData
    ?.find((record) => record.paneId === paneId) || null;
}

function findAppliedViewport(chartSurface, paneId) {
  return chartSurface.getState?.().appliedViewport
    ?.find((record) => record.paneId === paneId) || null;
}

export function connectManualWallInputBridge({
  chartSurface,
  dispatchCommand = dispatchRuntimeCommand,
} = {}) {
  if (!chartSurface || typeof chartSurface.subscribeVisibleRangeChange !== 'function') {
    throw new Error('Manual wall input bridge requires a chart surface with visible range events.');
  }
  if (typeof dispatchCommand !== 'function') {
    throw new Error('Manual wall input bridge requires dispatchCommand.');
  }

  let active = true;
  const unsubscribe = chartSurface.subscribeVisibleRangeChange((event = {}) => {
    if (!active) return;
    const paneId = String(event.paneId || '').trim();
    const range = {
      from: Number(event.from),
      to: Number(event.to),
    };
    if (!paneId || !Number.isFinite(range.from) || !Number.isFinite(range.to)) {
      return;
    }
    const appliedViewport = findAppliedViewport(chartSurface, paneId);
    if (appliedViewport && rangesEqual(appliedViewport, range)) {
      return;
    }
    const paneSnapshot = findPaneSnapshot(chartSurface, paneId);
    const latestLogicalIndex = Number(paneSnapshot?.dataLength) - 1;
    if (!Number.isFinite(latestLogicalIndex) || latestLogicalIndex < 0) {
      return;
    }
    const measurement = measureManualWallFromLogicalRange({
      latestLogicalIndex,
      range,
    });
    const appliedChartData = findAppliedChartData(chartSurface, paneId);
    void Promise.resolve(dispatchCommand(CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
      ...measurement,
      paneId,
    })).then(() => dispatchCommand(CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
      chartBarsRevision: Number(appliedChartData?.revision) || 0,
      latestLogicalIndex,
      paneId,
    }));
  });

  return {
    destroy() {
      active = false;
      unsubscribe();
    },
  };
}
