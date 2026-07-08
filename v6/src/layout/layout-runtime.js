import { LAYOUT_COMMANDS, LAYOUT_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { createLayoutStore } from './layout-store.js';

export function createLayoutRuntime({
  store = createLayoutStore(),
} = {}) {
  const unregisterCallbacks = [];

  function start({ emitEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(LAYOUT_COMMANDS.GET_SNAPSHOT, () => store.snapshot()),
      registerCommand(LAYOUT_COMMANDS.SET_MODE, ({ mode, variant } = {}) => {
        const snapshot = store.setMode(mode, variant);
        emitEvent?.(LAYOUT_EVENTS.MODE_CHANGED, snapshot);
        return snapshot;
      }),
      registerCommand(LAYOUT_COMMANDS.SET_ACTIVE_PANE, ({ paneId } = {}) => {
        const snapshot = store.setActivePane(paneId);
        emitEvent?.(LAYOUT_EVENTS.ACTIVE_PANE_CHANGED, snapshot);
        return snapshot;
      }),
      registerCommand(LAYOUT_COMMANDS.SET_SYNC, ({ key, value } = {}) => {
        const snapshot = store.setSync(key, value);
        emitEvent?.(LAYOUT_EVENTS.SYNC_CHANGED, snapshot);
        return snapshot;
      }),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.layout',
    start,
    stop,
  };
}
