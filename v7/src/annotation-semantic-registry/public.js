/**
 * Owner: annotation-semantic-registry.
 * Purpose: expose trusted-build Semantic package definition, lifecycle, construction, and resolution ports.
 * Inputs: branded package/type definitions, portable construction intent, and immutable Artifacts.
 * Outputs: branded Artifact drafts, active resolution, projection inputs, cutoff-safe Inspector groups, and lifecycle snapshots.
 * Side effects: only package-local activation/disposal; no Chart, Replay, Bar Data, DOM, persistence, or Annotation writes.
 * Lifecycle: each Registry is isolated and explicitly disposable; packages may be disabled and re-enabled.
 * Errors: AnnotationSemanticPackageError with stable compatibility, lifecycle, and policy codes.
 * Concurrency/cancellation: one asynchronous package lifecycle operation at a time; pure policies are synchronous.
 */
export { AnnotationSemanticPackageError } from './semantic-package-error.js';
export { defineSemanticType, readSemanticTypeDefinition } from './semantic-type-definition.js';
export { defineSemanticPackage, readSemanticPackageManifest } from './semantic-package-manifest.js';
export { createSemanticPackageRegistry } from './semantic-package-registry.js';
