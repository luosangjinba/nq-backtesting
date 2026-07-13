const DEFAULT_CANDIDATES = Object.freeze([
  'narrow-replay-materialization-runtime-handoff-readiness-audit',
  'narrow-replay-materialization-runtime-handoff',
  'more-diagnostics-readout-pack-wiring',
]);

const DEFAULT_ACCEPTANCE_GATES = Object.freeze([
  'step337-replay-coordination-browser-covered',
  'step352-producer-flow-readout-browser-covered',
  'step354-combination-pack-covered',
  'default-eight-member-target-history-pack-preserved',
  'optional-pack-members-preserved',
  'source-1m-replay-cursor-authority-preserved',
  'target-bars-display-input-only',
  'no-direct-update-snapshot-in-producer-flow-browser',
  'shell-consumption-command-event-only',
  'producer-runtimes-unchanged',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
  'no-runtime-behavior-change-in-selection-step',
]);

function normalizeCandidateSet(candidates = DEFAULT_CANDIDATES) {
  return new Set(candidates.map((candidate) => String(candidate || '').trim()).filter(Boolean));
}

function normalizeEvidence(evidence = {}) {
  return {
    combinationPackCovered: Boolean(evidence.combinationPackCovered),
    defaultPackPreserved: Boolean(evidence.defaultPackPreserved),
    noDirectUpdateSnapshot: Boolean(evidence.noDirectUpdateSnapshot),
    optionalMembersPreserved: Boolean(evidence.optionalMembersPreserved),
    producerFlowReadoutCovered: Boolean(evidence.producerFlowReadoutCovered),
    replayCoordinationPackCovered: Boolean(evidence.replayCoordinationPackCovered),
    shellConsumptionCommandEventOnly: Boolean(evidence.shellConsumptionCommandEventOnly),
    sourceReplayCursorAuthority: Boolean(evidence.sourceReplayCursorAuthority),
    targetBarsDisplayInputOnly: Boolean(evidence.targetBarsDisplayInputOnly),
  };
}

export function auditTargetMaterializationDiagnosticsReadoutChain({
  chartHistoryFastPathUnchanged = true,
  evidence = {},
  producerRuntimesUnchanged = true,
  targetHistoryRequestSizingUnchanged = true,
} = {}) {
  const normalizedEvidence = normalizeEvidence(evidence);
  const checks = {
    chartHistoryFastPathUnchanged: Boolean(chartHistoryFastPathUnchanged),
    combinationPackCovered: normalizedEvidence.combinationPackCovered,
    defaultPackPreserved: normalizedEvidence.defaultPackPreserved,
    noDirectUpdateSnapshot: normalizedEvidence.noDirectUpdateSnapshot,
    optionalMembersPreserved: normalizedEvidence.optionalMembersPreserved,
    producerFlowReadoutCovered: normalizedEvidence.producerFlowReadoutCovered,
    producerRuntimesUnchanged: Boolean(producerRuntimesUnchanged),
    replayCoordinationPackCovered: normalizedEvidence.replayCoordinationPackCovered,
    shellConsumptionCommandEventOnly: normalizedEvidence.shellConsumptionCommandEventOnly,
    sourceReplayCursorAuthority: normalizedEvidence.sourceReplayCursorAuthority,
    targetBarsDisplayInputOnly: normalizedEvidence.targetBarsDisplayInputOnly,
    targetHistoryRequestSizingUnchanged: Boolean(targetHistoryRequestSizingUnchanged),
  };
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  return Object.freeze({
    checks: Object.freeze(checks),
    failed: Object.freeze(failed),
    ready: failed.length === 0,
  });
}

