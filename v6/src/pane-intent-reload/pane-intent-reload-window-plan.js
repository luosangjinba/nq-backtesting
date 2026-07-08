import { planBarWindow } from '../bar-data/bar-window.js';

const DEFAULT_RELOAD_BAR_COUNT = 120;

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
  const window = freezeWindow(planBarWindow({
    anchor: cursorTime,
    count,
    direction: 'backward',
    instrument: intent.instrument,
    timeframe: intent.displayTimeframe,
  }));

  return Object.freeze({
    noFuture: true,
    paneId: intent.paneId,
    reason: intent.reason,
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
