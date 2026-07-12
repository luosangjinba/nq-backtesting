import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';

const PLAN_ID = 'narrow-replay-materialization-runtime-handoff-plan';
const OWNER_BOUNDARY = 'runtime.replay-coordination-materialization-handoff';
const OWNER_MODULE = 'replay-coordination-materialization-runtime-handoff';

const EVENT_SEQUENCE = Object.freeze([
  Object.freeze({
    id: 'manual-next-advanced-trigger',
    eventSurface: CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED,
    owner: OWNER_BOUNDARY,
    reads: Object.freeze(['paneId', 'replayCursorTimestamp', 'sourceTimeframe']),
    writes: Object.freeze(['handoffRequest']),
  }),
]);

const COMMAND_SEQUENCE = Object.freeze([
  Object.freeze({
    id: 'resolve-pane-context',
    commandSurface: PANE_COMMANDS.GET_BY_ID,
    owner: 'pane-runtime',
    reads: Object.freeze(['paneId']),
    writes: Object.freeze(['instrument', 'displayTimeframe', 'paneTargetWindow']),
  }),
  Object.freeze({
    id: 'read-replay-cursor',
    commandSurface: REPLAY_COMMANDS.GET_STATE,
    owner: 'replay-runtime',
    reads: Object.freeze(['sessionId', 'cursorTime', 'cursorIndex']),
    writes: Object.freeze(['sourceReplayCursorTimestamp']),
  }),
  Object.freeze({
    id: 'read-source-bars',
    commandSurface: CHART_DATA_COMMANDS.GET_SOURCE_BARS,
    owner: 'chart-data-runtime',
    reads: Object.freeze(['paneId']),
    writes: Object.freeze(['sourceBars']),
  }),
  Object.freeze({
    id: 'plan-target-window',
    commandSurface: BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW,
    owner: 'bar-data-runtime',
    reads: Object.freeze(['instrument', 'displayTimeframe', 'paneTargetWindow', 'sourceReplayCursorTimestamp']),
    writes: Object.freeze(['targetWindowPlan']),
  }),
  Object.freeze({
    id: 'load-target-window',
    commandSurface: BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW,
    owner: 'bar-data-runtime',
    reads: Object.freeze(['targetWindowPlan']),
    writes: Object.freeze(['targetBars', 'targetLoadDiagnostics']),
  }),
  Object.freeze({
    id: 'replace-display-bars',
    commandSurface: CHART_DATA_COMMANDS.REPLACE_BARS,
    owner: 'chart-data-runtime',
    reads: Object.freeze(['paneId', 'targetBars', 'sourceReplayCursorTimestamp']),
    writes: Object.freeze(['paneDisplayBars']),
    options: Object.freeze({
      preserveSource: true,
      revealPolicy: 'source-cursor-no-future-target-bars',
    }),
  }),
]);

const FALLBACK_GATES = Object.freeze([
  Object.freeze({
    id: 'ignore-source-timeframe-display',
    when: 'display-timeframe-is-source-1m',
    result: 'no-target-window-request',
  }),
  Object.freeze({
    id: 'missing-pane-context',
    when: 'pane.getById-missing-or-invalid',
    result: 'skip-handoff-without-replay-cursor-change',
  }),
  Object.freeze({
    id: 'missing-replay-cursor',
    when: 'replay.getState-missing-cursor',
    result: 'skip-handoff-without-chart-data-change',
  }),
  Object.freeze({
    id: 'missing-source-bars',
    when: 'chartData.getSourceBars-empty',
    result: 'skip-target-replace-and-preserve-current-bars',
  }),
  Object.freeze({
    id: 'target-window-plan-unavailable',
    when: 'barData.planTargetWindow-rejected-or-empty',
    result: 'fallback-to-source-display-without-target-bars',
  }),
  Object.freeze({
    id: 'target-window-load-unavailable',
    when: 'barData.loadTargetWindow-rejected-or-empty',
    result: 'fallback-to-source-display-without-target-bars',
  }),
  Object.freeze({
    id: 'target-bars-all-future',
    when: 'source-cursor-reveal-policy-filters-all-target-bars',
    result: 'preserve-current-display-bars',
  }),
]);

const FORBIDDEN_SURFACES = Object.freeze([
  'replay.next',
  'replay.previous',
  'replay.setCursorTime',
  'chartViewport.resetView',
  'chartViewport.setManualIntent',
  'chart-render-series-write',
  'chart-render-range-write',
  'shell.targetBarsApi',
  'targetMaterializationReplayDiagnostics.updateSnapshot',
]);

function cloneStep(step) {
  return {
    commandSurface: step.commandSurface ?? null,
    eventSurface: step.eventSurface ?? null,
    id: step.id,
    options: step.options ? { ...step.options } : undefined,
    owner: step.owner,
    reads: [...step.reads],
    writes: [...step.writes],
  };
}

function cloneGate(gate) {
  return { ...gate };
}

export function getNarrowReplayMaterializationRuntimeHandoffPlanId() {
  return PLAN_ID;
}

