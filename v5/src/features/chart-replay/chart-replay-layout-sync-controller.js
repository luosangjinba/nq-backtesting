import {
  DEFAULT_ACTIVE_PANE_ID,
  LAYOUT_COMMANDS,
} from '../../contracts/layout-contracts.js';

export function createChartReplayLayoutSyncController({
  dispatchCommand,
  getLayoutState,
  getActivePaneId,
  applyLayoutState,
  refreshReplayStatus,
  setCrosshairState,
  setControlsDisabled,
} = {}) {
  let disposed = false;

  function activePaneId() {
    return getActivePaneId?.() || DEFAULT_ACTIVE_PANE_ID;
  }

  function layoutState() {
    return getLayoutState?.() || {};
  }

  async function syncTime(time) {
    if (!time || disposed) return null;
    const nextLayoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_TIME, {
      paneId: activePaneId(),
      time,
    });
    applyLayoutState?.(nextLayoutState);
    return nextLayoutState;
  }

  async function syncDateRange(visibleRange) {
    if (!visibleRange || !layoutState().sync?.dateRange || disposed) return null;
    const from = visibleRange.from == null ? null : new Date(Number(visibleRange.from) * 1000).toISOString();
    const to = visibleRange.to == null ? null : new Date(Number(visibleRange.to) * 1000).toISOString();
    if (!from || !to) return null;
    const nextLayoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_DATE_RANGE, {
      paneId: activePaneId(),
      dateRange: { from, to },
    });
    applyLayoutState?.(nextLayoutState);
    return nextLayoutState;
  }

  async function syncCrosshair(crosshair) {
    if (!layoutState().sync?.crosshair || disposed) return null;
    const nextLayoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_CROSSHAIR, {
      paneId: activePaneId(),
      crosshair: crosshair || { active: false },
    });
    applyLayoutState?.(nextLayoutState);
    return nextLayoutState;
  }

  function handleCrosshairChanged(payload = {}) {
    if (disposed) return;
    setCrosshairState?.(payload.crosshair || { active: false });
    setControlsDisabled?.();
    syncCrosshair(payload.crosshair).catch(() => null);
  }

  function handleVisibleRangeChanged(payload = {}) {
    if (disposed) return;
    syncDateRange(payload.visibleRange).finally(() => refreshReplayStatus?.());
  }

  function dispose() {
    disposed = true;
  }

  return {
    syncTime,
    syncDateRange,
    syncCrosshair,
    handleCrosshairChanged,
    handleVisibleRangeChanged,
    dispose,
    get disposed() {
      return disposed;
    },
  };
}
