const DEFAULT_ACCEPTANCE_GATES = Object.freeze([
  'replay-source-1m-driven',
  'replay-runtime-owns-cursor-and-reveal-state',
  'bar-data-runtime-owns-source-and-target-bars',
  'chart-data-runtime-owns-pane-local-series-bars',
  'chart-viewport-runtime-owns-viewport-intent',
  'chart-history-fast-path-unchanged',
  'target-history-request-sizing-unchanged',
]);

export function selectReplayCoordinationMaterializationTransitionSlice({
  candidates = ['replay-coordination-materialization-owner-contract'],
  fastPathRemeasurement = {},
  ownership = {},
} = {}) {
  const available = new Set(candidates.map((candidate) => String(candidate || '').trim()).filter(Boolean));
  const ownerAudit = auditReplayCoordinationMaterializationOwnership(ownership);

  if (fastPathRemeasurement.status !== 'materialization-ready') {
    return {
      acceptanceGates: DEFAULT_ACCEPTANCE_GATES,
      ownerAudit,
      ownerBoundary: 'target-history-fast-path-responsive',
      reason: 'target-history-fast-path-remeasurement-not-ready',
      selectedSlice: null,
      status: 'blocked',
    };
  }

  if (!ownerAudit.ready) {
    return {
      acceptanceGates: DEFAULT_ACCEPTANCE_GATES,
      ownerAudit,
      ownerBoundary: 'replay-coordination-materialization-transition',
      reason: 'replay-coordination-materialization-ownership-incomplete',
      selectedSlice: null,
      status: 'blocked',
    };
  }

  if (available.has('replay-coordination-materialization-owner-contract')) {
    return {
      acceptanceGates: DEFAULT_ACCEPTANCE_GATES,
      ownerAudit,
      ownerBoundary: 'replay-coordination-materialization-transition',
      reason: 'materialization-ready-select-owner-contract-before-runtime-change',
      selectedSlice: 'replay-coordination-materialization-owner-contract',
      status: 'selected',
    };
  }

  return {
    acceptanceGates: DEFAULT_ACCEPTANCE_GATES,
    ownerAudit,
    ownerBoundary: 'replay-coordination-materialization-transition',
    reason: 'no-replay-coordination-materialization-candidate',
    selectedSlice: null,
    status: 'blocked',
  };
}

export function auditReplayCoordinationMaterializationOwnership({
  barDataOwnsBars = true,
  chartDataOwnsPaneSeries = true,
  chartHistoryFastPathUnchanged = true,
  chartViewportOwnsIntent = true,
  replayOwnsCursor = true,
  replaySourceTimeframe = 1,
  targetHistoryRequestSizingUnchanged = true,
} = {}) {
  const checks = {
    barDataOwnsBars: Boolean(barDataOwnsBars),
    chartDataOwnsPaneSeries: Boolean(chartDataOwnsPaneSeries),
    chartHistoryFastPathUnchanged: Boolean(chartHistoryFastPathUnchanged),
    chartViewportOwnsIntent: Boolean(chartViewportOwnsIntent),
    replayOwnsCursor: Boolean(replayOwnsCursor),
    replaySource1mDriven: Number(replaySourceTimeframe) === 1,
    targetHistoryRequestSizingUnchanged: Boolean(targetHistoryRequestSizingUnchanged),
  };
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  return {
    checks,
    failed,
    ready: failed.length === 0,
  };
}
