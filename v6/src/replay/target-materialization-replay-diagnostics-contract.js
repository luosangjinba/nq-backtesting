const DIAGNOSTICS_OWNER = 'target-materialization-replay-diagnostics-contract';

const DIAGNOSTICS_READ_FIELDS = Object.freeze([
  'paneId',
  'displayTimeframe',
  'displayApplyStatus',
  'projectionOwner',
  'targetHistoryStatus',
  'targetHistoryReason',
  'manualNextStatus',
  'autoPlayStatus',
  'fallbackStatus',
  'sourceCursorTime',
  'sourceCursorAuthority',
  'targetBarsDisplayInputOnly',
  'latestSourceTimestamp',
  'latestDisplayTimestamp',
]);

const DIAGNOSTICS_PARTICIPANTS = Object.freeze([
  Object.freeze({
    forbidden: Object.freeze(['callTargetBarsApi', 'mutateReplayCursor', 'writeChartSeries', 'mutateViewportIntent']),
    id: 'display-timeframe-runtime',
    reads: Object.freeze(['targetHistoryStatus', 'projectionOwner', 'sourceCursorTime']),
    writes: Object.freeze(['displayApplyDiagnostics']),
  }),
  Object.freeze({
    forbidden: Object.freeze(['callTargetBarsApi', 'mutateReplayCursor', 'writeChartSeries', 'mutateViewportIntent']),
    id: 'chart-entry-manual-next-runtime',
    reads: Object.freeze(['sourceCursorTime', 'displayTimeframe']),
    writes: Object.freeze(['manualNextDiagnostics']),
  }),
  Object.freeze({
    forbidden: Object.freeze(['callTargetBarsApi', 'mutateReplayCursor', 'writeChartSeries', 'mutateViewportIntent']),
    id: 'chart-entry-auto-play-runtime',
    reads: Object.freeze(['manualNextDiagnostics', 'sourceCursorTime']),
    writes: Object.freeze(['autoPlayDiagnostics']),
  }),
  Object.freeze({
    forbidden: Object.freeze(['callTargetBarsApi', 'requestBars', 'mutateReplayCursor', 'writeChartSeries']),
    id: 'shell-diagnostics-readout',
    reads: Object.freeze(['diagnosticSnapshot']),
    writes: Object.freeze(['domReadoutOnly']),
  }),
]);

const DIAGNOSTICS_ACCEPTANCE_GATES = Object.freeze([
  'read-only-diagnostics-contract',
  'source-1m-replay-cursor-authority',
  'target-bars-display-input-only',
  'shell-reads-diagnostics-no-target-api',
  'target-history-request-sizing-unchanged',
  'chart-history-fast-path-unchanged',
  'no-replay-cursor-mutation',
  'no-runtime-handoff-in-contract-step',
]);

function cloneParticipant(participant) {
  return {
    forbidden: [...participant.forbidden],
    id: participant.id,
    reads: [...participant.reads],
    writes: [...participant.writes],
  };
}

function normalizeString(value, fallback = null) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeBoolean(value, fallback = false) {
  return value === undefined ? fallback : Boolean(value);
}

function normalizeTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.floor(numeric) : null;
}

function pushError(errors, field, message) {
  errors.push(Object.freeze({ field, message }));
}

export function getTargetMaterializationReplayDiagnosticsOwner() {
  return DIAGNOSTICS_OWNER;
}

export function getTargetMaterializationReplayDiagnosticsReadFields() {
  return [...DIAGNOSTICS_READ_FIELDS];
}

export function getTargetMaterializationReplayDiagnosticsParticipants() {
  return DIAGNOSTICS_PARTICIPANTS.map(cloneParticipant);
}

export function getTargetMaterializationReplayDiagnosticsAcceptanceGates() {
  return [...DIAGNOSTICS_ACCEPTANCE_GATES];
}

export function createTargetMaterializationReplayDiagnosticsSnapshot(input = {}) {
  return Object.freeze({
    autoPlayStatus: normalizeString(input.autoPlayStatus, null),
    displayApplyStatus: normalizeString(input.displayApplyStatus, null),
    displayTimeframe: normalizeString(input.displayTimeframe, null),
    fallbackStatus: normalizeString(input.fallbackStatus, null),
    latestDisplayTimestamp: normalizeTimestamp(input.latestDisplayTimestamp),
    latestSourceTimestamp: normalizeTimestamp(input.latestSourceTimestamp),
    manualNextStatus: normalizeString(input.manualNextStatus, null),
    paneId: normalizeString(input.paneId, 'main'),
    projectionOwner: normalizeString(input.projectionOwner, null),
    sourceCursorAuthority: normalizeBoolean(input.sourceCursorAuthority, true),
    sourceCursorTime: normalizeString(input.sourceCursorTime, null),
    targetBarsDisplayInputOnly: normalizeBoolean(input.targetBarsDisplayInputOnly, true),
    targetHistoryReason: normalizeString(input.targetHistoryReason, null),
    targetHistoryStatus: normalizeString(input.targetHistoryStatus, null),
  });
}

export function validateTargetMaterializationReplayDiagnosticsSnapshot(snapshot = {}) {
  const candidate = createTargetMaterializationReplayDiagnosticsSnapshot(snapshot);
  const errors = [];

  if (!candidate.sourceCursorAuthority) {
    pushError(errors, 'sourceCursorAuthority', 'Diagnostics must preserve source 1m replay cursor authority.');
  }
  if (!candidate.targetBarsDisplayInputOnly) {
    pushError(errors, 'targetBarsDisplayInputOnly', 'Diagnostics must keep target bars as display inputs only.');
  }
  if (!candidate.paneId) {
    pushError(errors, 'paneId', 'Diagnostics paneId must be available.');
  }
  if (
    candidate.latestSourceTimestamp !== null
    && candidate.latestDisplayTimestamp !== null
    && candidate.latestSourceTimestamp < candidate.latestDisplayTimestamp
  ) {
    pushError(errors, 'latestSourceTimestamp', 'Diagnostics source timestamp must not lag the visible display timestamp.');
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}

export function createTargetMaterializationReplayDiagnosticsOwnerContract() {
  return Object.freeze({
    acceptanceGates: getTargetMaterializationReplayDiagnosticsAcceptanceGates(),
    owner: DIAGNOSTICS_OWNER,
    participants: getTargetMaterializationReplayDiagnosticsParticipants(),
    readFields: getTargetMaterializationReplayDiagnosticsReadFields(),
    readOnlyContractReady: true,
    runtimeCommandReady: false,
    runtimeWiringReady: false,
    shellConsumption: Object.freeze({
      forbidden: Object.freeze(['callTargetBarsApi', 'mutateReplayCursor', 'writeChartSeries']),
      mode: 'command-event-diagnostic-snapshot',
      owner: 'shell-diagnostics-readout',
    }),
    writeReady: false,
  });
}
