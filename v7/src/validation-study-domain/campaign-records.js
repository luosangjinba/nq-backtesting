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
  requireUuid,
  strictPortableValue,
  utf8Bytes,
  verifyContentDigest,
  withContentDigest,
} from './canonical-value.js';
import {
  VALIDATION_LIMITS,
  VALIDATION_SCHEMAS,
} from './constants.js';
import {
  definitionRef,
  readDefinitionRef,
  readOutcomeDefinition,
  readSetupDefinition,
} from './definition-records.js';
import { failValidation } from './validation-error.js';

const CAMPAIGN_FIELDS = Object.freeze([
  'archivedAtEpochMs', 'authorLabel', 'campaignId', 'contentDigest',
  'contextTimeframeId', 'createdAtEpochMs', 'direction', 'executionTimeframeId',
  'instrumentId', 'outcomeDefinitionRef', 'revision', 'schema', 'sessionHoursId',
  'setupDefinitionRef', 'status', 'title', 'updatedAtEpochMs', 'version',
]);
const DOCUMENT_FIELDS = Object.freeze([
  'analysisRuns', 'campaign', 'caseRevisions', 'cohorts', 'contentDigest',
  'createdAtEpochMs', 'documentRevision', 'outcomeDefinitions', 'schema',
  'setupDefinitions', 'sourceVerifications', 'updatedAtEpochMs', 'version',
]);
const INDEX_FIELDS = Object.freeze([
  'campaignIds', 'contentDigest', 'revision', 'schema', 'updatedAtEpochMs', 'version',
]);

function resourceLimit(message) {
  failValidation('VALIDATION_CAMPAIGN_RESOURCE_LIMIT', message, { operation: 'resource-check' });
}
function shortText(value, label) {
  return requireBoundedText(value, label, {
    codePoints: VALIDATION_LIMITS.maximumShortTextCodePoints,
  });
}

function campaignShape(value) {
  exactRecord(value, CAMPAIGN_FIELDS, 'Validation Campaign');
  if (value.schema !== VALIDATION_SCHEMAS.campaign || value.version !== 1) {
    throw new TypeError('Validation Campaign schema is unsupported.');
  }
  const created = requireEpoch(value.createdAtEpochMs, 'Campaign creation time');
  const updated = requireEpoch(value.updatedAtEpochMs, 'Campaign update time');
  const status = requireEnum(value.status, ['active', 'archived'], 'Campaign status');
  const archived = value.archivedAtEpochMs === null ? null
    : requireEpoch(value.archivedAtEpochMs, 'Campaign archive time');
  if (updated < created || (status === 'active' && archived !== null)
    || (status === 'archived' && (archived === null || archived < updated))) {
    throw new TypeError('Validation Campaign chronology is invalid.');
  }
  shortText(value.title, 'Campaign title');
  shortText(value.authorLabel, 'Campaign author');
  requireUuid(value.campaignId, 'Campaign id');
  requireRevision(value.revision, 'Campaign revision');
  requireContractId(value.instrumentId, 'Campaign instrument');
  requireContractId(value.contextTimeframeId, 'Campaign context timeframe');
  requireContractId(value.executionTimeframeId, 'Campaign execution timeframe');
  requireContractId(value.sessionHoursId, 'Campaign Session Hours');
  requireEnum(value.direction, ['long', 'short'], 'Campaign direction');
  readDefinitionRef(value.setupDefinitionRef);
  readDefinitionRef(value.outcomeDefinitionRef);
  return value;
}

export async function createCampaignRecord({
  authorLabel,
  campaignId,
  contextTimeframeId,
  crypto = globalThis.crypto,
  direction,
  executionTimeframeId,
  instrumentId,
  nowEpochMs,
  outcomeDefinitionRef,
  sessionHoursId,
  setupDefinitionRef,
  title,
}) {
  const value = await withContentDigest({
    archivedAtEpochMs: null,
    authorLabel: shortText(authorLabel, 'Campaign author'),
    campaignId: requireUuid(campaignId, 'Campaign id'),
    contextTimeframeId: requireContractId(contextTimeframeId, 'Context timeframe'),
    createdAtEpochMs: requireEpoch(nowEpochMs, 'Campaign creation time'),
    direction: requireEnum(direction, ['long', 'short'], 'Campaign direction'),
    executionTimeframeId: requireContractId(executionTimeframeId, 'Execution timeframe'),
    instrumentId: requireContractId(instrumentId, 'Campaign instrument'),
    outcomeDefinitionRef: readDefinitionRef(outcomeDefinitionRef),
    revision: 1,
    schema: VALIDATION_SCHEMAS.campaign,
    sessionHoursId: requireContractId(sessionHoursId, 'Session Hours'),
    setupDefinitionRef: readDefinitionRef(setupDefinitionRef),
    status: 'active',
    title: shortText(title, 'Campaign title'),
    updatedAtEpochMs: requireEpoch(nowEpochMs, 'Campaign update time'),
    version: 1,
  }, crypto);
  return strictPortableValue(campaignShape(value));
}

