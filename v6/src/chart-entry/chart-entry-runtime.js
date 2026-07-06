import {
  CHART_ENTRY_COMMANDS,
  CHART_ENTRY_EVENTS,
  SESSION_EVENTS,
} from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { createChartEntryInitializationPlan } from './chart-entry-plan.js';

function activationFromSession(session, source) {
  if (!session?.id) {
    return null;
  }
  return Object.freeze({
    activatedAt: new Date().toISOString(),
    sessionId: session.id,
    source,
  });
}

export function createChartEntryRuntime() {
  const unregisterCallbacks = [];
  const unsubscribeCallbacks = [];
  let activation = null;
  let plan = null;

  function getState() {
    return {
      activation: activation ? { ...activation } : null,
      activeSessionId: activation?.sessionId || null,
      initializationPlan: plan ? { ...plan, steps: [...plan.steps] } : null,
      status: plan ? 'planned' : activation ? 'activated' : 'idle',
    };
  }

  function activate(session, source, emitEvent) {
    const nextActivation = activationFromSession(session, source);
    if (!nextActivation) return getState();
    activation = nextActivation;
    plan = createChartEntryInitializationPlan({
      sessionId: nextActivation.sessionId,
      source,
    });
    emitEvent?.(CHART_ENTRY_EVENTS.ACTIVATED, { ...activation });
    return getState();
  }

  function start({ emitEvent, subscribeEvent } = {}) {
    unregisterCallbacks.push(
      registerCommand(CHART_ENTRY_COMMANDS.GET_STATE, () => getState())
    );

    if (subscribeEvent) {
      unsubscribeCallbacks.push(
        subscribeEvent(SESSION_EVENTS.CREATED, (session) => activate(session, 'session.created', emitEvent)),
        subscribeEvent(SESSION_EVENTS.OPENED, (session) => activate(session, 'session.opened', emitEvent))
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
    activation = null;
    plan = null;
  }

  return {
    id: 'runtime.chartEntry',
    start,
    stop,
  };
}
