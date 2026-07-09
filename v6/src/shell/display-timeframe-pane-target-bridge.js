import { PANE_COMMANDS, PANE_EVENTS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

function resolvePaneIdFromPane(pane = {}) {
  return String(pane.id || pane.paneId || '').trim();
}

export function connectDisplayTimeframePaneTargetBridge({
  dispatchCommand = dispatchRuntimeCommand,
  displayTimeframeControl,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!displayTimeframeControl || typeof displayTimeframeControl.setTargetPaneId !== 'function') {
    throw new Error('Display timeframe pane target bridge requires a display timeframe control.');
  }
  if (typeof dispatchCommand !== 'function') {
    throw new Error('Display timeframe pane target bridge requires dispatchCommand.');
  }
  if (typeof subscribeEvent !== 'function') {
    throw new Error('Display timeframe pane target bridge requires subscribeEvent.');
  }

  let active = true;

  function applyPane(pane = {}) {
    if (!active) return null;
    const paneId = resolvePaneIdFromPane(pane);
    if (!paneId) {
      return null;
    }
    return displayTimeframeControl.setTargetPaneId(paneId);
  }

  const unsubscribe = subscribeEvent(PANE_EVENTS.ACTIVE_CHANGED, applyPane);
  const ready = Promise.resolve(dispatchCommand(PANE_COMMANDS.GET_ACTIVE))
    .then((pane) => applyPane(pane))
    .catch(() => null);

  return {
    destroy() {
      active = false;
      unsubscribe();
    },
    ready,
  };
}
