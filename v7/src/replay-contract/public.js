/**
 * Owner: replay-runtime.
 * Purpose: expose the complete supported public contract for replay contract.
 * Inputs: immutable values and capability descriptors defined by the exported signatures.
 * Outputs: validated frozen values or deterministic calculations.
 * Side effects: none.
 * Lifecycle: stateless values and pure calls have no disposal phase.
 * Errors: invalid inputs throw the exported module error or a TypeError.
 * Concurrency/cancellation: synchronous and deterministic; cancellation is not applicable.
 */
/** Public provider-, chart-, pane-, and timeframe-independent Replay values. */
export { createReplayAdvanceInput, requireReplayAdvanceInput } from './advance-input.js';
export {
  createReplayCursorProposal,
  createReplayCursorRetentionProposal,
  createReplayCursorTargetProposal,
  isEpochVisibleAtReplayCursor,
  readReplayCursorProposal,
} from './cursor-proposal.js';
export { ReplayContractError } from './replay-error.js';
export { createReplayRange, requireCursorInRange } from './replay-range.js';
export { createReplayStep, readReplayStep } from './replay-step.js';
