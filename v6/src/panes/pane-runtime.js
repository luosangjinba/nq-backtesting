import { PANE_COMMANDS, PANE_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { createPaneStore } from './pane-store.js';

export function createPaneRuntime({
  store = createPaneStore(),
} = {}) {
  const unregisterCallbacks = [];

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(PANE_COMMANDS.GET_SNAPSHOT, () => store.snapshot()),
      registerCommand(PANE_COMMANDS.LIST, () => store.listPanes()),
      registerCommand(PANE_COMMANDS.GET_ACTIVE, () => store.getActivePane()),
      registerCommand(PANE_COMMANDS.GET_BY_ID, (paneId) => store.getPane(paneId)),
      registerCommand(PANE_COMMANDS.SET_ACTIVE, (paneId) => {
        const pane = store.setActivePane(paneId);
        emitEvent?.(PANE_EVENTS.ACTIVE_CHANGED, pane);
        return pane;
      })
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.pane',
    start,
    stop,
  };
}
