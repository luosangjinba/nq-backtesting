const DOM_WIRING_PLAN_ID = 'target-materialization-replay-diagnostics-readout-dom-wiring-plan';
const DOM_WIRING_OWNER = 'shell.pane-status-readout';
const VIEW_MODEL_ID = 'target-materialization-replay-diagnostics-readout-view-model';

const DOM_CONTAINER = Object.freeze({
  containerSelector: '[data-v6-pane-status-readout]',
  insertionPoint: 'after [data-v6-target-history-diagnostics]',
  readoutSelector: '[data-v6-target-materialization-diagnostics]',
  rowSelector: '[data-v6-target-materialization-diagnostics-row]',
  template: 'span.target-materialization-diagnostics-readout',
});

const DATASET_ATTRIBUTES = Object.freeze([
  'data-v6-target-materialization-diagnostics',
  'data-v6-target-materialization-diagnostics-mode',
  'data-v6-target-materialization-diagnostics-reason',
  'data-v6-target-materialization-diagnostics-pane-id',
  'data-v6-target-materialization-diagnostics-snapshot-ready',
  'data-v6-target-materialization-diagnostics-row',
  'data-v6-target-materialization-diagnostics-field',
  'data-v6-target-materialization-diagnostics-value',
]);

const CONSUMPTION_SEQUENCE = Object.freeze([
  Object.freeze({
    id: 'mount-pane-local-readout-containers',
    owner: DOM_WIRING_OWNER,
    reads: Object.freeze(['pane-status-readout-dom']),
    writes: Object.freeze(['domReadoutOnly']),
  }),
  Object.freeze({
    commandSurface: 'targetMaterializationReplayDiagnostics.getSnapshot',
    id: 'read-current-snapshot',
    owner: DOM_WIRING_OWNER,
    reads: Object.freeze(['diagnosticsSnapshot']),
    routesThrough: VIEW_MODEL_ID,
    writes: Object.freeze(['domReadoutOnly']),
  }),
  Object.freeze({
    eventSurface: 'targetMaterializationReplayDiagnostics:snapshotReady',
    id: 'refresh-on-snapshot-ready',
    owner: DOM_WIRING_OWNER,
    reads: Object.freeze(['diagnosticsSnapshot']),
    routesThrough: VIEW_MODEL_ID,
    writes: Object.freeze(['domReadoutOnly']),
  }),
]);

const RENDERING_RULES = Object.freeze([
  'hidden-view-model-removes-row-content-and-sets-hidden-mode',
  'collapsed-view-model-renders-first-visible-fields-only',
  'internal-only-fields-are-never-rendered-as-rows',
  'pane-id-mismatch-does-not-render-into-other-pane',
  'missing-container-skips-render-without-runtime-side-effects',
]);

const ROLLBACK_CRITERIA = Object.freeze([
  'pane-status-readout-layout-overlaps-chart-ohlc',
  'diagnostics-readout-causes-app-shell-browser-smoke-regression',
  'shell-code-calls-target-bars-api',
  'shell-code-dispatches-updateSnapshot',
  'producer-runtime-imports-diagnostics-commands',
  'view-model-exposes-internal-only-fields',
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
  'modify Display-Timeframe Runtime',
  'modify Manual Next Runtime',
  'modify Auto Play Runtime',
]);

function cloneSequenceStep(step) {
  return {
    commandSurface: step.commandSurface,
    eventSurface: step.eventSurface,
    id: step.id,
    owner: step.owner,
    reads: [...step.reads],
    routesThrough: step.routesThrough,
    writes: [...step.writes],
  };
}

function pushError(errors, field, message) {
  errors.push(Object.freeze({ field, message }));
}

export function getTargetMaterializationReplayDiagnosticsReadoutDomWiringPlanId() {
  return DOM_WIRING_PLAN_ID;
}

export function getTargetMaterializationReplayDiagnosticsReadoutDomWiringOwner() {
  return DOM_WIRING_OWNER;
}

export function getTargetMaterializationReplayDiagnosticsReadoutDomContainer() {
  return { ...DOM_CONTAINER };
}

export function getTargetMaterializationReplayDiagnosticsReadoutDomDatasetAttributes() {
  return [...DATASET_ATTRIBUTES];
}

export function getTargetMaterializationReplayDiagnosticsReadoutDomConsumptionSequence() {
  return CONSUMPTION_SEQUENCE.map(cloneSequenceStep);
}

export function getTargetMaterializationReplayDiagnosticsReadoutDomRenderingRules() {
  return [...RENDERING_RULES];
}

export function getTargetMaterializationReplayDiagnosticsReadoutDomRollbackCriteria() {
  return [...ROLLBACK_CRITERIA];
}

