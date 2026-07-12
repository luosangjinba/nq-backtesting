const READOUT_PLAN_ID = 'target-materialization-replay-diagnostics-readout-owner-plan';
const READOUT_OWNER = 'shell.pane-status-readout';

const PLACEMENT = Object.freeze({
  mode: 'developer-collapsed-pane-status-readout',
  owner: READOUT_OWNER,
  reason: 'reuse the existing pane-local diagnostics surface without adding a new workstation chrome area',
});

const FIRST_VISIBLE_FIELDS = Object.freeze([
  'displayTimeframe',
  'targetHistoryStatus',
  'projectionOwner',
  'manualNextStatus',
  'autoPlayStatus',
  'fallbackStatus',
]);

const INTERNAL_ONLY_FIELDS = Object.freeze([
  'paneId',
  'sourceCursorTime',
  'sourceCursorAuthority',
  'targetBarsDisplayInputOnly',
  'latestSourceTimestamp',
  'latestDisplayTimestamp',
  'targetHistoryReason',
  'displayApplyStatus',
]);

const VISIBILITY_RULES = Object.freeze([
  'hidden-by-default-for-normal-replay',
  'collapsed-unless-target-history-active-or-fallback',
  'pane-local-only',
  'show-only-when-diagnostics-snapshot-ready',
  'no-expanded-diagnostics-during-order-ticket-or-journal-workflows',
]);

const CONSUMPTION_SEQUENCE = Object.freeze([
  Object.freeze({
    commandSurface: 'targetMaterializationReplayDiagnostics.getSnapshot',
    id: 'read-current-diagnostics-snapshot',
    owner: READOUT_OWNER,
    writes: Object.freeze(['domReadoutOnly']),
  }),
  Object.freeze({
    eventSurface: 'targetMaterializationReplayDiagnostics:snapshotReady',
    id: 'refresh-on-snapshot-ready',
    owner: READOUT_OWNER,
    writes: Object.freeze(['domReadoutOnly']),
  }),
]);

const FORBIDDEN_ACTIONS = Object.freeze([
  'call target bars API',
  'dispatch targetMaterializationReplayDiagnostics.updateSnapshot',
  'dispatch replay.next',
  'dispatch replay.setCursorTime',
  'dispatch barData.planTargetWindow',
  'dispatch barData.loadTargetWindow',
  'dispatch chartData.replaceBars',
  'dispatch chartData.appendBars',
  'dispatch chartViewport.resetView',
  'write chart engine series directly',
  'change target-history request sizing',
  'change chart-history fast-path delay policy',
]);

function cloneSequenceStep(step) {
  return {
    commandSurface: step.commandSurface,
    eventSurface: step.eventSurface,
    id: step.id,
    owner: step.owner,
    writes: [...step.writes],
  };
}

function pushError(errors, field, message) {
  errors.push(Object.freeze({ field, message }));
}

export function getTargetMaterializationReplayDiagnosticsReadoutPlanId() {
  return READOUT_PLAN_ID;
}

export function getTargetMaterializationReplayDiagnosticsReadoutOwner() {
  return READOUT_OWNER;
}

export function getTargetMaterializationReplayDiagnosticsFirstVisibleFields() {
  return [...FIRST_VISIBLE_FIELDS];
}

export function getTargetMaterializationReplayDiagnosticsInternalOnlyFields() {
  return [...INTERNAL_ONLY_FIELDS];
}

export function getTargetMaterializationReplayDiagnosticsVisibilityRules() {
  return [...VISIBILITY_RULES];
}

export function getTargetMaterializationReplayDiagnosticsConsumptionSequence() {
  return CONSUMPTION_SEQUENCE.map(cloneSequenceStep);
}

export function getTargetMaterializationReplayDiagnosticsReadoutForbiddenActions() {
  return [...FORBIDDEN_ACTIONS];
}