export function getNarrowReplayMaterializationRuntimeHandoffEventSequence() {
  return EVENT_SEQUENCE.map(cloneStep);
}

export function getNarrowReplayMaterializationRuntimeHandoffCommandSequence() {
  return COMMAND_SEQUENCE.map(cloneStep);
}

export function getNarrowReplayMaterializationRuntimeHandoffFallbackGates() {
  return FALLBACK_GATES.map(cloneGate);
}

export function getNarrowReplayMaterializationRuntimeHandoffForbiddenSurfaces() {
  return [...FORBIDDEN_SURFACES];
}

export function createNarrowReplayMaterializationRuntimeHandoffPlan() {
  return Object.freeze({
    autoPlayCoverage: Object.freeze({
      coveredBy: CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED,
      reason: 'Auto Play dispatches Manual Next for each tick, so the handoff listens to the Manual Next advanced event only.',
    }),
    commandSequence: Object.freeze(getNarrowReplayMaterializationRuntimeHandoffCommandSequence()),
    eventSequence: Object.freeze(getNarrowReplayMaterializationRuntimeHandoffEventSequence()),
    fallbackGates: Object.freeze(getNarrowReplayMaterializationRuntimeHandoffFallbackGates()),
    forbiddenSurfaces: Object.freeze(getNarrowReplayMaterializationRuntimeHandoffForbiddenSurfaces()),
    id: PLAN_ID,
    ownerBoundary: OWNER_BOUNDARY,
    ownerModule: OWNER_MODULE,
    runtimeBehaviorChanges: false,
    runtimeWiringReady: false,
    sourceReplayCursorAuthority: '1m',
    targetBarsDisplayMaterializationInputOnly: true,
  });
}

export function validateNarrowReplayMaterializationRuntimeHandoffPlan(plan = {}) {
  const errors = [];
  const eventSurfaces = new Set((plan.eventSequence || []).map((step) => step.eventSurface));
  const commandSurfaces = new Set((plan.commandSequence || []).map((step) => step.commandSurface));
  const fallbackGateIds = new Set((plan.fallbackGates || []).map((gate) => gate.id));
  const forbiddenSurfaces = new Set(plan.forbiddenSurfaces || []);

  if (plan.id !== PLAN_ID) {
    errors.push(Object.freeze({ field: 'id', message: 'Narrow replay materialization runtime handoff plan id is invalid.' }));
  }
  if (plan.ownerBoundary !== OWNER_BOUNDARY) {
    errors.push(Object.freeze({ field: 'ownerBoundary', message: 'Future owner boundary must remain replay-coordination materialization handoff.' }));
  }
  if (plan.ownerModule !== OWNER_MODULE) {
    errors.push(Object.freeze({ field: 'ownerModule', message: 'Future owner module must remain the new replay-coordination runtime helper.' }));
  }
  if (plan.runtimeBehaviorChanges !== false || plan.runtimeWiringReady !== false) {
    errors.push(Object.freeze({ field: 'runtimeWiringReady', message: 'Step 357 must remain plan-only without runtime behavior wiring.' }));
  }
  if (plan.sourceReplayCursorAuthority !== '1m') {
    errors.push(Object.freeze({ field: 'sourceReplayCursorAuthority', message: 'Source 1m replay cursor must remain authority.' }));
  }
  if (plan.targetBarsDisplayMaterializationInputOnly !== true) {
    errors.push(Object.freeze({ field: 'targetBarsDisplayMaterializationInputOnly', message: 'Target bars must remain display materialization input only.' }));
  }
  if (!eventSurfaces.has(CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED)) {
    errors.push(Object.freeze({ field: 'eventSequence', message: 'Manual Next advanced event must be the handoff trigger.' }));
  }
  for (const commandSurface of [
    PANE_COMMANDS.GET_BY_ID,
    REPLAY_COMMANDS.GET_STATE,
    CHART_DATA_COMMANDS.GET_SOURCE_BARS,
    BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW,
    BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW,
    CHART_DATA_COMMANDS.REPLACE_BARS,
  ]) {
    if (!commandSurfaces.has(commandSurface)) {
      errors.push(Object.freeze({ field: 'commandSequence', message: `Missing command surface: ${commandSurface}.` }));
    }
  }
  for (const fallbackGate of [
    'ignore-source-timeframe-display',
    'missing-pane-context',
    'missing-replay-cursor',
    'missing-source-bars',
    'target-window-plan-unavailable',
    'target-window-load-unavailable',
    'target-bars-all-future',
  ]) {
    if (!fallbackGateIds.has(fallbackGate)) {
      errors.push(Object.freeze({ field: 'fallbackGates', message: `Missing fallback gate: ${fallbackGate}.` }));
    }
  }
  for (const forbiddenSurface of FORBIDDEN_SURFACES) {
    if (!forbiddenSurfaces.has(forbiddenSurface)) {
      errors.push(Object.freeze({ field: 'forbiddenSurfaces', message: `Missing forbidden surface: ${forbiddenSurface}.` }));
    }
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}