export function getTargetMaterializationReplayDiagnosticsReadoutDomForbiddenActions() {
  return [...FORBIDDEN_ACTIONS];
}

export function createTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan() {
  return Object.freeze({
    consumptionSequence: Object.freeze(getTargetMaterializationReplayDiagnosticsReadoutDomConsumptionSequence()),
    datasetAttributes: Object.freeze(getTargetMaterializationReplayDiagnosticsReadoutDomDatasetAttributes()),
    domContainer: Object.freeze(getTargetMaterializationReplayDiagnosticsReadoutDomContainer()),
    domVisibleUiWired: false,
    forbiddenActions: Object.freeze(getTargetMaterializationReplayDiagnosticsReadoutDomForbiddenActions()),
    id: DOM_WIRING_PLAN_ID,
    owner: DOM_WIRING_OWNER,
    renderingRules: Object.freeze(getTargetMaterializationReplayDiagnosticsReadoutDomRenderingRules()),
    rollbackCriteria: Object.freeze(getTargetMaterializationReplayDiagnosticsReadoutDomRollbackCriteria()),
    runtimeBehaviorChanges: false,
    targetHistoryRequestSizingUnchanged: true,
    viewModelId: VIEW_MODEL_ID,
  });
}

export function validateTargetMaterializationReplayDiagnosticsReadoutDomWiringPlan(plan = {}) {
  const errors = [];
  const datasetAttributes = new Set(plan.datasetAttributes || []);
  const renderingRules = new Set(plan.renderingRules || []);
  const rollbackCriteria = new Set(plan.rollbackCriteria || []);
  const forbiddenActions = new Set(plan.forbiddenActions || []);
  const sequence = Array.isArray(plan.consumptionSequence) ? plan.consumptionSequence : [];
  const commandSurfaces = new Set(sequence.map((step) => step.commandSurface).filter(Boolean));
  const eventSurfaces = new Set(sequence.map((step) => step.eventSurface).filter(Boolean));
  const routeTargets = new Set(sequence.map((step) => step.routesThrough).filter(Boolean));

  if (plan.id !== DOM_WIRING_PLAN_ID) {
    pushError(errors, 'id', 'DOM wiring plan id is invalid.');
  }
  if (plan.owner !== DOM_WIRING_OWNER) {
    pushError(errors, 'owner', 'DOM wiring owner must remain shell.pane-status-readout.');
  }
  if (plan.viewModelId !== VIEW_MODEL_ID || !routeTargets.has(VIEW_MODEL_ID)) {
    pushError(errors, 'viewModelId', 'DOM wiring must route diagnostics through the Step 349 view model.');
  }
  if (plan.domVisibleUiWired !== false || plan.runtimeBehaviorChanges !== false) {
    pushError(errors, 'domVisibleUiWired', 'Step 350 must remain a plan-only DOM wiring contract.');
  }
  if (plan.targetHistoryRequestSizingUnchanged !== true) {
    pushError(errors, 'targetHistoryRequestSizingUnchanged', 'DOM wiring planning must not change target-history request sizing.');
  }
  if (plan.domContainer?.containerSelector !== '[data-v6-pane-status-readout]') {
    pushError(errors, 'domContainer', 'DOM wiring must stay pane-local inside pane status readout.');
  }
  if (plan.domContainer?.insertionPoint !== 'after [data-v6-target-history-diagnostics]') {
    pushError(errors, 'domContainer', 'DOM wiring insertion point must follow target-history diagnostics.');
  }
  if (!commandSurfaces.has('targetMaterializationReplayDiagnostics.getSnapshot')) {
    pushError(errors, 'consumptionSequence', 'DOM wiring must read current diagnostics through getSnapshot.');
  }
  if (!eventSurfaces.has('targetMaterializationReplayDiagnostics:snapshotReady')) {
    pushError(errors, 'consumptionSequence', 'DOM wiring must refresh from snapshotReady.');
  }
  for (const attribute of DATASET_ATTRIBUTES) {
    if (!datasetAttributes.has(attribute)) {
      pushError(errors, 'datasetAttributes', `Missing dataset attribute: ${attribute}.`);
    }
  }
  for (const rule of RENDERING_RULES) {
    if (!renderingRules.has(rule)) {
      pushError(errors, 'renderingRules', `Missing rendering rule: ${rule}.`);
    }
  }
  for (const criterion of ROLLBACK_CRITERIA) {
    if (!rollbackCriteria.has(criterion)) {
      pushError(errors, 'rollbackCriteria', `Missing rollback criterion: ${criterion}.`);
    }
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
