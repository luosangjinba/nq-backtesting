import { BAR_DATA_COMMANDS } from '../contracts/bar-data-contracts.js';
import { CHART_COMMANDS } from '../contracts/chart-contracts.js';
import { REPLAY_EVENTS } from '../contracts/replay-contracts.js';
import { SESSION_COMMANDS } from '../contracts/session-contracts.js';
import {
  MAX_PREFIX_BARS,
  assertNoDisplayBarsAfter,
  cloneReplayValue as clone,
  computeForwardRevealWindowCount,
  computePrefixBarCount,
  selectStartBar,
  timestampSeconds,
} from './replay-runtime-state.js';

export function createReplayBootstrapController({
  getState,
  setState,
  dispatchCommand,
  chartSync,
  resetPrefixAnchors,
  emitEvent,
  barDataCommands = BAR_DATA_COMMANDS,
  chartCommands = CHART_COMMANDS,
  replayEvents = REPLAY_EVENTS,
  sessionCommands = SESSION_COMMANDS,
}) {
  let initialLoadSequence = 0;

  function assertCurrentInitialLoad(sessionId, loadSequence) {
    const state = getState();
    if (!loadSequence) return;
    if (loadSequence !== initialLoadSequence || state.sessionId !== sessionId) {
      throw new Error('Stale replay initial load ignored.');
    }
  }

  async function resolveStartBar({ sessionId, loadSequence } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }

    const record = await dispatchCommand(sessionCommands.GET, { sessionId });
    const session = record?.session;
    const cursor = record?.cursor;
    if (!session) {
      throw new Error(`Replay session "${sessionId}" was not found.`);
    }

    const window = await dispatchCommand(barDataCommands.LOAD_WINDOW, {
      instrument: session.instrument,
      timeframe: session.timeframe,
      anchor: session.sessionStart,
      direction: 'forward',
      count: computeForwardRevealWindowCount({
        cursorTimestamp: session.sessionStart,
        sessionEnd: session.sessionEnd,
        timeframe: session.timeframe,
      }),
    });
    if (loadSequence && loadSequence !== initialLoadSequence) {
      throw new Error('Stale replay initial load ignored.');
    }
    const startBar = selectStartBar(window.bars, session.sessionStart);
    resetPrefixAnchors();

    const nextState = setState({
      ...getState(),
      sessionId: session.id,
      session: clone(session),
      persistedCursor: clone(cursor),
      startBar: clone(startBar),
      startBarTimestamp: startBar.time,
      cursorTimestamp: startBar.time,
      revealedCount: 0,
      replayTimeframe: session.timeframe,
      displayTimeframe: session.timeframe,
      displayBarsTimeframe: null,
      prefixBars: [],
      prefixChunks: [],
      releasedPrefixChunks: [],
      displayBars: [],
      viewportMetrics: null,
      status: 'start-resolved',
    });
    emitEvent(replayEvents.START_BAR_RESOLVED, {
      session: clone(session),
      startBar: clone(startBar),
    });
    return clone(nextState);
  }

  async function loadPersistedRevealBars(cursor, { sessionId = getState().sessionId, loadSequence } = {}) {
    const state = getState();
    if (!cursor?.cursorTimestamp || !state.startBar) return [];
    assertCurrentInitialLoad(sessionId, loadSequence);
    const startTimestamp = Number(state.startBar.timestamp);
    const targetTimestamp = timestampSeconds(cursor.cursorTimestamp);
    if (targetTimestamp <= startTimestamp) return [];

    const targetRevealCount = Math.max(1, Number(cursor.revealedCount) || 0);
    const revealedBars = [];
    let anchor = state.startBar.time;
    while (revealedBars.length < targetRevealCount) {
      const current = getState();
      const remaining = targetRevealCount - revealedBars.length;
      const count = Math.min(remaining + 1, MAX_PREFIX_BARS);
      const window = await dispatchCommand(barDataCommands.LOAD_WINDOW, {
        instrument: current.session.instrument,
        timeframe: current.session.timeframe,
        anchor,
        direction: 'forward',
        count,
      });
      assertCurrentInitialLoad(sessionId, loadSequence);
      const nextBars = window.bars
        .filter((bar) => Number(bar?.timestamp) > timestampSeconds(anchor))
        .filter((bar) => Number(bar?.timestamp) <= targetTimestamp)
        .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
      if (!nextBars.length) break;
      revealedBars.push(...nextBars);
      anchor = nextBars[nextBars.length - 1].time;
      if (Number(nextBars[nextBars.length - 1].timestamp) >= targetTimestamp) break;
    }

    const latest = revealedBars[revealedBars.length - 1];
    if (!latest || Number(latest.timestamp) < targetTimestamp) {
      throw new Error('Unable to restore replay cursor from bounded bar windows.');
    }
    return revealedBars.slice(0, targetRevealCount);
  }

  async function loadInitialPrefix({ sessionId, loadSequence } = {}) {
    if (!getState().startBar || getState().sessionId !== sessionId) {
      await resolveStartBar({ sessionId, loadSequence });
    }
    assertCurrentInitialLoad(sessionId, loadSequence);

    const metrics = await dispatchCommand(chartCommands.GET_VIEWPORT_METRICS);
    assertCurrentInitialLoad(sessionId, loadSequence);
    const state = getState();
    const prefixCount = computePrefixBarCount(metrics);
    const window = await dispatchCommand(barDataCommands.LOAD_WINDOW, {
      instrument: state.session.instrument,
      timeframe: state.session.timeframe,
      anchor: state.startBar.time,
      direction: 'backward',
      count: prefixCount + 1,
    });
    assertCurrentInitialLoad(sessionId, loadSequence);
    const current = getState();
    const startTimestamp = Number(current.startBar.timestamp);
    const prefixBars = window.bars
      .filter((bar) => Number(bar?.timestamp) < startTimestamp)
      .sort((left, right) => Number(left.timestamp) - Number(right.timestamp))
      .slice(-prefixCount);

    const nextState = setState({
      ...current,
      prefixBars: clone(prefixBars),
      displayBars: [],
      viewportMetrics: clone(metrics),
      status: 'prefix-loaded',
    });
    emitEvent(replayEvents.PREFIX_LOADED, {
      session: clone(nextState.session),
      startBar: clone(nextState.startBar),
      prefixBars: clone(prefixBars),
      viewportMetrics: clone(metrics),
    });
    return clone(nextState);
  }

  async function loadInitialSession({ sessionId } = {}) {
    const loadSequence = ++initialLoadSequence;
    if (getState().status !== 'prefix-loaded' || getState().sessionId !== sessionId) {
      await loadInitialPrefix({ sessionId, loadSequence });
    }
    assertCurrentInitialLoad(sessionId, loadSequence);

    const state = getState();
    const persistedRevealBars = await loadPersistedRevealBars(state.persistedCursor, {
      sessionId,
      loadSequence,
    });
    assertCurrentInitialLoad(sessionId, loadSequence);
    const current = getState();
    const restoredCursor = persistedRevealBars.length
      ? persistedRevealBars[persistedRevealBars.length - 1]
      : current.startBar;
    const restoredCursorTimestamp = restoredCursor.time;
    const revealedCount = persistedRevealBars.length;
    const displayBars = [
      ...current.prefixBars,
      current.startBar,
      ...persistedRevealBars,
    ];
    assertNoDisplayBarsAfter(displayBars, restoredCursorTimestamp);
    await chartSync.renderDisplayBars(displayBars, restoredCursorTimestamp, { resumeViewportFollow: true });
    assertCurrentInitialLoad(sessionId, loadSequence);
    await chartSync.syncChartRightEdgeLimit(restoredCursorTimestamp);
    assertCurrentInitialLoad(sessionId, loadSequence);
    await chartSync.syncChartDisplayContext({
      displayTimeframe: getState().displayTimeframe || getState().session.timeframe,
      bars: displayBars,
    });
    assertCurrentInitialLoad(sessionId, loadSequence);

    const beforeState = getState();
    const nextTimeframe = beforeState.displayTimeframe || beforeState.session.timeframe;
    const nextState = setState({
      ...beforeState,
      replayTimeframe: beforeState.session.timeframe,
      displayTimeframe: nextTimeframe,
      displayBarsTimeframe: nextTimeframe,
      cursorTimestamp: restoredCursorTimestamp,
      revealedCount,
      displayBars: clone(displayBars),
      status: 'initial-loaded',
    });
    emitEvent(replayEvents.INITIAL_LOADED, {
      session: clone(nextState.session),
      startBar: clone(nextState.startBar),
      cursorTimestamp: nextState.cursorTimestamp,
      revealedCount: nextState.revealedCount,
      displayBars: clone(displayBars),
      viewportMetrics: clone(nextState.viewportMetrics),
    });
    return clone(nextState);
  }

  function reset() {
    initialLoadSequence = 0;
  }

  return {
    loadInitialPrefix,
    loadInitialSession,
    reset,
    resolveStartBar,
  };
}
