import {
  caseRef,
  createAnalysisRun,
  createSourceVerification,
  createStudyCohort,
  failValidation,
  replaceCampaignDocument,
} from '../validation-study-domain/public.js';
import {
  campaignDocument,
  commitCampaignDocument,
  expectedDocument,
  providerFor,
} from './runtime-state.js';
import { exactCase } from './command-contract.js';

function casesForRefs(document, refs, { finalized = false } = {}) {
  if (!Array.isArray(refs)) throw new TypeError('Case references must be an array.');
  return refs.map((ref) => {
    const record = exactCase(document, ref.caseId, ref.caseRevision);
    if (record.contentDigest !== ref.caseContentDigest
      || (finalized && record.lifecycleState !== 'finalized')) {
      failValidation('VALIDATION_CAMPAIGN_COHORT_INVALID', 'Case reference is stale or not finalized.', {
        campaignId: document.campaign.campaignId, operation: 'freeze-cohort',
      });
    }
    return record;
  });
}

export async function freezeCohort(state, command) {
  const document = campaignDocument(state, command.campaignId);
  expectedDocument(document, command.expectedDocumentRevision, command.kind);
  const members = casesForRefs(document, command.memberCaseRefs, { finalized: true });
  const excluded = casesForRefs(document, command.excludedCaseRefs ?? []);
  const parent = command.parentCohortRef === null || command.parentCohortRef === undefined
    ? null : document.cohorts.find(({ cohortId, cohortRevision, contentDigest }) => (
      cohortId === command.parentCohortRef.cohortId
        && cohortRevision === command.parentCohortRef.cohortRevision
        && contentDigest === command.parentCohortRef.cohortContentDigest
    ));
  if (command.parentCohortRef && !parent) throw new TypeError('Parent Cohort reference is stale.');
  const cohort = await createStudyCohort({
    authorLabel: command.authorLabel,
    campaignId: command.campaignId,
    cohortId: state.idFactory(),
    crypto: state.crypto,
    excludedCases: excluded,
    manualOverrideReasons: command.manualOverrideReasons ?? [],
    memberCases: members,
    name: command.name,
    nowEpochMs: state.nowEpochMs(),
    outcomeDefinitionRef: document.campaign.outcomeDefinitionRef,
    parentCohortRef: parent === null ? null : {
      cohortContentDigest: parent.contentDigest,
      cohortId: parent.cohortId,
      cohortRevision: parent.cohortRevision,
    },
    setupDefinitionRef: document.campaign.setupDefinitionRef,
  });
  const candidate = await replaceCampaignDocument(document, {
    cohorts: [...document.cohorts, cohort],
  }, state.nowEpochMs(), state.crypto);
  await commitCampaignDocument(state, { document: candidate, previous: document });
  return Object.freeze({
    campaignId: command.campaignId,
    cohortId: cohort.cohortId,
    cohortRevision: cohort.cohortRevision,
    documentRevision: candidate.documentRevision,
    kind: command.kind,
  });
}

function sourceAvailability(state, cases) {
  return Object.freeze(cases.flatMap((record) => record.evidenceCitations.map((citation) => {
    const provider = providerFor(state, {
      evidenceRole: citation.evidenceRole,
      providerId: citation.providerIdentity.providerId,
      providerVersion: citation.providerIdentity.providerVersion,
    });
    return Object.freeze({
      caseRef: caseRef(record),
      citationId: citation.citationId,
      evidenceRole: citation.evidenceRole,
      providerId: citation.providerIdentity.providerId,
      providerVersion: citation.providerIdentity.providerVersion,
      status: provider === null ? 'unavailable' : 'available',
    });
  })));
}

