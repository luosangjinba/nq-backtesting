import { PANE_COMMANDS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';

export function connectPaneActiveSurfaceBridge({
  chartSurface,
  dispatchCommand = dispatchRuntimeCommand,
} = {}) {
  if (!chartSurface || typeof chartSurface.subscribePaneActivation !== 'function') {
    throw new Error('Pane active surface bridge requires a chart surface with pane activation events.');
  }
  if (typeof dispatchCommand !== 'function') {
    throw new Error('Pane active surface bridge requires dispatchCommand.');
  }

  let active = true;
  const unsubscribe = chartSurface.subscribePaneActivation((event = {}) => {
    if (!active) return;
    const paneId = String(event.paneId || '').trim();
    if (!paneId) {
      return;
    }
    void Promise.resolve(dispatchCommand(PANE_COMMANDS.SET_ACTIVE, paneId));
  });

  return {
    destroy() {
      active = false;
      unsubscribe();
    },
  };
}
