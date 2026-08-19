import {
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

function readCohortRef(value) {
  if (value === null) return null;
  exactRecord(value, ['cohortContentDigest', 'cohortId', 'cohortRevision'], 'Cohort reference');
  return strictPortableValue({
    cohortContentDigest: requireDigest(value.cohortContentDigest),
    cohortId: requireUuid(value.cohortId),
    cohortRevision: requireRevision(value.cohortRevision),
  });
}

function orderedRefs(values) {
  const result = values.map(readCaseRef).sort((left, right) => (
    left.caseId.localeCompare(right.caseId) || left.caseRevision - right.caseRevision
  ));
  const keys = result.map(({ caseId, caseRevision }) => `${caseId}:${caseRevision}`);
  if (new Set(keys).size !== keys.length) throw new TypeError('Cohort Case references are duplicated.');
  return Object.freeze(result);
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
  const members = orderedRefs(memberCases.map(caseRef));
  const excluded = orderedRefs(excludedCases.map((entry) => caseRef(entry.case ?? entry)));
  if (members.some((member) => excluded.some((entry) => (
    entry.caseId === member.caseId && entry.caseRevision === member.caseRevision
  )))) throw new TypeError('A Cohort Case cannot be both included and excluded.');
  const reasons = manualOverrideReasons.map((entry) => {
    exactRecord(entry, ['caseRef', 'kind', 'reason'], 'Cohort override reason');
    return strictPortableValue({
      caseRef: readCaseRef(entry.caseRef),
      kind: requireOpaqueId(entry.kind, 'Override kind'),
      reason: requireBoundedText(entry.reason, 'Override reason', {
        bytes: VALIDATION_LIMITS.maximumReasonBytes,
      }),
    });
  });
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
  orderedRefs(value.memberCaseRefs);
  orderedRefs(value.excludedCaseRefs);
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
