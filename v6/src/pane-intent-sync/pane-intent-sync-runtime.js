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
    appliedCount: 0,
    lastApplied: null,
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
  const suppressedEvents = new Set();

  function suppressionKey(kind, paneId, value) {
    return `${kind}:${paneId}:${String(value)}`;
  }

  async function refreshLayoutSnapshot(snapshot = null) {
    if (snapshot) {
      layoutSnapshot = snapshot;
      return layoutSnapshot;
    }
    layoutSnapshot = await dispatchCommand(LAYOUT_COMMANDS.GET_SNAPSHOT);
    return layoutSnapshot;
  }

  async function applyPlan(plan = {}) {
    const appliedTargets = [];
    for (const target of plan.targets || []) {
      suppressedEvents.add(suppressionKey(plan.kind, target.paneId, target.value));
      if (plan.kind === 'symbol') {
        await dispatchCommand(PANE_COMMANDS.SET_SYMBOL_INTENT, {
          instrument: target.value,
          paneId: target.paneId,
        });
      } else {
        await dispatchCommand(PANE_COMMANDS.SET_INTERVAL_INTENT, {
          displayTimeframe: target.value,
          paneId: target.paneId,
        });
      }
      appliedTargets.push({ ...target });
    }
    const applied = {
      kind: plan.kind,
      sourcePaneId: plan.sourcePaneId,
      sourceValue: plan.sourceValue,
      targets: appliedTargets,
    };
    state = {
      ...state,
      appliedCount: state.appliedCount + 1,
      lastApplied: applied,
      status: appliedTargets.length ? 'applied' : state.status,
    };
    emit(PANE_INTENT_SYNC_EVENTS.APPLIED, applied);
    return applied;
  }

  async function planFromPaneEvent(kind, pane = {}) {
    const key = suppressionKey(kind, pane.id, kind === 'symbol' ? pane.instrument : pane.displayTimeframe);
    if (suppressedEvents.has(key)) {
      suppressedEvents.delete(key);
      return null;
    }
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
      ...state,
      lastPlan: clonePlan(plan),
      planCount: state.planCount + 1,
      status: 'planned',
    };
    emit(PANE_INTENT_SYNC_EVENTS.PLANNED, clonePlan(plan));
    if (plan.enabled && plan.targets.length) {
      await applyPlan(plan);
    }
    return plan;
  }

  function getState() {
    return {
      appliedCount: state.appliedCount,
      lastApplied: state.lastApplied ? {
        ...state.lastApplied,
        targets: state.lastApplied.targets.map((target) => ({ ...target })),
      } : null,
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
    suppressedEvents.clear();
    state = createInitialState();
  }

  return {
    id: 'runtime.paneIntentSync',
    start,
    stop,
  };
}
