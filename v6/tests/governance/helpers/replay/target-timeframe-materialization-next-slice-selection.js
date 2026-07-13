const DEFAULT_NEXT_SLICE_CANDIDATES = Object.freeze([
  'target-history-pack-replay-coordination-member',
  'target-materialization-diagnostics-readout',
  'narrow-replay-materialization-runtime-handoff',
]);

const DEFAULT_ACCEPTANCE_GATES = Object.freeze([
  'display-timeframe-target-materialization-covered',
  'manual-next-target-materialization-covered',
  'auto-play-target-materialization-covered',
  'fallback-target-materialization-covered',
  'source-1m-replay-cursor-authority-preserved',
  'target-bars-display-input-only',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
  'full-target-history-pack-remains-available',
  'no-runtime-behavior-change-in-selection-step',
]);

function normalizeCandidateSet(candidates = DEFAULT_NEXT_SLICE_CANDIDATES) {
  return new Set(candidates.map((candidate) => String(candidate || '').trim()).filter(Boolean));
}

function normalizeCoverage(coverage = {}) {
  return {
    autoPlayCovered: Boolean(coverage.autoPlayCovered),
    displayApplyCovered: Boolean(coverage.displayApplyCovered),
    fallbackCovered: Boolean(coverage.fallbackCovered),
    manualNextCovered: Boolean(coverage.manualNextCovered),
    packMemberControlsAvailable: Boolean(coverage.packMemberControlsAvailable),
    sourceReplayCursorAuthority: Boolean(coverage.sourceReplayCursorAuthority),
    targetBarsDisplayInputOnly: Boolean(coverage.targetBarsDisplayInputOnly),
  };
}

export function auditTargetTimeframeMaterializationNextSliceReadiness({
  chartHistoryFastPathUnchanged = true,
  coverage = {},
  targetHistoryRequestSizingUnchanged = true,
} = {}) {
  const normalizedCoverage = normalizeCoverage(coverage);
  const checks = {
    autoPlayCovered: normalizedCoverage.autoPlayCovered,
    chartHistoryFastPathUnchanged: Boolean(chartHistoryFastPathUnchanged),
    displayApplyCovered: normalizedCoverage.displayApplyCovered,
    fallbackCovered: normalizedCoverage.fallbackCovered,
    manualNextCovered: normalizedCoverage.manualNextCovered,
    packMemberControlsAvailable: normalizedCoverage.packMemberControlsAvailable,
    sourceReplayCursorAuthority: normalizedCoverage.sourceReplayCursorAuthority,
    targetBarsDisplayInputOnly: normalizedCoverage.targetBarsDisplayInputOnly,
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

export function selectTargetTimeframeMaterializationNextSlice({
  candidates = DEFAULT_NEXT_SLICE_CANDIDATES,
  chartHistoryFastPathUnchanged = true,
  coverage = {},
  targetHistoryRequestSizingUnchanged = true,
} = {}) {
  const available = normalizeCandidateSet(candidates);
  const readiness = auditTargetTimeframeMaterializationNextSliceReadiness({
    chartHistoryFastPathUnchanged,
    coverage,
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
      ]),
      ownerBoundary: 'target-timeframe-materialization-selection',
      readiness,
      reason: 'target-timeframe-materialization-next-slice-readiness-incomplete',
      rollbackCriteria: Object.freeze(['selection-readiness-fails']),
      selectedSlice: null,
      status: 'blocked',
    });
  }

  if (available.has('target-history-pack-replay-coordination-member')) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_ACCEPTANCE_GATES],
      affectedRuntimes: Object.freeze(['test-harness.target-history-pack']),
      forbiddenActions: Object.freeze([
        'change-replay-cursor-movement',
        'change-no-bar-gap-skipping',
        'change-target-history-request-sizing',
        'change-chart-history-fast-path',
        'route-target-bars-through-replay-runtime',
      ]),
      ownerBoundary: 'target-history-browser-regression-pack',
      readiness,
      reason: 'step337-covered-select-pack-member-integration-before-runtime-changes',
      rollbackCriteria: Object.freeze([
        'focused-replay-coordination-member-fails',
        'full-target-history-pack-member-list-regresses',
        'pack-env-selection-regresses',
      ]),
      selectedSlice: 'target-history-pack-replay-coordination-member',
      status: 'selected',
    });
  }

  if (available.has('target-materialization-diagnostics-readout')) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_ACCEPTANCE_GATES],
      affectedRuntimes: Object.freeze(['shell.diagnostics-readout']),
      forbiddenActions: Object.freeze([
        'change-replay-cursor-movement',
        'change-no-bar-gap-skipping',
        'route-target-bars-through-replay-runtime',
      ]),
      ownerBoundary: 'target-materialization-diagnostics',
      readiness,
      reason: 'pack-integration-candidate-missing-select-readout-before-runtime-changes',
      rollbackCriteria: Object.freeze(['diagnostic-readout-ownership-regresses']),
      selectedSlice: 'target-materialization-diagnostics-readout',
      status: 'selected',
    });
  }

  if (available.has('narrow-replay-materialization-runtime-handoff')) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_ACCEPTANCE_GATES],
      affectedRuntimes: Object.freeze([]),
      forbiddenActions: Object.freeze([
        'start-runtime-handoff-without-pack-integration',
        'change-replay-cursor-movement',
      ]),
      ownerBoundary: 'target-timeframe-materialization-selection',
      readiness,
      reason: 'runtime-handoff-deferred-until-pack-integration-or-readout',
      rollbackCriteria: Object.freeze(['runtime-handoff-selected-too-early']),
      selectedSlice: null,
      status: 'blocked',
    });
  }

  return Object.freeze({
    acceptanceGates: [...DEFAULT_ACCEPTANCE_GATES],
    affectedRuntimes: Object.freeze([]),
    forbiddenActions: Object.freeze(['change-runtime-behavior-without-selected-slice']),
    ownerBoundary: 'target-timeframe-materialization-selection',
    readiness,
    reason: 'no-target-timeframe-materialization-next-slice-candidate',
    rollbackCriteria: Object.freeze(['no-candidate-selected']),
    selectedSlice: null,
    status: 'blocked',
  });
}
