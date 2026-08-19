import nodeCrypto from 'node:crypto';
import {
  calculateOutcomeObservation,
  createEvidenceCandidate,
  sha256Canonical,
} from '../../src/validation-study-domain/public.js';
import {
  createValidationCampaignPersistenceAdapter,
} from '../../src/validation-campaign-persistence/public.js';
import {
  createValidationCampaignAuditExporter,
} from '../../src/validation-campaign-audit-export/public.js';
import {
  createValidationCampaignRuntime,
} from '../../src/validation-campaign-runtime/public.js';

const crypto = nodeCrypto.webcrypto;
const digest = (character) => `sha256:${character.repeat(64)}`;

function storagePort(values) {
  return Object.freeze({
    keys: () => Object.freeze([...values.keys()].sort()),
    read: (key) => values.get(key) ?? null,
    remove: (key) => values.delete(key),
    write: (key, value) => values.set(key, value),
  });
}

function uuidFactory() {
  let sequence = 200;
  return () => {
    sequence += 1;
    return `10000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
  };
}

function providerIdentity(role) {
  const sma = role === 'context-sma';
  return Object.freeze({
    contributionId: sma ? 'moving-averages.sma-close' : 'semantic.manual-fvg',
    contributionVersion: '1.0.0',
    definitionDigest: digest(sma ? '2' : '3'),
    definitionOrSemanticTypeId: sma ? 'moving-averages.sma.close' : 'imbalance.fvg',
    definitionOrSemanticTypeVersion: '1.0.0',
    packageGeneration: 1,
    packageId: sma ? 'first-party.moving-averages' : 'first-party.fair-value-gap',
    packageVersion: '1.0.0',
    provenanceDigest: digest(sma ? '4' : '5'),
    providerId: sma ? 'validation.evidence.sma-close' : 'validation.evidence.manual-fvg',
    providerVersion: '1.0.0',
    schemaDigest: digest(sma ? '6' : '7'),
  });
}

function sourceReference(role, sourceRecordId, sessionId) {
  const sma = role === 'context-sma';
  return Object.freeze({
    ownerKind: sma ? 'calculated-series-document' : 'annotation-document',
    resultDigest: sma ? digest('8') : null,
    resultFrameId: sma ? 'frame-browser-seed' : null,
    resultFrameRevision: sma ? 1 : null,
    sourceDigest: digest(sma ? '9' : 'a'),
    sourceDocumentId: `${sma ? 'calculated-series' : 'annotation'}:${sessionId}`,
    sourceDocumentRevision: 1,
    sourceRecordId,
    sourceRecordRevision: 1,
  });
}

async function candidateFor(role, request, fixture) {
  const sma = role === 'context-sma';
  const context = Object.freeze({
    datasetId: fixture.datasetId,
    datasetRevision: fixture.datasetRevision,
    exclusiveReplayCutoffEpochMs: fixture.decisionCutoffEpochMs,
    instrumentId: request.campaign.instrumentId,
    latestEligibleBarStartEpochMs: fixture.decisionCutoffEpochMs - 60_000,
    paneId: request.paneId,
    paneRevision: 1,
    paneRole: sma ? 'context-pane' : 'execution-pane',
    sessionHoursId: request.campaign.sessionHoursId,
    sessionId: fixture.sessionId,
    sessionRevision: fixture.sessionRevision,
    timeframeId: sma ? request.campaign.contextTimeframeId
      : request.campaign.executionTimeframeId,
    workspaceDigest: digest('b'),
    workspaceRevision: 1,
  });
  const boundedClaim = sma ? Object.freeze({
    claimKind: 'sma-close-comparison',
    close: 110,
    comparison: 'close-above-sma',
    comparisonPassed: true,
    length: 20,
    readiness: 'ready',
    sma: 100,
    valueBarStartEpochMs: fixture.decisionCutoffEpochMs - 60_000,
    visible: true,
  }) : Object.freeze({
    acceptance: 'accepted',
    claimKind: 'manual-fvg-observation',
    direction: 'bullish',
    evidenceBarStartEpochMs: Object.freeze([
      fixture.decisionCutoffEpochMs - 180_000,
      fixture.decisionCutoffEpochMs - 120_000,
      fixture.decisionCutoffEpochMs - 60_000,
    ]),
    lifecycle: 'active',
    lowerPrice: 99,
    predicatePassed: true,
    upperPrice: 101,
  });
  return createEvidenceCandidate({
    boundedClaim,
    currencyFence: { sourceRecordRevision: 1 },
    evidenceRole: role,
    observationContext: context,
    predicateId: request.setupDefinition.setupDefinitionId,
    predicateVersion: request.setupDefinition.setupDefinitionVersion,
    providerIdentity: providerIdentity(role),
    sourceAvailabilityAtCapture: 'available',
    sourceReference: sourceReference(role, request.sourceRecordId, fixture.sessionId),
  }, crypto);
}

function evidenceProvider(role, fixture) {
  const identity = providerIdentity(role);
  const prepareCitation = (request) => candidateFor(role, request, fixture);
  return Object.freeze({
    evidenceRole: role,
    async getAvailability(request) {
      await prepareCitation(request);
      return Object.freeze({
        detail: null,
        evidenceRole: role,
        providerId: identity.providerId,
        providerVersion: identity.providerVersion,
        reasonCode: 'ready',
        status: 'available',
      });
    },
    prepareCitation,
    providerId: identity.providerId,
    providerVersion: identity.providerVersion,
    async verifyCitation({ candidate, request }) {
      const current = await prepareCitation(request);
      return Object.freeze({
        candidate: current,
        reasonCode: current.receiptDigest === candidate.receiptDigest
          ? 'source-match' : 'source-changed',
        result: current.receiptDigest === candidate.receiptDigest ? 'match' : 'mismatch',
      });
    },
  });
}

function observationRequest(documentValue, fixture) {
  return Object.freeze({
    campaignId: documentValue.campaign.campaignId,
    contextPaneId: fixture.contextPaneId,
    executionPaneId: fixture.executionPaneId,
    expectedDocumentRevision: documentValue.documentRevision,
    fvgArtifactId: 'artifact-browser-seed',
    outcomeDefinitionRef: documentValue.campaign.outcomeDefinitionRef,
    setupDefinitionRef: documentValue.campaign.setupDefinitionRef,
    smaInstanceId: 'instance-browser-seed',
  });
}

function commitCommand(documentValue, preview, pathPlan) {
  return Object.freeze({
    authorLabel: 'H121 browser reviewer',
    campaignId: documentValue.campaign.campaignId,
    confidence: 80,
    explicitConfirmation: true,
    expectedDocumentRevision: documentValue.documentRevision,
    kind: 'commit-case-observation',
    notes: 'Frozen browser-Harness decision evidence.',
    outcomeDefinitionRef: documentValue.campaign.outcomeDefinitionRef,
    pathPlan,
    previewToken: preview.previewToken,
    qualificationClass: 'qualified',
    setupDefinitionRef: documentValue.campaign.setupDefinitionRef,
  });
}

async function fakeOutcome(request) {
  return calculateOutcomeObservation({
    bars: Object.freeze([Object.freeze({
      close: 105, high: 106, low: 99, open: 100,
      startEpochMs: request.decisionCutoffEpochMs,
    })]),
    coverageProof: 'complete-window',
    crypto,
    datasetIdentity: {
      datasetId: request.datasetId,
      datasetRevision: request.datasetRevision,
    },
    decisionCutoffEpochMs: request.decisionCutoffEpochMs,
    outcomeCutoffEpochMs: request.requestedOutcomeCutoffEpochMs,
    pathPlan: request.pathPlan,
    recordedAtEpochMs: request.recordedAtEpochMs,
  });
}

/** Build deterministic localStorage bytes for production-route UI completion evidence. */
export async function buildValidationCampaignBrowserSeed(input) {
  const datasetDigest = await sha256Canonical({
    datasetRevision: input.datasetRevision,
    providerId: input.datasetProviderId ?? 'provider.local-market-data',
  }, crypto);
  const fixture = Object.freeze({
    ...input,
    datasetId: `dataset-${datasetDigest.slice(7, 23)}`,
  });
  const values = new Map();
  let nowEpochMs = input.outcomeCutoffEpochMs + 1_000;
  const runtime = await createValidationCampaignRuntime({
    auditExporter: createValidationCampaignAuditExporter({ crypto }),
    crypto,
    evidenceProviders: [
      evidenceProvider('context-sma', fixture),
      evidenceProvider('execution-fvg', fixture),
    ],
    idFactory: uuidFactory(),
    nowEpochMs: () => nowEpochMs++,
    outcomeAdapter: Object.freeze({ observeOutcome: fakeOutcome }),
    persistence: createValidationCampaignPersistenceAdapter({ storage: storagePort(values) }),
  });
  const created = await runtime.execute({
    authorLabel: 'H121 browser reviewer',
    contextTimeframeId: input.contextTimeframeId,
    direction: 'long',
    executionTimeframeId: input.executionTimeframeId,
    expectedIndexRevision: 0,
    instrumentId: 'instrument.cme.nq',
    kind: 'create-campaign',
    sessionHoursId: 'session-hours.cme-eth',
    title: 'H121 FVG + SMA Campaign',
  });
  const campaignId = created.campaignId;
  let documentValue = runtime.getCampaign(campaignId);
  let preview = await runtime.prepareCaseObservation(observationRequest(documentValue, fixture));
  const finalizedCommit = await runtime.execute(commitCommand(documentValue, preview, {
    direction: 'long', horizonBars: 1, invalidationPrice: 95,
    referencePrice: 100, targetPrice: 105,
  }));
  documentValue = runtime.getCampaign(campaignId);
  const outcome = await runtime.execute({
    campaignId,
    caseId: finalizedCommit.caseId,
    caseRevision: finalizedCommit.caseRevision,
    expectedDocumentRevision: documentValue.documentRevision,
    kind: 'record-case-outcome',
    outcomeCutoffEpochMs: input.outcomeCutoffEpochMs,
  });
  documentValue = runtime.getCampaign(campaignId);
  await runtime.execute({
    campaignId,
    caseId: finalizedCommit.caseId,
    caseRevision: outcome.caseRevision,
    expectedDocumentRevision: documentValue.documentRevision,
    kind: 'finalize-case',
  });
  documentValue = runtime.getCampaign(campaignId);
  const finalized = runtime.readCase(campaignId, finalizedCommit.caseId);
  preview = await runtime.prepareCaseObservation(observationRequest(documentValue, fixture));
  const pendingCommit = await runtime.execute(commitCommand(documentValue, preview, {
    direction: 'long', horizonBars: 1, invalidationPrice: 1,
    referencePrice: 25_000, targetPrice: 1_000_000,
  }));
  documentValue = runtime.getCampaign(campaignId);
  await runtime.execute({
    campaignId,
    caseId: finalized.caseId,
    caseRevision: finalized.caseRevision,
    citationRef: {
      citationContentDigest: finalized.evidenceCitations[0].contentDigest,
      citationId: finalized.evidenceCitations[0].citationId,
      citationRevision: finalized.evidenceCitations[0].citationRevision,
    },
    expectedDocumentRevision: documentValue.documentRevision,
    kind: 'verify-source',
  });
  documentValue = runtime.getCampaign(campaignId);
  const frozen = await runtime.execute({
    authorLabel: 'H121 browser reviewer',
    campaignId,
    excludedCaseRefs: [],
    expectedDocumentRevision: documentValue.documentRevision,
    kind: 'freeze-cohort',
    manualOverrideReasons: [],
    memberCaseRefs: [{
      caseContentDigest: finalized.contentDigest,
      caseId: finalized.caseId,
      caseRevision: finalized.caseRevision,
    }],
    name: 'Seeded exact Cohort',
    parentCohortRef: null,
  });
  documentValue = runtime.getCampaign(campaignId);
  const cohort = documentValue.cohorts.find(({ cohortId }) => cohortId === frozen.cohortId);
  await runtime.execute({
    authorLabel: 'H121 browser reviewer',
    campaignId,
    cohortRef: {
      cohortContentDigest: cohort.contentDigest,
      cohortId: cohort.cohortId,
      cohortRevision: cohort.cohortRevision,
    },
    expectedDocumentRevision: documentValue.documentRevision,
    kind: 'run-analysis',
  });
  runtime.dispose();
  return Object.freeze({
    campaignId,
    entries: Object.freeze([...values.entries()]),
    pendingCaseId: pendingCommit.caseId,
  });
}
