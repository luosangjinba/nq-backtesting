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
      }),
      registerCommand(PANE_COMMANDS.SET_SYMBOL_INTENT, ({ instrument, paneId } = {}) => {
        const pane = store.setSymbolIntent(paneId, instrument);
        emitEvent?.(PANE_EVENTS.SYMBOL_INTENT_CHANGED, pane);
        return pane;
      }),
      registerCommand(PANE_COMMANDS.SET_INTERVAL_INTENT, ({ displayTimeframe, paneId } = {}) => {
        const pane = store.setIntervalIntent(paneId, displayTimeframe);
        emitEvent?.(PANE_EVENTS.INTERVAL_INTENT_CHANGED, pane);
        return pane;
      }),
      registerCommand(PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, ({ displayTimeframe, paneId } = {}) => {
        const pane = store.setIntervalIntent(paneId, displayTimeframe);
        emitEvent?.(PANE_EVENTS.INTERVAL_INTENT_CHANGED, pane);
        emitEvent?.(PANE_EVENTS.DISPLAY_TIMEFRAME_CHANGED, pane);
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
