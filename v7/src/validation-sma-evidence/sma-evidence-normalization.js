import {
  createEvidenceCandidate,
  sha256Canonical,
} from '../validation-study-domain/public.js';

async function evidenceDigests({ frame, identity, instance, pane, point, session }, crypto) {
  const cutoff = frame.identity.replayVisibleThroughEpochMs;
  const workspaceRevision = frame.identity.workspaceStateRevision;
  return Object.freeze({
    datasetDigest: await sha256Canonical({
      datasetRevision: pane.datasetRevision, providerId: pane.providerId,
    }, crypto),
    provenanceDigest: await sha256Canonical(frame.provenance, crypto),
    resultDigest: await sha256Canonical({
      frameIdentity: frame.identity,
      point,
      projectionRevision: frame.projectionRevision,
      provenance: frame.provenance,
      state: frame.state,
    }, crypto),
    schemaDigest: await sha256Canonical({
      claimKind: 'sma-close-comparison', source: 'close', version: 1,
    }, crypto),
    sourceDigest: await sha256Canonical({
      definitionRef: identity,
      effectiveSettings: instance.effectiveSettings,
      instanceId: instance.id,
      instanceRevision: instance.revision,
      visibility: instance.visibility,
    }, crypto),
    workspaceDigest: await sha256Canonical({
      exclusiveReplayCutoffEpochMs: cutoff,
      sessionId: session.id,
      sessionRevision: session.revision,
      workspaceRevision,
    }, crypto),
  });
}

function requireEligibleSource({ frame, identity, instance, packageState, pane, point, predicate, request }) {
  const cutoff = frame.identity.replayVisibleThroughEpochMs;
  const eligible = instance.id === request.sourceRecordId
    && identity.definitionId === predicate.definitionId
    && identity.definitionVersion === predicate.definitionVersion
    && instance.effectiveSettings.length === predicate.length
    && instance.visibility === 'visible'
    && frame.state === 'ready'
    && point !== null && pane.close !== null
    && point.displayEpochMs < cutoff
    && pane.latestEligibleBarStartEpochMs < cutoff
    && packageState.runtimeState === 'active'
    && pane.instrumentId === request.campaign.instrumentId
    && pane.workspacePaneId === request.paneId
    && pane.displayTimeframeId === request.campaign.contextTimeframeId
    && pane.sessionHoursPolicyId === request.campaign.sessionHoursId;
  if (!eligible) throw new TypeError('SMA evidence source is unavailable or ineligible.');
}

function candidateInput({ digests, evidenceRole, observation, providerId, providerVersion, request }) {
  const { document, frame, instance, package: packageState, pane, point, session } = observation;
  const predicate = request.setupDefinition.smaPredicate;
  const identity = instance.definitionRef;
  const cutoff = frame.identity.replayVisibleThroughEpochMs;
  const workspaceRevision = frame.identity.workspaceStateRevision;
  const comparison = request.campaign.direction === 'long'
    ? predicate.longComparison : predicate.shortComparison;
  requireEligibleSource({
    frame, identity, instance, packageState, pane, point, predicate, request,
  });
  const comparisonPassed = comparison === 'close-above-sma'
    ? pane.close > point.value : pane.close < point.value;
  return {
    boundedClaim: {
      claimKind: 'sma-close-comparison',
      close: pane.close,
      comparison,
      comparisonPassed,
      length: instance.effectiveSettings.length,
      readiness: frame.state,
      sma: point?.value,
      valueBarStartEpochMs: pane.latestEligibleBarStartEpochMs,
      visible: instance.visibility === 'visible',
    },
    currencyFence: {
      documentRevision: document.revision,
      exclusiveReplayCutoffEpochMs: cutoff,
      instanceRevision: instance.revision,
      packageGeneration: packageState.generation,
      resultDigest: digests.resultDigest,
      workspaceRevision,
    },
    evidenceRole,
    observationContext: {
      datasetId: `dataset-${digests.datasetDigest.slice(7, 23)}`,
      datasetRevision: pane.datasetRevision,
      exclusiveReplayCutoffEpochMs: cutoff,
      instrumentId: pane.instrumentId,
      latestEligibleBarStartEpochMs: pane.latestEligibleBarStartEpochMs,
      paneId: pane.workspacePaneId,
      paneRevision: pane.paneRevision,
      paneRole: 'context-pane',
      sessionHoursId: pane.sessionHoursPolicyId,
      sessionId: session.id,
      sessionRevision: session.revision,
      timeframeId: pane.displayTimeframeId,
      workspaceDigest: digests.workspaceDigest,
      workspaceRevision,
    },
    predicateId: request.setupDefinition.setupDefinitionId,
    predicateVersion: request.setupDefinition.setupDefinitionVersion,
    providerIdentity: {
      contributionId: identity.contributionId,
      contributionVersion: identity.contributionVersion,
      definitionDigest: frame.provenance.definitionDigest,
      definitionOrSemanticTypeId: identity.definitionId,
      definitionOrSemanticTypeVersion: identity.definitionVersion,
      packageGeneration: packageState.generation,
      packageId: identity.packageId,
      packageVersion: identity.packageVersion,
      provenanceDigest: digests.provenanceDigest,
      providerId,
      providerVersion,
      schemaDigest: digests.schemaDigest,
    },
    sourceAvailabilityAtCapture: 'available',
    sourceReference: {
      ownerKind: 'calculated-series-document',
      resultDigest: digests.resultDigest,
      resultFrameId: `frame-${frame.identity.inputDigest.slice(7, 23)}`,
      resultFrameRevision: frame.projectionRevision,
      sourceDigest: digests.sourceDigest,
      sourceDocumentId: document.id,
      sourceDocumentRevision: document.revision,
      sourceRecordId: instance.id,
      sourceRecordRevision: instance.revision,
    },
  };
}

export async function normalizeSmaEvidenceObservation(options) {
  const { frame, instance, pane, point, session } = options.observation;
  const digests = await evidenceDigests({
    frame, identity: instance.definitionRef, instance, pane, point, session,
  }, options.crypto);
  return createEvidenceCandidate(candidateInput({ ...options, digests }), options.crypto);
}
