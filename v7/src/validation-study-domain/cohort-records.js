import {
  canonicalJson,
  exactRecord,
  requireBoundedText,
  requireDigest,
  requireEpoch,
  requireOpaqueId,
  requireRevision,
  requireUuid,
  strictPortableValue,
  verifyContentDigest,
  withContentDigest,
} from './canonical-value.js';
import { VALIDATION_LIMITS, VALIDATION_SCHEMAS } from './constants.js';
import { caseRef } from './case-records.js';
import { readDefinitionRef } from './definition-records.js';

const COHORT_FIELDS = Object.freeze([
  'authorLabel', 'campaignId', 'cohortId', 'cohortRevision', 'contentDigest',
  'createdAtEpochMs', 'excludedCaseRefs', 'manualOverrideReasons', 'memberCaseRefs',
  'name', 'outcomeDefinitionRef', 'parentCohortRef', 'schema', 'selectionPolicy',
  'setupDefinitionRef', 'version',
]);

function readCaseRef(value) {
  exactRecord(value, ['caseContentDigest', 'caseId', 'caseRevision'], 'Case reference');
  return strictPortableValue({
    caseContentDigest: requireDigest(value.caseContentDigest, 'Case content digest'),
    caseId: requireUuid(value.caseId, 'Case id'),
    caseRevision: requireRevision(value.caseRevision, 'Case revision'),
  });
}

export function cohortRef(value) {
  return strictPortableValue({
    cohortContentDigest: requireDigest(value.contentDigest, 'Cohort content digest'),
    cohortId: requireUuid(value.cohortId, 'Cohort id'),
    cohortRevision: requireRevision(value.cohortRevision, 'Cohort revision'),
  });
}

export function readCohortRef(value) {
  if (value === null) return null;
  exactRecord(value, ['cohortContentDigest', 'cohortId', 'cohortRevision'], 'Cohort reference');
  return strictPortableValue({
    cohortContentDigest: requireDigest(value.cohortContentDigest),
    cohortId: requireUuid(value.cohortId),
    cohortRevision: requireRevision(value.cohortRevision),
  });
}

function orderedRefs(values, { requireCanonicalOrder = false } = {}) {
  const result = values.map(readCaseRef).sort((left, right) => (
    left.caseId.localeCompare(right.caseId) || left.caseRevision - right.caseRevision
  ));
  const keys = result.map(({ caseId, caseRevision }) => `${caseId}:${caseRevision}`);
  if (new Set(keys).size !== keys.length) throw new TypeError('Cohort Case references are duplicated.');
  if (requireCanonicalOrder && canonicalJson(values) !== canonicalJson(result)) {
    throw new TypeError('Cohort Case references are not canonically ordered.');
  }
  return Object.freeze(result);
}

function overrideReasons(values, knownRefs, { requireCanonicalOrder = false } = {}) {
  if (!Array.isArray(values)) throw new TypeError('Cohort override reasons must be an array.');
  const reasons = values.map((entry) => {
    exactRecord(entry, ['caseRef', 'kind', 'reason'], 'Cohort override reason');
    const ref = readCaseRef(entry.caseRef);
    const key = `${ref.caseId}:${ref.caseRevision}`;
    if (canonicalJson(knownRefs.get(key)) !== canonicalJson(ref)) {
      throw new TypeError('Cohort override reason references an unknown or stale Case.');
    }
    return strictPortableValue({
      caseRef: ref,
      kind: requireOpaqueId(entry.kind, 'Override kind'),
      reason: requireBoundedText(entry.reason, 'Override reason', {
        bytes: VALIDATION_LIMITS.maximumReasonBytes,
      }),
    });
  });
  const ordered = [...reasons].sort((left, right) => (
    left.caseRef.caseId.localeCompare(right.caseRef.caseId)
      || left.caseRef.caseRevision - right.caseRef.caseRevision
      || left.kind.localeCompare(right.kind)
  ));
  const keys = ordered.map(({ caseRef: ref, kind }) => `${ref.caseId}:${ref.caseRevision}:${kind}`);
  if (new Set(keys).size !== keys.length) throw new TypeError('Cohort override reasons are duplicated.');
  if (requireCanonicalOrder && canonicalJson(values) !== canonicalJson(ordered)) {
    throw new TypeError('Cohort override reasons are not canonically ordered.');
  }
  return Object.freeze(ordered);
}

