export const VALIDATION_CAMPAIGN_INDEX_KEY = 'v7.validation-campaign:index';
export const VALIDATION_CAMPAIGN_DOCUMENT_PREFIX = 'v7.validation-campaign:document:';

export const VALIDATION_LIMITS = Object.freeze({
  maximumAnalysisRuns: 32,
  maximumAuditBytes: 1_500_000,
  maximumCampaignBytes: 1_250_000,
  maximumCampaigns: 16,
  maximumCaseIds: 128,
  maximumCaseRevisions: 8,
  maximumCohorts: 32,
  maximumCombinedBytes: 1_500_000,
  maximumEvidenceCitations: 2,
  maximumIndexBytes: 64_000,
  maximumNotesBytes: 2_000,
  maximumOutcomeBars: 2_000,
  maximumOutcomeBytes: 512_000,
  maximumReasonBytes: 512,
  maximumShortTextCodePoints: 80,
  maximumVerificationsPerCitation: 4,
  preparationLeaseMs: 60_000,
});

export const VALIDATION_SCHEMAS = Object.freeze({
  analysisRun: 'v7.validation-analysis-run',
  auditBundle: 'v7.validation-audit-bundle',
  campaign: 'v7.validation-campaign',
  campaignDocument: 'v7.validation-campaign-document',
  campaignIndex: 'v7.validation-campaign-index',
  cohort: 'v7.validation-study-cohort',
  evidenceCitation: 'v7.validation-evidence-citation',
  outcomeDefinition: 'v7.validation-outcome-definition',
  rawContextIntent: 'v7.validation-raw-context-intent',
  setupDefinition: 'v7.validation-setup-definition',
  sourceVerification: 'v7.validation-source-verification',
  studyCase: 'v7.validation-study-case',
});

export const QUALIFICATION_CLASSES = Object.freeze([
  'qualified', 'rejected', 'ambiguous', 'incomplete',
]);
export const OUTCOME_CLASSES = Object.freeze([
  'target-first', 'invalidation-first', 'same-bar-ambiguous',
  'horizon-expired', 'incomplete-data',
]);
export const CASE_LIFECYCLE_STATES = Object.freeze([
  'draft', 'observation-recorded', 'outcome-recorded', 'finalized',
]);

export const SETUP_TEMPLATE_ID = 'demo.sma-trend-manual-fvg';
export const SETUP_TEMPLATE_VERSION = '1.0.0';
export const OUTCOME_POLICY_ID = 'demo.directional-first-touch-path';
export const OUTCOME_POLICY_VERSION = '1.0.0';
export const METRIC_SET_ID = 'demo.validation-first-touch-descriptives';
export const METRIC_SET_VERSION = '1.0.0';
