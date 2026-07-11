import { createDisplayTimeframeTargetMaterializationReadinessReport } from './display-timeframe-target-materialization-readiness-audit.js';

const WIRING_PLAN_ID = 'display-timeframe-target-materialization-wiring-plan';
const WIRING_OWNER = 'display-timeframe-runtime';

const COMMAND_SEQUENCE = Object.freeze([
  Object.freeze({
    id: 'read-source-replay-cursor',
    owner: 'display-timeframe-runtime',
    commandSurface: 'replay.getState',
    reads: Object.freeze(['sourceReplayCursorTime']),
    writes: Object.freeze([]),
  }),
  Object.freeze({
    id: 'preserve-source-bars',
    owner: 'display-timeframe-runtime',
    commandSurface: 'chartData.getSourceBars',
    reads: Object.freeze(['paneSourceBars']),
    writes: Object.freeze([]),
  }),
  Object.freeze({
    id: 'plan-target-window',
    owner: 'bar-data-runtime',
    commandSurface: 'barData.planTargetWindow',
    reads: Object.freeze(['paneId', 'instrument', 'displayTimeframe', 'targetHistoryWindow']),
    writes: Object.freeze(['targetWindowPlan']),
  }),
  Object.freeze({
    id: 'load-target-window',
    owner: 'bar-data-runtime',
    commandSurface: 'barData.loadTargetWindow',
    reads: Object.freeze(['targetWindowPlan']),
    writes: Object.freeze(['targetBars', 'targetLoadDiagnostics']),
  }),
  Object.freeze({
    id: 'resolve-target-bar-reveal-state',
    owner: 'replay-coordination-materialization-contract',
    commandSurface: null,
    reads: Object.freeze(['sourceReplayCursorTime', 'targetBars']),
    writes: Object.freeze(['targetBarRevealStates']),
  }),
  Object.freeze({
    id: 'replace-display-bars',
    owner: 'chart-data-runtime',
    commandSurface: 'chartData.replaceBars',
    reads: Object.freeze(['visibleTargetBars', 'sourceReplayCursorTime']),
    writes: Object.freeze(['paneDisplayBars', 'chartDataRevision']),
  }),
  Object.freeze({
    id: 'reapply-existing-viewport-intent',
    owner: 'chart-viewport-runtime',
    commandSurface: null,
    reads: Object.freeze(['chartDataRevision', 'paneViewportIntent']),
    writes: Object.freeze(['projectedViewportIntent']),
  }),
]);

const FALLBACK_GATES = Object.freeze([
  'readiness-report-ready',
  'target-history-enabled-for-display-timeframe',
  'source-1m-replay-cursor-readable',
  'source-bars-preserved-before-target-replacement',
  'target-window-plan-created',
  'target-window-load-returned-bars',
  'target-bar-reveal-policy-resolved',
  'chart-data-replace-accepts-preserve-source',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
]);

const ROLLBACK_CRITERIA = Object.freeze([
  'runtime-wiring-mutates-replay-cursor',
  'runtime-wiring-mutates-viewport-intent-directly',
  'runtime-wiring-writes-chart-engine-directly',
  'target-load-latency-regresses-high-timeframe-history-pack',
  'switching-back-to-1m-loses-source-bars',
  'target-bar-reveal-policy-allows-future-bars',
]);

const FORBIDDEN_ACTIONS = Object.freeze([
  'dispatch replay.next',
  'dispatch replay.previous',
  'dispatch replay.setCursorTime',
  'dispatch chartViewport.resetView',
  'dispatch chartViewport.setManualIntent',
  'call chart-engine setData directly',
  'call chart-engine setVisibleLogicalRange directly',
  'change target-history request sizing',
  'change chart-history fast-path delay policy',
]);

function cloneRecord(record) {
  return {
    commandSurface: record.commandSurface,
    id: record.id,
    owner: record.owner,
    reads: [...record.reads],
    writes: [...record.writes],
  };
}

function normalizeReadinessReport(readinessReport) {
  if (readinessReport) {
    return readinessReport;
  }
  return createDisplayTimeframeTargetMaterializationReadinessReport();
}

export function getDisplayTimeframeTargetMaterializationWiringPlanId() {
  return WIRING_PLAN_ID;
}

export function getDisplayTimeframeTargetMaterializationWiringOwner() {
  return WIRING_OWNER;
}

export function getDisplayTimeframeTargetMaterializationWiringCommandSequence() {
  return COMMAND_SEQUENCE.map(cloneRecord);
}

export function getDisplayTimeframeTargetMaterializationWiringFallbackGates() {
  return [...FALLBACK_GATES];
}

export function getDisplayTimeframeTargetMaterializationWiringRollbackCriteria() {
  return [...ROLLBACK_CRITERIA];
}

export function getDisplayTimeframeTargetMaterializationWiringForbiddenActions() {
  return [...FORBIDDEN_ACTIONS];
}

