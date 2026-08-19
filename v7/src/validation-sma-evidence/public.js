/**
 * Owner: validation-evidence-adapter.
 * Purpose: expose read-only SMA evidence preparation and verification for
 * Validation Campaign capture without owning calculated-series or Campaign state.
 * Inputs: a frozen calculated-series observation reader, request identity, and crypto.
 * Outputs: provider availability, bounded SMA candidates, and verification results.
 * Side effects: reads accepted calculated-series evidence only; performs no writes.
 * Lifecycle: stateless factory/provider calls with no retained resources.
 * Errors: rejects unavailable, stale, hidden, non-ready, wrong-definition,
 * wrong-length, mismatched, future, or malformed SMA evidence.
 * Concurrency/cancellation: each preparation is signal-aware and independently source-fenced.
 */
export { createValidationSmaEvidenceProvider } from './sma-evidence-provider.js';