export function selectTargetMaterializationDiagnosticsReadoutChainNextSlice({
  candidates = DEFAULT_CANDIDATES,
  chartHistoryFastPathUnchanged = true,
  evidence = {},
  producerRuntimesUnchanged = true,
  targetHistoryRequestSizingUnchanged = true,
} = {}) {
  const available = normalizeCandidateSet(candidates);
  const readiness = auditTargetMaterializationDiagnosticsReadoutChain({
    chartHistoryFastPathUnchanged,
    evidence,
    producerRuntimesUnchanged,
    targetHistoryRequestSizingUnchanged,
  });

  if (!readiness.ready) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_ACCEPTANCE_GATES],
      affectedRuntimes: Object.freeze([]),
      forbiddenActions: Object.freeze([
        'change-replay-cursor-movement',
        'change-no-bar-gap-skipping',
        'change-target-history-request-sizing',
        'change-chart-history-fast-path',
        'start-runtime-handoff-before-observability-chain-closeout',
      ]),
      ownerBoundary: 'target-materialization-diagnostics-readout-chain-selection',
      readiness,
      reason: 'target-materialization-diagnostics-readout-chain-readiness-incomplete',
      rollbackCriteria: Object.freeze(['diagnostics-readout-chain-readiness-fails']),
      selectedSlice: null,
      status: 'blocked',
    });
  }

  if (available.has('narrow-replay-materialization-runtime-handoff-readiness-audit')) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_ACCEPTANCE_GATES],
      affectedRuntimes: Object.freeze([]),
      forbiddenActions: Object.freeze([
        'change-replay-cursor-movement',
        'change-no-bar-gap-skipping',
        'route-target-bars-through-replay-runtime',
        'change-target-history-request-sizing',
        'change-chart-history-fast-path',
      ]),
      ownerBoundary: 'target-materialization-runtime-handoff-readiness',
      readiness,
      reason: 'diagnostics-readout-chain-packaged-select-runtime-handoff-readiness-audit',
      rollbackCriteria: Object.freeze([
        'runtime-handoff-readiness-audit-fails',
        'observability-pack-combination-regresses',
        'source-replay-authority-regresses',
      ]),
      selectedSlice: 'narrow-replay-materialization-runtime-handoff-readiness-audit',
      status: 'selected',
    });
  }

  if (available.has('narrow-replay-materialization-runtime-handoff')) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_ACCEPTANCE_GATES],
      affectedRuntimes: Object.freeze([]),
      forbiddenActions: Object.freeze([
        'start-runtime-handoff-before-readiness-audit',
        'change-replay-cursor-movement',
        'route-target-bars-through-replay-runtime',
      ]),
      ownerBoundary: 'target-materialization-diagnostics-readout-chain-selection',
      readiness,
      reason: 'runtime-handoff-deferred-until-readiness-audit',
      rollbackCriteria: Object.freeze(['runtime-handoff-selected-too-early']),
      selectedSlice: null,
      status: 'blocked',
    });
  }

  if (available.has('more-diagnostics-readout-pack-wiring')) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_ACCEPTANCE_GATES],
      affectedRuntimes: Object.freeze([]),
      forbiddenActions: Object.freeze([
        'extend-diagnostics-ui-after-chain-closeout',
        'change-runtime-behavior-without-selected-slice',
      ]),
      ownerBoundary: 'target-materialization-diagnostics-readout-chain-selection',
      readiness,
      reason: 'diagnostics-readout-chain-already-packaged-no-more-pack-wiring-selected',
      rollbackCriteria: Object.freeze(['observability-work-continues-without-foundation-slice']),
      selectedSlice: null,
      status: 'blocked',
    });
  }

  return Object.freeze({
    acceptanceGates: [...DEFAULT_ACCEPTANCE_GATES],
    affectedRuntimes: Object.freeze([]),
    forbiddenActions: Object.freeze(['change-runtime-behavior-without-selected-slice']),
    ownerBoundary: 'target-materialization-diagnostics-readout-chain-selection',
    readiness,
    reason: 'no-target-materialization-diagnostics-readout-chain-candidate',
    rollbackCriteria: Object.freeze(['no-candidate-selected']),
    selectedSlice: null,
    status: 'blocked',
  });
}
