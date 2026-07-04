import {
  DEFAULT_ACTIVE_PANE_ID,
  DEFAULT_LAYOUT_STATE,
} from '../../contracts/layout-contracts.js';

export function createChartReplayPaneOrchestrator({
  getLayoutState,
  getReplayDisplayTimeframe,
  getSessionTimeframe,
  getDisplayTimeframeFallback,
} = {}) {
  let disposed = false;

  function layoutSnapshot(layoutState) {
    return layoutState || getLayoutState?.() || DEFAULT_LAYOUT_STATE;
  }

  function activeDisplayTimeframe(layoutState) {
    const snapshot = layoutSnapshot(layoutState);
    const activePaneId = snapshot.activePaneId || DEFAULT_ACTIVE_PANE_ID;
    const activePane = snapshot.panes?.find((pane) => pane.id === activePaneId);
    return Number(
      activePane?.displayTimeframe
      || getReplayDisplayTimeframe?.()
      || getSessionTimeframe?.()
      || getDisplayTimeframeFallback?.()
      || 1
    );
  }

  function dispose() {
    disposed = true;
  }

  return {
    activeDisplayTimeframe,
    dispose,
    get disposed() {
      return disposed;
    },
  };
}
