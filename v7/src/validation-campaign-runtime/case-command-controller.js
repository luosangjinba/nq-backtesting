import {
  createEvidenceCitation,
  createStudyCase,
  failValidation,
  observationContextFromCitations,
  replaceCampaignDocument,
  requireBoundedText,
  supersedeStudyCase,
} from '../validation-study-domain/public.js';
import {
  campaignDocument,
  commitCampaignDocument,
  expectedDocument,
} from './runtime-state.js';
import {
  exactCase,
  expectedDefinitions,
  pathForCampaign,
  requireLatestCase,
} from './command-contract.js';
import {
  consumePreview,
  requirePreview,
  verifyPreviewCurrency,
} from './observation-controller.js';

async function persistCase(state, document, record) {
  const candidate = await replaceCampaignDocument(document, {
    caseRevisions: [...document.caseRevisions, record],
  }, state.nowEpochMs(), state.crypto);
  await commitCampaignDocument(state, { document: candidate, previous: document });
  return Object.freeze({
    campaignId: document.campaign.campaignId,
    caseId: record.caseId,
    caseRevision: record.caseRevision,
    documentRevision: candidate.documentRevision,
    kind: 'case-accepted',
  });
}

async function citationRecords(state, preview) {
  const candidates = preview.results.map(({ candidate }) => candidate).filter(Boolean);
  const nowEpochMs = state.nowEpochMs();
  const citations = [];
  for (const candidate of candidates) {
    citations.push(await createEvidenceCitation({
      candidate,
      citationId: state.idFactory(),
      crypto: state.crypto,
      nowEpochMs,
    }));
  }
  return Object.freeze(citations.sort((left, right) => (
    left.evidenceRole.localeCompare(right.evidenceRole)
  )));
}

export async function commitObservation(state, command, incomplete) {
  const document = campaignDocument(state, command.campaignId);
  expectedDocument(document, command.expectedDocumentRevision, command.kind);
  expectedDefinitions(document, command);
  const preview = requirePreview(state, command.previewToken, command.campaignId, command.kind);
  await verifyPreviewCurrency(state, preview, command.kind);
  const citations = await citationRecords(state, preview);
  const predicateResults = preview.results.map(({ predicateResult }) => predicateResult);
  const qualificationClass = incomplete ? 'incomplete' : command.qualificationClass;
  if (!incomplete && !['qualified', 'rejected', 'ambiguous'].includes(qualificationClass)) {
    failValidation('VALIDATION_CAMPAIGN_QUALIFICATION_INVALID', 'Observation classification is invalid.', {
      campaignId: command.campaignId, operation: command.kind,
    });
  }
  if (!incomplete && citations.length !== 2) {
    failValidation('VALIDATION_CAMPAIGN_SOURCE_UNAVAILABLE', 'Complete observation requires two evidence receipts.', {
      campaignId: command.campaignId, operation: command.kind,
    });
  }
  if (qualificationClass === 'qualified'
    && (command.explicitConfirmation !== true
      || predicateResults.some(({ passed }) => passed !== true))) {
    failValidation('VALIDATION_CAMPAIGN_QUALIFICATION_INVALID', 'Qualified Case requires both predicates and confirmation.', {
      campaignId: command.campaignId, operation: command.kind,
    });
  }
  const nextRevision = document.documentRevision + 1;
  const nowEpochMs = state.nowEpochMs();
  const observationContext = citations.length === 2
    ? observationContextFromCitations(citations) : null;
  const classificationReason = incomplete ? requireBoundedText(
    command.classificationReason,
    'Incomplete classification reason',
    { bytes: 512 },
  ) : null;
  const notes = classificationReason === null ? command.notes
    : `${classificationReason}${command.notes.length > 0 ? `\n${command.notes}` : ''}`;
  const record = await createStudyCase({
    acceptedDocumentRevision: nextRevision,
    authorLabel: command.authorLabel,
    campaignId: command.campaignId,
    caseId: state.idFactory(),
    confidence: command.confidence,
    crypto: state.crypto,
    evidenceCitations: citations,
    lifecycleState: incomplete ? 'draft' : 'observation-recorded',
    notes,
    nowEpochMs,
    observationContext,
    outcomeDefinitionRef: document.campaign.outcomeDefinitionRef,
    pathPlan: pathForCampaign(command.pathPlan, document.campaign),
    predicateResults,
    qualificationClass,
    setupDefinitionRef: document.campaign.setupDefinitionRef,
  });
  const result = await persistCase(state, document, record);
  consumePreview(state, command.previewToken);
  return Object.freeze({ ...result, kind: command.kind });
}