function cohortTopology(memberValues, excludedValues, reasonValues, options = {}) {
  const members = orderedRefs(memberValues, options);
  const excluded = orderedRefs(excludedValues, options);
  const memberKeys = new Set(members.map(({ caseId, caseRevision }) => `${caseId}:${caseRevision}`));
  const excludedKeys = new Set(excluded.map(({ caseId, caseRevision }) => `${caseId}:${caseRevision}`));
  if ([...memberKeys].some((key) => excludedKeys.has(key))) {
    throw new TypeError('A Cohort Case cannot be both included and excluded.');
  }
  const knownRefs = new Map([...members, ...excluded].map((ref) => [
    `${ref.caseId}:${ref.caseRevision}`, ref,
  ]));
  const reasons = overrideReasons(reasonValues, knownRefs, options);
  const reasonRefs = new Set(reasons.map(({ caseRef: ref }) => `${ref.caseId}:${ref.caseRevision}`));
  if ([...excludedKeys].some((key) => !reasonRefs.has(key))) {
    throw new TypeError('Every excluded Cohort Case requires an explicit override reason.');
  }
  return Object.freeze({ excluded, members, reasons });
}

function shortText(value, label) {
  return requireBoundedText(value, label, {
    codePoints: VALIDATION_LIMITS.maximumShortTextCodePoints,
  });
}

export async function createStudyCohort({
  authorLabel,
  campaignId,
  cohortId,
  crypto = globalThis.crypto,
  excludedCases = [],
  manualOverrideReasons = [],
  memberCases,
  name,
  nowEpochMs,
  outcomeDefinitionRef,
  parentCohortRef = null,
  setupDefinitionRef,
}) {
  const { excluded, members, reasons } = cohortTopology(
    memberCases.map(caseRef),
    excludedCases.map((entry) => caseRef(entry.case ?? entry)),
    manualOverrideReasons,
  );
  return withContentDigest({
    authorLabel: shortText(authorLabel, 'Cohort author'),
    campaignId: requireUuid(campaignId, 'Cohort Campaign id'),
    cohortId: requireUuid(cohortId, 'Cohort id'),
    cohortRevision: 1,
    createdAtEpochMs: requireEpoch(nowEpochMs, 'Cohort creation time'),
    excludedCaseRefs: excluded,
    manualOverrideReasons: reasons,
    memberCaseRefs: members,
    name: shortText(name, 'Cohort name'),
    outcomeDefinitionRef: readDefinitionRef(outcomeDefinitionRef),
    parentCohortRef: readCohortRef(parentCohortRef),
    schema: VALIDATION_SCHEMAS.cohort,
    selectionPolicy: 'all-finalized-revisions',
    setupDefinitionRef: readDefinitionRef(setupDefinitionRef),
    version: 1,
  }, crypto);
}

export async function readStudyCohort(value, crypto = globalThis.crypto) {
  exactRecord(value, COHORT_FIELDS, 'Study Cohort');
  if (value.schema !== VALIDATION_SCHEMAS.cohort || value.version !== 1
    || value.selectionPolicy !== 'all-finalized-revisions'
    || !Array.isArray(value.memberCaseRefs) || !Array.isArray(value.excludedCaseRefs)
    || !Array.isArray(value.manualOverrideReasons)) {
    throw new TypeError('Study Cohort schema or topology is invalid.');
  }
  requireUuid(value.cohortId, 'Cohort id');
  requireRevision(value.cohortRevision, 'Cohort revision');
  requireUuid(value.campaignId, 'Cohort Campaign id');
  cohortTopology(
    value.memberCaseRefs,
    value.excludedCaseRefs,
    value.manualOverrideReasons,
    { requireCanonicalOrder: true },
  );
  readCohortRef(value.parentCohortRef);
  readDefinitionRef(value.setupDefinitionRef);
  readDefinitionRef(value.outcomeDefinitionRef);
  shortText(value.name, 'Cohort name');
  shortText(value.authorLabel, 'Cohort author');
  requireEpoch(value.createdAtEpochMs, 'Cohort creation time');
  await verifyContentDigest(value, crypto);
  return strictPortableValue(value);
}

export { readCaseRef };
