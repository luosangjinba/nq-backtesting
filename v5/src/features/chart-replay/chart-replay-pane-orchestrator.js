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
  const paneDisplayLoadKeys = new Set();
  const paneDisplayInitializationInFlight = new Set();
  const paneDisplayInitializationPromises = new Map();

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
    return Number(
      pane.displayTimeframe
      || getReplayDisplayTimeframe?.()
      || getSessionTimeframe?.()
      || getDisplayTimeframeFallback?.()
      || 1
    );
  }

  async function ensurePaneLocalDisplay(pane) {
    const paneId = String(pane?.id || '').trim();
    const sessionId = getSessionId?.() || '';
    if (!paneId || paneId === DEFAULT_ACTIVE_PANE_ID || !sessionId || !getReplayLoaded?.() || disposed) return;
    const nextDisplayTimeframe = paneInitialDisplayTimeframe(pane);
    if (!Number.isFinite(nextDisplayTimeframe) || nextDisplayTimeframe <= 0) return;
    const loadKey = `${paneId}:${nextDisplayTimeframe}`;
    if (paneDisplayLoadKeys.has(loadKey)) return;
    if (paneDisplayInitializationPromises.has(loadKey)) {
      return paneDisplayInitializationPromises.get(loadKey);
    }
    const initialization = (async () => {
      paneDisplayInitializationInFlight.add(loadKey);
      try {
        if (pane.displayTimeframe == null) {
          const layoutState = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_DISPLAY_TIMEFRAME, {
            paneId,
            displayTimeframe: nextDisplayTimeframe,
          });
          if (!disposed) {
            applyLayoutState(layoutState);
          }
        }
        await dispatchCommand(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, {
          sessionId,
          paneId,
          displayTimeframe: nextDisplayTimeframe,
        });
        paneDisplayLoadKeys.add(loadKey);
      } catch (error) {
        if (!disposed) {
          setStatusText?.(error?.message || String(error));
        }
      } finally {
        paneDisplayInitializationInFlight.delete(loadKey);
        paneDisplayInitializationPromises.delete(loadKey);
      }
    })();
    paneDisplayInitializationPromises.set(loadKey, initialization);
    return initialization;
  }

  function ensureNonPrimaryPaneDisplays(layoutState = currentLayoutState) {
    if (!getReplayLoaded?.() || disposed || !Array.isArray(layoutState.panes)) return;
    layoutState.panes
      .filter((pane) => pane.id && pane.id !== DEFAULT_ACTIVE_PANE_ID)
      .forEach((pane) => {
        ensurePaneLocalDisplay(pane);
      });
  }

  async function syncPaneForReplayNext(pane, payload = {}) {
    const paneId = String(pane?.id || '').trim();
    const sessionId = getSessionId?.() || '';
    if (!paneId || paneId === DEFAULT_ACTIVE_PANE_ID || !sessionId || disposed) return;
    const paneTimeframe = paneInitialDisplayTimeframe(pane);
    const replayTimeframe = Number(
      payload.replayTimeframe
      || getSessionTimeframe?.()
      || getDisplayTimeframeFallback?.()
      || 1
    );
    if (!Number.isFinite(paneTimeframe) || paneTimeframe <= 0) return;
    const cursorTimestamp = payload.cursorTimestamp || payload.revealedBar?.time || payload.revealedBar?.timestamp;
    await ensurePaneLocalDisplay(pane);
    if (disposed) return;
    if (Number(paneTimeframe) === Number(replayTimeframe) && Array.isArray(payload.revealedBars)) {
      const metrics = await dispatchCommand(CHART_COMMANDS.GET_VIEWPORT_METRICS, { paneId }).catch(() => null);
      await dispatchCommand(CHART_COMMANDS.APPEND_BARS, {
        paneId,
        bars: payload.revealedBars,
        viewportFollow: {
          enabled: true,
          cursorTimestamp,
          estimatedVisibleBars: metrics?.estimatedVisibleBars,
        },
      });
      return;
    }
    if (cursorTimestamp) {
      await dispatchCommand(REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW, {
        sessionId,
        paneId,
        displayTimeframe: paneTimeframe,
        anchor: cursorTimestamp,
        direction: 'backward',
      });
    }
  }

  function syncPanesForReplayEvent(eventName, payload = {}) {
    if (!getReplayLoaded?.() || disposed || !Array.isArray(currentLayoutState.panes)) return;
    if (eventName !== REPLAY_EVENTS.NEXT || !payload.advanced) return;
    currentLayoutState.panes
      .filter((pane) => pane.id && pane.id !== DEFAULT_ACTIVE_PANE_ID)
      .forEach((pane) => {
        syncPaneForReplayNext(pane, payload).catch((error) => {
          if (!disposed) {
            setStatusText?.(error?.message || String(error));
          }
        });
      });
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
        paneDisplayLoadKeys.add(`${targetPaneId}:${Number(nextDisplayTimeframe)}`);
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
    paneDisplayLoadKeys.clear();
    paneDisplayInitializationInFlight.clear();
    paneDisplayInitializationPromises.clear();
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
