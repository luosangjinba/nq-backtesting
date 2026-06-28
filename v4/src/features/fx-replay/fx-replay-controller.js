import * as bus from '../../event-bus.js';
import {
  applyFxReplayPrefixBars,
  applyFxReplayStartBar,
  assertFxReplayInitialInvariants,
  createFxReplaySessionState,
  getFxReplayChangedPayload,
  getFxReplayInitialDisplayBars,
  setFxReplayViewportDemandRange,
} from './fx-replay-model.js';
import {
  buildFxReplayPrefixRequest,
  buildFxReplayStartResolveRequest,
  parseFxReplayDateTime,
} from './fx-replay-loader.js';
import { buildFxReplayInitialViewportDemandRange } from './fx-replay-viewport-policy.js';

let activeFxReplayState = null;

function normalizeBarsResult(result) {
  if (Array.isArray(result)) return result;
  return Array.isArray(result?.bars) ? result.bars : [];
}

function selectStartBar(bars = [], sessionStart = '') {
  const sessionStartMs = parseFxReplayDateTime(sessionStart);
  const sessionStartTimestamp = sessionStartMs === null ? null : sessionStartMs / 1000;
  const sorted = normalizeBarsResult(bars)
    .filter((bar) => Number.isFinite(Number(bar?.timestamp)))
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
  if (!sorted.length) return null;
  if (sessionStartTimestamp === null) return sorted[0];
  return sorted.find((bar) => Number(bar.timestamp) >= sessionStartTimestamp) || sorted[0];
}

function filterPrefixBars(bars = [], startBarTimestamp) {
  return normalizeBarsResult(bars)
    .filter((bar) => Number.isFinite(Number(bar?.timestamp)) && Number(bar.timestamp) < Number(startBarTimestamp))
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
}

export function getActiveFxReplayState() {
  return activeFxReplayState;
}

export async function startFxReplayInitialSession({
  sessionId = '',
  instrument = 'NQ',
  timeframe = 1,
  sessionStart = '',
  sessionEnd = '',
  viewport = {},
  prefixFillRatio = 1,
  prefixBufferBars = 24,
  maxPrefixBars = 5000,
  loadBars,
  projectBars,
  enterMode = () => {},
} = {}) {
  if (typeof loadBars !== 'function') {
    throw new Error('FX Replay initial session requires a loadBars dependency');
  }
  if (typeof projectBars !== 'function') {
    throw new Error('FX Replay initial session requires a projectBars dependency');
  }

  const state = createFxReplaySessionState({
    sessionId,
    instrument,
    timeframe,
    sessionStart,
    sessionEnd,
  });

  const startRequest = buildFxReplayStartResolveRequest({
    sessionStart,
    timeframe: state.timeframe,
    instrument: state.instrument,
  });
  const startResult = await loadBars(startRequest);
  const startBar = selectStartBar(startResult, state.sessionStart);
  if (!startBar) {
    throw new Error('FX Replay initial session could not resolve a start bar');
  }
  applyFxReplayStartBar(state, startBar);

  const viewportDemand = buildFxReplayInitialViewportDemandRange({
    ...viewport,
    startBarTimestamp: state.startBarTimestamp,
    timeframe: state.timeframe,
    prefixFillRatio,
    prefixBufferBars,
    maxPrefixBars,
  });
  setFxReplayViewportDemandRange(state, viewportDemand);

  const prefixRequest = buildFxReplayPrefixRequest({
    startBarTimestamp: state.startBarTimestamp,
    prefixBars: viewportDemand.requestedPrefixBars,
    timeframe: state.timeframe,
    instrument: state.instrument,
  });
  const prefixResult = await loadBars(prefixRequest);
  applyFxReplayPrefixBars(state, filterPrefixBars(prefixResult, state.startBarTimestamp));
  assertFxReplayInitialInvariants(state);

  const displayBars = getFxReplayInitialDisplayBars(state);
  enterMode({ source: 'fx-replay-initial-load', sessionId: state.sessionId });
  projectBars(displayBars, { timeframe: state.timeframe, showEnd: true });

  activeFxReplayState = state;
  const payload = getFxReplayChangedPayload(state);
  bus.emit('fx-replay:changed', payload);
  return {
    state,
    displayBars,
    requests: {
      start: startRequest,
      prefix: prefixRequest,
    },
    payload,
  };
}
