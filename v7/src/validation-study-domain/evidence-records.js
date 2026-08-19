import {
  exactRecord,
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
  strictPortableValue,
  verifyContentDigest,
  withContentDigest,
} from './canonical-value.js';
import { VALIDATION_SCHEMAS } from './constants.js';

const OBSERVATION_CONTEXT_FIELDS = Object.freeze([
  'datasetId', 'datasetRevision', 'exclusiveReplayCutoffEpochMs', 'instrumentId',
  'latestEligibleBarStartEpochMs', 'paneId', 'paneRevision', 'paneRole',
  'sessionHoursId', 'sessionId', 'sessionRevision', 'timeframeId',
  'workspaceDigest', 'workspaceRevision',
]);
const PROVIDER_IDENTITY_FIELDS = Object.freeze([
  'contributionId', 'contributionVersion', 'definitionDigest',
  'definitionOrSemanticTypeId', 'definitionOrSemanticTypeVersion', 'packageGeneration',
  'packageId', 'packageVersion', 'provenanceDigest', 'providerId', 'providerVersion',
  'schemaDigest',
]);
const SOURCE_REFERENCE_FIELDS = Object.freeze([
  'ownerKind', 'resultDigest', 'resultFrameId', 'resultFrameRevision',
  'sourceDigest', 'sourceDocumentId', 'sourceDocumentRevision', 'sourceRecordId',
  'sourceRecordRevision',
]);
const CITATION_FIELDS = Object.freeze([
  'boundedClaim', 'capturedAtEpochMs', 'citationId', 'citationRevision',
  'contentDigest', 'evidenceRole', 'observationContext', 'predicateId',
  'predicateVersion', 'providerIdentity', 'receiptDigest', 'schema',
  'sourceAvailabilityAtCapture', 'sourceReference', 'version',
]);
const CANDIDATE_FIELDS = Object.freeze([
  'boundedClaim', 'currencyFence', 'evidenceRole', 'observationContext', 'predicateId',
  'predicateVersion', 'providerIdentity', 'receiptDigest', 'sourceAvailabilityAtCapture',
  'sourceReference',
]);

function nullableIdentity(value, label, validator = requireOpaqueId) {
  return value === null ? null : validator(value, label);
}
export function readObservationContext(value) {
  exactRecord(value, OBSERVATION_CONTEXT_FIELDS, 'Evidence observation context');
  return strictPortableValue({
    datasetId: requireOpaqueId(value.datasetId, 'Dataset id'),
    datasetRevision: requireOpaqueId(value.datasetRevision, 'Dataset revision'),
    exclusiveReplayCutoffEpochMs: requireEpoch(
      value.exclusiveReplayCutoffEpochMs, 'Exclusive Replay cutoff',
    ),
    instrumentId: requireContractId(value.instrumentId, 'Observed instrument'),
    latestEligibleBarStartEpochMs: requireEpoch(
      value.latestEligibleBarStartEpochMs, 'Latest eligible Bar start',
    ),
    paneId: requireOpaqueId(value.paneId, 'Pane id'),
    paneRevision: requireRevision(value.paneRevision, 'Pane revision', { minimum: 0 }),
    paneRole: requireEnum(value.paneRole, ['context-pane', 'execution-pane'], 'Pane role'),
    sessionHoursId: requireContractId(value.sessionHoursId, 'Session Hours id'),
    sessionId: requireOpaqueId(value.sessionId, 'Session id'),
    sessionRevision: requireRevision(value.sessionRevision, 'Session revision'),
    timeframeId: requireContractId(value.timeframeId, 'Observed timeframe'),
    workspaceDigest: requireDigest(value.workspaceDigest, 'Workspace digest'),
    workspaceRevision: requireRevision(value.workspaceRevision, 'Workspace revision', { minimum: 0 }),
  });
}

