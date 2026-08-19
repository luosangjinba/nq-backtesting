import {
  createEvidenceCandidate,
  sha256Canonical,
} from '../validation-study-domain/public.js';

async function evidenceDigests({ artifact, pane, predicate, replay, session, workspace }, crypto) {
  return Object.freeze({
    datasetDigest: await sha256Canonical({
      datasetRevision: pane.datasetRevision,
      providerId: pane.providerId,
    }, crypto),
    definitionDigest: await sha256Canonical(artifact.definition, crypto),
    provenanceDigest: await sha256Canonical(artifact.provenance, crypto),
    schemaDigest: await sha256Canonical({
      claimKind: 'manual-fvg-observation',
      semanticTypeId: predicate.semanticTypeId,
      semanticTypeVersion: predicate.semanticTypeVersion,
    }, crypto),
    sourceDigest: await sha256Canonical({
      artifactId: artifact.id,
      definition: artifact.definition,
      direction: artifact.direction,
      evidenceBarStartEpochMs: artifact.evidenceBarStartEpochMs,
      lowerPrice: artifact.lowerPrice,
      revision: artifact.revision,
      status: artifact.status,
      upperPrice: artifact.upperPrice,
    }, crypto),
    workspaceDigest: await sha256Canonical({
      exclusiveReplayCutoffEpochMs: replay.exclusiveCutoffEpochMs,
      sessionId: session.id,
      sessionRevision: session.revision,
      workspaceRevision: workspace.revision,
    }, crypto),
  });
}

function isEligible({ artifact, packageState, pane, predicate, replay, request }) {
  const expectedDirection = request.campaign.direction === 'long'
    ? predicate.longDirection : predicate.shortDirection;
  return artifact.id === request.sourceRecordId
    && artifact.typeId === predicate.semanticTypeId
    && artifact.typeVersion === predicate.semanticTypeVersion
    && artifact.status === 'active'
    && artifact.acceptance === 'accepted'
    && packageState.state === 'active'
    && artifact.direction === expectedDirection
    && artifact.evidenceBarStartEpochMs.length === 3
    && artifact.evidenceBarStartEpochMs.every((start) => start < replay.exclusiveCutoffEpochMs)
    && pane.instrumentId === request.campaign.instrumentId
    && pane.displayTimeframeId === request.campaign.executionTimeframeId
    && pane.sessionHoursPolicyId === request.campaign.sessionHoursId;
}

function candidateInput({ digests, evidenceRole, observation, providerId, providerVersion, request }) {
  const { artifact, document, package: packageState, pane, replay, session, workspace } = observation;
  const predicate = request.setupDefinition.fvgPredicate;
  const eligible = isEligible({ artifact, packageState, pane, predicate, replay, request });
  return {
    boundedClaim: {
      acceptance: artifact.acceptance,
      claimKind: 'manual-fvg-observation',
      direction: artifact.direction,
      evidenceBarStartEpochMs: artifact.evidenceBarStartEpochMs,
      lifecycle: artifact.status,
      lowerPrice: artifact.lowerPrice,
      predicatePassed: eligible,
      upperPrice: artifact.upperPrice,
    },
    currencyFence: {
      artifactRevision: artifact.revision,
      documentRevision: document.revision,
      exclusiveReplayCutoffEpochMs: replay.exclusiveCutoffEpochMs,
      packageGeneration: packageState.generation,
      sourceDigest: digests.sourceDigest,
      workspaceRevision: workspace.revision,
    },
    evidenceRole,
    observationContext: {
      datasetId: `dataset-${digests.datasetDigest.slice(7, 23)}`,
      datasetRevision: pane.datasetRevision,
      exclusiveReplayCutoffEpochMs: replay.exclusiveCutoffEpochMs,
      instrumentId: pane.instrumentId,
      latestEligibleBarStartEpochMs: pane.latestEligibleBarStartEpochMs,
      paneId: pane.paneId,
      paneRevision: pane.paneRevision,
      paneRole: 'execution-pane',
      sessionHoursId: pane.sessionHoursPolicyId,
      sessionId: session.id,
      sessionRevision: session.revision,
      timeframeId: pane.displayTimeframeId,
      workspaceDigest: digests.workspaceDigest,
      workspaceRevision: workspace.revision,
    },
    predicateId: request.setupDefinition.setupDefinitionId,
    predicateVersion: request.setupDefinition.setupDefinitionVersion,
    providerIdentity: {
      contributionId: null,
      contributionVersion: null,
      definitionDigest: digests.definitionDigest,
      definitionOrSemanticTypeId: artifact.typeId,
      definitionOrSemanticTypeVersion: artifact.typeVersion,
      packageGeneration: packageState.generation,
      packageId: packageState.packageId,
      packageVersion: packageState.packageVersion,
      provenanceDigest: digests.provenanceDigest,
      providerId,
      providerVersion,
      schemaDigest: digests.schemaDigest,
    },
    sourceAvailabilityAtCapture: 'available',
    sourceReference: {
      ownerKind: 'annotation-document',
      resultDigest: null,
      resultFrameId: null,
      resultFrameRevision: null,
      sourceDigest: digests.sourceDigest,
      sourceDocumentId: document.id,
      sourceDocumentRevision: document.revision,
      sourceRecordId: artifact.id,
      sourceRecordRevision: artifact.revision,
    },
  };
}

export async function normalizeFvgEvidenceObservation(options) {
  const { artifact, pane, replay, session, workspace } = options.observation;
  const predicate = options.request.setupDefinition.fvgPredicate;
  const digests = await evidenceDigests({
    artifact, pane, predicate, replay, session, workspace,
  }, options.crypto);
  return createEvidenceCandidate(candidateInput({ ...options, digests }), options.crypto);
}
