function fail() {
  throw new TypeError('Evidence does not close to the Campaign Setup Definition.');
}

function commonClosure(evidence, campaign, setupDefinition, expected) {
  const context = evidence.observationContext;
  const identity = evidence.providerIdentity;
  if (evidence.evidenceRole !== expected.evidenceRole
    || evidence.predicateId !== setupDefinition.setupDefinitionId
    || evidence.predicateVersion !== setupDefinition.setupDefinitionVersion
    || identity.providerId !== expected.predicate.providerId
    || identity.providerVersion !== expected.predicate.providerVersion
    || identity.definitionOrSemanticTypeId !== expected.definitionId
    || identity.definitionOrSemanticTypeVersion !== expected.definitionVersion
    || evidence.boundedClaim.claimKind !== expected.claimKind
    || evidence.sourceReference.ownerKind !== expected.ownerKind
    || evidence.sourceAvailabilityAtCapture !== 'available'
    || context.paneRole !== expected.paneRole
    || context.instrumentId !== campaign.instrumentId
    || context.timeframeId !== expected.timeframeId
    || context.sessionHoursId !== campaign.sessionHoursId
    || context.latestEligibleBarStartEpochMs >= context.exclusiveReplayCutoffEpochMs) fail();
}

function smaClosure(evidence, campaign, setupDefinition) {
  const predicate = setupDefinition.smaPredicate;
  const claim = evidence.boundedClaim;
  const comparison = campaign.direction === 'long'
    ? predicate.longComparison : predicate.shortComparison;
  commonClosure(evidence, campaign, setupDefinition, {
    claimKind: 'sma-close-comparison',
    definitionId: predicate.definitionId,
    definitionVersion: predicate.definitionVersion,
    evidenceRole: 'context-sma',
    ownerKind: 'calculated-series-document',
    paneRole: setupDefinition.contextRole,
    predicate,
    timeframeId: campaign.contextTimeframeId,
  });
  const expectedPassed = comparison === 'close-above-sma'
    ? claim.close > claim.sma : claim.close < claim.sma;
  if (claim.comparison !== comparison
    || claim.length !== predicate.length
    || claim.readiness !== 'ready'
    || claim.visible !== true
    || claim.valueBarStartEpochMs >= evidence.observationContext.exclusiveReplayCutoffEpochMs
    || claim.comparisonPassed !== expectedPassed) fail();
}

function fvgClosure(evidence, campaign, setupDefinition) {
  const predicate = setupDefinition.fvgPredicate;
  const claim = evidence.boundedClaim;
  const direction = campaign.direction === 'long'
    ? predicate.longDirection : predicate.shortDirection;
  commonClosure(evidence, campaign, setupDefinition, {
    claimKind: 'manual-fvg-observation',
    definitionId: predicate.semanticTypeId,
    definitionVersion: predicate.semanticTypeVersion,
    evidenceRole: 'execution-fvg',
    ownerKind: 'annotation-document',
    paneRole: setupDefinition.executionRole,
    predicate,
    timeframeId: campaign.executionTimeframeId,
  });
  if (claim.acceptance !== 'accepted'
    || claim.lifecycle !== 'active'
    || claim.evidenceBarStartEpochMs.some((start) => (
      start >= evidence.observationContext.exclusiveReplayCutoffEpochMs
    ))
    || claim.predicatePassed !== (claim.direction === direction)) fail();
}

/** Assert one Candidate/Citation against the exact frozen Campaign and Setup semantics. */
export function assertEvidenceCampaignClosure(evidence, campaign, setupDefinition) {
  if (evidence?.evidenceRole === 'context-sma') smaClosure(evidence, campaign, setupDefinition);
  else if (evidence?.evidenceRole === 'execution-fvg') {
    fvgClosure(evidence, campaign, setupDefinition);
  } else fail();
  return evidence;
}