export function createDisplayTimeframeTargetMaterializationWiringPlan({
  readinessReport = null,
} = {}) {
  const report = normalizeReadinessReport(readinessReport);
  const runtimeWiringAllowed = report.status === 'ready'
    && report.nextSlice === WIRING_PLAN_ID
    && report.ownerBoundary === 'display-timeframe-target-materialization-handoff';

  return Object.freeze({
    chartHistoryFastPathUnchanged: true,
    commandSequence: Object.freeze(getDisplayTimeframeTargetMaterializationWiringCommandSequence()),
    fallbackGates: Object.freeze(getDisplayTimeframeTargetMaterializationWiringFallbackGates()),
    forbiddenActions: Object.freeze(getDisplayTimeframeTargetMaterializationWiringForbiddenActions()),
    id: WIRING_PLAN_ID,
    owner: WIRING_OWNER,
    preservesSourceReplayCursorAuthority: true,
    readinessReport: report,
    rollbackCriteria: Object.freeze(getDisplayTimeframeTargetMaterializationWiringRollbackCriteria()),
    runtimeBehaviorChanges: false,
    runtimeWiringAllowed,
    runtimeWiringReady: false,
    targetBarsDisplayMaterializationInputOnly: true,
    targetHistoryRequestSizingUnchanged: true,
  });
}

export function validateDisplayTimeframeTargetMaterializationWiringPlan(plan = {}) {
  const errors = [];
  const commandSequence = Array.isArray(plan.commandSequence) ? plan.commandSequence : [];
  const commandIds = new Set(commandSequence.map((step) => step.id));
  const commands = new Set(commandSequence.map((step) => step.commandSurface).filter(Boolean));
  const fallbackGates = new Set(plan.fallbackGates || []);
  const forbiddenActions = new Set(plan.forbiddenActions || []);
  const rollbackCriteria = new Set(plan.rollbackCriteria || []);

  if (plan.id !== WIRING_PLAN_ID) {
    errors.push(Object.freeze({ field: 'id', message: 'Display-timeframe target materialization wiring plan id is invalid.' }));
  }
  if (plan.owner !== WIRING_OWNER) {
    errors.push(Object.freeze({ field: 'owner', message: 'Display-timeframe runtime must own the future target materialization handoff.' }));
  }
  if (plan.runtimeBehaviorChanges !== false || plan.runtimeWiringReady !== false) {
    errors.push(Object.freeze({ field: 'runtimeWiringReady', message: 'Step 334 must remain a read-only wiring plan.' }));
  }
  if (plan.runtimeWiringAllowed !== true) {
    errors.push(Object.freeze({ field: 'runtimeWiringAllowed', message: 'Wiring plan requires a ready Step 333 readiness report.' }));
  }
  if (plan.preservesSourceReplayCursorAuthority !== true) {
    errors.push(Object.freeze({ field: 'preservesSourceReplayCursorAuthority', message: 'Source 1m replay cursor must remain authority.' }));
  }
  if (plan.targetBarsDisplayMaterializationInputOnly !== true) {
    errors.push(Object.freeze({ field: 'targetBarsDisplayMaterializationInputOnly', message: 'Target bars must stay display materialization inputs only.' }));
  }
  if (plan.targetHistoryRequestSizingUnchanged !== true) {
    errors.push(Object.freeze({ field: 'targetHistoryRequestSizingUnchanged', message: 'Wiring plan must keep target-history request sizing unchanged.' }));
  }
  if (plan.chartHistoryFastPathUnchanged !== true) {
    errors.push(Object.freeze({ field: 'chartHistoryFastPathUnchanged', message: 'Wiring plan must keep chart-history fast-path behavior unchanged.' }));
  }

  for (const requiredStep of [
    'read-source-replay-cursor',
    'preserve-source-bars',
    'plan-target-window',
    'load-target-window',
    'resolve-target-bar-reveal-state',
    'replace-display-bars',
    'reapply-existing-viewport-intent',
  ]) {
    if (!commandIds.has(requiredStep)) {
      errors.push(Object.freeze({ field: 'commandSequence', message: `Missing wiring step: ${requiredStep}.` }));
    }
  }

  for (const requiredCommand of [
    'replay.getState',
    'chartData.getSourceBars',
    'barData.planTargetWindow',
    'barData.loadTargetWindow',
    'chartData.replaceBars',
  ]) {
    if (!commands.has(requiredCommand)) {
      errors.push(Object.freeze({ field: 'commandSequence', message: `Missing command surface: ${requiredCommand}.` }));
    }
  }

  for (const gate of FALLBACK_GATES) {
    if (!fallbackGates.has(gate)) {
      errors.push(Object.freeze({ field: 'fallbackGates', message: `Missing fallback gate: ${gate}.` }));
    }
  }

  for (const criterion of ROLLBACK_CRITERIA) {
    if (!rollbackCriteria.has(criterion)) {
      errors.push(Object.freeze({ field: 'rollbackCriteria', message: `Missing rollback criterion: ${criterion}.` }));
    }
  }

  for (const action of FORBIDDEN_ACTIONS) {
    if (!forbiddenActions.has(action)) {
      errors.push(Object.freeze({ field: 'forbiddenActions', message: `Missing forbidden action: ${action}.` }));
    }
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}
