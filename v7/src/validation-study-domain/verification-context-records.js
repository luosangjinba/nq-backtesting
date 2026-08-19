import {
  canonicalJson,
  exactRecord,
  requireBoundedText,
  requireContractId,
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
import { readCaseRef } from './cohort-records.js';
import { citationRef, readCitationRef, readSourceReference } from './evidence-records.js';

const VERIFICATION_RESULTS = Object.freeze([
  'match', 'mismatch', 'source-absent', 'provider-absent',
  'incompatible-version', 'dataset-mismatch', 'record-missing',
]);

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
const PANE_ROLES = Object.freeze(['context-pane', 'execution-pane']);
const EVIDENCE_ROLES = Object.freeze(['context-sma', 'execution-fvg']);

function readRawPaneIntents(values) {
  if (!Array.isArray(values) || values.length !== PANE_ROLES.length) {
    throw new TypeError('Raw-context intent requires exactly two Pane intents.');
  }
  const entries = values.map((entry) => {
    exactRecord(entry, ['paneId', 'paneRevision', 'paneRole', 'timeframeId'], 'Raw-context Pane intent');
    return strictPortableValue({
      paneId: requireOpaqueId(entry.paneId, 'Raw-context Pane id'),
      paneRevision: requireRevision(entry.paneRevision, 'Raw-context Pane revision', { minimum: 0 }),
      paneRole: requireEnum(entry.paneRole, PANE_ROLES, 'Raw-context Pane role'),
      timeframeId: requireContractId(entry.timeframeId, 'Raw-context timeframe'),
    });
  });
  const ordered = [...entries].sort((left, right) => left.paneRole.localeCompare(right.paneRole));
  if (new Set(entries.map(({ paneRole }) => paneRole)).size !== PANE_ROLES.length
    || canonicalJson(entries) !== canonicalJson(ordered)) {
    throw new TypeError('Raw-context Pane roles are duplicated or unordered.');
  }
  return Object.freeze(entries);
}

function readRawSourceIntents(values) {
  if (!Array.isArray(values) || values.length !== EVIDENCE_ROLES.length) {
    throw new TypeError('Raw-context intent requires exactly two source selections.');
  }
  const entries = values.map((entry) => {
    exactRecord(
      entry,
      ['evidenceRole', 'sourceRecordId', 'sourceRecordRevision'],
      'Raw-context source intent',
    );
    return strictPortableValue({
      evidenceRole: requireEnum(entry.evidenceRole, EVIDENCE_ROLES, 'Raw-context evidence role'),
      sourceRecordId: requireOpaqueId(entry.sourceRecordId, 'Raw-context source record id'),
      sourceRecordRevision: requireRevision(
        entry.sourceRecordRevision, 'Raw-context source record revision',
      ),
    });
  });
  const ordered = [...entries].sort((left, right) => (
    left.evidenceRole.localeCompare(right.evidenceRole)
  ));
  if (new Set(entries.map(({ evidenceRole }) => evidenceRole)).size !== EVIDENCE_ROLES.length
    || canonicalJson(entries) !== canonicalJson(ordered)) {
    throw new TypeError('Raw-context source roles are duplicated or unordered.');
  }
  return Object.freeze(entries);
}

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
    providerId: requireContractId(providerId, 'Verification provider id'),
    providerVersion: requireSemver(providerVersion, 'Verification provider version'),
    reasonCode: requireOpaqueId(reasonCode, 'Verification reason code'),
    result: requireEnum(result, VERIFICATION_RESULTS, 'Verification result'),
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
  readCaseRef(value.caseRef);
  readCitationRef(value.citationRef);
  requireEpoch(value.checkedAtEpochMs, 'Verification check time');
  requireContractId(value.providerId, 'Verification provider id');
  requireSemver(value.providerVersion, 'Verification provider version');
  requireOpaqueId(value.reasonCode, 'Verification reason code');
  requireBoundedText(value.detail, 'Verification detail', {
    allowEmpty: true, bytes: VALIDATION_LIMITS.maximumReasonBytes,
  });
  const result = requireEnum(value.result, VERIFICATION_RESULTS, 'Verification result');
  const source = value.observedSourceReference === null
    ? null : readSourceReference(value.observedSourceReference);
  const requiresObservedSource = ['match', 'mismatch', 'dataset-mismatch'].includes(result);
  if (requiresObservedSource !== (source !== null)) {
    throw new TypeError('Verification result and observed source are inconsistent.');
  }
  await verifyContentDigest(value, crypto);
  return strictPortableValue(value);
}

export function createRawContextIntent({
  campaignId,
  caseRecord,
  contextRole,
}) {
  if (campaignId !== caseRecord?.campaignId) {
    throw new TypeError('Raw-context Campaign differs from its Case.');
  }
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
  readCaseRef(value.caseRef);
  requireEnum(value.contextRole, ['observation', 'outcome'], 'Raw-context role');
  requireOpaqueId(value.datasetId, 'Raw-context dataset id');
  requireOpaqueId(value.datasetRevision, 'Raw-context dataset revision');
  requireContractId(value.instrumentId, 'Raw-context instrument');
  requireContractId(value.sessionHoursId, 'Raw-context Session Hours');
  requireOpaqueId(value.sessionId, 'Raw-context Session id');
  requireRevision(value.sessionRevision, 'Raw-context Session revision');
  requireRevision(value.workspaceRevision, 'Raw-context Workspace revision', { minimum: 0 });
  requireDigest(value.workspaceDigest, 'Raw-context Workspace digest');
  requireEpoch(value.exclusiveReplayCutoffEpochMs, 'Raw-context Replay cutoff');
  readRawPaneIntents(value.paneIntents);
  readRawSourceIntents(value.sourceSelectionIntents);
  await verifyContentDigest(value, crypto);
  return strictPortableValue(value);
}
