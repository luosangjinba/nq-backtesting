const DEFAULT_HANDOFF_CANDIDATES = Object.freeze([
  'replay-coordination-materialization-pure-handoff-plan',
  'replay-coordination-materialization-runtime-wiring',
]);

const DEFAULT_HANDOFF_GATES = Object.freeze([
  'source-1m-replay-cursor-authority',
  'target-bars-display-materialization-input-only',
  'chart-data-no-future-filtering',
  'bar-data-target-cache-owner',
  'chart-history-request-coordination-only',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
  'no-runtime-wiring-in-selection-step',
]);

function normalizeCandidates(candidates = DEFAULT_HANDOFF_CANDIDATES) {
  return new Set(candidates.map((candidate) => String(candidate || '').trim()).filter(Boolean));
}

function normalizeContract(contract = {}) {
  return {
    materializationRuntimeReady: Boolean(contract.materializationRuntimeReady),
    owner: String(contract.owner || '').trim(),
    readOnlyContractReady: Boolean(contract.readOnlyContractReady),
    replaySourceTimeframe: Number(contract.replaySourceTimeframe),
    runtimeWiringReady: Boolean(contract.runtimeWiringReady),
    targetBarsMayMaterializeDisplay: Boolean(contract.targetBarsMayMaterializeDisplay),
    writeReady: Boolean(contract.writeReady),
  };
}

export function auditReplayCoordinationMaterializationHandoffReadiness({
  contract = {},
  fastPathUnchanged = true,
  targetHistoryRequestSizingUnchanged = true,
} = {}) {
  const normalizedContract = normalizeContract(contract);
  const checks = {
    chartHistoryFastPathUnchanged: Boolean(fastPathUnchanged),
    contractOwnerReady: normalizedContract.owner === 'replay-coordination-materialization-contract',
    noRuntimeWiringYet: normalizedContract.runtimeWiringReady === false,
    noWriteSurfaceYet: normalizedContract.writeReady === false,
    readOnlyContractReady: normalizedContract.readOnlyContractReady === true,
    replaySource1mDriven: normalizedContract.replaySourceTimeframe === 1,
    targetBarsDisplayInputAllowed: normalizedContract.targetBarsMayMaterializeDisplay === true,
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

export function selectReplayCoordinationMaterializationHandoffSlice({
  candidates = DEFAULT_HANDOFF_CANDIDATES,
  contract = {},
  fastPathUnchanged = true,
  targetHistoryRequestSizingUnchanged = true,
} = {}) {
  const available = normalizeCandidates(candidates);
  const readiness = auditReplayCoordinationMaterializationHandoffReadiness({
    contract,
    fastPathUnchanged,
    targetHistoryRequestSizingUnchanged,
  });

  if (!readiness.ready) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_HANDOFF_GATES],
      ownerBoundary: 'replay-coordination-materialization-contract',
      readiness,
      reason: 'replay-coordination-materialization-handoff-readiness-incomplete',
      selectedSlice: null,
      status: 'blocked',
    });
  }

  if (available.has('replay-coordination-materialization-pure-handoff-plan')) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_HANDOFF_GATES],
      ownerBoundary: 'replay-coordination-materialization-runtime-handoff',
      readiness,
      reason: 'owner-contract-ready-select-pure-handoff-plan-before-runtime-wiring',
      selectedSlice: 'replay-coordination-materialization-pure-handoff-plan',
      status: 'selected',
    });
  }

  if (available.has('replay-coordination-materialization-runtime-wiring')) {
    return Object.freeze({
      acceptanceGates: [...DEFAULT_HANDOFF_GATES],
      ownerBoundary: 'replay-coordination-materialization-runtime-handoff',
      readiness,
      reason: 'pure-handoff-plan-missing-do-not-start-runtime-wiring',
      selectedSlice: null,
      status: 'blocked',
    });
  }

  return Object.freeze({
    acceptanceGates: [...DEFAULT_HANDOFF_GATES],
    ownerBoundary: 'replay-coordination-materialization-runtime-handoff',
    readiness,
    reason: 'no-replay-coordination-materialization-handoff-candidate',
    selectedSlice: null,
    status: 'blocked',
  });
}
