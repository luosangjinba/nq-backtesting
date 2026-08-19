/**
 * Owner: validation-study-domain.
 * Purpose: expose strict immutable R14.1 Validation Campaign, Study Case,
 * Cohort, Analysis, evidence, outcome, digest, and schema value semantics.
 * Inputs: portable untrusted values plus explicitly injected digest capability.
 * Outputs: frozen validated records, canonical bytes/digests, and diagnostics.
 * Side effects: none except explicitly injected Web Crypto digest calls.
 * Lifecycle: pure calls with no retained resources.
 * Errors: rejects unknown fields, invalid identity/revision, hostile values,
 * non-canonical data, resource ceilings, and no-future violations.
 * Concurrency/cancellation: synchronous unless digesting with injected Web
 * Crypto; pure operations are reentrant and digest calls need no cancellation.
 */
export { ValidationCampaignError, failValidation } from './validation-error.js';
export {
  CASE_LIFECYCLE_STATES,
  METRIC_SET_ID,
  METRIC_SET_VERSION,
  OUTCOME_CLASSES,
  OUTCOME_POLICY_ID,
  OUTCOME_POLICY_VERSION,
  QUALIFICATION_CLASSES,
  SETUP_TEMPLATE_ID,
  SETUP_TEMPLATE_VERSION,
  VALIDATION_CAMPAIGN_DOCUMENT_PREFIX,
  VALIDATION_CAMPAIGN_INDEX_KEY,
  VALIDATION_LIMITS,
  VALIDATION_SCHEMAS,
} from './constants.js';
export {
  canonicalJson,
  deepFreeze,
  exactRecord,
  parseCanonicalJson,
  requireBoundedText,
  requireContractId,
  requireDigest,
  requireEnum,
  requireEpoch,
  requireFinite,
  requireOpaqueId,
  requireRevision,
  requireSemver,
  requireUuid,
  sha256Canonical,
  sha256CanonicalSync,
  strictPortableValue,
  utf8Bytes,
  verifyContentDigest,
  withContentDigest,
  withContentDigestSync,
} from './canonical-value.js';
export {
  createSeedDefinitions,
  definitionRef,
  readDefinitionRef,
  readOutcomeDefinition,
  readSetupDefinition,
} from './definition-records.js';
export {
  archiveCampaignRecord,
  assertCampaignDocumentCeilings,
  createCampaignDocument,
  createCampaignIndex,
  createCampaignRecord,
  orderedDocumentCollections,
  readCampaignDocument,
  readCampaignIndex,
  readCampaignRecord,
  replaceCampaignDocument,
} from './campaign-records.js';
export {
  citationRef,
  createEvidenceCandidate,
  createEvidenceCitation,
  readBoundedClaim,
  readCitationRef,
  readEvidenceCandidate,
  readEvidenceCitation,
  readObservationContext,
  readProviderIdentity,
  readSourceReference,
} from './evidence-records.js';
export {
  caseRef,
  createStudyCase,
  observationContextFromCitations,
  readCaseObservationContext,
  readPathPlan,
  readPredicateResults,
  readStudyCase,
  supersedeStudyCase,
} from './case-records.js';
export { assertEvidenceCampaignClosure } from './case-evidence-closure.js';
export { readOutcomeObservation } from './outcome-records.js';
export { calculateOutcomeObservation } from './outcome-calculation.js';
export {
  cohortRef,
  createStudyCohort,
  readCaseRef,
  readCohortRef,
  readStudyCohort,
} from './cohort-records.js';
export {
  calculateValidationMetrics,
  createAnalysisRun,
} from './analysis-calculation.js';
export { readAnalysisRun } from './analysis-record-validation.js';
export {
  createRawContextIntent,
  createSourceVerification,
  readRawContextIntent,
  readSourceVerification,
} from './verification-context-records.js';
