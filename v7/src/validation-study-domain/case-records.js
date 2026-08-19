import {
  canonicalJson,
  exactRecord,
  requireBoundedText,
  requireDigest,
  requireEnum,
  requireEpoch,
  requireFinite,
  requireOpaqueId,
  requireRevision,
  requireUuid,
  strictPortableValue,
  utf8Bytes,
  verifyContentDigest,
  withContentDigest,
} from './canonical-value.js';
import {
  CASE_LIFECYCLE_STATES,
  QUALIFICATION_CLASSES,
  VALIDATION_LIMITS,
  VALIDATION_SCHEMAS,
} from './constants.js';
import { readDefinitionRef } from './definition-records.js';
import { readEvidenceCitation } from './evidence-records.js';
import { readOutcomeObservation } from './outcome-records.js';

const CASE_FIELDS = Object.freeze([
  'acceptedDocumentRevision', 'authorLabel', 'campaignId', 'caseId', 'caseRevision',
  'confidence', 'contentDigest', 'createdAtEpochMs', 'evidenceCitations',
  'finalizedAtEpochMs', 'lifecycleState', 'notes', 'observationContext',
  'outcomeDefinitionRef', 'outcomeObservation', 'pathPlan', 'predicateResults',
  'qualificationClass', 'schema', 'setupDefinitionRef', 'supersedesCaseRevision',
  'updatedAtEpochMs', 'version',
]);
const PATH_FIELDS = Object.freeze([
  'direction', 'horizonBars', 'invalidationPrice', 'referencePrice', 'targetPrice',
]);
const CASE_OBSERVATION_FIELDS = Object.freeze([
  'datasetId', 'datasetRevision', 'exclusiveReplayCutoffEpochMs', 'instrumentId',
  'paneAssignments', 'sessionHoursId', 'sessionId', 'sessionRevision',
  'workspaceDigest', 'workspaceRevision',
]);

export function readPathPlan(value) {
  exactRecord(value, PATH_FIELDS, 'Study Case path plan');
  const direction = requireEnum(value.direction, ['long', 'short'], 'Path direction');
  const referencePrice = requireFinite(value.referencePrice, 'Reference price');
  const invalidationPrice = requireFinite(value.invalidationPrice, 'Invalidation price');
  const targetPrice = requireFinite(value.targetPrice, 'Target price');
  const horizonBars = requireRevision(value.horizonBars, 'Outcome horizon');
  if (horizonBars > VALIDATION_LIMITS.maximumOutcomeBars
    || (direction === 'long' && !(invalidationPrice < referencePrice && referencePrice < targetPrice))
    || (direction === 'short' && !(targetPrice < referencePrice && referencePrice < invalidationPrice))) {
    throw new TypeError('Study Case path ordering or horizon is invalid.');
  }
  return strictPortableValue({ direction, horizonBars, invalidationPrice, referencePrice, targetPrice });
}

export function readCaseObservationContext(value) {
  exactRecord(value, CASE_OBSERVATION_FIELDS, 'Study Case observation context');
  if (!Array.isArray(value.paneAssignments) || value.paneAssignments.length !== 2) {
    throw new TypeError('Study Case requires two Pane assignments.');
  }
  const assignments = value.paneAssignments.map((entry) => {
    exactRecord(entry, ['paneId', 'paneRevision', 'paneRole', 'timeframeId'], 'Pane assignment');
    return strictPortableValue({
      paneId: requireOpaqueId(entry.paneId, 'Pane id'),
      paneRevision: requireRevision(entry.paneRevision, 'Pane revision', { minimum: 0 }),
      paneRole: requireEnum(entry.paneRole, ['context-pane', 'execution-pane'], 'Pane role'),
      timeframeId: requireOpaqueId(entry.timeframeId, 'Pane timeframe'),
    });
  }).sort((left, right) => left.paneRole.localeCompare(right.paneRole));
  if (new Set(assignments.map(({ paneRole }) => paneRole)).size !== 2) {
    throw new TypeError('Study Case Pane roles must be unique.');
  }
  return strictPortableValue({
    datasetId: requireOpaqueId(value.datasetId, 'Dataset id'),
    datasetRevision: requireOpaqueId(value.datasetRevision, 'Dataset revision'),
    exclusiveReplayCutoffEpochMs: requireEpoch(value.exclusiveReplayCutoffEpochMs, 'Replay cutoff'),
    instrumentId: requireOpaqueId(value.instrumentId, 'Instrument id'),
    paneAssignments: assignments,
    sessionHoursId: requireOpaqueId(value.sessionHoursId, 'Session Hours id'),
    sessionId: requireOpaqueId(value.sessionId, 'Session id'),
    sessionRevision: requireRevision(value.sessionRevision, 'Session revision'),
    workspaceDigest: requireDigest(value.workspaceDigest, 'Workspace digest'),
    workspaceRevision: requireRevision(value.workspaceRevision, 'Workspace revision', { minimum: 0 }),
  });
}

