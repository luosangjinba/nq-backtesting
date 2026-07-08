import {
  BAR_DATA_COMMANDS,
  CHART_ENTRY_EVENTS,
  CHART_ENTRY_INITIALIZATION_COMMANDS,
  CHART_ENTRY_INITIALIZATION_EVENTS,
  SESSION_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import { createChartEntryContextPlan } from './chart-entry-context-plan.js';

function clonePlan(plan) {
  return plan ? {
    ...plan,
    boundedContextWindow: { ...plan.boundedContextWindow },
    plannedWindow: plan.plannedWindow ? { ...plan.plannedWindow } : null,
  } : null;
}

export function createChartEntryInitializationRuntime({ prefixBars } = {}) {
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

  async function initialize(activation, emitEvent) {
    try {
      const sessionId = activation?.sessionId;
      if (!sessionId) {
        throw new Error('Chart entry initialization requires an active session id.');
      }
      const session = await dispatchCommand(SESSION_COMMANDS.GET_BY_ID, sessionId);
      if (!session) {
        throw new Error(`Chart entry initialization session ${sessionId} does not exist.`);
      }
      const contextPlan = createChartEntryContextPlan(session, { prefixBars });
      const plannedWindow = await dispatchCommand(BAR_DATA_COMMANDS.PLAN_WINDOW, contextPlan.boundedContextWindow);
      state = {
        error: null,
        plan: {
          ...contextPlan,
          plannedWindow,
        },
        status: 'planned',
      };
      emitEvent?.(CHART_ENTRY_INITIALIZATION_EVENTS.PLANNED, getState().plan);
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
      registerCommand(CHART_ENTRY_INITIALIZATION_COMMANDS.GET_STATE, () => getState())
    );
    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(CHART_ENTRY_EVENTS.ACTIVATED, (activation) => {
          void initialize(activation, emitEvent);
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
    id: 'runtime.chartEntryInitialization',
    start,
    stop,
  };
}
