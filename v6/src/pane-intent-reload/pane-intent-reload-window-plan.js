import { planBarWindow } from '../bar-data/bar-window.js';

const DEFAULT_RELOAD_BAR_COUNT = 120;
const DEFAULT_RELOAD_SOURCE_BAR_LIMIT = 2500;

function normalizeReloadIntent(intent) {
  if (!intent || typeof intent !== 'object') {
    throw new Error('Pane intent reload window plan requires a reload intent.');
  }
  if (!intent.paneId) {
    throw new Error('Pane intent reload window plan requires paneId.');
  }
  return intent;
}

function resolveCursorTime(state) {
  const value = state?.cursorTime ?? state?.cursorTimestamp ?? state?.timestamp;
  if (value === null || value === undefined || value === '') {
    throw new Error('Pane intent reload window plan requires replay cursor time.');
  }
  return value;
}

function normalizeTimeframe(value, fieldName) {
  const text = String(value ?? '').trim().toUpperCase();
  if (text === '1D') return text;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`Pane intent reload window plan ${fieldName} must be a positive integer or 1D.`);
  }
  return normalized;
}

function resolveSourceTimeframe(state = {}) {
  return normalizeTimeframe(state.timeframe || 1, 'sourceTimeframe');
}

function resolveSessionStartTime(state = {}) {
  return String(state.startTime || state.sessionStartTime || '').trim() || null;
}

function resolveSourceCount({ count, sourceTimeframe, targetTimeframe }) {
  const targetCount = normalizeTimeframe(count, 'count');
  if (targetTimeframe === '1D') {
    return Math.min(DEFAULT_RELOAD_SOURCE_BAR_LIMIT, targetCount * 1440);
  }
  const ratio = Math.max(1, Math.ceil(targetTimeframe / sourceTimeframe));
  return Math.min(DEFAULT_RELOAD_SOURCE_BAR_LIMIT, targetCount * ratio);
}

function freezeWindow(window) {
  return Object.freeze({
    ...window,
    requestCap: 'replay-cursor',
  });
}

export function createReplaySafeReloadWindowPlan({
  count = DEFAULT_RELOAD_BAR_COUNT,
  reloadIntent,
  replayState,
} = {}) {
  const intent = normalizeReloadIntent(reloadIntent);
  const cursorTime = resolveCursorTime(replayState);
  const displayTimeframe = normalizeTimeframe(intent.displayTimeframe, 'displayTimeframe');
  const sourceTimeframe = resolveSourceTimeframe(replayState);
  const sourceCount = resolveSourceCount({
    count,
    sourceTimeframe,
    targetTimeframe: displayTimeframe,
  });
  const window = freezeWindow(planBarWindow({
    anchor: cursorTime,
    count: sourceCount,
    direction: 'backward',
    instrument: intent.instrument,
    timeframe: sourceTimeframe,
  }, { maxBarsPerWindow: DEFAULT_RELOAD_SOURCE_BAR_LIMIT }));

  return Object.freeze({
    displayTimeframe,
    noFuture: true,
    paneId: intent.paneId,
    reason: intent.reason,
    sessionStartTime: resolveSessionStartTime(replayState),
    sourceTimeframe,
    source: intent.source,
    window,
  });
}

export function createReplaySafeReloadWindowPlans({
  count = DEFAULT_RELOAD_BAR_COUNT,
  reloadIntents = [],
  replayState,
} = {}) {
  if (!Array.isArray(reloadIntents)) {
    throw new Error('Pane intent reload window plans require an array of reload intents.');
  }

  return Object.freeze(reloadIntents.map((reloadIntent) => createReplaySafeReloadWindowPlan({
    count,
    reloadIntent,
    replayState,
  })));
}