export function observationContextFromCitations(citations) {
  if (!Array.isArray(citations) || citations.length !== 2) {
    throw new TypeError('Two citations are required to close an observation context.');
  }
  const contexts = citations.map(({ observationContext }) => observationContext);
  const first = contexts[0];
  for (const field of [
    'sessionId', 'sessionRevision', 'workspaceRevision', 'workspaceDigest', 'datasetId',
    'datasetRevision', 'instrumentId', 'sessionHoursId', 'exclusiveReplayCutoffEpochMs',
  ]) {
    if (contexts.some((context) => context[field] !== first[field])) {
      throw new TypeError(`Citation ${field} identities differ.`);
    }
  }
  return readCaseObservationContext({
    datasetId: first.datasetId,
    datasetRevision: first.datasetRevision,
    exclusiveReplayCutoffEpochMs: first.exclusiveReplayCutoffEpochMs,
    instrumentId: first.instrumentId,
    paneAssignments: contexts.map((context) => ({
      paneId: context.paneId,
      paneRevision: context.paneRevision,
      paneRole: context.paneRole,
      timeframeId: context.timeframeId,
    })),
    sessionHoursId: first.sessionHoursId,
    sessionId: first.sessionId,
    sessionRevision: first.sessionRevision,
    workspaceDigest: first.workspaceDigest,
    workspaceRevision: first.workspaceRevision,
  });
}

export function readPredicateResults(value) {
  if (!Array.isArray(value) || value.length > 2) throw new TypeError('Predicate results are invalid.');
  const entries = value.map((entry) => {
    exactRecord(entry, ['evidenceRole', 'passed', 'reasonCode', 'status'], 'Predicate result');
    if (entry.passed !== null && typeof entry.passed !== 'boolean') throw new TypeError('Predicate result is invalid.');
    return strictPortableValue({
      evidenceRole: requireEnum(entry.evidenceRole, ['context-sma', 'execution-fvg'], 'Evidence role'),
      passed: entry.passed,
      reasonCode: requireOpaqueId(entry.reasonCode, 'Predicate reason'),
      status: requireEnum(entry.status, ['ready', 'source-unavailable', 'source-mismatch'], 'Predicate status'),
    });
  }).sort((left, right) => left.evidenceRole.localeCompare(right.evidenceRole));
  if (new Set(entries.map(({ evidenceRole }) => evidenceRole)).size !== entries.length) {
    throw new TypeError('Predicate roles are duplicated.');
  }
  return Object.freeze(entries);
}

