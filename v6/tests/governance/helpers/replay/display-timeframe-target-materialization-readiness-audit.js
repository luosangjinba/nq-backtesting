import { validateReplayCoordinationMaterializationPureHandoffPlan } from '../../../../src/replay/replay-coordination-materialization-pure-handoff-plan.js';

const REQUIRED_SURFACES = Object.freeze([
  'displayTimeframeApplySurface',
  'displayTimeframeTargetHistoryBranch',
  'barDataTargetPlanSurface',
  'barDataTargetLoadSurface',
  'chartDataReplaceSurface',
  'chartDataSourcePreservationSurface',
  'replayCursorReadSurface',
  'targetBarRevealPolicySurface',
]);

const REQUIRED_GATES = Object.freeze([
  'source-1m-replay-cursor-authority',
  'target-bars-display-materialization-input-only',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
  'no-runtime-wiring-in-readiness-audit',
]);

function normalizeSurfaceMap(surfaces = {}) {
  return Object.fromEntries(
    REQUIRED_SURFACES.map((surface) => [surface, Boolean(surfaces[surface])]),
  );
}

function normalizeGateMap(gates = {}) {
  return Object.fromEntries(
    REQUIRED_GATES.map((gate) => [gate, gates[gate] !== false]),
  );
}

export function auditDisplayTimeframeTargetMaterializationReadiness({
  gates = {},
  plan = {},
  surfaces = {},
} = {}) {
  const planValidation = validateReplayCoordinationMaterializationPureHandoffPlan(plan);
  const surfaceChecks = normalizeSurfaceMap(surfaces);
  const gateChecks = normalizeGateMap(gates);
  const missingSurfaces = Object.entries(surfaceChecks)
    .filter(([, ready]) => !ready)
    .map(([surface]) => surface);
  const missingGates = Object.entries(gateChecks)
    .filter(([, ready]) => !ready)
    .map(([gate]) => gate);
  const futureWiringPointReady = plan.futureWiringPoint?.id === 'display-timeframe-target-materialization-handoff'
    && plan.futureWiringPoint?.owner === 'display-timeframe-runtime';
  const ownerSurfaceMappingReady = Array.isArray(plan.ownerSurfaces)
    && plan.ownerSurfaces.some((surface) => surface.commandSurface === 'barData.planTargetWindow')
    && plan.ownerSurfaces.some((surface) => surface.commandSurface === 'barData.loadTargetWindow')
    && plan.ownerSurfaces.some((surface) => surface.commandSurface === 'chartData.replaceBars')
    && plan.ownerSurfaces.some((surface) => surface.commandSurface === 'chartData.getSourceBars');
  const failed = [
    ...(planValidation.valid ? [] : ['pureHandoffPlanValid']),
    ...(futureWiringPointReady ? [] : ['futureWiringPointReady']),
    ...(ownerSurfaceMappingReady ? [] : ['ownerSurfaceMappingReady']),
    ...missingSurfaces,
    ...missingGates,
  ];

  return Object.freeze({
    failed: Object.freeze(failed),
    futureWiringPointReady,
    gates: Object.freeze(gateChecks),
    missingGates: Object.freeze(missingGates),
    missingSurfaces: Object.freeze(missingSurfaces),
    ownerSurfaceMappingReady,
    planValidation,
    ready: failed.length === 0,
    status: failed.length === 0 ? 'ready-for-runtime-wiring-selection' : 'readiness-incomplete',
    surfaces: Object.freeze(surfaceChecks),
  });
}

export function createDisplayTimeframeTargetMaterializationReadinessReport(input = {}) {
  const audit = auditDisplayTimeframeTargetMaterializationReadiness(input);
  return Object.freeze({
    audit,
    nextSlice: audit.ready
      ? 'display-timeframe-target-materialization-wiring-plan'
      : 'display-timeframe-target-materialization-readiness-gap-closure',
    ownerBoundary: 'display-timeframe-target-materialization-handoff',
    reason: audit.ready
      ? 'display-timeframe-target-materialization-owner-surfaces-ready'
      : 'display-timeframe-target-materialization-owner-surfaces-incomplete',
    status: audit.ready ? 'ready' : 'blocked',
  });
}
