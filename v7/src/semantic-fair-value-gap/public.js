/**
 * Owner: semantic-fair-value-gap.
 * Purpose: expose strict three-Bar FVG construction, projection, inspection, and inner-zone revision policies.
 * Inputs: public Geometry/Evidence contracts, branded evidence, exact Artifacts, and cutoff-bound revisions.
 * Outputs: one package manifest with deterministic Artifact, host-schema, effective-zone, and projection policies.
 * Side effects: none; no Bar request, Replay/Annotation write, Chart, DOM, storage, or network authority.
 * Lifecycle: activation is host-owned and each active package generation is explicitly disposable.
 * Errors: AnnotationSemanticPackageError rejects malformed evidence, Artifacts, schemas, or invalid overrides.
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
export {
  FAIR_VALUE_GAP_PLUGIN_MANIFEST,
  FAIR_VALUE_GAP_TOOL_ID,
} from './plugin-manifest.js';