export function createTargetMaterializationReplayDiagnosticsReadoutOwnerPlan() {
  return Object.freeze({
    chartHistoryFastPathUnchanged: true,
    consumptionSequence: Object.freeze(getTargetMaterializationReplayDiagnosticsConsumptionSequence()),
    firstVisibleFields: Object.freeze(getTargetMaterializationReplayDiagnosticsFirstVisibleFields()),
    forbiddenActions: Object.freeze(getTargetMaterializationReplayDiagnosticsReadoutForbiddenActions()),
    id: READOUT_PLAN_ID,
    internalOnlyFields: Object.freeze(getTargetMaterializationReplayDiagnosticsInternalOnlyFields()),
    owner: READOUT_OWNER,
    placement: PLACEMENT,
    runtimeBehaviorChanges: false,
    shellVisibleUiReady: false,
    targetBarsDisplayMaterializationInputOnly: true,
    targetHistoryRequestSizingUnchanged: true,
    visibilityRules: Object.freeze(getTargetMaterializationReplayDiagnosticsVisibilityRules()),
  });
}

export function validateTargetMaterializationReplayDiagnosticsReadoutOwnerPlan(plan = {}) {
  const errors = [];
  const visibleFields = new Set(plan.firstVisibleFields || []);
  const internalFields = new Set(plan.internalOnlyFields || []);
  const rules = new Set(plan.visibilityRules || []);
  const forbiddenActions = new Set(plan.forbiddenActions || []);
  const sequence = Array.isArray(plan.consumptionSequence) ? plan.consumptionSequence : [];
  const commands = new Set(sequence.map((step) => step.commandSurface).filter(Boolean));
  const events = new Set(sequence.map((step) => step.eventSurface).filter(Boolean));

  if (plan.id !== READOUT_PLAN_ID) {
    pushError(errors, 'id', 'Diagnostics readout owner plan id is invalid.');
  }
  if (plan.owner !== READOUT_OWNER) {
    pushError(errors, 'owner', 'Diagnostics readout owner must remain shell.pane-status-readout.');
  }
  if (plan.runtimeBehaviorChanges !== false || plan.shellVisibleUiReady !== false) {
    pushError(errors, 'shellVisibleUiReady', 'Step 348 must remain a plan-only readout owner contract.');
  }
  if (plan.targetBarsDisplayMaterializationInputOnly !== true) {
    pushError(errors, 'targetBarsDisplayMaterializationInputOnly', 'Target bars must remain display materialization inputs only.');
  }
  if (plan.targetHistoryRequestSizingUnchanged !== true) {
    pushError(errors, 'targetHistoryRequestSizingUnchanged', 'Readout planning must not change target-history request sizing.');
  }
  if (plan.chartHistoryFastPathUnchanged !== true) {
    pushError(errors, 'chartHistoryFastPathUnchanged', 'Readout planning must not change chart-history fast-path behavior.');
  }
  if (plan.placement?.mode !== 'developer-collapsed-pane-status-readout') {
    pushError(errors, 'placement', 'First diagnostics readout must be developer-collapsed in pane status.');
  }

  for (const field of FIRST_VISIBLE_FIELDS) {
    if (!visibleFields.has(field)) {
      pushError(errors, 'firstVisibleFields', `Missing first visible field: ${field}.`);
    }
  }
  for (const field of INTERNAL_ONLY_FIELDS) {
    if (!internalFields.has(field)) {
      pushError(errors, 'internalOnlyFields', `Missing internal-only field: ${field}.`);
    }
  }
  for (const field of ['sourceCursorAuthority', 'targetBarsDisplayInputOnly', 'latestSourceTimestamp']) {
    if (visibleFields.has(field)) {
      pushError(errors, 'firstVisibleFields', `Field must remain internal-only first: ${field}.`);
    }
  }
  for (const rule of VISIBILITY_RULES) {
    if (!rules.has(rule)) {
      pushError(errors, 'visibilityRules', `Missing visibility rule: ${rule}.`);
    }
  }
  if (!commands.has('targetMaterializationReplayDiagnostics.getSnapshot')) {
    pushError(errors, 'consumptionSequence', 'Shell readout must read diagnostics through getSnapshot.');
  }
  if (!events.has('targetMaterializationReplayDiagnostics:snapshotReady')) {
    pushError(errors, 'consumptionSequence', 'Shell readout must refresh from snapshotReady.');
  }
  for (const action of FORBIDDEN_ACTIONS) {
    if (!forbiddenActions.has(action)) {
      pushError(errors, 'forbiddenActions', `Missing forbidden action: ${action}.`);
    }
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}
