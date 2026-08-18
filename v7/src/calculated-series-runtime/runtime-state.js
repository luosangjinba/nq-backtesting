import { createActivationGeneration, requireActivationGeneration } from '../activation-generation/public.js';
import { createSessionId, requireSessionId, serializeSessionId } from '../session-identity/public.js';
import { createTransactionId } from '../transaction-identity/public.js';
import { createWorkspaceTransactionIdentity } from '../workspace-transaction-contract/public.js';
import { createTrustedCalculatedSeriesCatalog } from './registration-catalog.js';
import { failCalculatedSeriesRuntime } from './runtime-error.js';

function requirePersistence(value) {
  for (const method of ['apply', 'finalize', 'prepare', 'restore', 'rollback']) {
    if (typeof value?.[method] !== 'function') {
      failCalculatedSeriesRuntime(
        'CALCULATED_SERIES_RUNTIME_PERSISTENCE_INVALID',
        `Calculated-series persistence requires ${method}().`,
      );
    }
  }
  return value;
}

function requireExecution(value) {
  if (typeof value?.execute !== 'function') {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_EXECUTION_INVALID',
      'Calculated-series runtime requires a trusted execute() port.',
    );
  }
  return value;
}

function normalizedScope(sessionId, activationGeneration) {
  const session = typeof sessionId === 'string' ? createSessionId(sessionId) : sessionId;
  const activation = typeof activationGeneration === 'number'
    ? createActivationGeneration(activationGeneration) : activationGeneration;
  return Object.freeze({
    activationGeneration: requireActivationGeneration(activation),
    sessionId: requireSessionId(session),
    sessionToken: serializeSessionId(session).value,
  });
}

export function requireCalculatedSeriesChartPort(value) {
  for (const method of ['prepare', 'snapshot']) {
    if (typeof value?.[method] !== 'function') {
      failCalculatedSeriesRuntime(
        'CALCULATED_SERIES_RUNTIME_CHART_PORT_INVALID',
        `Calculated-series Chart port requires ${method}().`,
      );
    }
  }
  return value;
}

/** Create the mutable state owned by one calculated-series runtime generation. */
export function createCalculatedSeriesRuntimeState(options = {}) {
  const {
    activationGeneration,
    crypto: cryptoPort = globalThis.crypto,
    execution,
    idFactory,
    persistence,
    readProfileSnapshot = () => Object.freeze({ packages: Object.freeze([]) }),
    registrations = [],
    scheduleTask = (callback) => setTimeout(callback, 0),
    sessionId,
  } = options;
  if (typeof idFactory !== 'function' || typeof readProfileSnapshot !== 'function'
    || typeof scheduleTask !== 'function') {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_OPTIONS_INVALID',
      'Calculated-series runtime identity/profile ports are invalid.',
    );
  }
  return {
    acceptedDocument: null,
    activeController: null,
    boundChartPort: null,
    busy: false,
    calculationCount: 0,
    catalog: createTrustedCalculatedSeriesCatalog(registrations),
    commandSequence: 0,
    cryptoPort,
    diagnostic: null,
    disposed: false,
    executor: requireExecution(execution),
    idFactory,
    initialized: false,
    knownRaw: null,
    listeners: new Set(),
    paneContexts: new Map(),
    paneTasks: new Map(),
    publication: null,
    readProfileSnapshot,
    scheduleTask,
    scope: normalizedScope(sessionId, activationGeneration),
    status: 'created',
    storage: requirePersistence(persistence),
    workspaceDocumentCandidates: new WeakMap(),
    workspacePreparations: new WeakMap(),
  };
}

export function readRuntimeProfileSnapshot(state) {
  const value = state.readProfileSnapshot();
  return value && typeof value === 'object'
    ? value : Object.freeze({ packages: Object.freeze([]) });
}

export function requireLiveRuntime(state) {
  if (state.disposed) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_DISPOSED',
      'Calculated-series runtime is disposed.',
    );
  }
  if (!state.initialized) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_UNINITIALIZED',
      'Calculated-series runtime must initialize before use.',
    );
  }
}

export function nextCalculatedSeriesTransactionIdentity(state) {
  state.commandSequence += 1;
  return createWorkspaceTransactionIdentity({
    activationGeneration: state.scope.activationGeneration,
    sessionId: state.scope.sessionId,
    transactionId: createTransactionId(
      `calculated-series-${state.commandSequence}-${state.idFactory()}`,
    ),
  });
}

export function cancelCalculatedSeriesPaneTask(state, paneId, reason) {
  const task = state.paneTasks.get(paneId);
  if (!task) return;
  state.paneTasks.delete(paneId);
  task.controller.abort(reason);
}
