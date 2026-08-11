/**
 * Owner: annotation-semantic-registry.
 * Purpose: expose trusted-build Semantic package lifecycle, construction, inspection, revision, and resolution ports.
 * Inputs: branded definitions, portable construction/revision intent, exact Artifacts, and Replay-safe contexts.
 * Outputs: generation-bound construction/revision drafts, projections, validated Inspector groups, and lifecycle snapshots.
 * Side effects: only package-local activation/disposal; no Chart, Replay, Bar Data, DOM, persistence, or Annotation writes.
 * Lifecycle: each Registry is isolated and explicitly disposable; packages may be disabled and re-enabled.
 * Errors: AnnotationSemanticPackageError fails incompatible, stale, foreign, malformed, or failed policies closed.
 * Concurrency/cancellation: one asynchronous package lifecycle operation at a time; package policies stay synchronous.
 */
export { AnnotationSemanticPackageError } from './semantic-package-error.js';
export { defineSemanticType, readSemanticTypeDefinition } from './semantic-type-definition.js';
export { defineSemanticPackage, readSemanticPackageManifest } from './semantic-package-manifest.js';
export { createSemanticPackageRegistry } from './semantic-package-registry.js';
