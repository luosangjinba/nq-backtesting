import { LAYOUT_COMMANDS, LAYOUT_EVENTS, PANE_COMMANDS, PANE_EVENTS } from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import { createLayoutStore } from './layout-store.js';

export function createLayoutRuntime({
  store = createLayoutStore(),
} = {}) {
  const unregisterCallbacks = [];

  async function snapshotFromOwners() {
    const layout = store.snapshot();
    const paneSnapshot = await dispatchCommand(PANE_COMMANDS.GET_SNAPSHOT);
    return {
      ...layout,
      activePaneId: paneSnapshot.activePaneId,
      panes: paneSnapshot.panes,
    };
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(LAYOUT_COMMANDS.GET_SNAPSHOT, snapshotFromOwners),
      registerCommand(LAYOUT_COMMANDS.SET_MODE, async ({ mode, variant } = {}) => {
        store.setMode(mode, variant);
        const snapshot = await snapshotFromOwners();
        emitEvent?.(LAYOUT_EVENTS.MODE_CHANGED, snapshot);
        return snapshot;
      }),
      registerCommand(LAYOUT_COMMANDS.SET_ACTIVE_PANE, async ({ paneId } = {}) => {
        await dispatchCommand(PANE_COMMANDS.SET_ACTIVE, paneId);
        return snapshotFromOwners();
      }),
      registerCommand(LAYOUT_COMMANDS.SET_SYNC, async ({ key, value } = {}) => {
        store.setSync(key, value);
        const snapshot = await snapshotFromOwners();
        emitEvent?.(LAYOUT_EVENTS.SYNC_CHANGED, snapshot);
        return snapshot;
      }),
    );
    if (typeof subscribeEvent === 'function') {
      unregisterCallbacks.push(subscribeEvent(PANE_EVENTS.ACTIVE_CHANGED, async () => {
        emitEvent?.(LAYOUT_EVENTS.ACTIVE_PANE_CHANGED, await snapshotFromOwners());
      }));
    }
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
