import { failPaneSetMaterialization } from './materialization-error.js';

const EMPTY_REASONS = new Set(['no-source-data', 'no-eligible-source']);

class EmptyPaneProjectionValue {
  #reason;

  constructor(reason) {
    this.#reason = reason;
    Object.freeze(this);
  }

  read() {
    return this.#reason;
  }
}

/**
 * Owner: Projection/materialization boundary.
 * Purpose: represent a legitimate Pane-local absence without failing the shared Replay clock.
 * Inputs: stable no-data reason.
 * Outputs: branded immutable empty projection result.
 * Side effects/lifecycle: none.
 * Errors: PANE_SET_EMPTY_REASON_INVALID.
 */
export function createEmptyPaneProjection({ reason }) {
  if (!EMPTY_REASONS.has(reason)) {
    failPaneSetMaterialization('PANE_SET_EMPTY_REASON_INVALID', 'Empty Pane reason is unsupported.');
  }
  return new EmptyPaneProjectionValue(reason);
}

export function readEmptyPaneProjection(candidate) {
  return candidate instanceof EmptyPaneProjectionValue ? candidate.read() : null;
}
