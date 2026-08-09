/**
 * Owner: annotation-persistence adapter.
 * Purpose: expose Session-keyed durable Annotation bytes without owning document meaning.
 * Inputs: explicit storage port, branded Session identities, canonical Runtime snapshots.
 * Outputs: reversible Repository preparations, restore state, and versioned import/export.
 * Side effects: only the injected storage adapter is read/written; no browser global is chosen.
 * Lifecycle: repository instances are isolated and hold only opaque sidecar tokens in memory.
 * Errors: AnnotationPersistenceError with stable codes.
 * Concurrency/cancellation: compare-and-swap prepare rejects stale bytes; writes settle once.
 */
export {
  AnnotationPersistenceError,
} from './annotation-persistence-error.js';
export { createDurableAnnotationRepository } from './durable-annotation-repository.js';
export { createAnnotationStorageAdapter } from './storage-adapter.js';
