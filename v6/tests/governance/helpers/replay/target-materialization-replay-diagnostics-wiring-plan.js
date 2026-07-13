const WIRING_PLAN_ID = 'target-materialization-replay-diagnostics-runtime-wiring-plan';
const WIRING_OWNER = 'runtime.target-materialization-replay-diagnostics';

const PRODUCER_SEQUENCE = Object.freeze([
  Object.freeze({
    consumesEvent: 'displayTimeframe:applied',
    diagnosticFields: Object.freeze([
      'paneId',
      'displayTimeframe',
      'displayApplyStatus',
      'projectionOwner',
      'targetHistoryStatus',
      'targetHistoryReason',
      'fallbackStatus',
      'latestDisplayTimestamp',
      'latestSourceTimestamp',
    ]),
    id: 'consume-display-timeframe-applied',
    producer: 'display-timeframe-runtime',
    updateSurface: 'targetMaterializationReplayDiagnostics.updateSnapshot',
  }),
  Object.freeze({
    consumesEvent: 'chartEntryManualNext:advanced',
    diagnosticFields: Object.freeze([
      'paneId',
      'manualNextStatus',
      'sourceCursorTime',
      'sourceCursorAuthority',
      'latestSourceTimestamp',
    ]),
    id: 'consume-manual-next-advanced',
    producer: 'chart-entry-manual-next-runtime',
    updateSurface: 'targetMaterializationReplayDiagnostics.updateSnapshot',
  }),
  Object.freeze({
    consumesEvent: 'chartEntryAutoPlay:ticked',
    diagnosticFields: Object.freeze([
      'autoPlayStatus',
      'sourceCursorTime',
      'sourceCursorAuthority',
    ]),
    id: 'consume-auto-play-ticked',
    producer: 'chart-entry-auto-play-runtime',
    updateSurface: 'targetMaterializationReplayDiagnostics.updateSnapshot',
  }),
  Object.freeze({
    consumesEvent: 'chartEntryAutoPlay:started',
    diagnosticFields: Object.freeze(['autoPlayStatus']),
    id: 'consume-auto-play-started',
    producer: 'chart-entry-auto-play-runtime',
    updateSurface: 'targetMaterializationReplayDiagnostics.updateSnapshot',
  }),
  Object.freeze({
    consumesEvent: 'chartEntryAutoPlay:stopped',
    diagnosticFields: Object.freeze(['autoPlayStatus', 'fallbackStatus']),
    id: 'consume-auto-play-stopped',
    producer: 'chart-entry-auto-play-runtime',
    updateSurface: 'targetMaterializationReplayDiagnostics.updateSnapshot',
  }),
]);

const CONSUMER_SEQUENCE = Object.freeze([
  Object.freeze({
    consumesEvent: 'targetMaterializationReplayDiagnostics:snapshotReady',
    id: 'shell-consume-snapshot-ready',
    owner: 'shell-diagnostics-readout',
    reads: Object.freeze(['diagnosticSnapshot']),
  }),
  Object.freeze({
    commandSurface: 'targetMaterializationReplayDiagnostics.getSnapshot',
    id: 'shell-read-current-snapshot',
    owner: 'shell-diagnostics-readout',
    reads: Object.freeze(['diagnosticSnapshot']),
  }),
]);

const FALLBACK_GATES = Object.freeze([
  'diagnostics-runtime-started',
  'producer-event-payload-normalized',
  'snapshot-validation-preserves-source-cursor-authority',
  'snapshot-validation-preserves-target-bars-display-input-only',
  'shell-consumes-command-event-snapshot-only',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
]);

const ROLLBACK_CRITERIA = Object.freeze([
  'diagnostics-wiring-mutates-replay-cursor',
  'diagnostics-wiring-loads-target-bars',
  'diagnostics-wiring-writes-chart-data',
  'diagnostics-wiring-mutates-viewport-intent',
  'diagnostics-wiring-writes-visible-ui-before-readout-step',
  'diagnostics-wiring-regresses-replay-coordination-pack',
]);

const FORBIDDEN_ACTIONS = Object.freeze([
  'dispatch replay.next',
  'dispatch replay.previous',
  'dispatch replay.setCursorTime',
  'dispatch barData.planTargetWindow',
  'dispatch barData.loadTargetWindow',
  'dispatch chartData.replaceBars',
  'dispatch chartData.appendBars',
  'dispatch chartViewport.resetView',
  'call target bars API directly',
  'write chart engine series directly',
  'write visible shell diagnostics UI',
  'change target-history request sizing',
  'change chart-history fast-path delay policy',
]);

function cloneSequenceStep(step) {
  return {
    commandSurface: step.commandSurface,
    consumesEvent: step.consumesEvent,
    diagnosticFields: step.diagnosticFields ? [...step.diagnosticFields] : undefined,
    id: step.id,
    owner: step.owner,
    producer: step.producer,
    reads: step.reads ? [...step.reads] : undefined,
    updateSurface: step.updateSurface,
  };
}

function pushError(errors, field, message) {
  errors.push(Object.freeze({ field, message }));
}

export function getTargetMaterializationReplayDiagnosticsWiringPlanId() {
  return WIRING_PLAN_ID;
}

export function getTargetMaterializationReplayDiagnosticsWiringOwner() {
  return WIRING_OWNER;
}

export function getTargetMaterializationReplayDiagnosticsProducerSequence() {
  return PRODUCER_SEQUENCE.map(cloneSequenceStep);
}

export function getTargetMaterializationReplayDiagnosticsConsumerSequence() {
  return CONSUMER_SEQUENCE.map(cloneSequenceStep);
}

export function getTargetMaterializationReplayDiagnosticsWiringFallbackGates() {
  return [...FALLBACK_GATES];
}

