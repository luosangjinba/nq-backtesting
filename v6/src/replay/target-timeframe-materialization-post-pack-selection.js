const DEFAULT_POST_PACK_CANDIDATES = Object.freeze([
  'target-materialization-replay-coordination-diagnostics-readout',
  'narrow-replay-materialization-runtime-handoff',
]);

const DEFAULT_POST_PACK_ACCEPTANCE_GATES = Object.freeze([
  'display-timeframe-target-materialization-covered',
  'replay-coordination-browser-covered',
  'replay-coordination-pack-member-available',
  'targeted-pack-member-runnable',
  'full-eight-member-target-history-pack-preserved',
  'source-1m-replay-cursor-authority-preserved',
  'target-bars-display-input-only',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
  'no-runtime-behavior-change-in-selection-step',
]);

function normalizeCandidateSet(candidates = DEFAULT_POST_PACK_CANDIDATES) {
  return new Set(candidates.map((candidate) => String(candidate || '').trim()).filter(Boolean));
}

function normalizeCoverage(coverage = {}) {
  return {
    displayMaterializationCovered: Boolean(coverage.displayMaterializationCovered),
    fullEightMemberPackPreserved: Boolean(coverage.fullEightMemberPackPreserved),
    packMemberRunnable: Boolean(coverage.packMemberRunnable),
    replayCoordinationBrowserCovered: Boolean(coverage.replayCoordinationBrowserCovered),
    replayCoordinationPackMemberAvailable: Boolean(coverage.replayCoordinationPackMemberAvailable),
    sourceReplayCursorAuthority: Boolean(coverage.sourceReplayCursorAuthority),
    targetBarsDisplayInputOnly: Boolean(coverage.targetBarsDisplayInputOnly),
  };
}

export function auditTargetTimeframeMaterializationPostPackReadiness({
  chartHistoryFastPathUnchanged = true,
  coverage = {},
  targetHistoryRequestSizingUnchanged = true,
} = {}) {
  const normalizedCoverage = normalizeCoverage(coverage);
  const checks = {
    chartHistoryFastPathUnchanged: Boolean(chartHistoryFastPathUnchanged),
    displayMaterializationCovered: normalizedCoverage.displayMaterializationCovered,
    fullEightMemberPackPreserved: normalizedCoverage.fullEightMemberPackPreserved,
    packMemberRunnable: normalizedCoverage.packMemberRunnable,
    replayCoordinationBrowserCovered: normalizedCoverage.replayCoordinationBrowserCovered,
    replayCoordinationPackMemberAvailable: normalizedCoverage.replayCoordinationPackMemberAvailable,
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

export function selectTargetTimeframeMaterializationPostPackSlice({
  candidates = DEFAULT_POST_PACK_CANDIDATES,
  chartHistoryFastPathUnchanged = true,
  coverage = {},
  targetHistoryRequestSizingUnchanged = true,
} = {}) {
  const available = normalizeCandidateSet(candidates);
  const readiness = auditTargetTimeframeMaterializationPostPackReadiness({
    chartHistoryFastPathUnchanged,
    coverage,
    targetHistoryRequestSizingUnchanged,
  });

  if (!readiness.ready) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_POST_PACK_ACCEPTANCE_GATES],
      affectedRuntimes: Object.freeze([]),
      forbiddenActions: Object.freeze([
        'change-replay-cursor-movement',
        'change-no-bar-gap-skipping',
        'change-target-history-request-sizing',
        'change-chart-history-fast-path',
        'start-runtime-handoff-before-pack-coverage-is-runnable',
      ]),
      ownerBoundary: 'target-timeframe-materialization-post-pack-selection',
      readiness,
      reason: 'target-timeframe-materialization-post-pack-readiness-incomplete',
      rollbackCriteria: Object.freeze(['post-pack-readiness-fails']),
      selectedSlice: null,
      status: 'blocked',
    });
  }

  if (available.has('target-materialization-replay-coordination-diagnostics-readout')) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_POST_PACK_ACCEPTANCE_GATES],
      affectedRuntimes: Object.freeze(['shell.diagnostics-readout', 'runtime.display-timeframe']),
      forbiddenActions: Object.freeze([
        'change-replay-cursor-movement',
        'change-no-bar-gap-skipping',
        'change-target-history-request-sizing',
        'change-chart-history-fast-path',
        'route-target-bars-through-replay-runtime',
      ]),
      ownerBoundary: 'target-materialization-diagnostics-readout',
      readiness,
      reason: 'pack-member-runnable-select-diagnostics-readout-before-runtime-handoff',
      rollbackCriteria: Object.freeze([
        'diagnostics-readout-regresses',
        'replay-coordination-pack-member-fails',
        'full-eight-member-pack-regresses',
      ]),
      selectedSlice: 'target-materialization-replay-coordination-diagnostics-readout',
      status: 'selected',
    });
  }

  if (available.has('narrow-replay-materialization-runtime-handoff')) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_POST_PACK_ACCEPTANCE_GATES],
      affectedRuntimes: Object.freeze([]),
      forbiddenActions: Object.freeze([
        'start-runtime-handoff-before-diagnostics-readout',
        'change-replay-cursor-movement',
        'route-target-bars-through-replay-runtime',
      ]),
      ownerBoundary: 'target-timeframe-materialization-post-pack-selection',
      readiness,
      reason: 'runtime-handoff-deferred-until-diagnostics-readout-selection',
      rollbackCriteria: Object.freeze(['runtime-handoff-selected-too-early']),
      selectedSlice: null,
      status: 'blocked',
    });
  }

  return Object.freeze({
    acceptanceGates: [...DEFAULT_POST_PACK_ACCEPTANCE_GATES],
    affectedRuntimes: Object.freeze([]),
    forbiddenActions: Object.freeze(['change-runtime-behavior-without-selected-slice']),
    ownerBoundary: 'target-timeframe-materialization-post-pack-selection',
    readiness,
    reason: 'no-target-timeframe-materialization-post-pack-candidate',
    rollbackCriteria: Object.freeze(['no-candidate-selected']),
    selectedSlice: null,
    status: 'blocked',
  });
}
