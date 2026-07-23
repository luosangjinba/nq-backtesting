const POSITION_RATIO = 0.5;

/** Stable public failure for malformed explicit Pane time-location values. */
export class PaneTimeLocationDomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PaneTimeLocationDomainError';
    this.code = code;
  }
}

class PaneTimeLocationSelection {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() { return this.#value; }
}

class PaneTimeLocationCommand {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() { return this.#value; }
}

function fail(code, message) {
  throw new PaneTimeLocationDomainError(code, message);
}

function requireEpoch(value, code, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(code, `${label} must be a non-negative safe epoch.`);
  return value;
}

function requirePaneId(value, code, label) {
  if (typeof value !== 'string' || value.trim().length === 0) fail(code, `${label} must be a non-empty Pane id.`);
  return value;
}

function visibleRange(value) {
  const from = value?.from;
  const to = value?.to;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
    fail('PANE_TIME_LOCATION_RANGE_INVALID', 'Target visible range must be finite and increasing.');
  }
  return Object.freeze({ from, to });
}

function timeline(value) {
  if (!Array.isArray(value)) {
    fail('PANE_TIME_LOCATION_TIMELINE_INVALID', 'Target timeline must be an array.');
  }
  let previousStart = -1;
  let previousDisplay = -1;
  return Object.freeze(value.map((entry) => {
    const startEpochMs = requireEpoch(
      entry?.startEpochMs,
      'PANE_TIME_LOCATION_TIMELINE_INVALID',
      'Target start time',
    );
    const displayEpochMs = requireEpoch(
      entry?.displayEpochMs,
      'PANE_TIME_LOCATION_TIMELINE_INVALID',
      'Target display time',
    );
    if (startEpochMs <= previousStart || displayEpochMs <= previousDisplay) {
      fail('PANE_TIME_LOCATION_TIMELINE_INVALID', 'Target timeline must increase strictly in market and display time.');
    }
    previousStart = startEpochMs;
    previousDisplay = displayEpochMs;
    return Object.freeze({ displayEpochMs, startEpochMs });
  }));
}

function floorIndex(entries, marketEpochMs) {
  let low = 0;
  let high = entries.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (entries[middle].startEpochMs <= marketEpochMs) low = middle + 1;
    else high = middle - 1;
  }
  return high;
}

/**
 * Owner: Pane Time Location Domain.
 * Purpose: brand one exact source-candle market-time selection.
 * Inputs/outputs: source Pane id and non-negative candle start epoch; immutable branded value.
 * Side effects/lifecycle/concurrency: none.
 * Errors: PaneTimeLocationDomainError for malformed source identity or epoch.
 */
export function createPaneTimeLocationSelection({ marketEpochMs, sourcePaneId } = {}) {
  return new PaneTimeLocationSelection({
    marketEpochMs: requireEpoch(
      marketEpochMs,
      'PANE_TIME_LOCATION_EPOCH_INVALID',
      'Selected market time',
    ),
    sourcePaneId: requirePaneId(
      sourcePaneId,
      'PANE_TIME_LOCATION_SOURCE_INVALID',
      'Source Pane id',
    ),
  });
}

/** Read one branded source-candle selection; structural lookalikes are rejected. */
export function readPaneTimeLocationSelection(candidate) {
  if (!(candidate instanceof PaneTimeLocationSelection)) {
    fail('PANE_TIME_LOCATION_SELECTION_REQUIRED', 'A branded Pane time-location selection is required.');
  }
  return candidate.read();
}

/**
 * Owner: Pane Time Location Domain.
 * Purpose: create an explicit one-shot command from one source candle to selected other Panes.
 * Inputs/outputs: branded selection plus unique non-source target Pane ids; immutable branded command.
 * Side effects/lifecycle/concurrency: none; the command never owns Replay or Viewport state.
 * Errors: PaneTimeLocationDomainError for empty, duplicate, or source-equal targets.
 */
export function createPaneTimeLocationCommand({ selection, targetPaneIds } = {}) {
  const source = readPaneTimeLocationSelection(selection);
  if (!Array.isArray(targetPaneIds) || targetPaneIds.length === 0) {
    fail('PANE_TIME_LOCATION_TARGETS_INVALID', 'At least one target Pane is required.');
  }
  const normalized = targetPaneIds.map((paneId) => requirePaneId(
    paneId,
    'PANE_TIME_LOCATION_TARGETS_INVALID',
    'Target Pane id',
  ));
  if (new Set(normalized).size !== normalized.length || normalized.includes(source.sourcePaneId)) {
    fail('PANE_TIME_LOCATION_TARGETS_INVALID', 'Targets must be unique and must not include the source Pane.');
  }
  return new PaneTimeLocationCommand({ selection, targetPaneIds: Object.freeze(normalized) });
}

/** Read one branded explicit Pane time-location command. */
export function readPaneTimeLocationCommand(candidate) {
  if (!(candidate instanceof PaneTimeLocationCommand)) {
    fail('PANE_TIME_LOCATION_COMMAND_REQUIRED', 'A branded Pane time-location command is required.');
  }
  const value = candidate.read();
  return Object.freeze({
    ...value,
    selection: readPaneTimeLocationSelection(value.selection),
  });
}

/**
 * Owner: Pane Time Location Domain.
 * Purpose: center a real market time in a target Pane while preserving its current logical span.
 * Inputs/outputs: target candle timeline, timeframe duration, visible range, and market epoch;
 * a located, history-required, or unavailable immutable plan.
 * Side effects/lifecycle/concurrency: none; no chart, Replay, data request, or Viewport mutation.
 * Errors: PaneTimeLocationDomainError for malformed epochs, timeline, duration, or visible range.
 * Protected invariant: a missing market-time candle never snaps to an unrelated session or future bar.
 */
export function planPaneTimeLocation({
  marketEpochMs,
  timeframeDurationMs,
  targetTimeline,
  targetVisibleRange,
} = {}) {
  const target = requireEpoch(
    marketEpochMs,
    'PANE_TIME_LOCATION_EPOCH_INVALID',
    'Target market time',
  );
  if (!Number.isSafeInteger(timeframeDurationMs) || timeframeDurationMs <= 0) {
    fail('PANE_TIME_LOCATION_DURATION_INVALID', 'Target timeframe duration must be a positive safe integer.');
  }
  const range = visibleRange(targetVisibleRange);
  const entries = timeline(targetTimeline);
  if (entries.length === 0) {
    return Object.freeze({ marketEpochMs: target, reason: 'no-bars', status: 'unavailable' });
  }
  if (target < entries[0].startEpochMs) {
    return Object.freeze({ marketEpochMs: target, status: 'history-required' });
  }
  const logical = floorIndex(entries, target);
  const bar = entries[logical];
  if (target >= bar.startEpochMs + timeframeDurationMs) {
    return Object.freeze({ marketEpochMs: target, reason: 'no-containing-bar', status: 'unavailable' });
  }
  const spanBars = range.to - range.from;
  const from = logical - (spanBars * POSITION_RATIO);
  return Object.freeze({
    displayEpochMs: bar.displayEpochMs,
    from,
    logical,
    marketEpochMs: target,
    positionRatio: POSITION_RATIO,
    spanBars,
    status: 'located',
    to: from + spanBars,
  });
}