export function readProviderIdentity(value) {
  exactRecord(value, PROVIDER_IDENTITY_FIELDS, 'Evidence provider identity');
  const packageId = nullableIdentity(value.packageId, 'Package id', requireContractId);
  const packageVersion = nullableIdentity(value.packageVersion, 'Package version', requireSemver);
  const contributionId = nullableIdentity(value.contributionId, 'Contribution id', requireContractId);
  const contributionVersion = nullableIdentity(
    value.contributionVersion, 'Contribution version', requireSemver,
  );
  if ((packageId === null) !== (packageVersion === null)
    || (contributionId === null) !== (contributionVersion === null)) {
    throw new TypeError('Provider package/contribution identity is incomplete.');
  }
  return strictPortableValue({
    contributionId,
    contributionVersion,
    definitionDigest: requireDigest(value.definitionDigest, 'Definition digest'),
    definitionOrSemanticTypeId: requireContractId(
      value.definitionOrSemanticTypeId, 'Definition or Semantic Type id',
    ),
    definitionOrSemanticTypeVersion: requireSemver(
      value.definitionOrSemanticTypeVersion, 'Definition or Semantic Type version',
    ),
    packageGeneration: requireRevision(value.packageGeneration, 'Package generation', { minimum: 0 }),
    packageId,
    packageVersion,
    provenanceDigest: requireDigest(value.provenanceDigest, 'Provenance digest'),
    providerId: requireContractId(value.providerId, 'Evidence provider id'),
    providerVersion: requireSemver(value.providerVersion, 'Evidence provider version'),
    schemaDigest: requireDigest(value.schemaDigest, 'Evidence schema digest'),
  });
}

export function readSourceReference(value) {
  exactRecord(value, SOURCE_REFERENCE_FIELDS, 'Evidence source reference');
  const source = strictPortableValue({
    ownerKind: requireEnum(
      value.ownerKind,
      ['annotation-document', 'calculated-series-document'],
      'Evidence owner kind',
    ),
    resultDigest: value.resultDigest === null ? null : requireDigest(value.resultDigest, 'Result digest'),
    resultFrameId: nullableIdentity(value.resultFrameId, 'Result frame id'),
    resultFrameRevision: value.resultFrameRevision === null ? null
      : requireRevision(value.resultFrameRevision, 'Result frame revision'),
    sourceDigest: requireDigest(value.sourceDigest, 'Source digest'),
    sourceDocumentId: requireOpaqueId(value.sourceDocumentId, 'Source document id'),
    sourceDocumentRevision: requireRevision(
      value.sourceDocumentRevision, 'Source document revision', { minimum: 0 },
    ),
    sourceRecordId: requireOpaqueId(value.sourceRecordId, 'Source record id'),
    sourceRecordRevision: requireRevision(value.sourceRecordRevision, 'Source record revision'),
  });
  const fvg = source.ownerKind === 'annotation-document';
  if (fvg && [source.resultFrameId, source.resultFrameRevision, source.resultDigest]
    .some((entry) => entry !== null)) throw new TypeError('FVG citation cannot carry a result frame.');
  if (!fvg && [source.resultFrameId, source.resultFrameRevision, source.resultDigest]
    .some((entry) => entry === null)) throw new TypeError('SMA citation requires its result frame.');
  return source;
}

export function readBoundedClaim(value) {
  if (value?.claimKind === 'sma-close-comparison') {
    exactRecord(value, [
      'claimKind', 'close', 'comparison', 'comparisonPassed', 'length', 'readiness',
      'sma', 'valueBarStartEpochMs', 'visible',
    ], 'SMA bounded claim');
    if (typeof value.comparisonPassed !== 'boolean' || typeof value.visible !== 'boolean') {
      throw new TypeError('SMA claim booleans are invalid.');
    }
    return strictPortableValue({
      claimKind: value.claimKind,
      close: requireFinite(value.close, 'SMA claim close'),
      comparison: requireEnum(
        value.comparison, ['close-above-sma', 'close-below-sma'], 'SMA comparison',
      ),
      comparisonPassed: value.comparisonPassed,
      length: requireRevision(value.length, 'SMA length'),
      readiness: requireEnum(value.readiness, ['ready', 'pending', 'error', 'empty'], 'SMA readiness'),
      sma: requireFinite(value.sma, 'SMA value'),
      valueBarStartEpochMs: requireEpoch(value.valueBarStartEpochMs, 'SMA value Bar start'),
      visible: value.visible,
    });
  }
  if (value?.claimKind === 'manual-fvg-observation') {
    exactRecord(value, [
      'acceptance', 'claimKind', 'direction', 'evidenceBarStartEpochMs', 'lifecycle',
      'lowerPrice', 'predicatePassed', 'upperPrice',
    ], 'FVG bounded claim');
    if (!Array.isArray(value.evidenceBarStartEpochMs)
      || value.evidenceBarStartEpochMs.length !== 3
      || typeof value.predicatePassed !== 'boolean') throw new TypeError('FVG claim is invalid.');
    const starts = value.evidenceBarStartEpochMs.map((entry) => requireEpoch(entry, 'FVG evidence Bar start'));
    if (!(starts[0] < starts[1] && starts[1] < starts[2])) throw new TypeError('FVG evidence Bars are unordered.');
    const lowerPrice = requireFinite(value.lowerPrice, 'FVG lower price');
    const upperPrice = requireFinite(value.upperPrice, 'FVG upper price');
    if (!(lowerPrice < upperPrice)) throw new TypeError('FVG price bounds are invalid.');
    return strictPortableValue({
      acceptance: requireEnum(value.acceptance, ['accepted', 'unresolved'], 'FVG acceptance'),
      claimKind: value.claimKind,
      direction: requireEnum(value.direction, ['bullish', 'bearish'], 'FVG direction'),
      evidenceBarStartEpochMs: starts,
      lifecycle: requireEnum(value.lifecycle, ['active', 'archived'], 'FVG lifecycle'),
      lowerPrice,
      predicatePassed: value.predicatePassed,
      upperPrice,
    });
  }
  throw new TypeError('Evidence bounded claim kind is unsupported.');
}

