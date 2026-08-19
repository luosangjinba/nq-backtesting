/**
 * Owner: validation-evidence-adapter.
 * Purpose: expose read-only manual FVG evidence preparation and verification
 * for Validation Campaign capture without owning FVG or Campaign state.
 * Inputs: a frozen Annotation observation reader, request identity, and crypto.
 * Outputs: provider availability, bounded FVG candidates, and verification results.
 * Side effects: reads accepted Annotation evidence only; performs no writes.
 * Lifecycle: stateless factory/provider calls with no retained resources.
 * Errors: rejects unavailable, stale, archived, mismatched, future, or malformed FVG evidence.
 * Concurrency/cancellation: each preparation is signal-aware and independently source-fenced.
 */
export { createValidationFvgEvidenceProvider } from './fvg-evidence-provider.js';
