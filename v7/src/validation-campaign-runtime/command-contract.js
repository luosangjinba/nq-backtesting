import {
  failValidation,
  readDefinitionRef,
  readPathPlan,
} from '../validation-study-domain/public.js';

const COMMAND_SHAPES = Object.freeze({
  'archive-campaign': Object.freeze({
    required: ['campaignId', 'expectedCampaignRevision', 'expectedDocumentRevision', 'kind'],
  }),
  'commit-case-observation': Object.freeze({
    required: [
      'authorLabel', 'campaignId', 'confidence', 'explicitConfirmation',
      'expectedDocumentRevision', 'kind', 'notes', 'outcomeDefinitionRef', 'pathPlan',
      'previewToken', 'qualificationClass', 'setupDefinitionRef',
    ],
  }),
  'create-campaign': Object.freeze({
    required: [
      'authorLabel', 'contextTimeframeId', 'direction', 'executionTimeframeId',
      'expectedIndexRevision', 'instrumentId', 'kind', 'sessionHoursId', 'title',
    ],
  }),
  'finalize-case': Object.freeze({
    required: ['campaignId', 'caseId', 'caseRevision', 'expectedDocumentRevision', 'kind'],
  }),
  'freeze-cohort': Object.freeze({
    required: [
      'authorLabel', 'campaignId', 'excludedCaseRefs', 'expectedDocumentRevision',
      'kind', 'manualOverrideReasons', 'memberCaseRefs', 'name', 'parentCohortRef',
    ],
  }),
  'record-case-outcome': Object.freeze({
    required: [
      'campaignId', 'caseId', 'caseRevision', 'expectedDocumentRevision', 'kind',
      'outcomeCutoffEpochMs',
    ],
  }),
  'run-analysis': Object.freeze({
    required: ['authorLabel', 'campaignId', 'cohortRef', 'expectedDocumentRevision', 'kind'],
  }),
  'save-incomplete-case': Object.freeze({
    required: [
      'authorLabel', 'campaignId', 'classificationReason', 'confidence',
      'expectedDocumentRevision', 'kind', 'notes', 'outcomeDefinitionRef', 'pathPlan',
      'previewToken', 'qualificationClass', 'setupDefinitionRef',
    ],
  }),
  'supersede-case': Object.freeze({
    optional: [
      'confidence', 'explicitConfirmation', 'notes', 'outcomeDefinitionRef', 'pathPlan', 'previewToken',
      'qualificationClass', 'setupDefinitionRef',
    ],
    required: [
      'campaignId', 'caseId', 'caseRevision', 'expectedDocumentRevision', 'kind', 'reason',
    ],
  }),
  'verify-source': Object.freeze({
    required: [
      'campaignId', 'caseId', 'caseRevision', 'citationRef', 'expectedDocumentRevision', 'kind',
    ],
  }),
});

export function validateCommandShape(command) {
  const shape = COMMAND_SHAPES[command.kind];
  if (!shape) throw new TypeError(`Validation Campaign command ${command.kind} is unsupported.`);
  const required = shape.required;
  const allowed = new Set([...required, ...(shape.optional ?? [])]);
  if (required.some((field) => !Object.hasOwn(command, field))
    || Object.keys(command).some((field) => !allowed.has(field))) {
    throw new TypeError(`Validation Campaign ${command.kind} command fields are invalid.`);
  }
}

export function expectedDefinitions(document, command) {
  const setup = readDefinitionRef(command.setupDefinitionRef);
  const outcome = readDefinitionRef(command.outcomeDefinitionRef);
  if (JSON.stringify(setup) !== JSON.stringify(document.campaign.setupDefinitionRef)
    || JSON.stringify(outcome) !== JSON.stringify(document.campaign.outcomeDefinitionRef)) {
    failValidation('VALIDATION_CAMPAIGN_REVISION_STALE', 'Campaign Definition reference changed.', {
      campaignId: document.campaign.campaignId,
      operation: command.kind,
    });
  }
}

export function expectedCampaign(document, expectedRevision, operation) {
  if (document.campaign.revision !== expectedRevision) {
    failValidation(
      'VALIDATION_CAMPAIGN_REVISION_STALE',
      'Validation Campaign revision changed; reload and retry.',
      { campaignId: document.campaign.campaignId, operation },
    );
  }
}

export function exactCase(document, caseId, caseRevision) {
  const record = document.caseRevisions.find((entry) => (
    entry.caseId === caseId && entry.caseRevision === caseRevision
  ));
  if (!record) throw new TypeError(`Study Case ${caseId} revision ${caseRevision} was not found.`);
  return record;
}

function latestCaseRevision(document, caseId) {
  return document.caseRevisions
    .filter((entry) => entry.caseId === caseId)
    .sort((left, right) => right.caseRevision - left.caseRevision)[0] ?? null;
}

export function requireLatestCase(document, record, operation) {
  if (latestCaseRevision(document, record.caseId)?.caseRevision !== record.caseRevision) {
    failValidation(
      'VALIDATION_CAMPAIGN_REVISION_STALE',
      'A newer Study Case revision already exists.',
      { campaignId: document.campaign.campaignId, caseId: record.caseId, operation },
    );
  }
}

export function pathForCampaign(value, campaign) {
  const path = readPathPlan(value);
  if (path.direction !== campaign.direction) throw new TypeError('Case path direction differs from Campaign.');
  return path;
}
