import {
  PANE_INTENT_RELOAD_EVENTS,
  PANE_INTENT_RELOAD_PLAN_COMMANDS,
  PANE_INTENT_RELOAD_PLAN_EVENTS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import { createReplaySafeReloadWindowPlans } from './pane-intent-reload-window-plan.js';

function cloneWindow(window = {}) {
  return { ...window };
}

function clonePlan(plan = {}) {
  return {
    ...plan,
    window: cloneWindow(plan.window),
  };
}

function clonePlans(plans = []) {
  return plans.map(clonePlan);
}

function createInitialState() {
  return {
    lastError: null,
    lastPlans: [],
    plannedCount: 0,
    status: 'idle',
  };
}

export function createPaneIntentReloadWindowRuntime() {
  const unregisterCallbacks = [];
  const unsubscribeCallbacks = [];
  let emit = () => {};
  let state = createInitialState();

  function publishPlans(plans = []) {
    const records = clonePlans(plans);
    state = {
      lastError: null,
      lastPlans: records,
      plannedCount: state.plannedCount + records.length,
      status: records.length ? 'planned' : state.status,
    };
    if (records.length) {
      emit(PANE_INTENT_RELOAD_PLAN_EVENTS.PLANNED, records);
    }
    return records;
  }

  function recordError(error) {
    state = {
      ...state,
      lastError: error instanceof Error ? error.message : String(error),
      status: 'error',
    };
  }

  async function handleReloadIntents(reloadIntents = []) {
    try {
      const replayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
      return publishPlans(createReplaySafeReloadWindowPlans({
        reloadIntents,
        replayState,
      }));
    } catch (error) {
      recordError(error);
      return [];
    }
  }

  function getState() {
    return {
      lastError: state.lastError,
      lastPlans: clonePlans(state.lastPlans),
      plannedCount: state.plannedCount,
      status: state.status,
    };
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(PANE_INTENT_RELOAD_PLAN_COMMANDS.GET_STATE, getState),
    );
    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(PANE_INTENT_RELOAD_EVENTS.INTENT_CREATED, (records) => {
          void handleReloadIntents(records);
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
    id: 'runtime.paneIntentReloadWindow',
    start,
    stop,
  };
}
