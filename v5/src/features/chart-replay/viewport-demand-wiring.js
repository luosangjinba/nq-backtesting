import { dispatchCommand } from '../../runtime/commands.js';
import { subscribeEvent } from '../../runtime/events.js';
import { CHART_EVENTS } from '../../contracts/chart-contracts.js';
import { REPLAY_COMMANDS } from '../../contracts/replay-contracts.js';

function demandKey(sessionId, viewportDemand = {}) {
  const missingWindow = viewportDemand.missingWindow || {};
  const suggestedCount = Math.max(1, Math.ceil(Number(missingWindow.suggestedCount || 1)));
  return [
    sessionId,
    viewportDemand.instrument || '',
    viewportDemand.displayTimeframe || '',
    viewportDemand.direction || '',
    missingWindow.direction || '',
    missingWindow.anchor || '',
    suggestedCount,
  ].join('|');
}

export function createReplayViewportDemandBridge({
  getSessionId,
  settleMs = 140,
  completedTtlMs = 2_000,
  setTimer = globalThis.setTimeout?.bind(globalThis),
  clearTimer = globalThis.clearTimeout?.bind(globalThis),
  onLoaded = () => {},
  onError = (error) => {
    queueMicrotask(() => {
      throw error;
    });
  },
} = {}) {
  if (typeof getSessionId !== 'function') {
    throw new Error('viewport demand bridge requires getSessionId.');
  }

  const inFlightDemandKeys = new Set();
  const completedDemandKeys = new Map();
  let pendingDemand = null;
  let pendingTimer = null;
  let unsubscribe = null;

  function clearPendingDemand() {
    if (pendingTimer !== null) {
      clearTimer?.(pendingTimer);
      pendingTimer = null;
    }
    pendingDemand = null;
  }

  function dispatchPendingDemand() {
    const pending = pendingDemand;
    pendingDemand = null;
    pendingTimer = null;
    if (!pending) return;

    const { sessionId, viewportDemand, key } = pending;
    if (inFlightDemandKeys.has(key) || completedDemandKeys.has(key)) return;
    inFlightDemandKeys.add(key);

    dispatchCommand(REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW, {
      sessionId,
      viewportDemand,
      })
      .then((result) => {
        completedDemandKeys.set(key, Date.now() + Math.max(0, Number(completedTtlMs || 0)));
        onLoaded(result);
      })
      .catch((error) => {
        onError(error);
      })
      .finally(() => {
        inFlightDemandKeys.delete(key);
      });
  }

  function scheduleDemand(sessionId, viewportDemand) {
    const key = demandKey(sessionId, viewportDemand);
    const completedUntil = completedDemandKeys.get(key);
    if (completedUntil && completedUntil <= Date.now()) {
      completedDemandKeys.delete(key);
    }
    if (inFlightDemandKeys.has(key) || completedDemandKeys.has(key)) return;
    pendingDemand = {
      sessionId,
      viewportDemand,
      key,
    };
    if (pendingTimer !== null) {
      clearTimer?.(pendingTimer);
      pendingTimer = null;
    }
    const delay = Math.max(0, Number(settleMs || 0));
    pendingTimer = setTimer?.(dispatchPendingDemand, delay);
    if (pendingTimer == null) {
      queueMicrotask(dispatchPendingDemand);
    }
  }

  function start() {
    if (unsubscribe) return;
    unsubscribe = subscribeEvent(CHART_EVENTS.VIEWPORT_DEMAND, ({ viewportDemand } = {}) => {
      const sessionId = getSessionId();
      if (!sessionId || !viewportDemand) return;
      scheduleDemand(sessionId, viewportDemand);
    });
  }

  function stop() {
    unsubscribe?.();
    unsubscribe = null;
    clearPendingDemand();
    inFlightDemandKeys.clear();
    completedDemandKeys.clear();
  }

  return {
    start,
    stop,
  };
}
