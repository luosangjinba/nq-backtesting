import { PANE_COMMANDS, PANE_EVENTS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

export function connectPaneActiveSurfaceBridge({
  chartSurface,
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!chartSurface || typeof chartSurface.subscribePaneActivation !== 'function') {
    throw new Error('Pane active surface bridge requires a chart surface with pane activation events.');
  }
  if (typeof dispatchCommand !== 'function') {
    throw new Error('Pane active surface bridge requires dispatchCommand.');
  }
  if (typeof subscribeEvent !== 'function') {
    throw new Error('Pane active surface bridge requires subscribeEvent.');
  }

  let active = true;
  const unsubscribeSurface = chartSurface.subscribePaneActivation((event = {}) => {
    if (!active) return;
    const paneId = String(event.paneId || '').trim();
    if (!paneId) {
      return;
    }
    void Promise.resolve(dispatchCommand(PANE_COMMANDS.SET_ACTIVE, paneId));
  });
  const applyPane = (pane = {}) => {
    if (!active) return null;
    return chartSurface.applyActivePane?.(pane.id ?? pane.paneId) || null;
  };
  const unsubscribeRuntime = subscribeEvent(PANE_EVENTS.ACTIVE_CHANGED, applyPane);
  const ready = Promise.resolve(dispatchCommand(PANE_COMMANDS.GET_ACTIVE)).then(applyPane);

  return {
    ready,
    destroy() {
      active = false;
      unsubscribeSurface();
      unsubscribeRuntime();
    },
  };
}
