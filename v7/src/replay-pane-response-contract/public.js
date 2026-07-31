/**
 * Owner: workspace-transaction-runtime.
 * Purpose: expose the complete supported public contract for replay pane response contract.
 * Inputs: immutable values and capability descriptors defined by the exported signatures.
 * Outputs: validated frozen values or deterministic calculations.
 * Side effects: none.
 * Lifecycle: stateless values and pure calls have no disposal phase.
 * Errors: invalid inputs throw the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public facade for pure shared-Replay response planning across complete Pane sets. */
export {
  createReplayPaneAction,
  readReplayPaneAction,
  REPLAY_GOTO_ANCHORS,
  REPLAY_PANE_ACTION_KINDS,
} from './action-intent.js';
export { planReplayPaneResponse, requireReplayPaneResponsePlan } from './response-plan.js';
export { ReplayPaneResponseContractError } from './response-error.js';
