const MATERIALIZATION_OWNER = 'replay-coordination-materialization-contract';

const MATERIALIZATION_ACCEPTANCE_GATES = Object.freeze([
  'source-1m-replay-cursor-authority',
  'target-bars-display-materialization-input-only',
  'no-replay-cursor-mutation',
  'no-viewport-intent-mutation',
  'chart-data-no-future-filtering',
  'bar-data-target-cache-owner',
  'chart-history-request-coordination-only',
]);

const MATERIALIZATION_PARTICIPANTS = Object.freeze([
  Object.freeze({
    id: 'replay-runtime',
    reads: Object.freeze([]),
    writes: Object.freeze(['sourceCursorTime', 'revealedSourceRange', 'playbackState']),
    forbidden: Object.freeze(['requestBars', 'writeChartSeries', 'mutateViewportIntent']),
  }),
  Object.freeze({
    id: 'bar-data-runtime',
    reads: Object.freeze(['sourceWindowIntent', 'targetWindowIntent']),
    writes: Object.freeze(['sourceBarsCache', 'targetBarsCache', 'loadDiagnostics']),
    forbidden: Object.freeze(['mutateReplayCursor', 'writeChartSeries', 'mutateViewportIntent']),
  }),
  Object.freeze({
    id: 'chart-data-runtime',
    reads: Object.freeze(['sourceCursorTime', 'displayMaterializationBars']),
    writes: Object.freeze(['paneDisplayBars', 'noFutureFilteredBars']),
    forbidden: Object.freeze(['mutateReplayCursor', 'requestBars', 'mutateViewportIntent']),
  }),
  Object.freeze({
    id: 'chart-history',
    reads: Object.freeze(['displayTimeframe', 'viewportLeftEdgeIntent']),
    writes: Object.freeze(['targetHistoryRequestIntent', 'extensionDiagnostics']),
    forbidden: Object.freeze(['mutateReplayCursor', 'writeChartSeries', 'mutateViewportIntent']),
  }),
  Object.freeze({
    id: 'display-timeframe-runtime',
    reads: Object.freeze(['paneDisplayTimeframe', 'targetHistoryCapability']),
    writes: Object.freeze(['displayMaterializationIntent']),
    forbidden: Object.freeze(['mutateReplayCursor', 'writeChartSeries', 'mutateViewportIntent']),
  }),
  Object.freeze({
    id: 'chart-viewport-runtime',
    reads: Object.freeze(['sourceCursorTime', 'paneViewportIntent']),
    writes: Object.freeze(['paneViewportIntent']),
    forbidden: Object.freeze(['requestBars', 'mutateReplayCursor', 'writeChartSeries']),
  }),
]);

const DEFAULT_MATERIALIZATION_INTENT = Object.freeze({
  chartDataFiltersNoFuture: true,
  chartHistoryCoordinatesRequests: true,
  displayMaterializationInputOnly: true,
  mutatesReplayCursor: false,
  mutatesViewportIntent: false,
  replaySourceTimeframe: 1,
  targetBarCompletenessUsesSourceCursor: true,
  targetHistoryRequestSizingUnchanged: true,
  writesChartSeries: false,
});

function cloneParticipant(participant) {
  return {
    forbidden: [...participant.forbidden],
    id: participant.id,
    reads: [...participant.reads],
    writes: [...participant.writes],
  };
}

function pushError(errors, field, message) {
  errors.push(Object.freeze({ field, message }));
}

