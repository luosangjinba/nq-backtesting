import {
  canonicalJson,
  METRIC_SET_ID,
  METRIC_SET_VERSION,
  requireEpoch,
  sha256Canonical,
  strictPortableValue,
  utf8Bytes,
  VALIDATION_LIMITS,
  VALIDATION_SCHEMAS,
} from '../validation-study-domain/public.js';

const OMISSIONS = Object.freeze([
  'raw-bars',
  'screenshots',
  'plugin-package-bytes',
  'plugin-code',
  'credentials-cookies-tokens',
  'native-chart-dom-canvas-state',
  'filesystem-paths',
  'private-provider-payloads',
  'ai-prompts-embeddings-labels',
  'remote-references',
]);

function sourceMetadata(document) {
  const datasets = new Map();
  for (const record of document.caseRevisions) {
    const context = record.observationContext;
    if (context === null) continue;
    datasets.set(`${context.datasetId}:${context.datasetRevision}`, strictPortableValue({
      datasetId: context.datasetId,
      datasetRevision: context.datasetRevision,
      instrumentId: context.instrumentId,
      sessionHoursId: context.sessionHoursId,
    }));
  }
  return strictPortableValue({
    datasets: [...datasets.values()].sort((left, right) => (
      `${left.datasetId}:${left.datasetRevision}`.localeCompare(`${right.datasetId}:${right.datasetRevision}`)
    )),
    rawMarketDataIncluded: false,
    rightsDeclaration: 'local-user-controlled-source-metadata-only',
  });
}
/** Build one deterministic, download-only audit bundle with explicit omissions. */
export function createValidationCampaignAuditExporter({ crypto = globalThis.crypto } = {}) {
  return Object.freeze({
    async prepare({ campaignDocument, exportedAtEpochMs = campaignDocument.updatedAtEpochMs } = {}) {
      const payload = strictPortableValue({
        campaignDocument,
        exportFormatId: 'v7.validation-campaign-audit-json',
        exportFormatVersion: '1.0.0',
        exportedAtEpochMs: requireEpoch(exportedAtEpochMs, 'Audit export time'),
        metricDefinitions: [{
          metricSetId: METRIC_SET_ID,
          metricSetVersion: METRIC_SET_VERSION,
          semantics: 'frozen-case-descriptive-count-rate-median',
        }],
        omissions: OMISSIONS,
        schema: VALIDATION_SCHEMAS.auditBundle,
        sourceAndRightsMetadata: sourceMetadata(campaignDocument),
        version: 1,
      });
      const bundle = strictPortableValue({
        ...payload,
        payloadDigest: await sha256Canonical(payload, crypto),
      });
      if (utf8Bytes(bundle) > VALIDATION_LIMITS.maximumAuditBytes) {
        const error = new Error('Validation Campaign audit JSON exceeds 1.5 MB.');
        error.code = 'VALIDATION_CAMPAIGN_RESOURCE_LIMIT';
        throw error;
      }
      return bundle;
    },
    serialize(bundle) {
      const raw = canonicalJson(bundle);
      if (utf8Bytes(raw) > VALIDATION_LIMITS.maximumAuditBytes) {
        const error = new Error('Validation Campaign audit JSON exceeds 1.5 MB.');
        error.code = 'VALIDATION_CAMPAIGN_RESOURCE_LIMIT';
        throw error;
      }
      return raw;
    },
  });
}
