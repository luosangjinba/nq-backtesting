import {
  DEFAULT_ACTIVE_PANE_ID,
  LAYOUT_COMMANDS,
} from '../../contracts/layout-contracts.js';
import {
  REPLAY_COMMANDS,
} from '../../contracts/replay-contracts.js';

export const PANE_DISPLAY_STATES = Object.freeze({
  IDLE: 'display-idle',
  LOADING: 'display-loading',
  READY: 'display-ready',
  ERROR: 'display-error',
});

function normalizePaneId(paneId) {
  return String(paneId || '').trim();
}

function displayLoadKey(paneId, displayTimeframe) {
  return `${paneId}:${Number(displayTimeframe)}`;
}

export function createChartReplayPaneDisplayCoordinator({
  dispatchCommand,
  getReplayDisplayTimeframe,
  getSessionTimeframe,
  getDisplayTimeframeFallback,
  getSessionId,
  getReplayLoaded,
  onLayoutState,
  setStatusText,
  isDisposed,
} = {}) {
  const paneStates = new Map();
  const loadedKeys = new Set();
  const initializationPromises = new Map();

  function disposed() {
    return Boolean(isDisposed?.());
  }

  function paneInitialDisplayTimeframe(pane = {}) {
    const paneId = pane.id || DEFAULT_ACTIVE_PANE_ID;
    if (pane.displayTimeframe) return Number(pane.displayTimeframe);
    if (paneId === DEFAULT_ACTIVE_PANE_ID) {
      return Number(
        getReplayDisplayTimeframe?.()
        || getSessionTimeframe?.()
        || getDisplayTimeframeFallback?.()
        || 1
      );
    }
    return Number(
      getSessionTimeframe?.()
      || getDisplayTimeframeFallback?.()
      || 1
    );
  }

  function setPaneState(paneId, state, detail = {}) {
    const nextPaneId = normalizePaneId(paneId);
    if (!nextPaneId) return null;
    const record = {
      paneId: nextPaneId,
      state,
      displayTimeframe: Number(detail.displayTimeframe || 0) || null,
      error: detail.error || null,
    };
    paneStates.set(nextPaneId, record);
    return record;
  }

  function getPaneDisplayState(paneId) {
    const nextPaneId = normalizePaneId(paneId);
    return paneStates.get(nextPaneId) || {
      paneId: nextPaneId,
      state: PANE_DISPLAY_STATES.IDLE,
      displayTimeframe: null,
      error: null,
    };
  }

  function markPaneDisplayReady(paneId, displayTimeframe) {
    const nextPaneId = normalizePaneId(paneId);
    const nextDisplayTimeframe = Number(displayTimeframe);
    if (!nextPaneId || !Number.isFinite(nextDisplayTimeframe) || nextDisplayTimeframe <= 0) return null;
    loadedKeys.add(displayLoadKey(nextPaneId, nextDisplayTimeframe));
    return setPaneState(nextPaneId, PANE_DISPLAY_STATES.READY, {
      displayTimeframe: nextDisplayTimeframe,
    });
  }

  async function ensurePaneDisplay(pane = {}) {
    const paneId = normalizePaneId(pane.id);
    const sessionId = getSessionId?.() || '';
    if (!paneId || paneId === DEFAULT_ACTIVE_PANE_ID || !sessionId || !getReplayLoaded?.() || disposed()) return null;
    const nextDisplayTimeframe = paneInitialDisplayTimeframe(pane);
    if (!Number.isFinite(nextDisplayTimeframe) || nextDisplayTimeframe <= 0) return null;
    const loadKey = displayLoadKey(paneId, nextDisplayTimeframe);
    if (loadedKeys.has(loadKey)) {
      return getPaneDisplayState(paneId);
    }
    if (initializationPromises.has(loadKey)) {
      return initializationPromises.get(loadKey);
    }

    const initialization = (async () => {
      setPaneState(paneId, PANE_DISPLAY_STATES.LOADING, {
        displayTimeframe: nextDisplayTimeframe,
      });
      try {
        if (pane.displayTimeframe == null) {
          const layoutState = await dispatchCommand?.(LAYOUT_COMMANDS.SET_PANE_DISPLAY_TIMEFRAME, {
            paneId,
            displayTimeframe: nextDisplayTimeframe,
          });
          if (!disposed()) {
            onLayoutState?.(layoutState);
          }
        }
        await dispatchCommand?.(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, {
          sessionId,
          paneId,
          displayTimeframe: nextDisplayTimeframe,
        });
        return markPaneDisplayReady(paneId, nextDisplayTimeframe);
      } catch (error) {
        const record = setPaneState(paneId, PANE_DISPLAY_STATES.ERROR, {
          displayTimeframe: nextDisplayTimeframe,
          error,
        });
        if (!disposed()) {
          setStatusText?.(error?.message || String(error));
        }
        return record;
      } finally {
        initializationPromises.delete(loadKey);
      }
    })();

    initializationPromises.set(loadKey, initialization);
    return initialization;
  }

  function ensureNonPrimaryPaneDisplays(layoutState = {}) {
    if (!getReplayLoaded?.() || disposed() || !Array.isArray(layoutState.panes)) return [];
    return layoutState.panes
      .filter((pane) => pane.id && pane.id !== DEFAULT_ACTIVE_PANE_ID)
      .map((pane) => ensurePaneDisplay(pane));
  }

  function clear() {
    loadedKeys.clear();
    initializationPromises.clear();
    paneStates.clear();
  }

  return {
    clear,
    dispose: clear,
    ensureNonPrimaryPaneDisplays,
    ensurePaneDisplay,
    getPaneDisplayState,
    markPaneDisplayReady,
    paneInitialDisplayTimeframe,
  };
}
