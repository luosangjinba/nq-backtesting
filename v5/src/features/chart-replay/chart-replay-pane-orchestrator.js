import {
  CHART_COMMANDS,
} from '../../contracts/chart-contracts.js';
import {
  DEFAULT_ACTIVE_PANE_ID,
  DEFAULT_LAYOUT_STATE,
  LAYOUT_COMMANDS,
} from '../../contracts/layout-contracts.js';
import {
  REPLAY_COMMANDS,
  REPLAY_EVENTS,
} from '../../contracts/replay-contracts.js';
import {
  createChartReplayPaneDisplayCoordinator,
} from './chart-replay-pane-display-coordinator.js';
import {
  createReplayPaneProjection,
} from './chart-replay-pane-projection.js';

export function createChartReplayPaneOrchestrator({
  root,
  dispatchCommand,
  getLayoutState,
  onLayoutStateChange,
  onDisplayTimeframeChange,
  setReplayDisplayTimeframe,
  getReplayDisplayTimeframe,
  getSessionTimeframe,
  getDisplayTimeframeFallback,
  getSessionId,
  getReplayLoaded,
  setStatusText,
  renderLayoutState,
  renderPaneShellState,
  refreshChartOhlcOverlay,
  renderReplayControls,
  setReplayControlsDisabled,
} = {}) {
  let disposed = false;
  let currentLayoutState = getLayoutState?.() || DEFAULT_LAYOUT_STATE;
  const paneDisplayCoordinator = createChartReplayPaneDisplayCoordinator({
    dispatchCommand,
    getReplayDisplayTimeframe,
    getSessionTimeframe,
    getDisplayTimeframeFallback,
    getSessionId,
    getReplayLoaded,
    onLayoutState: (layoutState) => applyLayoutState(layoutState),
    setStatusText,
    isDisposed: () => disposed,
  });
  const replayPaneProjection = createReplayPaneProjection({
    dispatchCommand,
    ensurePaneDisplay: (pane) => ensurePaneLocalDisplay(pane),
    paneInitialDisplayTimeframe: (pane) => paneInitialDisplayTimeframe(pane),
    getSessionId,
    getSessionTimeframe,
    getDisplayTimeframeFallback,
    getReplayLoaded,
    isDisposed: () => disposed,
    setStatusText,
  });

  function layoutSnapshot(layoutState) {
    return layoutState || currentLayoutState || getLayoutState?.() || DEFAULT_LAYOUT_STATE;
  }

  function getActivePaneId(layoutState = currentLayoutState) {
    return layoutSnapshot(layoutState).activePaneId || DEFAULT_ACTIVE_PANE_ID;
  }

  function activeDisplayTimeframe(layoutState) {
    const snapshot = layoutSnapshot(layoutState);
    const activePane = snapshot.panes?.find((pane) => pane.id === getActivePaneId(snapshot));
    return Number(
      activePane?.displayTimeframe
      || getReplayDisplayTimeframe?.()
      || getSessionTimeframe?.()
      || getDisplayTimeframeFallback?.()
      || 1
    );
  }

  function mountChartHosts() {
    root?.querySelectorAll('[data-chart-host]').forEach((host) => {
      dispatchCommand?.(CHART_COMMANDS.MOUNT_HOST, {
        paneId: host.dataset.chartPaneId || DEFAULT_ACTIVE_PANE_ID,
        host,
      }).catch(() => null);
    });
  }

  function releaseRemovedChartPanes(layoutState = currentLayoutState) {
    const paneIds = Array.isArray(layoutState.panes)
      ? layoutState.panes.map((pane) => pane.id || DEFAULT_ACTIVE_PANE_ID)
      : [DEFAULT_ACTIVE_PANE_ID];
    dispatchCommand?.(CHART_COMMANDS.RELEASE_PANES, { paneIds }).catch(() => null);
  }

  function paneInitialDisplayTimeframe(pane = {}) {
    return paneDisplayCoordinator.paneInitialDisplayTimeframe(pane);
  }

  function ensurePaneLocalDisplay(pane) {
    return paneDisplayCoordinator.ensurePaneDisplay(pane);
  }

  function ensureNonPrimaryPaneDisplays(layoutState = currentLayoutState) {
    return paneDisplayCoordinator.ensureNonPrimaryPaneDisplays(layoutState);
  }

  function syncPanesForReplayEvent(eventName, payload = {}) {
    return replayPaneProjection.projectReplayEvent(eventName, payload, currentLayoutState);
  }

  function applyLayoutState(layoutState = DEFAULT_LAYOUT_STATE) {
    if (disposed) return currentLayoutState;
    currentLayoutState = layoutState || DEFAULT_LAYOUT_STATE;
    onLayoutStateChange?.(currentLayoutState);
    const nextActivePaneId = currentLayoutState.activePaneId || DEFAULT_ACTIVE_PANE_ID;
    const nextPaneCount = Array.isArray(currentLayoutState.panes)
      ? currentLayoutState.panes.length
      : DEFAULT_LAYOUT_STATE.panes.length;
    if (root) {
      root.dataset.activePaneId = nextActivePaneId;
      root.dataset.activePaneCount = String(nextPaneCount);
      root.dataset.layoutMode = currentLayoutState.mode || DEFAULT_LAYOUT_STATE.mode;
      root.dataset.layoutVariant = currentLayoutState.variant || DEFAULT_LAYOUT_STATE.variant;
    }
    onDisplayTimeframeChange?.(activeDisplayTimeframe(currentLayoutState));
    renderLayoutState?.(currentLayoutState);
    renderPaneShellState?.(currentLayoutState);
    mountChartHosts();
    releaseRemovedChartPanes(currentLayoutState);
    ensureNonPrimaryPaneDisplays(currentLayoutState);
    refreshChartOhlcOverlay?.();
    renderReplayControls?.();
    setReplayControlsDisabled?.();
    return currentLayoutState;
  }

  async function setActivePaneDisplayTimeframe({ displayTimeframe: nextDisplayTimeframe } = {}) {
    const paneId = getActivePaneId();
    const layoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_DISPLAY_TIMEFRAME, {
      paneId,
      displayTimeframe: nextDisplayTimeframe,
    });
    applyLayoutState(layoutState);
    const targetPaneIds = layoutState.sync?.interval
      ? layoutState.panes.map((pane) => pane.id || DEFAULT_ACTIVE_PANE_ID)
      : [paneId];
    let state = null;
    for (const targetPaneId of targetPaneIds) {
      const nextState = await dispatchCommand(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        sessionId: getSessionId?.() || '',
        paneId: targetPaneId,
        displayTimeframe: nextDisplayTimeframe,
        resumeViewportFollow: true,
      });
      if (targetPaneId === DEFAULT_ACTIVE_PANE_ID || !state) {
        state = nextState;
      }
    }
    if (targetPaneIds.includes(DEFAULT_ACTIVE_PANE_ID)) {
      setReplayDisplayTimeframe?.(Number(state?.displayTimeframe || nextDisplayTimeframe));
    }
    targetPaneIds
      .filter((targetPaneId) => targetPaneId !== DEFAULT_ACTIVE_PANE_ID)
      .forEach((targetPaneId) => {
        paneDisplayCoordinator.markPaneDisplayReady(targetPaneId, Number(nextDisplayTimeframe));
      });
    onDisplayTimeframeChange?.(activeDisplayTimeframe(layoutState));
    return {
      ...(state || {}),
      paneId,
      displayTimeframe: Number(nextDisplayTimeframe),
      replayReloaded: true,
    };
  }

  function dispose() {
    disposed = true;
    paneDisplayCoordinator.dispose();
  }

  return {
    activeDisplayTimeframe,
    applyLayoutState,
    ensureNonPrimaryPaneDisplays,
    getActivePaneId,
    getLayoutState: () => currentLayoutState,
    mountChartHosts,
    setActivePaneDisplayTimeframe,
    syncPanesForReplayEvent,
    dispose,
    get disposed() {
      return disposed;
    },
  };
}
