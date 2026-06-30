import { dispatchCommand } from '../../runtime/commands.js';
import { subscribeEvent } from '../../runtime/events.js';
import { CHART_EVENTS } from '../../contracts/chart-contracts.js';
import { REPLAY_COMMANDS } from '../../contracts/replay-contracts.js';

function demandKey(sessionId, viewportDemand = {}) {
  const missingWindow = viewportDemand.missingWindow || {};
  return [
    sessionId,
    viewportDemand.instrument || '',
    viewportDemand.displayTimeframe || '',
    viewportDemand.direction || '',
    missingWindow.direction || '',
    missingWindow.anchor || '',
    missingWindow.from || '',
    missingWindow.to || '',
    missingWindow.suggestedCount || '',
  ].join('|');
}

export function createReplayViewportDemandBridge({
  getSessionId,
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
  let unsubscribe = null;

  function start() {
    if (unsubscribe) return;
    unsubscribe = subscribeEvent(CHART_EVENTS.VIEWPORT_DEMAND, ({ viewportDemand } = {}) => {
      const sessionId = getSessionId();
      if (!sessionId || !viewportDemand) return;

      const key = demandKey(sessionId, viewportDemand);
      if (inFlightDemandKeys.has(key)) return;
      inFlightDemandKeys.add(key);

      dispatchCommand(REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW, {
        sessionId,
        viewportDemand,
      })
        .then((result) => {
          onLoaded(result);
        })
        .catch((error) => {
          onError(error);
        })
        .finally(() => {
          inFlightDemandKeys.delete(key);
        });
    });
  }

  function stop() {
    unsubscribe?.();
    unsubscribe = null;
    inFlightDemandKeys.clear();
  }

  return {
    start,
    stop,
  };
}
