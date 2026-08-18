/**
 * Owner: trusted-calculated-series-execution.
 * Purpose: validate immutable trusted-build envelopes, invoke one admitted pure formula, and attribute a complete result.
 * Inputs: exact registration evidence, branded frame identity, finite close/time Bars, parameters, timeline, and AbortSignal.
 * Outputs: one branded P1c.1 result with exact resource and provenance evidence.
 * Side effects: invokes only the supplied trusted formula and reads an injected monotonic clock; no state is retained.
 * Lifecycle: stateless adapter values require no start/stop and retain no package or input handles.
 * Errors: stable failures isolate invalid identity, resources, cancellation, formula errors, and invalid P1c.1 output.
 * Concurrency/cancellation: synchronous full calculation checks cancellation before and after formula invocation.
 */
export { TrustedCalculatedSeriesExecutionError } from './execution-error.js';
export { createTrustedCalculatedSeriesExecutionAdapter } from './execution-adapter.js';
