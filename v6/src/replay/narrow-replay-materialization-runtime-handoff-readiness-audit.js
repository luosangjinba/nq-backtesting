import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';

const AUDIT_ID = 'narrow-replay-materialization-runtime-handoff-readiness-audit';

const FUTURE_OWNER = Object.freeze({
  boundary: 'runtime.replay-coordination-materialization-handoff',
  module: 'replay-coordination-materialization-runtime-handoff',
  reason: 'Replay cursor advances are the trigger; display-timeframe runtime remains the TF-switch owner and diagnostics runtime remains read-only observability.',
  selectedOwner: 'new-replay-coordination-runtime-helper',
});

const ALLOWED_EVENT_SURFACES = Object.freeze([
  CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED,
]);

const ALLOWED_COMMAND_SURFACES = Object.freeze([
  PANE_COMMANDS.GET_BY_ID,
  REPLAY_COMMANDS.GET_STATE,
  CHART_DATA_COMMANDS.GET_SOURCE_BARS,
  BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW,
  BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW,
  CHART_DATA_COMMANDS.REPLACE_BARS,
]);

const FORBIDDEN_SURFACES = Object.freeze([
  'replay.next',
  'replay.previous',
  'replay.setCursorTime',
  'chartViewport.resetView',
  'chartViewport.setManualIntent',
  'chart-engine-series-data-write',
  'chart-engine-visible-range-write',
  'shell.targetBarsApi',
  'targetMaterializationReplayDiagnostics.updateSnapshot',
]);

const ACCEPTANCE_GATES = Object.freeze([
  'future-owner-is-new-replay-coordination-runtime-helper',
  'manual-next-advanced-event-is-primary-trigger',
  'auto-play-covered-through-manual-next-advanced',
  'display-timeframe-runtime-remains-tf-switch-owner',
  'diagnostics-runtime-remains-read-only-observability',
  'source-1m-replay-cursor-authority-preserved',
  'target-bars-display-materialization-input-only',
  'target-bar-reveal-policy-uses-source-cursor',
  'chart-data-replace-preserves-source-bars',
  'bar-data-owns-target-window-plan-and-load',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
  'default-target-history-pack-preserved',
  'optional-pack-members-preserved',
  'no-runtime-behavior-change-in-audit-step',
]);

function normalizeEvidence(evidence = {}) {
  return {
    autoPlayCoveredThroughManualNext: Boolean(evidence.autoPlayCoveredThroughManualNext),
    barDataTargetWindowSurfacesAvailable: Boolean(evidence.barDataTargetWindowSurfacesAvailable),
    chartDataReplacePreservesSource: Boolean(evidence.chartDataReplacePreservesSource),
    defaultPackPreserved: Boolean(evidence.defaultPackPreserved),
    diagnosticsRuntimeReadOnly: Boolean(evidence.diagnosticsRuntimeReadOnly),
    displayTimeframeRuntimeOwnsTfSwitch: Boolean(evidence.displayTimeframeRuntimeOwnsTfSwitch),
    manualNextAdvancedEventAvailable: Boolean(evidence.manualNextAdvancedEventAvailable),
    optionalPackMembersPreserved: Boolean(evidence.optionalPackMembersPreserved),
    sourceReplayCursorAuthority: Boolean(evidence.sourceReplayCursorAuthority),
    targetBarRevealPolicyCovered: Boolean(evidence.targetBarRevealPolicyCovered),
    targetBarsDisplayInputOnly: Boolean(evidence.targetBarsDisplayInputOnly),
  };
}

export function auditNarrowReplayMaterializationRuntimeHandoffReadiness({
  chartHistoryFastPathUnchanged = true,
  evidence = {},
  producerRuntimesUnchanged = true,
  targetHistoryRequestSizingUnchanged = true,
} = {}) {
  const normalizedEvidence = normalizeEvidence(evidence);
  const checks = {
    autoPlayCoveredThroughManualNext: normalizedEvidence.autoPlayCoveredThroughManualNext,
    barDataTargetWindowSurfacesAvailable: normalizedEvidence.barDataTargetWindowSurfacesAvailable,
    chartDataReplacePreservesSource: normalizedEvidence.chartDataReplacePreservesSource,
    chartHistoryFastPathUnchanged: Boolean(chartHistoryFastPathUnchanged),
    defaultPackPreserved: normalizedEvidence.defaultPackPreserved,
    diagnosticsRuntimeReadOnly: normalizedEvidence.diagnosticsRuntimeReadOnly,
    displayTimeframeRuntimeOwnsTfSwitch: normalizedEvidence.displayTimeframeRuntimeOwnsTfSwitch,
    manualNextAdvancedEventAvailable: normalizedEvidence.manualNextAdvancedEventAvailable,
    optionalPackMembersPreserved: normalizedEvidence.optionalPackMembersPreserved,
    producerRuntimesUnchanged: Boolean(producerRuntimesUnchanged),
    sourceReplayCursorAuthority: normalizedEvidence.sourceReplayCursorAuthority,
    targetBarRevealPolicyCovered: normalizedEvidence.targetBarRevealPolicyCovered,
    targetBarsDisplayInputOnly: normalizedEvidence.targetBarsDisplayInputOnly,
    targetHistoryRequestSizingUnchanged: Boolean(targetHistoryRequestSizingUnchanged),
  };
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  return Object.freeze({
    allowedCommandSurfaces: [...ALLOWED_COMMAND_SURFACES],
    allowedEventSurfaces: [...ALLOWED_EVENT_SURFACES],
    checks: Object.freeze(checks),
    failed: Object.freeze(failed),
    forbiddenSurfaces: [...FORBIDDEN_SURFACES],
    futureOwner: { ...FUTURE_OWNER },
    id: AUDIT_ID,
    ready: failed.length === 0,
  });
}

export function createNarrowReplayMaterializationRuntimeHandoffReadinessReport(input = {}) {
  const audit = auditNarrowReplayMaterializationRuntimeHandoffReadiness(input);
  if (!audit.ready) {
    return Object.freeze({
      acceptanceGates: [...ACCEPTANCE_GATES],
      audit,
      futureOwner: audit.futureOwner,
      nextStep: null,
      reason: 'narrow-replay-materialization-runtime-handoff-readiness-incomplete',
      selectedOwnerBoundary: audit.futureOwner.boundary,
      status: 'blocked',
    });
  }

  return Object.freeze({
    acceptanceGates: [...ACCEPTANCE_GATES],
    audit,
    futureOwner: audit.futureOwner,
    nextStep: 'narrow-replay-materialization-runtime-handoff-plan',
    reason: 'runtime-handoff-surfaces-ready-select-plan-before-behavior-wiring',
    selectedOwnerBoundary: audit.futureOwner.boundary,
    status: 'ready',
  });
}
