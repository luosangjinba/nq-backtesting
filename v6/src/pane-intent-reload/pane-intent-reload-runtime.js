import {
  PANE_COMMANDS,
  PANE_EVENTS,
  PANE_INTENT_RELOAD_COMMANDS,
  PANE_INTENT_RELOAD_EVENTS,
  PANE_INTENT_SYNC_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import {
  createReloadIntentsFromPaneIntent,
  createReloadIntentsFromSyncApplied,
} from './pane-intent-reload-model.js';

function cloneIntent(intent = {}) {
  return { ...intent };
}

function cloneIntents(intents = []) {
  return intents.map(cloneIntent);
}

function createInitialState() {
  return {
    intentCount: 0,
    lastIntents: [],
    status: 'idle',
  };
}

export function createPaneIntentReloadRuntime() {
  const unregisterCallbacks = [];
  const unsubscribeCallbacks = [];
  let emit = () => {};
  let state = createInitialState();

  function publishIntents(intents = []) {
    const records = cloneIntents(intents);
    state = {
      intentCount: state.intentCount + records.length,
      lastIntents: records,
      status: records.length ? 'intent-created' : state.status,
    };
    if (records.length) {
      emit(PANE_INTENT_RELOAD_EVENTS.INTENT_CREATED, records);
    }
    return records;
  }

  function handlePaneIntent(reason, pane = {}) {
    return publishIntents(createReloadIntentsFromPaneIntent({
      pane,
      reason,
      source: 'pane-intent',
    }));
  }

  async function handleSyncApplied(applied = {}) {
    const paneSnapshot = await dispatchCommand(PANE_COMMANDS.GET_SNAPSHOT);
    return publishIntents(createReloadIntentsFromSyncApplied(applied, paneSnapshot));
  }

  function getState() {
    return {
      intentCount: state.intentCount,
      lastIntents: cloneIntents(state.lastIntents),
      status: state.status,
    };
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(PANE_INTENT_RELOAD_COMMANDS.GET_STATE, getState),
    );
    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(PANE_EVENTS.SYMBOL_INTENT_CHANGED, (pane) => {
          handlePaneIntent('symbol', pane);
        }),
        subscribeEvent(PANE_EVENTS.INTERVAL_INTENT_CHANGED, (pane) => {
          handlePaneIntent('interval', pane);
        }),
        subscribeEvent(PANE_INTENT_SYNC_EVENTS.APPLIED, (applied) => {
          void handleSyncApplied(applied);
        }),
      );
    }
  }

  function stop() {
    while (unsubscribeCallbacks.length) {
      unsubscribeCallbacks.pop()();
    }
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    emit = () => {};
    state = createInitialState();
  }

  return {
    id: 'runtime.paneIntentReload',
    start,
    stop,
  };
}