function normalizeFiniteTimestamp(value, fieldName) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${fieldName} must be finite.`);
  }
  return timestamp;
}

function normalizeOptionalCursorTimestamp(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return normalizeFiniteTimestamp(value, 'Replay coordination materialization replayCursorTimestamp');
}

export function getReplayCoordinationMaterializationOwner() {
  return MATERIALIZATION_OWNER;
}

export function getReplayCoordinationMaterializationAcceptanceGates() {
  return [...MATERIALIZATION_ACCEPTANCE_GATES];
}

export function getReplayCoordinationMaterializationParticipants() {
  return MATERIALIZATION_PARTICIPANTS.map(cloneParticipant);
}

export function createDefaultReplayCoordinationMaterializationIntent(input = {}) {
  return Object.freeze({
    chartDataFiltersNoFuture: input.chartDataFiltersNoFuture === undefined
      ? DEFAULT_MATERIALIZATION_INTENT.chartDataFiltersNoFuture
      : Boolean(input.chartDataFiltersNoFuture),
    chartHistoryCoordinatesRequests: input.chartHistoryCoordinatesRequests === undefined
      ? DEFAULT_MATERIALIZATION_INTENT.chartHistoryCoordinatesRequests
      : Boolean(input.chartHistoryCoordinatesRequests),
    displayMaterializationInputOnly: input.displayMaterializationInputOnly === undefined
      ? DEFAULT_MATERIALIZATION_INTENT.displayMaterializationInputOnly
      : Boolean(input.displayMaterializationInputOnly),
    mutatesReplayCursor: Boolean(input.mutatesReplayCursor),
    mutatesViewportIntent: Boolean(input.mutatesViewportIntent),
    replaySourceTimeframe: Number(input.replaySourceTimeframe ?? DEFAULT_MATERIALIZATION_INTENT.replaySourceTimeframe),
    targetBarCompletenessUsesSourceCursor: input.targetBarCompletenessUsesSourceCursor === undefined
      ? DEFAULT_MATERIALIZATION_INTENT.targetBarCompletenessUsesSourceCursor
      : Boolean(input.targetBarCompletenessUsesSourceCursor),
    targetHistoryRequestSizingUnchanged: input.targetHistoryRequestSizingUnchanged === undefined
      ? DEFAULT_MATERIALIZATION_INTENT.targetHistoryRequestSizingUnchanged
      : Boolean(input.targetHistoryRequestSizingUnchanged),
    writesChartSeries: Boolean(input.writesChartSeries),
  });
}

export function validateReplayCoordinationMaterializationIntent(intent = {}) {
  const candidate = createDefaultReplayCoordinationMaterializationIntent(intent);
  const errors = [];

  if (candidate.replaySourceTimeframe !== 1) {
    pushError(errors, 'replaySourceTimeframe', 'Replay coordination materialization must keep source 1m replay cursor authority.');
  }
  if (candidate.mutatesReplayCursor) {
    pushError(errors, 'mutatesReplayCursor', 'Replay coordination materialization must not mutate replay cursor state.');
  }
  if (candidate.mutatesViewportIntent) {
    pushError(errors, 'mutatesViewportIntent', 'Replay coordination materialization must not mutate chart viewport intent.');
  }
  if (candidate.writesChartSeries) {
    pushError(errors, 'writesChartSeries', 'Replay coordination materialization must not write chart series directly.');
  }
  if (!candidate.displayMaterializationInputOnly) {
    pushError(errors, 'displayMaterializationInputOnly', 'Target bars must be display materialization inputs only.');
  }
  if (!candidate.chartDataFiltersNoFuture) {
    pushError(errors, 'chartDataFiltersNoFuture', 'Chart data runtime must keep no-future filtering ownership.');
  }
  if (!candidate.targetBarCompletenessUsesSourceCursor) {
    pushError(errors, 'targetBarCompletenessUsesSourceCursor', 'Target bar completeness must be evaluated against source cursor time.');
  }
  if (!candidate.chartHistoryCoordinatesRequests) {
    pushError(errors, 'chartHistoryCoordinatesRequests', 'Chart-history must remain request coordination only.');
  }
  if (!candidate.targetHistoryRequestSizingUnchanged) {
    pushError(errors, 'targetHistoryRequestSizingUnchanged', 'Contract step must keep target-history request sizing unchanged.');
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    valid: errors.length === 0,
  });
}

export function resolveReplayCoordinationTargetBarRevealState({
  replayCursorTimestamp = null,
  targetBar = {},
} = {}) {
  const cursorTimestamp = normalizeOptionalCursorTimestamp(replayCursorTimestamp);
  const bucketStartTimestamp = normalizeFiniteTimestamp(
    targetBar.bucketStartTimestamp ?? targetBar.timestamp ?? targetBar.time,
    'Replay coordination materialization target bar bucketStartTimestamp',
  );
  const bucketEndTimestamp = normalizeFiniteTimestamp(
    targetBar.bucketEndTimestamp ?? bucketStartTimestamp,
    'Replay coordination materialization target bar bucketEndTimestamp',
  );
  if (bucketEndTimestamp < bucketStartTimestamp) {
    throw new Error('Replay coordination materialization target bar bucketEndTimestamp must be after bucketStartTimestamp.');
  }

  if (cursorTimestamp === null) {
    return Object.freeze({
      bucketEndTimestamp,
      bucketStartTimestamp,
      complete: false,
      cursorCapped: true,
      reason: 'source-cursor-required-for-target-materialization',
      visible: false,
    });
  }

  if (cursorTimestamp < bucketStartTimestamp) {
    return Object.freeze({
      bucketEndTimestamp,
      bucketStartTimestamp,
      complete: false,
      cursorCapped: true,
      reason: 'target-bar-start-after-source-cursor',
      visible: false,
    });
  }

  if (cursorTimestamp < bucketEndTimestamp) {
    return Object.freeze({
      bucketEndTimestamp,
      bucketStartTimestamp,
      complete: false,
      cursorCapped: true,
      reason: 'source-cursor-inside-target-bucket',
      visible: true,
    });
  }

  return Object.freeze({
    bucketEndTimestamp,
    bucketStartTimestamp,
    complete: true,
    cursorCapped: false,
    reason: 'target-bar-complete-before-or-at-source-cursor',
    visible: true,
  });
}

export function createReplayCoordinationMaterializationOwnerContract() {
  return Object.freeze({
    acceptanceGates: getReplayCoordinationMaterializationAcceptanceGates(),
    commandSurfaceReady: false,
    materializationRuntimeReady: false,
    owner: MATERIALIZATION_OWNER,
    participants: getReplayCoordinationMaterializationParticipants(),
    readOnlyContractReady: true,
    replaySourceTimeframe: 1,
    runtimeWiringReady: false,
    targetBarsMayMaterializeDisplay: true,
    writeReady: false,
  });
}