function requireEvidenceClosure(citations, predicateResults, observation, setupDefinitionRef) {
  const citationRoles = citations.map(({ evidenceRole }) => evidenceRole);
  if (new Set(citationRoles).size !== citationRoles.length) {
    throw new TypeError('Study Case citation roles are duplicated.');
  }
  const predicateByRole = new Map(predicateResults.map((entry) => [entry.evidenceRole, entry]));
  for (const citation of citations) {
    const context = citation.observationContext;
    const isSma = citation.evidenceRole === 'context-sma';
    const expected = isSma ? {
      claimKind: 'sma-close-comparison',
      ownerKind: 'calculated-series-document',
      paneRole: 'context-pane',
      providerId: 'validation.evidence.sma-close',
    } : {
      claimKind: 'manual-fvg-observation',
      ownerKind: 'annotation-document',
      paneRole: 'execution-pane',
      providerId: 'validation.evidence.manual-fvg',
    };
    const passed = citation.boundedClaim.comparisonPassed
      ?? citation.boundedClaim.predicatePassed;
    if (citation.predicateId !== setupDefinitionRef.id
      || citation.predicateVersion !== setupDefinitionRef.version
      || citation.boundedClaim.claimKind !== expected.claimKind
      || citation.providerIdentity.providerId !== expected.providerId
      || citation.sourceReference.ownerKind !== expected.ownerKind
      || context.paneRole !== expected.paneRole
      || predicateByRole.get(citation.evidenceRole)?.passed !== passed
      || context.latestEligibleBarStartEpochMs >= context.exclusiveReplayCutoffEpochMs
      || (isSma
        ? citation.boundedClaim.valueBarStartEpochMs >= context.exclusiveReplayCutoffEpochMs
        : citation.boundedClaim.evidenceBarStartEpochMs.some((start) => (
          start >= context.exclusiveReplayCutoffEpochMs
        )))) {
      throw new TypeError('Study Case citation does not close to its predicate and no-future context.');
    }
  }
  if (citations.length === 2) {
    const derived = observationContextFromCitations(citations);
    if (observation === null || canonicalJson(derived) !== canonicalJson(observation)) {
      throw new TypeError('Study Case observation context differs from its citations.');
    }
  } else if (observation !== null) {
    throw new TypeError('Partial Study Case evidence cannot claim a closed observation context.');
  }
}

function notes(value) {
  return requireBoundedText(value, 'Study Case notes', {
    allowEmpty: true, bytes: VALIDATION_LIMITS.maximumNotesBytes,
  });
}

function author(value) {
  return requireBoundedText(value, 'Study Case author', {
    codePoints: VALIDATION_LIMITS.maximumShortTextCodePoints,
  });
}

export async function createStudyCase({
  acceptedDocumentRevision,
  authorLabel,
  campaignId,
  caseId,
  caseRevision = 1,
  confidence,
  nowEpochMs,
  createdAtEpochMs = nowEpochMs,
  crypto = globalThis.crypto,
  evidenceCitations,
  finalizedAtEpochMs = null,
  lifecycleState,
  notes: noteValue,
  observationContext,
  outcomeDefinitionRef,
  outcomeObservation = null,
  pathPlan,
  predicateResults,
  qualificationClass,
  setupDefinitionRef,
  supersedesCaseRevision = null,
}) {
  const value = await withContentDigest({
    acceptedDocumentRevision: requireRevision(acceptedDocumentRevision, 'Accepted document revision'),
    authorLabel: author(authorLabel),
    campaignId: requireUuid(campaignId, 'Case Campaign id'),
    caseId: requireUuid(caseId, 'Case id'),
    caseRevision: requireRevision(caseRevision, 'Case revision'),
    confidence: confidence === null ? null : requireRevision(confidence, 'Confidence', { minimum: 0 }),
    createdAtEpochMs: requireEpoch(createdAtEpochMs, 'Case creation time'),
    evidenceCitations: evidenceCitations ?? [],
    finalizedAtEpochMs,
    lifecycleState,
    notes: notes(noteValue),
    observationContext,
    outcomeDefinitionRef: readDefinitionRef(outcomeDefinitionRef),
    outcomeObservation,
    pathPlan: readPathPlan(pathPlan),
    predicateResults: readPredicateResults(predicateResults),
    qualificationClass,
    schema: VALIDATION_SCHEMAS.studyCase,
    setupDefinitionRef: readDefinitionRef(setupDefinitionRef),
    supersedesCaseRevision,
    updatedAtEpochMs: requireEpoch(nowEpochMs, 'Case update time'),
    version: 1,
  }, crypto);
  return readStudyCase(value, crypto);
}

export async function supersedeStudyCase(previous, changes, {
  acceptedDocumentRevision, crypto = globalThis.crypto, nowEpochMs,
} = {}) {
  await readStudyCase(previous, crypto);
  const { contentDigest: ignored, ...wire } = previous;
  return createStudyCase({
    ...wire,
    ...changes,
    acceptedDocumentRevision,
    caseRevision: previous.caseRevision + 1,
    createdAtEpochMs: previous.createdAtEpochMs,
    crypto,
    nowEpochMs,
    supersedesCaseRevision: previous.caseRevision,
  });
}

