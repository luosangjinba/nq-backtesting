/**
 * Owner: calculated-series-contract.
 * Purpose: define, read, compare, assess, validate, verify, and simulate exact Profile binding,
 * Definition, Plot, Scale, Workspace document, frame identity, result,
 * projection-frame, diagnostic, resource, and migration pure contracts.
 * Inputs: closed portable V1 wires, branded accepted identity values, a pinned
 * Contribution Profile registry, definitions, timelines, and pure digest ports.
 * Outputs: branded deeply immutable values, canonical wire records, structural
 * compatibility/currency decisions, catalogs, and migration simulation evidence.
 * Side effects: none; no calculation, Chart, Bar request, Replay mutation,
 * persistence, package callback, Worker, timer, filesystem, network, DOM, or Canvas.
 * Lifecycle: stateless values and pure calls have no activation or disposal phase.
 * Errors: CalculatedSeriesContractError fails forged, inferred, partial, stale,
 * future, incompatible, non-portable, unknown, ambiguous, or oversized input closed.
 * Concurrency/cancellation: synchronous except injected digest simulation; no
 * handles are retained, and cancellation grants no publication authority.
 *
 * Protected invariant — no-future: result points must belong to the exact
 * eligible input timeline and cannot exceed the Replay-visible cutoff.
 * Protected invariant — stale-rejection: only exact branded frame identity
 * equality can produce a current publication decision.
 * Protected invariant — projection-alignment: ready output closes over the
 * complete defined Plot/Plot Group set and exact projected-Pane snapshot.
 */
export { CalculatedSeriesContractError } from './contract-error.js';
export { CALCULATED_SERIES_LIMITS } from './limits.js';
export {
  assessScaleIntentCompatibility,
  defineScaleIntent,
  readCalculatedSeriesScaleCatalog,
} from './scale-catalog.js';
export {
  CALCULATED_SERIES_PLOT_KINDS,
  definePlot,
  definePlotGroup,
  defineReferenceLine,
} from './plot-definition.js';
export {
  calculatedSeriesDefinitionRef,
  compareCalculatedSeriesVersions,
  defineCalculatedSeriesDefinition,
  readCalculatedSeriesDefinition,
} from './definition.js';
export {
  defineCalculatedSeriesContributionBinding,
  readCalculatedSeriesContributionBinding,
} from './contribution-binding.js';
export {
  defineCalculatedSeriesWorkspaceDocument,
  readCalculatedSeriesWorkspaceDocument,
  verifyCalculatedSeriesUnresolvedIntegrity,
} from './workspace-document.js';
export {
  assessCalculatedSeriesFrameCurrency,
  calculatedSeriesFrameIdentitiesEqual,
  createCalculatedSeriesFrameIdentity,
  readCalculatedSeriesFrameIdentity,
} from './frame-identity.js';
export {
  defineCalculatedSeriesProjectionFrame,
  defineCalculatedSeriesResult,
  readCalculatedSeriesProjectionFrame,
  readCalculatedSeriesResult,
} from './result-frame.js';
export {
  CALCULATED_SERIES_MIGRATION_OPERATION_KINDS,
  defineCalculatedSeriesMigrationPlan,
  readCalculatedSeriesMigrationPlan,
  simulateCalculatedSeriesMigration,
  validateCalculatedSeriesMigrationChain,
} from './migration-plan.js';