export async function recordOutcome(state, command, signal) {
  const document = campaignDocument(state, command.campaignId);
  expectedDocument(document, command.expectedDocumentRevision, command.kind);
  const previous = exactCase(document, command.caseId, command.caseRevision);
  requireLatestCase(document, previous, command.kind);
  if (previous.lifecycleState !== 'observation-recorded') {
    failValidation('VALIDATION_CAMPAIGN_CASE_STATE_INVALID', 'Only an observed Case can record Outcome.', {
      campaignId: command.campaignId, caseId: command.caseId, operation: command.kind,
    });
  }
  const executionPane = previous.observationContext.paneAssignments
    .find(({ paneRole }) => paneRole === 'execution-pane');
  const nowEpochMs = state.nowEpochMs();
  const outcomeObservation = await state.outcomeAdapter.observeOutcome({
    decisionCutoffEpochMs: previous.observationContext.exclusiveReplayCutoffEpochMs,
    executionPaneId: executionPane.paneId,
    executionTimeframeId: executionPane.timeframeId,
    instrumentId: previous.observationContext.instrumentId,
    pathPlan: previous.pathPlan,
    recordedAtEpochMs: nowEpochMs,
    requestedOutcomeCutoffEpochMs: command.outcomeCutoffEpochMs,
    sessionHoursId: previous.observationContext.sessionHoursId,
  }, signal);
  const record = await supersedeStudyCase(previous, {
    finalizedAtEpochMs: null,
    lifecycleState: 'outcome-recorded',
    outcomeObservation,
  }, {
    acceptedDocumentRevision: document.documentRevision + 1,
    crypto: state.crypto,
    nowEpochMs,
  });
  const result = await persistCase(state, document, record);
  return Object.freeze({ ...result, kind: command.kind, outcomeClass: outcomeObservation.outcomeClass });
}

export async function finalizeCase(state, command) {
  const document = campaignDocument(state, command.campaignId);
  expectedDocument(document, command.expectedDocumentRevision, command.kind);
  const previous = exactCase(document, command.caseId, command.caseRevision);
  requireLatestCase(document, previous, command.kind);
  if (previous.lifecycleState === 'finalized') {
    failValidation('VALIDATION_CAMPAIGN_CASE_FINALIZED', 'Study Case is already finalized.', {
      campaignId: command.campaignId, caseId: command.caseId, operation: command.kind,
    });
  }
  if (previous.lifecycleState !== 'outcome-recorded') {
    failValidation('VALIDATION_CAMPAIGN_CASE_STATE_INVALID', 'Only an Outcome-recorded Case can finalize.', {
      campaignId: command.campaignId, caseId: command.caseId, operation: command.kind,
    });
  }
  const nowEpochMs = state.nowEpochMs();
  const record = await supersedeStudyCase(previous, {
    finalizedAtEpochMs: nowEpochMs,
    lifecycleState: 'finalized',
  }, {
    acceptedDocumentRevision: document.documentRevision + 1,
    crypto: state.crypto,
    nowEpochMs,
  });
  const result = await persistCase(state, document, record);
  return Object.freeze({ ...result, kind: command.kind });
}

export async function supersedeCase(state, command) {
  const document = campaignDocument(state, command.campaignId);
  expectedDocument(document, command.expectedDocumentRevision, command.kind);
  const previous = exactCase(document, command.caseId, command.caseRevision);
  requireLatestCase(document, previous, command.kind);
  requireBoundedText(command.reason, 'Superseding reason', { bytes: 512 });
  if (command.setupDefinitionRef || command.outcomeDefinitionRef) expectedDefinitions(document, {
    ...command,
    outcomeDefinitionRef: command.outcomeDefinitionRef ?? previous.outcomeDefinitionRef,
    setupDefinitionRef: command.setupDefinitionRef ?? previous.setupDefinitionRef,
  });
  const qualificationClass = command.qualificationClass ?? previous.qualificationClass;
  let evidenceCitations = previous.evidenceCitations;
  let observationContext = previous.observationContext;
  let predicateResults = previous.predicateResults;
  let preview = null;
  if (command.previewToken !== undefined) {
    preview = requirePreview(state, command.previewToken, command.campaignId, command.kind);
    await verifyPreviewCurrency(state, preview, command.kind);
    evidenceCitations = await citationRecords(state, preview);
    predicateResults = preview.results.map(({ predicateResult }) => predicateResult);
    observationContext = evidenceCitations.length === 2
      ? observationContextFromCitations(evidenceCitations) : null;
  }
  const complete = qualificationClass !== 'incomplete';
  if (complete && evidenceCitations.length !== 2) {
    failValidation('VALIDATION_CAMPAIGN_SOURCE_UNAVAILABLE', 'Complete replacement requires two evidence receipts.', {
      campaignId: command.campaignId, caseId: command.caseId, operation: command.kind,
    });
  }
  if (qualificationClass === 'qualified'
    && (predicateResults.some(({ passed }) => passed !== true)
      || (preview !== null && command.explicitConfirmation !== true))) {
    failValidation('VALIDATION_CAMPAIGN_QUALIFICATION_INVALID', 'Qualified replacement requires passing evidence and confirmation.', {
      campaignId: command.campaignId, caseId: command.caseId, operation: command.kind,
    });
  }
  const lifecycleState = complete ? 'observation-recorded' : 'draft';
  const nowEpochMs = state.nowEpochMs();
  const correctedNotes = command.notes ?? previous.notes;
  const reasonPrefix = `Superseding reason: ${command.reason}`;
  const record = await supersedeStudyCase(previous, {
    confidence: command.confidence ?? previous.confidence,
    evidenceCitations,
    finalizedAtEpochMs: null,
    lifecycleState,
    notes: `${reasonPrefix}${correctedNotes.length > 0 ? `\n${correctedNotes}` : ''}`,
    observationContext,
    outcomeObservation: null,
    pathPlan: pathForCampaign(command.pathPlan ?? previous.pathPlan, document.campaign),
    predicateResults,
    qualificationClass,
  }, {
    acceptedDocumentRevision: document.documentRevision + 1,
    crypto: state.crypto,
    nowEpochMs,
  });
  const result = await persistCase(state, document, record);
  if (preview !== null) consumePreview(state, command.previewToken);
  return Object.freeze({ ...result, kind: command.kind });
}
