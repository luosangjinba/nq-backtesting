/**
 * Owner: semantic-fair-value-gap.
 * Purpose: expose the strict evidence-derived three-Bar FVG trusted-build package.
 * Inputs: public Geometry/Evidence contracts plus one branded Evidence Bundle and Session identity.
 * Outputs: one branded package manifest with deterministic construction and projection policies.
 * Side effects: none; no Bar request, Replay/Annotation write, Chart, DOM, storage, or network authority.
 * Lifecycle: activation is host-owned and each active package generation is explicitly disposable.
 * Errors: AnnotationSemanticPackageError rejects malformed, non-FVG, gapped, or cross-Session evidence.
 * Concurrency/cancellation: package policies are synchronous; Registry lifecycle remains serialized.
 */
export {
  createFairValueGapSemanticPackage,
  FAIR_VALUE_GAP_PACKAGE_ID,
} from './fair-value-gap-package.js';
export {
  FAIR_VALUE_GAP_PROFILE,
  FAIR_VALUE_GAP_TYPE_ID,
  FAIR_VALUE_GAP_VERSION,
} from './fvg-artifact.js';
