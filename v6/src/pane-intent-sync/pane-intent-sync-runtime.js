import {
  LAYOUT_COMMANDS,
  LAYOUT_EVENTS,
  PANE_COMMANDS,
  PANE_EVENTS,
  PANE_INTENT_SYNC_COMMANDS,
  PANE_INTENT_SYNC_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import {
  createIntervalIntentSyncPlan,
  createSymbolIntentSyncPlan,
} from './pane-intent-sync-model.js';

function clonePlan(plan = null) {
  return plan ? {
    ...plan,
    targets: plan.targets.map((target) => ({ ...target })),
  } : null;
}

function createInitialState() {
  return {
    lastPlan: null,
    planCount: 0,
    status: 'idle',
  };
}

export function createPaneIntentSyncRuntime() {
  const unregisterCallbacks = [];
  const unsubscribeCallbacks = [];
  let emit = () => {};
  let layoutSnapshot = null;
  let state = createInitialState();

  async function refreshLayoutSnapshot(snapshot = null) {
    if (snapshot) {
      layoutSnapshot = snapshot;
      return layoutSnapshot;
    }
    layoutSnapshot = await dispatchCommand(LAYOUT_COMMANDS.GET_SNAPSHOT);
    return layoutSnapshot;
  }

  async function planFromPaneEvent(kind, pane = {}) {
    if (!layoutSnapshot) {
      await refreshLayoutSnapshot();
    }
    const paneSnapshot = await dispatchCommand(PANE_COMMANDS.GET_SNAPSHOT);
    const plan = kind === 'symbol'
      ? createSymbolIntentSyncPlan({
        layoutSnapshot,
        paneSnapshot,
        sourcePane: pane,
      })
      : createIntervalIntentSyncPlan({
        layoutSnapshot,
        paneSnapshot,
        sourcePane: pane,
      });
    state = {
      lastPlan: clonePlan(plan),
      planCount: state.planCount + 1,
      status: 'planned',
    };
    emit(PANE_INTENT_SYNC_EVENTS.PLANNED, clonePlan(plan));
    return plan;
  }

  function getState() {
    return {
      lastPlan: clonePlan(state.lastPlan),
      planCount: state.planCount,
      status: state.status,
    };
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(PANE_INTENT_SYNC_COMMANDS.GET_STATE, getState),
    );
    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(LAYOUT_EVENTS.MODE_CHANGED, refreshLayoutSnapshot),
        subscribeEvent(LAYOUT_EVENTS.SYNC_CHANGED, refreshLayoutSnapshot),
        subscribeEvent(PANE_EVENTS.SYMBOL_INTENT_CHANGED, (pane) => {
          void planFromPaneEvent('symbol', pane);
        }),
        subscribeEvent(PANE_EVENTS.INTERVAL_INTENT_CHANGED, (pane) => {
          void planFromPaneEvent('interval', pane);
        }),
      );
    }
    void refreshLayoutSnapshot();
  }

  function stop() {
    while (unsubscribeCallbacks.length) {
      unsubscribeCallbacks.pop()();
    }
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    emit = () => {};
    layoutSnapshot = null;
    state = createInitialState();
  }

  return {
    id: 'runtime.paneIntentSync',
    start,
    stop,
  };
}