export async function readStudyCase(value, crypto = globalThis.crypto) {
  exactRecord(value, CASE_FIELDS, 'Study Case');
  if (value.schema !== VALIDATION_SCHEMAS.studyCase || value.version !== 1) {
    throw new TypeError('Study Case schema is unsupported.');
  }
  requireUuid(value.caseId, 'Case id');
  requireUuid(value.campaignId, 'Case Campaign id');
  const revision = requireRevision(value.caseRevision, 'Case revision');
  if ((revision === 1 && value.supersedesCaseRevision !== null)
    || (revision > 1 && value.supersedesCaseRevision !== revision - 1)) {
    throw new TypeError('Study Case superseding chain is invalid.');
  }
  requireRevision(value.acceptedDocumentRevision, 'Accepted document revision');
  const lifecycle = requireEnum(value.lifecycleState, CASE_LIFECYCLE_STATES, 'Case lifecycle');
  const qualification = requireEnum(value.qualificationClass, QUALIFICATION_CLASSES, 'Qualification class');
  if (!Array.isArray(value.evidenceCitations)
    || value.evidenceCitations.length > VALIDATION_LIMITS.maximumEvidenceCitations) {
    throw new TypeError('Study Case citation count is invalid.');
  }
  await Promise.all(value.evidenceCitations.map((citation) => readEvidenceCitation(citation, crypto)));
  readDefinitionRef(value.setupDefinitionRef);
  readDefinitionRef(value.outcomeDefinitionRef);
  const observation = value.observationContext === null ? null : readCaseObservationContext(value.observationContext);
  const outcome = readOutcomeObservation(value.outcomeObservation);
  const predicateResults = readPredicateResults(value.predicateResults);
  requireEvidenceClosure(
    value.evidenceCitations, predicateResults, observation, value.setupDefinitionRef,
  );
  const plan = readPathPlan(value.pathPlan);
  if (outcome !== null && (observation === null
    || outcome.decisionCutoffEpochMs !== observation.exclusiveReplayCutoffEpochMs
    || outcome.horizonBars !== plan.horizonBars)) {
    throw new TypeError('Study Case Outcome differs from its frozen decision context or path.');
  }
  if ((lifecycle === 'draft' && outcome !== null)
    || (lifecycle !== 'draft' && (value.evidenceCitations.length !== 2 || observation === null))
    || (['observation-recorded'].includes(lifecycle) && outcome !== null)
    || (['outcome-recorded', 'finalized'].includes(lifecycle) && outcome === null)
    || (lifecycle === 'finalized') !== (value.finalizedAtEpochMs !== null)
    || (qualification === 'qualified'
      && (lifecycle === 'draft' || predicateResults.length !== 2
        || predicateResults.some(({ passed }) => passed !== true)))) {
    throw new TypeError('Study Case lifecycle evidence closure is invalid.');
  }
  const created = requireEpoch(value.createdAtEpochMs, 'Case creation time');
  const updated = requireEpoch(value.updatedAtEpochMs, 'Case update time');
  if (updated < created) throw new TypeError('Study Case chronology is invalid.');
  if (value.finalizedAtEpochMs !== null && requireEpoch(value.finalizedAtEpochMs) < updated) {
    throw new TypeError('Study Case finalization time is invalid.');
  }
  if (value.confidence !== null
    && (!Number.isSafeInteger(value.confidence) || value.confidence < 0 || value.confidence > 100)) {
    throw new TypeError('Study Case confidence is invalid.');
  }
  notes(value.notes);
  author(value.authorLabel);
  await verifyContentDigest(value, crypto);
  return strictPortableValue(value);
}

export function caseRef(value) {
  return strictPortableValue({
    caseContentDigest: requireDigest(value.contentDigest, 'Case content digest'),
    caseId: requireUuid(value.caseId, 'Case id'),
    caseRevision: requireRevision(value.caseRevision, 'Case revision'),
  });
}
