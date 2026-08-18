import { WorkspaceTransactionRuntimeError } from './runtime-error.js';

const REQUIRED_REPLAY_METHODS = ['prepare', 'propose', 'reject'];
const REQUIRED_PUBLICATION_METHODS = ['apply', 'finalize', 'reject', 'rollback', 'stage'];

function requireMethod(port, method, code) {
  if (!port || typeof port[method] !== 'function') {
    throw new WorkspaceTransactionRuntimeError(code, `Injected port must provide ${method}().`);
  }
}

/** Validate only the public operations the headless coordinator is allowed to invoke. */
export function requireWorkspaceTransactionPorts({
  acquisitionPort,
  auxiliaryPorts = [],
  chartPort,
  publicationPort,
  projectionPort,
  replayPort,
  workspaceStatePort,
}) {
  if (!Array.isArray(auxiliaryPorts) || auxiliaryPorts.some((port) => (
    !port || typeof port.id !== 'string' || port.id.length === 0
      || typeof port.prepare !== 'function'
  )) || new Set(auxiliaryPorts.map(({ id }) => id)).size !== auxiliaryPorts.length) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_AUXILIARY_PORT',
      'Workspace auxiliary participants require unique ids and prepare().',
    );
  }
  for (const method of REQUIRED_REPLAY_METHODS) {
    requireMethod(replayPort, method, 'WORKSPACE_REPLAY_PORT');
  }
  requireMethod(acquisitionPort, 'acquire', 'WORKSPACE_ACQUISITION_PORT');
  requireMethod(projectionPort, 'project', 'WORKSPACE_PROJECTION_PORT');
  requireMethod(chartPort, 'prepare', 'WORKSPACE_CHART_PORT');
  for (const method of ['begin', 'prepare', 'reject']) {
    requireMethod(workspaceStatePort, method, 'WORKSPACE_STATE_PORT');
  }
  for (const method of REQUIRED_PUBLICATION_METHODS) {
    requireMethod(publicationPort, method, 'WORKSPACE_PUBLICATION_PORT');
  }
  return Object.freeze({
    acquisitionPort,
    auxiliaryPorts: Object.freeze([...auxiliaryPorts]),
    chartPort,
    projectionPort,
    publicationPort,
    replayPort,
    workspaceStatePort,
  });
}

/** Runtime payloads are opaque to the coordinator but must be immutable. */
export function requireImmutableTransactionInput(candidate) {
  if (!candidate || typeof candidate !== 'object' || !Object.isFrozen(candidate)) {
    throw new WorkspaceTransactionRuntimeError(
      'WORKSPACE_TRANSACTION_INPUT_IMMUTABLE',
      'Workspace transaction input must be a frozen object.',
    );
  }
  return candidate;
}