export function getTargetMaterializationReplayDiagnosticsWiringRollbackCriteria() {
  return [...ROLLBACK_CRITERIA];
}

export function getTargetMaterializationReplayDiagnosticsWiringForbiddenActions() {
  return [...FORBIDDEN_ACTIONS];
}

export function createTargetMaterializationReplayDiagnosticsWiringPlan() {
  return Object.freeze({
    chartHistoryFastPathUnchanged: true,
    consumerSequence: Object.freeze(getTargetMaterializationReplayDiagnosticsConsumerSequence()),
    fallbackGates: Object.freeze(getTargetMaterializationReplayDiagnosticsWiringFallbackGates()),
    forbiddenActions: Object.freeze(getTargetMaterializationReplayDiagnosticsWiringForbiddenActions()),
    id: WIRING_PLAN_ID,
    owner: WIRING_OWNER,
    preservesSourceReplayCursorAuthority: true,
    producerSequence: Object.freeze(getTargetMaterializationReplayDiagnosticsProducerSequence()),
    rollbackCriteria: Object.freeze(getTargetMaterializationReplayDiagnosticsWiringRollbackCriteria()),
    runtimeBehaviorChanges: false,
    runtimeWiringReady: false,
    shellVisibleUiReady: false,
    targetBarsDisplayMaterializationInputOnly: true,
    targetHistoryRequestSizingUnchanged: true,
    updateCommandReady: false,
  });
}

export function validateTargetMaterializationReplayDiagnosticsWiringPlan(plan = {}) {
  const errors = [];
  const producerSequence = Array.isArray(plan.producerSequence) ? plan.producerSequence : [];
  const consumerSequence = Array.isArray(plan.consumerSequence) ? plan.consumerSequence : [];
  const producerIds = new Set(producerSequence.map((step) => step.id));
  const producerEvents = new Set(producerSequence.map((step) => step.consumesEvent).filter(Boolean));
  const updateSurfaces = new Set(producerSequence.map((step) => step.updateSurface).filter(Boolean));
  const consumerEvents = new Set(consumerSequence.map((step) => step.consumesEvent).filter(Boolean));
  const consumerCommands = new Set(consumerSequence.map((step) => step.commandSurface).filter(Boolean));
  const fallbackGates = new Set(plan.fallbackGates || []);
  const forbiddenActions = new Set(plan.forbiddenActions || []);
  const rollbackCriteria = new Set(plan.rollbackCriteria || []);

  if (plan.id !== WIRING_PLAN_ID) {
    pushError(errors, 'id', 'Target materialization replay diagnostics wiring plan id is invalid.');
  }
  if (plan.owner !== WIRING_OWNER) {
    pushError(errors, 'owner', 'Diagnostics runtime must own the future diagnostics wiring surface.');
  }
  if (plan.runtimeBehaviorChanges !== false || plan.runtimeWiringReady !== false || plan.updateCommandReady !== false) {
    pushError(errors, 'runtimeWiringReady', 'Step 343 must remain a read-only wiring plan without live update wiring.');
  }
  if (plan.shellVisibleUiReady !== false) {
    pushError(errors, 'shellVisibleUiReady', 'Step 343 must not wire visible shell UI.');
  }
  if (plan.preservesSourceReplayCursorAuthority !== true) {
    pushError(errors, 'preservesSourceReplayCursorAuthority', 'Source 1m replay cursor must remain authority.');
  }
  if (plan.targetBarsDisplayMaterializationInputOnly !== true) {
    pushError(errors, 'targetBarsDisplayMaterializationInputOnly', 'Target bars must stay display materialization inputs only.');
  }
  if (plan.targetHistoryRequestSizingUnchanged !== true) {
    pushError(errors, 'targetHistoryRequestSizingUnchanged', 'Diagnostics wiring plan must keep target-history request sizing unchanged.');
  }
  if (plan.chartHistoryFastPathUnchanged !== true) {
    pushError(errors, 'chartHistoryFastPathUnchanged', 'Diagnostics wiring plan must keep chart-history fast-path behavior unchanged.');
  }

  for (const requiredProducer of [
    'consume-display-timeframe-applied',
    'consume-manual-next-advanced',
    'consume-auto-play-ticked',
    'consume-auto-play-started',
    'consume-auto-play-stopped',
  ]) {
    if (!producerIds.has(requiredProducer)) {
      pushError(errors, 'producerSequence', `Missing diagnostics producer: ${requiredProducer}.`);
    }
  }

  for (const requiredEvent of [
    'displayTimeframe:applied',
    'chartEntryManualNext:advanced',
    'chartEntryAutoPlay:ticked',
    'chartEntryAutoPlay:started',
    'chartEntryAutoPlay:stopped',
  ]) {
    if (!producerEvents.has(requiredEvent)) {
      pushError(errors, 'producerSequence', `Missing producer event: ${requiredEvent}.`);
    }
  }

  if (!updateSurfaces.has('targetMaterializationReplayDiagnostics.updateSnapshot')) {
    pushError(errors, 'producerSequence', 'Missing future update surface: targetMaterializationReplayDiagnostics.updateSnapshot.');
  }
  if (!consumerEvents.has('targetMaterializationReplayDiagnostics:snapshotReady')) {
    pushError(errors, 'consumerSequence', 'Missing shell consumer event: targetMaterializationReplayDiagnostics:snapshotReady.');
  }
  if (!consumerCommands.has('targetMaterializationReplayDiagnostics.getSnapshot')) {
    pushError(errors, 'consumerSequence', 'Missing shell consumer command: targetMaterializationReplayDiagnostics.getSnapshot.');
  }

  for (const gate of FALLBACK_GATES) {
    if (!fallbackGates.has(gate)) {
      pushError(errors, 'fallbackGates', `Missing fallback gate: ${gate}.`);
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