export async function archiveCampaignRecord(campaign, nowEpochMs, crypto = globalThis.crypto) {
  await readCampaignRecord(campaign, crypto);
  if (campaign.status === 'archived') return campaign;
  const { contentDigest: ignored, ...wire } = campaign;
  return withContentDigest({
    ...wire,
    archivedAtEpochMs: requireEpoch(nowEpochMs, 'Campaign archive time'),
    revision: campaign.revision + 1,
    status: 'archived',
    updatedAtEpochMs: nowEpochMs,
  }, crypto);
}

export async function readCampaignRecord(value, crypto = globalThis.crypto) {
  campaignShape(value);
  return verifyContentDigest(value, crypto);
}

export async function createCampaignIndex({
  campaignIds = [], crypto = globalThis.crypto, nowEpochMs, revision = 1,
}) {
  const ids = [...campaignIds].map((id) => requireUuid(id, 'Campaign index id')).sort();
  if (ids.length > VALIDATION_LIMITS.maximumCampaigns || new Set(ids).size !== ids.length) {
    resourceLimit('Campaign index exceeds its unique campaign ceiling.');
  }
  const index = await withContentDigest({
    campaignIds: ids,
    revision: requireRevision(revision, 'Campaign index revision'),
    schema: VALIDATION_SCHEMAS.campaignIndex,
    updatedAtEpochMs: requireEpoch(nowEpochMs, 'Campaign index update time'),
    version: 1,
  }, crypto);
  if (utf8Bytes(index) > VALIDATION_LIMITS.maximumIndexBytes) resourceLimit('Campaign index is oversized.');
  return index;
}

export async function readCampaignIndex(value, crypto = globalThis.crypto) {
  exactRecord(value, INDEX_FIELDS, 'Validation Campaign index');
  if (value.schema !== VALIDATION_SCHEMAS.campaignIndex || value.version !== 1) {
    throw new TypeError('Validation Campaign index schema is unsupported.');
  }
  const ids = value.campaignIds;
  if (!Array.isArray(ids) || ids.length > VALIDATION_LIMITS.maximumCampaigns
    || ids.some((id) => !requireUuid(id)) || new Set(ids).size !== ids.length
    || JSON.stringify(ids) !== JSON.stringify([...ids].sort())) {
    throw new TypeError('Validation Campaign index ids are invalid.');
  }
  requireRevision(value.revision, 'Campaign index revision');
  requireEpoch(value.updatedAtEpochMs, 'Campaign index update time');
  if (utf8Bytes(value) > VALIDATION_LIMITS.maximumIndexBytes) resourceLimit('Campaign index is oversized.');
  return verifyContentDigest(value, crypto);
}

function stableRecordOrder(records, idField, revisionField, timeField = 'createdAtEpochMs') {
  return [...records].sort((left, right) => (
    (left[timeField] ?? 0) - (right[timeField] ?? 0)
      || String(left[idField]).localeCompare(String(right[idField]))
      || (left[revisionField] ?? 0) - (right[revisionField] ?? 0)
  ));
}

export function orderedDocumentCollections(value) {
  return Object.freeze({
    analysisRuns: stableRecordOrder(value.analysisRuns, 'analysisRunId', 'analysisRunRevision'),
    caseRevisions: stableRecordOrder(value.caseRevisions, 'caseId', 'caseRevision'),
    cohorts: stableRecordOrder(value.cohorts, 'cohortId', 'cohortRevision'),
    sourceVerifications: stableRecordOrder(
      value.sourceVerifications, 'verificationId', 'verificationRevision', 'checkedAtEpochMs',
    ),
  });
}

export async function createCampaignDocument({
  analysisRuns = [],
  campaign,
  caseRevisions = [],
  cohorts = [],
  crypto = globalThis.crypto,
  documentRevision = 1,
  nowEpochMs,
  outcomeDefinitions,
  setupDefinitions,
  sourceVerifications = [],
}) {
  const collections = orderedDocumentCollections({
    analysisRuns, caseRevisions, cohorts, sourceVerifications,
  });
  const document = await withContentDigest({
    analysisRuns: collections.analysisRuns,
    campaign,
    caseRevisions: collections.caseRevisions,
    cohorts: collections.cohorts,
    createdAtEpochMs: documentRevision === 1 ? nowEpochMs : undefined,
    documentRevision,
    outcomeDefinitions,
    schema: VALIDATION_SCHEMAS.campaignDocument,
    setupDefinitions,
    sourceVerifications: collections.sourceVerifications,
    updatedAtEpochMs: nowEpochMs,
    version: 1,
  }, crypto);
  return document;
}

