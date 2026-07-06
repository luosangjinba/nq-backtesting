import {
  CHART_ENTRY_DEFAULT_WALL_PLAN_COMMANDS,
  CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS,
  CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS,
} from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { createChartEntryDefaultWallPlan } from './chart-entry-default-wall-plan.js';

function clonePlan(plan) {
  return plan ? {
    ...plan,
    context: {
      loadedWindow: plan.context?.loadedWindow ? { ...plan.context.loadedWindow } : null,
      plannedWindow: plan.context?.plannedWindow ? { ...plan.context.plannedWindow } : null,
      record: plan.context?.record ? { ...plan.context.record } : null,
    },
  } : null;
}

export function createChartEntryDefaultWallPlanRuntime(options = {}) {
  const unregisterCallbacks = [];
  const unsubscribeCallbacks = [];
  let state = {
    error: null,
    plan: null,
    status: 'idle',
  };

  function getState() {
    return {
      error: state.error,
      plan: clonePlan(state.plan),
      status: state.status,
    };
  }

  function planWall(bootstrap, emitEvent) {
    try {
      const plan = createChartEntryDefaultWallPlan(bootstrap, options);
      state = {
        error: null,
        plan,
        status: 'planned',
      };
      emitEvent?.(CHART_ENTRY_DEFAULT_WALL_PLAN_EVENTS.PLANNED, getState().plan);
      return getState();
    } catch (error) {
      state = {
        error: error?.message || String(error),
        plan: null,
        status: 'error',
      };
      return getState();
    }
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(CHART_ENTRY_DEFAULT_WALL_PLAN_COMMANDS.GET_STATE, () => getState())
    );
    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(CHART_ENTRY_REPLAY_BOOTSTRAP_EVENTS.LOADED, (bootstrap) => {
          planWall(bootstrap, emitEvent);
        })
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
    state = {
      error: null,
      plan: null,
      status: 'idle',
    };
  }

  return {
    id: 'runtime.chartEntryDefaultWallPlan',
    start,
    stop,
  };
}
