import {
  exactRecord,
  requireBoundedText,
  requireDigest,
  requireEnum,
  requireEpoch,
  requireOpaqueId,
  requireRevision,
  requireSemver,
  requireUuid,
  strictPortableValue,
  verifyContentDigest,
  withContentDigest,
  withContentDigestSync,
} from './canonical-value.js';
import { VALIDATION_LIMITS, VALIDATION_SCHEMAS } from './constants.js';
import { caseRef } from './case-records.js';
import { citationRef, readSourceReference } from './evidence-records.js';

const VERIFICATION_FIELDS = Object.freeze([
  'campaignId', 'caseRef', 'checkedAtEpochMs', 'citationRef', 'contentDigest', 'detail',
  'observedSourceReference', 'providerId', 'providerVersion', 'reasonCode', 'result',
  'schema', 'verificationId', 'verificationRevision', 'version',
]);
const RAW_CONTEXT_FIELDS = Object.freeze([
  'campaignId', 'caseRef', 'contentDigest', 'contextRole', 'datasetId',
  'datasetRevision', 'exclusiveReplayCutoffEpochMs', 'instrumentId', 'paneIntents',
  'schema', 'sessionHoursId', 'sessionId', 'sessionRevision', 'sourceSelectionIntents',
  'version', 'workspaceDigest', 'workspaceRevision',
]);

export async function createSourceVerification({
  campaignId,
  caseRecord,
  checkedAtEpochMs,
  citation,
  crypto = globalThis.crypto,
  detail,
  observedSourceReference = null,
  providerId,
  providerVersion,
  reasonCode,
  result,
  verificationId,
}) {
  return withContentDigest({
    campaignId: requireUuid(campaignId, 'Verification Campaign id'),
    caseRef: caseRef(caseRecord),
    checkedAtEpochMs: requireEpoch(checkedAtEpochMs, 'Verification check time'),
    citationRef: citationRef(citation),
    detail: requireBoundedText(detail, 'Verification detail', {
      allowEmpty: true, bytes: VALIDATION_LIMITS.maximumReasonBytes,
    }),
    observedSourceReference: observedSourceReference === null
      ? null : readSourceReference(observedSourceReference),
    providerId: requireOpaqueId(providerId, 'Verification provider id'),
    providerVersion: requireSemver(providerVersion, 'Verification provider version'),
    reasonCode: requireOpaqueId(reasonCode, 'Verification reason code'),
    result: requireEnum(result, [
      'match', 'mismatch', 'source-absent', 'provider-absent',
      'incompatible-version', 'dataset-mismatch', 'record-missing',
    ], 'Verification result'),
    schema: VALIDATION_SCHEMAS.sourceVerification,
    verificationId: requireUuid(verificationId, 'Verification id'),
    verificationRevision: 1,
    version: 1,
  }, crypto);
}

export async function readSourceVerification(value, crypto = globalThis.crypto) {
  exactRecord(value, VERIFICATION_FIELDS, 'Source verification');
  if (value.schema !== VALIDATION_SCHEMAS.sourceVerification || value.version !== 1) {
    throw new TypeError('Source verification schema is unsupported.');
  }
  requireUuid(value.verificationId, 'Verification id');
  requireRevision(value.verificationRevision, 'Verification revision');
  requireUuid(value.campaignId, 'Verification Campaign id');
  requireEpoch(value.checkedAtEpochMs, 'Verification check time');
  if (value.observedSourceReference !== null) readSourceReference(value.observedSourceReference);
  await verifyContentDigest(value, crypto);
  return strictPortableValue(value);
}

export function createRawContextIntent({
  campaignId,
  caseRecord,
  contextRole,
}) {
  const role = requireEnum(contextRole, ['observation', 'outcome'], 'Raw context role');
  const context = caseRecord.observationContext;
  if (context === null) throw new TypeError('Draft Case has no raw observation context.');
  const cutoff = role === 'outcome'
    ? caseRecord.outcomeObservation?.outcomeCutoffEpochMs : context.exclusiveReplayCutoffEpochMs;
  if (cutoff === undefined || cutoff === null) throw new TypeError('Case Outcome context is unavailable.');
  return withContentDigestSync({
    campaignId: requireUuid(campaignId, 'Raw-context Campaign id'),
    caseRef: caseRef(caseRecord),
    contextRole: role,
    datasetId: context.datasetId,
    datasetRevision: context.datasetRevision,
    exclusiveReplayCutoffEpochMs: requireEpoch(cutoff, 'Raw-context Replay cutoff'),
    instrumentId: context.instrumentId,
    paneIntents: context.paneAssignments.map((entry) => strictPortableValue({
      paneId: entry.paneId,
      paneRole: entry.paneRole,
      paneRevision: entry.paneRevision,
      timeframeId: entry.timeframeId,
    })),
    schema: VALIDATION_SCHEMAS.rawContextIntent,
    sessionHoursId: context.sessionHoursId,
    sessionId: context.sessionId,
    sessionRevision: context.sessionRevision,
    sourceSelectionIntents: caseRecord.evidenceCitations.map((citation) => strictPortableValue({
      evidenceRole: citation.evidenceRole,
      sourceRecordId: citation.sourceReference.sourceRecordId,
      sourceRecordRevision: citation.sourceReference.sourceRecordRevision,
    })),
    version: 1,
    workspaceDigest: context.workspaceDigest,
    workspaceRevision: context.workspaceRevision,
  });
}

export async function readRawContextIntent(value, crypto = globalThis.crypto) {
  exactRecord(value, RAW_CONTEXT_FIELDS, 'Raw-context intent');
  if (value.schema !== VALIDATION_SCHEMAS.rawContextIntent || value.version !== 1
    || !Array.isArray(value.paneIntents) || !Array.isArray(value.sourceSelectionIntents)) {
    throw new TypeError('Raw-context intent schema is invalid.');
  }
  requireUuid(value.campaignId, 'Raw-context Campaign id');
  requireDigest(value.workspaceDigest, 'Raw-context Workspace digest');
  requireEpoch(value.exclusiveReplayCutoffEpochMs, 'Raw-context Replay cutoff');
  await verifyContentDigest(value, crypto);
  return strictPortableValue(value);
}
