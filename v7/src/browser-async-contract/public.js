/**
 * Owner: browser-async-contract.
 * Purpose: expose bounded AbortSignal-aware browser scheduling primitives.
 * Inputs: explicit timers and optional AbortSignal values.
 * Outputs: Promises which settle once and release every installed listener.
 * Side effects: owns only the supplied timer and signal listener for one wait.
 * Lifecycle: resources end on resolve, rejection, cancellation, or setup failure.
 * Errors: timer failures and exact AbortSignal reasons propagate unchanged.
 * Concurrency/cancellation: every waiter is independent and cancellation-safe.
 */
export { abortableDelay, abortReason } from './abortable-delay.js';
