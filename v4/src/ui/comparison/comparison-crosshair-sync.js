import * as chart from '../../chart/chart-manager.js';
import {
  hideComparisonSyncCrosshairCursor,
  showComparisonSyncCrosshairCursor,
} from '../../chart/comparison-chart-manager.js';
import { findDisplayBarFast, resolveExistingChartTimeFast } from '../../chart/display-bar-lookup.js';
import * as primaryStore from '../../data/bar-store.js';
import { getComparisonWindowState } from '../../comparison/comparison-window-store.js';
import { CHART_PANE_IDS, getSyncPeerPanes } from '../../chart-panes/chart-pane-store.js';

function requestFrame(callback) {
  const raf = globalThis.requestAnimationFrame || globalThis.window?.requestAnimationFrame;
  if (typeof raf === 'function') return raf(callback);
  callback();
  return null;
}

export function createComparisonCrosshairSync({ getReplaySyncedBars }) {
  let pendingPrimaryHoverTime = null;
  let pendingComparisonHoverTime = null;
  let primaryHoverFrame = null;
  let comparisonHoverFrame = null;

  function getPrimaryHoverTimestamp(time) {
    if (time === undefined || time === null) return null;
    const bar = findDisplayBarFast(primaryStore.getDisplayBars(), time, primaryStore.getCurrentTimeframe());
    return Number.isFinite(Number(bar?.timestamp)) ? Number(bar.timestamp) : null;
  }

  function getComparisonHoverTimestamp(time) {
    if (time === undefined || time === null) return null;
    const state = getComparisonWindowState();
    const bars = getReplaySyncedBars(state.displayBars || [], state.descriptor.timeframe);
    const bar = findDisplayBarFast(bars, time, state.descriptor.timeframe);
    return Number.isFinite(Number(bar?.timestamp)) ? Number(bar.timestamp) : null;
  }

  function syncComparisonHoverCursor(primaryTime) {
    const state = getComparisonWindowState();
    const peers = getSyncPeerPanes(CHART_PANE_IDS.PRIMARY);
    if (!state.enabled || !state.displayBars?.length || !peers.some((pane) => pane.id === CHART_PANE_IDS.COMPARISON)) {
      hideComparisonSyncCrosshairCursor();
      return;
    }
    const hoverTimestamp = getPrimaryHoverTimestamp(primaryTime);
    const syncedBars = getReplaySyncedBars(state.displayBars, state.descriptor.timeframe);
    const hoverTime = resolveExistingChartTimeFast(hoverTimestamp, state.descriptor.timeframe, syncedBars);
    if (hoverTime === null) {
      hideComparisonSyncCrosshairCursor();
      return;
    }
    showComparisonSyncCrosshairCursor(hoverTime);
  }

  function scheduleComparisonHoverCursor(primaryTime) {
    pendingPrimaryHoverTime = primaryTime;
    if (primaryHoverFrame !== null) return;
    primaryHoverFrame = requestFrame(() => {
      primaryHoverFrame = null;
      const time = pendingPrimaryHoverTime;
      pendingPrimaryHoverTime = null;
      syncComparisonHoverCursor(time);
    });
  }

  function syncPrimaryHoverCursor(comparisonTime) {
    const state = getComparisonWindowState();
    const peers = getSyncPeerPanes(CHART_PANE_IDS.COMPARISON);
    if (!state.enabled || !primaryStore.getDisplayBars().length || !peers.some((pane) => pane.id === CHART_PANE_IDS.PRIMARY)) {
      chart.hideSyncCrosshairCursor();
      return;
    }
    const hoverTimestamp = getComparisonHoverTimestamp(comparisonTime);
    const hoverTime = resolveExistingChartTimeFast(
      hoverTimestamp,
      primaryStore.getCurrentTimeframe(),
      primaryStore.getDisplayBars()
    );
    if (hoverTime === null) {
      chart.hideSyncCrosshairCursor();
      return;
    }
    chart.showSyncCrosshairCursor(hoverTime);
  }

  function schedulePrimaryHoverCursor(comparisonTime) {
    pendingComparisonHoverTime = comparisonTime;
    if (comparisonHoverFrame !== null) return;
    comparisonHoverFrame = requestFrame(() => {
      comparisonHoverFrame = null;
      const time = pendingComparisonHoverTime;
      pendingComparisonHoverTime = null;
      syncPrimaryHoverCursor(time);
    });
  }

  return {
    scheduleComparisonHoverCursor,
    schedulePrimaryHoverCursor,
  };
}
