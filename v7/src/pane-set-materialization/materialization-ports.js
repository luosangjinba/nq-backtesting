import { readReplayCursorProposal } from '../replay-contract/public.js';
import { failPaneSetMaterialization } from './materialization-error.js';
import { readEmptyPaneProjection } from './pane-result.js';
import { readPaneSetTransactionInput } from './transaction-input.js';

class AcquiredPaneSetValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() {
    return this.#value;
  }
}

function requireMethod(port, name) {
  if (!port || typeof port[name] !== 'function') {
    failPaneSetMaterialization('PANE_SET_PORT_INVALID', `Pane-set materialization requires ${name}().`);
  }
  return port[name].bind(port);
}

function requireSignal(signal) {
  if (!signal || typeof signal.aborted !== 'boolean') {
    failPaneSetMaterialization('PANE_SET_SIGNAL_REQUIRED', 'Pane-set materialization requires an AbortSignal.');
  }
  if (signal.aborted) {
    failPaneSetMaterialization('PANE_SET_MATERIALIZATION_STALE', 'Pane-set materialization is stale.');
  }
  return signal;
}

function requireAcquiredValue(value) {
  if (!value || typeof value !== 'object' || !Object.isFrozen(value)) {
    failPaneSetMaterialization('PANE_SET_ACQUIRED_VALUE_INVALID', 'Pane acquisition must return a frozen object.');
  }
  return value;
}

function requireProjectedPane(value, paneId, proposal) {
  if (!value || typeof value !== 'object' || !Object.isFrozen(value)
    || value.schemaVersion !== 1 || value.paneId !== paneId
    || !Array.isArray(value.bars) || !Object.isFrozen(value.bars)
    || !value.provenance || !Object.isFrozen(value.provenance)
    || value.provenance.cursorProposal !== proposal) {
    failPaneSetMaterialization(
      'PANE_SET_PROJECTED_PANE_INVALID',
      'Pane projection must be a frozen matching snapshot under the shared proposal.',
    );
  }
  return value;
}

function readAcquired(candidate) {
  if (!(candidate instanceof AcquiredPaneSetValue)) {
    failPaneSetMaterialization('PANE_SET_ACQUIRED_REQUIRED', 'A complete branded acquired Pane set is required.');
  }
  return candidate.read();
}

/**
 * Owner: Workspace Transaction Runtime materialization boundary.
 * Purpose: adapt complete Pane acquisition and projection behind the existing
 * single acquisitionPort/projectPort transaction stages.
 * Inputs: injected per-Pane acquisition and projection ports.
 * Outputs: frozen acquisitionPort and projectionPort for Workspace Transaction Runtime.
 * Side effects: only delegated acquisition; owns no cache or accepted state.
 * Lifecycle/concurrency: caller AbortSignal reaches every Pane; all results are
 * collected before a snapshot exists, and no partial result is published.
 * Errors: stable PaneSetMaterializationError or delegated port failures.
 */
export function createPaneSetMaterializationPorts({ acquisitionPort, projectionPort }) {
  const acquirePane = requireMethod(acquisitionPort, 'acquirePane');
  const projectPane = requireMethod(projectionPort, 'projectPane');
  return Object.freeze({
    acquisitionPort: Object.freeze({
      async acquire(context) {
        const input = readPaneSetTransactionInput(context.input);
        const signal = requireSignal(context.signal);
        const panes = await Promise.all(input.paneRequests.map(async (paneRequest, index) => {
          const acquired = await acquirePane(Object.freeze({
            identity: context.identity,
            operation: context.operation,
            paneRequest,
            paneResponse: input.responsePlan.paneResponses[index],
            proposal: context.proposal,
            signal,
          }));
          requireSignal(signal);
          return Object.freeze({ paneId: paneRequest.paneId, value: requireAcquiredValue(acquired) });
        }));
        return new AcquiredPaneSetValue({ input: context.input, panes: Object.freeze(panes), proposal: context.proposal });
      },
    }),
    projectionPort: Object.freeze({
      async project(context) {
        const acquired = readAcquired(context.acquired);
        const input = readPaneSetTransactionInput(context.input);
        const signal = requireSignal(context.signal);
        if (acquired.input !== context.input || acquired.proposal !== context.proposal) {
          failPaneSetMaterialization('PANE_SET_STAGE_MISMATCH', 'Acquisition and Projection stages do not match.');
        }
        readReplayCursorProposal(context.proposal);
        const panes = await Promise.all(acquired.panes.map(async (entry, index) => {
          const paneResponse = input.responsePlan.paneResponses[index];
          const projected = await projectPane(Object.freeze({
            acquired: entry.value,
            identity: context.identity,
            operation: context.operation,
            paneResponse,
            proposal: context.proposal,
            signal,
          }));
          requireSignal(signal);
          const emptyReason = readEmptyPaneProjection(projected);
          return emptyReason === null
            ? Object.freeze({
              paneId: entry.paneId,
              reason: null,
              snapshot: requireProjectedPane(projected, entry.paneId, context.proposal),
              status: 'ready',
            })
            : Object.freeze({ paneId: entry.paneId, reason: emptyReason, snapshot: null, status: 'empty' });
        }));
        return Object.freeze({
          cursorProposal: context.proposal,
          panes: Object.freeze(panes),
          responsePlan: input.responsePlan,
          schemaVersion: 2,
        });
      },
    }),
  });
}
