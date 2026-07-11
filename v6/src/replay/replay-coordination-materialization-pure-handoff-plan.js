const HANDOFF_PLAN_ID = 'replay-coordination-materialization-pure-handoff-plan';

const HANDOFF_OWNER_SURFACES = Object.freeze([
  Object.freeze({
    id: 'display-materialization-intent',
    owner: 'display-timeframe-runtime',
    reads: Object.freeze(['paneId', 'instrument', 'displayTimeframe', 'targetHistoryWindow']),
    writes: Object.freeze(['targetDisplayWindowIntent']),
    commandSurface: null,
  }),
  Object.freeze({
    id: 'target-window-plan',
    owner: 'bar-data-runtime',
    reads: Object.freeze(['instrument', 'displayTimeframe', 'targetHistoryWindow']),
    writes: Object.freeze(['targetWindowPlan']),
    commandSurface: 'barData.planTargetWindow',
  }),
  Object.freeze({
    id: 'target-window-load',
    owner: 'bar-data-runtime',
    reads: Object.freeze(['targetWindowPlan']),
    writes: Object.freeze(['targetBarsCache', 'targetLoadDiagnostics']),
    commandSurface: 'barData.loadTargetWindow',
  }),
  Object.freeze({
    id: 'target-bar-reveal-state',
    owner: 'replay-coordination-materialization-contract',
    reads: Object.freeze(['sourceReplayCursorTimestamp', 'targetBars']),
    writes: Object.freeze(['targetBarRevealStates']),
    commandSurface: null,
  }),
  Object.freeze({
    id: 'display-bars-apply',
    owner: 'chart-data-runtime',
    reads: Object.freeze(['targetBars', 'targetBarRevealStates', 'sourceReplayCursorTimestamp']),
    writes: Object.freeze(['paneDisplayBars', 'noFutureFilteredBars']),
    commandSurface: 'chartData.replaceBars',
  }),
  Object.freeze({
    id: 'source-bars-preservation-check',
    owner: 'chart-data-runtime',
    reads: Object.freeze(['paneSourceBars']),
    writes: Object.freeze([]),
    commandSurface: 'chartData.getSourceBars',
  }),
  Object.freeze({
    id: 'viewport-reapply',
    owner: 'chart-viewport-runtime',
    reads: Object.freeze(['paneViewportIntent', 'chartDataRevision']),
    writes: Object.freeze(['projectedViewportIntent']),
    commandSurface: null,
  }),
]);

const HANDOFF_FORBIDDEN_SURFACES = Object.freeze([
  'replay.setCursorTime',
  'replay.next',
  'replay.previous',
  'chartViewport.project',
  'chartEngine.setData',
  'chartEngine.setVisibleLogicalRange',
  'shell.dispatchTargetHistory',
]);

function cloneSurface(surface) {
  return {
    commandSurface: surface.commandSurface,
    id: surface.id,
    owner: surface.owner,
    reads: [...surface.reads],
    writes: [...surface.writes],
  };
}

function normalizeNonEmptyText(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
  return normalized;
}

function normalizeOptionalText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export function getReplayCoordinationMaterializationHandoffPlanId() {
  return HANDOFF_PLAN_ID;
}

export function getReplayCoordinationMaterializationHandoffOwnerSurfaces() {
  return HANDOFF_OWNER_SURFACES.map(cloneSurface);
}

export function getReplayCoordinationMaterializationForbiddenSurfaces() {
  return [...HANDOFF_FORBIDDEN_SURFACES];
}

export function createReplayCoordinationMaterializationHandoffIntent(input = {}) {
  return Object.freeze({
    displayTimeframe: normalizeNonEmptyText(input.displayTimeframe ?? '8h', 'Replay coordination materialization displayTimeframe'),
    instrument: normalizeNonEmptyText(input.instrument ?? 'NQ', 'Replay coordination materialization instrument').toUpperCase(),
    paneId: normalizeNonEmptyText(input.paneId ?? 'main', 'Replay coordination materialization paneId'),
    replayCursorTimestamp: input.replayCursorTimestamp ?? null,
    targetHistoryEnd: normalizeOptionalText(input.targetHistoryEnd),
    targetHistoryStart: normalizeOptionalText(input.targetHistoryStart),
  });
}

export function createReplayCoordinationMaterializationPureHandoffPlan(input = {}) {
  const intent = createReplayCoordinationMaterializationHandoffIntent(input);
  return Object.freeze({
    forbiddenSurfaces: getReplayCoordinationMaterializationForbiddenSurfaces(),
    futureWiringPoint: Object.freeze({
      id: 'display-timeframe-target-materialization-handoff',
      owner: 'display-timeframe-runtime',
      preconditions: Object.freeze([
        'pure-handoff-plan-accepted',
        'target-window-plan-owner-surface-available',
        'target-window-load-owner-surface-available',
        'chart-data-replace-owner-surface-available',
        'source-1m-replay-cursor-available',
        'target-bar-reveal-policy-covered',
      ]),
    }),
    id: HANDOFF_PLAN_ID,
    intent,
    ownerSurfaces: getReplayCoordinationMaterializationHandoffOwnerSurfaces(),
    runtimeWiringReady: false,
    sourceReplayCursorAuthority: true,
    targetBarsDisplayMaterializationInputOnly: true,
  });
}

export function validateReplayCoordinationMaterializationPureHandoffPlan(plan = {}) {
  const errors = [];
  const surfaces = Array.isArray(plan.ownerSurfaces) ? plan.ownerSurfaces : [];
  const surfaceIds = new Set(surfaces.map((surface) => surface.id));
  const forbidden = new Set(plan.forbiddenSurfaces || []);

  for (const requiredId of [
    'display-materialization-intent',
    'target-window-plan',
    'target-window-load',
    'target-bar-reveal-state',
    'display-bars-apply',
    'source-bars-preservation-check',
    'viewport-reapply',
  ]) {
    if (!surfaceIds.has(requiredId)) {
      errors.push(Object.freeze({ field: 'ownerSurfaces', message: `Missing handoff owner surface: ${requiredId}.` }));
    }
  }

  if (plan.id !== HANDOFF_PLAN_ID) {
    errors.push(Object.freeze({ field: 'id', message: 'Replay coordination materialization handoff plan id is invalid.' }));
  }
  if (plan.runtimeWiringReady !== false) {
    errors.push(Object.freeze({ field: 'runtimeWiringReady', message: 'Pure handoff plan must not enable runtime wiring.' }));
  }
  if (plan.sourceReplayCursorAuthority !== true) {
    errors.push(Object.freeze({ field: 'sourceReplayCursorAuthority', message: 'Source 1m replay cursor must remain authority.' }));
  }
  if (plan.targetBarsDisplayMaterializationInputOnly !== true) {
    errors.push(Object.freeze({ field: 'targetBarsDisplayMaterializationInputOnly', message: 'Target bars must stay display materialization input only.' }));
  }

  for (const forbiddenSurface of HANDOFF_FORBIDDEN_SURFACES) {
    if (!forbidden.has(forbiddenSurface)) {
      errors.push(Object.freeze({ field: 'forbiddenSurfaces', message: `Missing forbidden surface: ${forbiddenSurface}.` }));
    }
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}
