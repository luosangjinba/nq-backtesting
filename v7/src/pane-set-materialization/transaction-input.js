import { requireReplayPaneResponsePlan } from '../replay-pane-response-contract/public.js';
import { failPaneSetMaterialization } from './materialization-error.js';

const INPUT_FIELDS = Object.freeze(['paneRequests', 'responsePlan']);
const REQUEST_FIELDS = Object.freeze(['paneId', 'request']);

class PaneSetTransactionInputValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() {
    return this.#value;
  }
}

function exactRecord(value, fields, code, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failPaneSetMaterialization(code, `${label} must contain exactly the documented fields.`);
  }
}

/**
 * Owner: Workspace Transaction Runtime materialization boundary.
 * Purpose: bind exactly one immutable acquisition request to every planned visible Pane.
 * Inputs: branded Replay response plan and stable-order frozen opaque Pane requests.
 * Outputs: branded frozen transaction input accepted by Workspace Transaction Runtime.
 * Side effects/lifecycle/concurrency: none.
 * Errors: stable PaneSetMaterializationError or response-plan contract errors.
 */
export function createPaneSetTransactionInput(value) {
  exactRecord(value, INPUT_FIELDS, 'PANE_SET_INPUT_FIELDS_INVALID', 'Pane-set transaction input');
  const responsePlan = requireReplayPaneResponsePlan(value.responsePlan);
  if (!Array.isArray(value.paneRequests) || !Object.isFrozen(value.paneRequests)) {
    failPaneSetMaterialization('PANE_SET_REQUESTS_INVALID', 'Pane requests must be a frozen array.');
  }
  const paneRequests = Object.freeze(value.paneRequests.map((entry) => {
    exactRecord(entry, REQUEST_FIELDS, 'PANE_SET_REQUEST_FIELDS_INVALID', 'Pane request');
    if (typeof entry.paneId !== 'string' || entry.paneId.length === 0) {
      failPaneSetMaterialization('PANE_SET_REQUEST_PANE_INVALID', 'Pane request requires a pane id.');
    }
    if (!entry.request || typeof entry.request !== 'object' || !Object.isFrozen(entry.request)) {
      failPaneSetMaterialization('PANE_SET_REQUEST_IMMUTABLE', 'Each Pane request must be a frozen object.');
    }
    return Object.freeze({ paneId: entry.paneId, request: entry.request });
  }));
  const requestIds = paneRequests.map(({ paneId }) => paneId);
  if (requestIds.length !== responsePlan.affectedPaneIds.length
    || requestIds.some((paneId, index) => paneId !== responsePlan.affectedPaneIds[index])) {
    failPaneSetMaterialization(
      'PANE_SET_REQUEST_COVERAGE_MISMATCH',
      'Pane requests must exactly match the complete planned Pane set in stable order.',
    );
  }
  return new PaneSetTransactionInputValue({ paneRequests, responsePlan });
}

/**
 * Owner: Workspace Transaction Runtime materialization boundary.
 * Purpose: reject mutable or structural transaction-input lookalikes.
 * Inputs/outputs: branded Pane-set transaction input; returns its frozen semantic value.
 * Side effects/lifecycle: none.
 * Errors: PANE_SET_INPUT_REQUIRED.
 */
export function readPaneSetTransactionInput(candidate) {
  if (!(candidate instanceof PaneSetTransactionInputValue)) {
    failPaneSetMaterialization('PANE_SET_INPUT_REQUIRED', 'A branded Pane-set transaction input is required.');
  }
  return candidate.read();
}
