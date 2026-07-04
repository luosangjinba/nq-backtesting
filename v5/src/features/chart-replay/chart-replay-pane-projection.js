import {
  REPLAY_COMMANDS,
  REPLAY_EVENTS,
} from '../../contracts/replay-contracts.js';

function normalizePaneId(paneId) {
  return String(paneId || '').trim();
}

function replayCursorTimestamp(payload = {}) {
  return payload.cursorTimestamp || payload.revealedBar?.time || payload.revealedBar?.timestamp || null;
}

function projectionAlreadyApplied(paneId, paneTimeframe, payload = {}) {
  if (!payload.paneFanoutProjected || !Array.isArray(payload.paneFanout?.projected)) return false;
  return payload.paneFanout.projected.some((pane) => (
    normalizePaneId(pane?.paneId) === paneId
    && Number(pane?.displayTimeframe) === Number(paneTimeframe)
  ));
}

export function createReplayPaneProjection({
  dispatchCommand,
  ensurePaneDisplay,
  paneInitialDisplayTimeframe,
  getSessionId,
  getSessionTimeframe,
  getDisplayTimeframeFallback,
  getReplayLoaded,
  isDisposed,
  setStatusText,
} = {}) {
  function disposed() {
    return Boolean(isDisposed?.());
  }

  function replayTimeframe(payload = {}) {
    return Number(
      payload.replayTimeframe
      || getSessionTimeframe?.()
      || getDisplayTimeframeFallback?.()
      || 1
    );
  }

  function projectionPanes(layoutState = {}) {
    if (!Array.isArray(layoutState.panes)) return [];
    return layoutState.panes.filter((pane) => normalizePaneId(pane.id));
  }

  async function projectPaneForReplayNext(pane, payload = {}) {
    const paneId = normalizePaneId(pane?.id);
    const sessionId = getSessionId?.() || '';
    if (!paneId || !sessionId || disposed()) return null;

    const paneTimeframe = Number(paneInitialDisplayTimeframe?.(pane));
    if (!Number.isFinite(paneTimeframe) || paneTimeframe <= 0) return null;

    const cursorTimestamp = replayCursorTimestamp(payload);
    await ensurePaneDisplay?.(pane);
    if (disposed()) return null;

    if (Number(paneTimeframe) === Number(replayTimeframe(payload)) && Array.isArray(payload.revealedBars)) {
      return {
        paneId,
        action: payload.paneFanoutApplied ? 'fanout-already-applied' : 'same-timeframe-fanout-required',
        displayTimeframe: paneTimeframe,
      };
    }

    if (projectionAlreadyApplied(paneId, paneTimeframe, payload)) {
      return {
        paneId,
        action: 'projection-already-applied',
        displayTimeframe: paneTimeframe,
      };
    }

    if (cursorTimestamp) {
      await dispatchCommand?.(REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW, {
        sessionId,
        paneId,
        displayTimeframe: paneTimeframe,
        anchor: cursorTimestamp,
        direction: 'backward',
      });
      return {
        paneId,
        action: 'load-display-window',
        displayTimeframe: paneTimeframe,
      };
    }

    return null;
  }

  function projectReplayEvent(eventName, payload = {}, layoutState = {}) {
    if (!getReplayLoaded?.() || disposed()) return [];
    if (eventName !== REPLAY_EVENTS.NEXT || !payload.advanced) return [];
    return projectionPanes(layoutState).map((pane) => (
      projectPaneForReplayNext(pane, payload).catch((error) => {
        if (!disposed()) {
          setStatusText?.(error?.message || String(error));
        }
        return {
          paneId: normalizePaneId(pane.id),
          action: 'error',
          error,
        };
      })
    ));
  }

  return {
    projectPaneForReplayNext,
    projectReplayEvent,
    replayCursorTimestamp,
    replayTimeframe,
  };
}