function receiptPayload(value) {
  return strictPortableValue({
    boundedClaim: readBoundedClaim(value.boundedClaim),
    evidenceRole: requireEnum(value.evidenceRole, ['context-sma', 'execution-fvg'], 'Evidence role'),
    observationContext: readObservationContext(value.observationContext),
    predicateId: requireContractId(value.predicateId, 'Predicate id'),
    predicateVersion: requireSemver(value.predicateVersion, 'Predicate version'),
    providerIdentity: readProviderIdentity(value.providerIdentity),
    sourceAvailabilityAtCapture: requireEnum(
      value.sourceAvailabilityAtCapture, ['available'], 'Source availability at capture',
    ),
    sourceReference: readSourceReference(value.sourceReference),
  });
}

export async function createEvidenceCandidate(value, crypto = globalThis.crypto) {
  const payload = receiptPayload(value);
  return strictPortableValue({
    ...payload,
    currencyFence: strictPortableValue(value.currencyFence),
    receiptDigest: await sha256Canonical(payload, crypto),
  });
}

export async function readEvidenceCandidate(value, crypto = globalThis.crypto) {
  exactRecord(value, CANDIDATE_FIELDS, 'Evidence candidate');
  const payload = receiptPayload(value);
  const receiptDigest = await sha256Canonical(payload, crypto);
  if (receiptDigest !== requireDigest(value.receiptDigest, 'Evidence receipt digest')) {
    throw new TypeError('Evidence candidate receipt digest is stale.');
  }
  return strictPortableValue({
    ...payload,
    currencyFence: strictPortableValue(value.currencyFence),
    receiptDigest,
  });
}

export async function createEvidenceCitation({
  candidate, citationId, crypto = globalThis.crypto, nowEpochMs,
}) {
  const source = await readEvidenceCandidate(candidate, crypto);
  const { currencyFence: ignored, ...payload } = source;
  return withContentDigest({
    ...payload,
    capturedAtEpochMs: requireEpoch(nowEpochMs, 'Citation capture time'),
    citationId: requireUuid(citationId, 'Citation id'),
    citationRevision: 1,
    schema: VALIDATION_SCHEMAS.evidenceCitation,
    version: 1,
  }, crypto);
}

export async function readEvidenceCitation(value, crypto = globalThis.crypto) {
  exactRecord(value, CITATION_FIELDS, 'Evidence citation');
  if (value.schema !== VALIDATION_SCHEMAS.evidenceCitation || value.version !== 1) {
    throw new TypeError('Evidence citation schema is unsupported.');
  }
  requireUuid(value.citationId, 'Citation id');
  requireRevision(value.citationRevision, 'Citation revision');
  requireEpoch(value.capturedAtEpochMs, 'Citation capture time');
  const payload = receiptPayload(value);
  if (await sha256Canonical(payload, crypto) !== value.receiptDigest) {
    throw new TypeError('Evidence citation receipt digest is invalid.');
  }
  await verifyContentDigest(value, crypto);
  return strictPortableValue(value);
}

export function citationRef(value) {
  return strictPortableValue({
    citationContentDigest: requireDigest(value.contentDigest, 'Citation content digest'),
    citationId: requireUuid(value.citationId, 'Citation id'),
    citationRevision: requireRevision(value.citationRevision, 'Citation revision'),
  });
}
