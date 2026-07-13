const DEFAULT_RUNTIME_WIRING_CANDIDATES = Object.freeze([
  'display-timeframe-target-materialization-readiness-audit',
  'display-timeframe-target-materialization-runtime-wiring',
]);

const DEFAULT_RUNTIME_WIRING_GATES = Object.freeze([
  'pure-handoff-plan-accepted',
  'display-timeframe-target-materialization-handoff-selected',
  'target-window-plan-owner-surface-available',
  'target-window-load-owner-surface-available',
  'chart-data-replace-owner-surface-available',
  'source-1m-replay-cursor-available',
  'target-bar-reveal-policy-covered',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
  'no-runtime-wiring-in-selection-step',
]);

function normalizeCandidateSet(candidates = DEFAULT_RUNTIME_WIRING_CANDIDATES) {
  return new Set(candidates.map((candidate) => String(candidate || '').trim()).filter(Boolean));
}

function normalizePlan(plan = {}) {
  return {
    futureWiringPoint: {
      id: String(plan.futureWiringPoint?.id || '').trim(),
      owner: String(plan.futureWiringPoint?.owner || '').trim(),
      preconditions: Array.isArray(plan.futureWiringPoint?.preconditions)
        ? plan.futureWiringPoint.preconditions.map((item) => String(item || '').trim()).filter(Boolean)
        : [],
    },
    id: String(plan.id || '').trim(),
    runtimeWiringReady: Boolean(plan.runtimeWiringReady),
    sourceReplayCursorAuthority: Boolean(plan.sourceReplayCursorAuthority),
    targetBarsDisplayMaterializationInputOnly: Boolean(plan.targetBarsDisplayMaterializationInputOnly),
  };
}

export function auditReplayCoordinationMaterializationRuntimeWiringReadiness({
  chartHistoryFastPathUnchanged = true,
  plan = {},
  targetHistoryRequestSizingUnchanged = true,
} = {}) {
  const normalizedPlan = normalizePlan(plan);
  const preconditions = new Set(normalizedPlan.futureWiringPoint.preconditions);
  const checks = {
    chartDataReplaceSurfacePlanned: preconditions.has('chart-data-replace-owner-surface-available'),
    chartHistoryFastPathUnchanged: Boolean(chartHistoryFastPathUnchanged),
    futureWiringPointOwnerReady: normalizedPlan.futureWiringPoint.owner === 'display-timeframe-runtime',
    futureWiringPointSelected: normalizedPlan.futureWiringPoint.id === 'display-timeframe-target-materialization-handoff',
    noRuntimeWiringYet: normalizedPlan.runtimeWiringReady === false,
    planAccepted: normalizedPlan.id === 'replay-coordination-materialization-pure-handoff-plan',
    replayCursorAvailablePlanned: preconditions.has('source-1m-replay-cursor-available'),
    sourceReplayCursorAuthority: normalizedPlan.sourceReplayCursorAuthority === true,
    targetBarsDisplayInputOnly: normalizedPlan.targetBarsDisplayMaterializationInputOnly === true,
    targetBarRevealPolicyCovered: preconditions.has('target-bar-reveal-policy-covered'),
    targetHistoryRequestSizingUnchanged: Boolean(targetHistoryRequestSizingUnchanged),
    targetWindowLoadSurfacePlanned: preconditions.has('target-window-load-owner-surface-available'),
    targetWindowPlanSurfacePlanned: preconditions.has('target-window-plan-owner-surface-available'),
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

export function selectReplayCoordinationMaterializationRuntimeWiringSlice({
  candidates = DEFAULT_RUNTIME_WIRING_CANDIDATES,
  chartHistoryFastPathUnchanged = true,
  plan = {},
  targetHistoryRequestSizingUnchanged = true,
} = {}) {
  const available = normalizeCandidateSet(candidates);
  const readiness = auditReplayCoordinationMaterializationRuntimeWiringReadiness({
    chartHistoryFastPathUnchanged,
    plan,
    targetHistoryRequestSizingUnchanged,
  });

  if (!readiness.ready) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_RUNTIME_WIRING_GATES],
      ownerBoundary: 'replay-coordination-materialization-pure-handoff-plan',
      readiness,
      reason: 'replay-coordination-materialization-runtime-wiring-readiness-incomplete',
      selectedSlice: null,
      status: 'blocked',
    });
  }

  if (available.has('display-timeframe-target-materialization-readiness-audit')) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_RUNTIME_WIRING_GATES],
      ownerBoundary: 'display-timeframe-target-materialization-handoff',
      readiness,
      reason: 'pure-handoff-plan-ready-select-readiness-audit-before-runtime-wiring',
      selectedSlice: 'display-timeframe-target-materialization-readiness-audit',
      status: 'selected',
    });
  }

  if (available.has('display-timeframe-target-materialization-runtime-wiring')) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_RUNTIME_WIRING_GATES],
      ownerBoundary: 'display-timeframe-target-materialization-handoff',
      readiness,
      reason: 'readiness-audit-missing-do-not-start-runtime-wiring',
      selectedSlice: null,
      status: 'blocked',
    });
  }

  return Object.freeze({
    acceptanceGates: [...DEFAULT_RUNTIME_WIRING_GATES],
    ownerBoundary: 'display-timeframe-target-materialization-handoff',
    readiness,
    reason: 'no-replay-coordination-materialization-runtime-wiring-candidate',
    selectedSlice: null,
    status: 'blocked',
  });
}