export async function runAnalysis(state, command) {
  const document = campaignDocument(state, command.campaignId);
  expectedDocument(document, command.expectedDocumentRevision, command.kind);
  const cohort = document.cohorts.find(({ cohortId, cohortRevision, contentDigest }) => (
    cohortId === command.cohortRef.cohortId
      && cohortRevision === command.cohortRef.cohortRevision
      && contentDigest === command.cohortRef.cohortContentDigest
  ));
  if (!cohort) {
    failValidation('VALIDATION_CAMPAIGN_ANALYSIS_INPUT_STALE', 'Analysis Cohort reference is stale.', {
      campaignId: command.campaignId, operation: command.kind,
    });
  }
  const cases = casesForRefs(document, cohort.memberCaseRefs, { finalized: true });
  const analysis = await createAnalysisRun({
    analysisRunId: state.idFactory(),
    authorLabel: command.authorLabel,
    campaignId: command.campaignId,
    cases,
    cohort,
    crypto: state.crypto,
    nowEpochMs: state.nowEpochMs(),
    sourceAvailabilitySnapshot: sourceAvailability(state, cases),
  });
  const candidate = await replaceCampaignDocument(document, {
    analysisRuns: [...document.analysisRuns, analysis],
  }, state.nowEpochMs(), state.crypto);
  await commitCampaignDocument(state, { document: candidate, previous: document });
  return Object.freeze({
    analysisRunId: analysis.analysisRunId,
    analysisRunRevision: analysis.analysisRunRevision,
    campaignId: command.campaignId,
    documentRevision: candidate.documentRevision,
    kind: command.kind,
  });
}

async function observeVerification(provider, citation, document, signal) {
  if (provider === null) return Object.freeze({
    observedSourceReference: null,
    reasonCode: 'provider-absent',
    result: 'provider-absent',
  });
  try {
    const current = await provider.prepareCitation({
      campaign: document.campaign,
      paneId: citation.observationContext.paneId,
      setupDefinition: document.setupDefinitions[0],
      sourceRecordId: citation.sourceReference.sourceRecordId,
    }, signal);
    const match = JSON.stringify(current.sourceReference) === JSON.stringify(citation.sourceReference)
      && current.receiptDigest === citation.receiptDigest;
    return Object.freeze({
      observedSourceReference: current.sourceReference,
      reasonCode: match ? 'source-match' : 'source-mismatch',
      result: match ? 'match' : 'mismatch',
    });
  } catch (error) {
    return Object.freeze({
      observedSourceReference: null,
      reasonCode: error?.code ?? 'record-missing',
      result: 'record-missing',
    });
  }
}

export async function verifySource(state, command, signal) {
  const document = campaignDocument(state, command.campaignId);
  expectedDocument(document, command.expectedDocumentRevision, command.kind);
  const record = exactCase(document, command.caseId, command.caseRevision);
  const citation = record.evidenceCitations.find(({ citationId, citationRevision, contentDigest }) => (
    citationId === command.citationRef.citationId
      && citationRevision === command.citationRef.citationRevision
      && contentDigest === command.citationRef.citationContentDigest
  ));
  if (!citation) throw new TypeError('Evidence citation reference is stale.');
  const provider = providerFor(state, {
    evidenceRole: citation.evidenceRole,
    providerId: citation.providerIdentity.providerId,
    providerVersion: citation.providerIdentity.providerVersion,
  });
  const observed = await observeVerification(provider, citation, document, signal);
  const verification = await createSourceVerification({
    campaignId: command.campaignId,
    caseRecord: record,
    checkedAtEpochMs: state.nowEpochMs(),
    citation,
    crypto: state.crypto,
    detail: observed.result === 'match' ? 'Current source matches the frozen citation.'
      : 'Current source could not be matched to the frozen citation.',
    observedSourceReference: observed.observedSourceReference,
    providerId: citation.providerIdentity.providerId,
    providerVersion: citation.providerIdentity.providerVersion,
    reasonCode: observed.reasonCode,
    result: observed.result,
    verificationId: state.idFactory(),
  });
  const candidate = await replaceCampaignDocument(document, {
    sourceVerifications: [...document.sourceVerifications, verification],
  }, state.nowEpochMs(), state.crypto);
  await commitCampaignDocument(state, { document: candidate, previous: document });
  return Object.freeze({
    campaignId: command.campaignId,
    documentRevision: candidate.documentRevision,
    kind: command.kind,
    result: observed.result,
    verificationId: verification.verificationId,
  });
}