export async function replaceCampaignDocument(previous, changes, nowEpochMs, crypto = globalThis.crypto) {
  await readCampaignDocument(previous, crypto, { validateChildren: false });
  const { contentDigest: ignored, ...wire } = previous;
  const collections = orderedDocumentCollections({ ...wire, ...changes });
  return withContentDigest({
    ...wire,
    ...changes,
    ...collections,
    documentRevision: previous.documentRevision + 1,
    updatedAtEpochMs: requireEpoch(nowEpochMs, 'Document update time'),
  }, crypto);
}

export async function readCampaignDocument(value, crypto = globalThis.crypto, {
  readAnalysisRun = async (entry) => entry,
  readCase = async (entry) => entry,
  readCohort = async (entry) => entry,
  readVerification = async (entry) => entry,
  validateChildren = true,
} = {}) {
  exactRecord(value, DOCUMENT_FIELDS, 'Validation Campaign document');
  if (value.schema !== VALIDATION_SCHEMAS.campaignDocument || value.version !== 1
    || !Array.isArray(value.setupDefinitions) || value.setupDefinitions.length !== 1
    || !Array.isArray(value.outcomeDefinitions) || value.outcomeDefinitions.length !== 1
    || !Array.isArray(value.caseRevisions) || !Array.isArray(value.cohorts)
    || !Array.isArray(value.analysisRuns) || !Array.isArray(value.sourceVerifications)) {
    throw new TypeError('Validation Campaign document topology is invalid.');
  }
  requireRevision(value.documentRevision, 'Campaign document revision');
  requireEpoch(value.createdAtEpochMs, 'Document creation time');
  requireEpoch(value.updatedAtEpochMs, 'Document update time');
  if (value.updatedAtEpochMs < value.createdAtEpochMs) throw new TypeError('Document chronology is invalid.');
  const campaign = await readCampaignRecord(value.campaign, crypto);
  const setup = await readSetupDefinition(value.setupDefinitions[0], crypto);
  const outcome = await readOutcomeDefinition(value.outcomeDefinitions[0], crypto);
  if (JSON.stringify(campaign.setupDefinitionRef) !== JSON.stringify(definitionRef(setup, 'setup'))
    || JSON.stringify(campaign.outcomeDefinitionRef) !== JSON.stringify(definitionRef(outcome, 'outcome'))) {
    throw new TypeError('Campaign Definition references do not close to their seed records.');
  }
  if (validateChildren) {
    await Promise.all(value.caseRevisions.map((entry) => readCase(entry, crypto)));
    await Promise.all(value.cohorts.map((entry) => readCohort(entry, crypto)));
    await Promise.all(value.analysisRuns.map((entry) => readAnalysisRun(entry, crypto)));
    await Promise.all(value.sourceVerifications.map((entry) => readVerification(entry, crypto)));
  }
  const ordered = orderedDocumentCollections(value);
  for (const field of Object.keys(ordered)) {
    if (canonicalJson(ordered[field]) !== canonicalJson(value[field])) {
      throw new TypeError(`Campaign document ${field} order is invalid.`);
    }
  }
  if (utf8Bytes(value) > VALIDATION_LIMITS.maximumCampaignBytes) resourceLimit('Campaign document is oversized.');
  return verifyContentDigest(value, crypto);
}

export function assertCampaignDocumentCeilings(document) {
  const caseIds = new Map();
  for (const entry of document.caseRevisions) {
    const revisions = caseIds.get(entry.caseId) ?? [];
    revisions.push(entry.caseRevision);
    caseIds.set(entry.caseId, revisions);
  }
  if (caseIds.size > VALIDATION_LIMITS.maximumCaseIds
    || [...caseIds.values()].some((revisions) => revisions.length > VALIDATION_LIMITS.maximumCaseRevisions)
    || document.cohorts.length > VALIDATION_LIMITS.maximumCohorts
    || document.analysisRuns.length > VALIDATION_LIMITS.maximumAnalysisRuns) {
    resourceLimit('Campaign document exceeds a bounded collection ceiling.');
  }
  const verificationCounts = new Map();
  for (const entry of document.sourceVerifications) {
    const key = entry.citationRef?.citationId;
    verificationCounts.set(key, (verificationCounts.get(key) ?? 0) + 1);
  }
  if ([...verificationCounts.values()].some((count) => (
    count > VALIDATION_LIMITS.maximumVerificationsPerCitation
  ))) resourceLimit('A citation has too many source verifications.');
  if (utf8Bytes(document) > VALIDATION_LIMITS.maximumCampaignBytes) resourceLimit('Campaign document is oversized.');
  requireDigest(document.contentDigest, 'Campaign document digest');
  return document;
}
