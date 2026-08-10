/**
 * Owner: semantic-liquidity-level.
 * Purpose: expose the first-party human/manual BSL and SSL trusted-build package.
 * Inputs: public Geometry contract plus explicit manual anchors or one immutable Segment Drawing.
 * Outputs: one branded package manifest with pure construction, projection, and Inspector policies.
 * Side effects: none; the package owns no Chart, Replay, Bar Data, DOM, persistence, or document state.
 * Lifecycle: activation is host-owned and each active instance is explicitly disposable.
 * Errors: AnnotationSemanticPackageError for invalid manual assertions or package configuration.
 * Concurrency/cancellation: all package policies are synchronous; host lifecycle is serialized.
 */
export {
  createLiquidityLevelSemanticPackage,
  LIQUIDITY_LEVEL_TYPE_IDS,
} from './liquidity-level-package.js';
