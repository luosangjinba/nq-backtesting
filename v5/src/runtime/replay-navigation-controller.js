import { BAR_DATA_COMMANDS } from '../contracts/bar-data-contracts.js';
import { REPLAY_EVENTS } from '../contracts/replay-contracts.js';
import {
  assertNoDisplayBarsAfter,
  assertNoFutureDisplayBars,
  canRevealBar,
  cloneReplayValue as clone,
  computeForwardRevealWindowCount,
  filterDisplayBarsForCursor,
  isoFromTimestamp,
  isAtOrAfterSessionEnd,
  normalizeStepCount,
  normalizeTimeframe,
  timeframeSeconds,
  timestampSeconds,
} from './replay-runtime-state.js';

function forwardRevealWindowCount(sourceState) {
  return computeForwardRevealWindowCount({
    cursorTimestamp: sourceState.cursorTimestamp,
    sessionEnd: sourceState.session.sessionEnd,
    timeframe: sourceState.replayTimeframe || sourceState.session.timeframe,
  });
}

function selectNextBars(bars = [], cursorTimestamp, sessionEnd, count = 1) {
  const cursor = timestampSeconds(cursorTimestamp);
  return bars
    .filter((bar) => Number(bar?.timestamp) > cursor)
    .filter((bar) => canRevealBar(bar, sessionEnd))
    .sort((left, right) => Number(left.timestamp) - Number(right.timestamp))
    .slice(0, count);
}

export function createReplayNavigationController({
  getState,
  setState,
  dispatchCommand,
  chartSync,
  displayWindowController,
  ensureInitialSession,
  loadInitialPrefix,
  persistReplayCursor,
  clearPersistedReplayCursor,
  pausePlayback,
  emitEvent,
  barDataCommands = BAR_DATA_COMMANDS,
  replayEvents = REPLAY_EVENTS,
}) {
  async function next({ sessionId = getState().sessionId, stepCount = 1 } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    const normalizedStepCount = normalizeStepCount(stepCount);
    if (getState().sessionId !== sessionId || getState().status === 'idle') {
      await ensureInitialSession({ sessionId });
    }
    const sourceState = getState();
    if (!sourceState.displayBars.length || !sourceState.cursorTimestamp) {
      throw new Error('replay initial session must be loaded before Next.');
    }

    if (isAtOrAfterSessionEnd(sourceState.cursorTimestamp, sourceState.session.sessionEnd)) {
      return {
        ...clone(sourceState),
        advanced: false,
        reason: 'session-end',
      };
    }

    const window = await dispatchCommand(barDataCommands.LOAD_WINDOW, {
      instrument: sourceState.session.instrument,
      timeframe: sourceState.session.timeframe,
      anchor: sourceState.cursorTimestamp,
      direction: 'forward',
      count: forwardRevealWindowCount(sourceState),
    });
    const nextBars = selectNextBars(
      window.bars,
      sourceState.cursorTimestamp,
      sourceState.session.sessionEnd,
      normalizedStepCount
    );
    const nextBar = nextBars[nextBars.length - 1];
    if (!nextBar) {
      return {
        ...clone(sourceState),
        advanced: false,
        reason: 'session-end',
      };
    }

    const revealedCount = sourceState.revealedCount + nextBars.length;
    const normalizedDisplayTimeframe = normalizeTimeframe(
      sourceState.displayTimeframe || sourceState.session.timeframe,
      'display timeframe'
    );
    const normalizedReplayTimeframe = normalizeTimeframe(
      sourceState.replayTimeframe || sourceState.session.timeframe,
      'replay timeframe'
    );
    const displayBars = normalizedDisplayTimeframe === normalizedReplayTimeframe
      ? [
        ...sourceState.displayBars,
        ...nextBars,
      ]
      : sourceState.displayBars;
    if (normalizedDisplayTimeframe === normalizedReplayTimeframe) {
      await chartSync.syncChartRightEdgeLimit(nextBar.time);
      await chartSync.renderDisplayBars(displayBars, nextBar.time);
    }

    let nextState = setState({
      ...sourceState,
      cursorTimestamp: nextBar.time,
      revealedCount,
      displayBarsTimeframe: normalizedDisplayTimeframe,
      displayBars: clone(displayBars),
      status: 'replay-ready',
    });
    if (normalizedDisplayTimeframe !== normalizedReplayTimeframe) {
      await chartSync.syncChartRightEdgeLimit(nextBar.time);
      await displayWindowController.projectDisplayForCursor({
        sessionId,
        displayTimeframe: normalizedDisplayTimeframe,
        cursorTimestamp: nextBar.time,
      });
      nextState = getState();
    }
    const persisted = await persistReplayCursor({
      cursorTimestamp: nextBar.time,
      revealedCount,
    });
    nextState = setState({
      ...getState(),
      persistedCursor: clone(persisted.cursor),
    });
    const result = {
      ...clone(nextState),
      advanced: true,
      revealedBar: clone(nextBar),
      revealedBars: clone(nextBars),
    };
    emitEvent(replayEvents.NEXT, result);
    return result;
  }

  async function previous({ sessionId = getState().sessionId, stepCount = 1 } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    const normalizedStepCount = normalizeStepCount(stepCount);
    if (normalizedStepCount > 1) {
      let result = null;
      for (let index = 0; index < normalizedStepCount; index += 1) {
        result = await previous({ sessionId, stepCount: 1 });
        if (!result.rewound) return result;
      }
      return result;
    }
    pausePlayback();
    if (getState().sessionId !== sessionId || getState().status === 'idle') {
      await ensureInitialSession({ sessionId });
    }
    const sourceState = getState();
    if (!sourceState.displayBars.length || !sourceState.cursorTimestamp) {
      throw new Error('replay initial session must be loaded before Previous.');
    }
    if (!sourceState.revealedCount || sourceState.revealedCount <= 0) {
      return {
        ...clone(sourceState),
        rewound: false,
        reason: 'start-bar',
      };
    }

    const normalizedDisplayTimeframe = normalizeTimeframe(
      sourceState.displayTimeframe || sourceState.session.timeframe,
      'display timeframe'
    );
    const normalizedReplayTimeframe = normalizeTimeframe(
      sourceState.replayTimeframe || sourceState.session.timeframe,
      'replay timeframe'
    );
    const cursorTimestamp = timestampSeconds(sourceState.cursorTimestamp);
    const replayBars = normalizedDisplayTimeframe === normalizedReplayTimeframe
      ? sourceState.displayBars
        .filter((bar) => Number(bar?.timestamp) <= cursorTimestamp)
        .sort((left, right) => Number(left.timestamp) - Number(right.timestamp))
      : [];
    const currentBarIndex = replayBars.findIndex((bar) => Number(bar?.timestamp) === cursorTimestamp);
    const previousCursorTimestamp = cursorTimestamp - timeframeSeconds(normalizedReplayTimeframe);
    const previousCursorBar = normalizedDisplayTimeframe === normalizedReplayTimeframe
      ? currentBarIndex > 0
        ? replayBars[currentBarIndex - 1]
        : null
      : {
        timestamp: previousCursorTimestamp,
        time: isoFromTimestamp(previousCursorTimestamp),
      };
    if (!previousCursorBar) {
      return {
        ...clone(sourceState),
        rewound: false,
        reason: 'previous-bar-unavailable',
      };
    }

    const revealedCount = Math.max(0, sourceState.revealedCount - 1);
    const persisted = await persistReplayCursor({
      cursorTimestamp: previousCursorBar.time,
      revealedCount,
    });
    let displayBars = sourceState.displayBars;
    if (normalizedDisplayTimeframe === normalizedReplayTimeframe) {
      displayBars = filterDisplayBarsForCursor(sourceState.displayBars, {
        cursorTimestamp: previousCursorBar.time,
        displayTimeframe: normalizedDisplayTimeframe,
        replayTimeframe: normalizedReplayTimeframe,
      });
      assertNoDisplayBarsAfter(displayBars, previousCursorBar.time);
      await chartSync.syncChartRightEdgeLimit(previousCursorBar.time);
      await chartSync.renderDisplayBars(displayBars, previousCursorBar.time);
    }

    let nextState = setState({
      ...sourceState,
      persistedCursor: clone(persisted.cursor),
      cursorTimestamp: previousCursorBar.time,
      revealedCount,
      displayBarsTimeframe: normalizedDisplayTimeframe,
      displayBars: clone(displayBars),
      status: revealedCount > 0 ? 'replay-ready' : 'initial-loaded',
    });
    if (normalizedDisplayTimeframe !== normalizedReplayTimeframe) {
      await chartSync.syncChartRightEdgeLimit(previousCursorBar.time);
      await displayWindowController.projectDisplayForCursor({
        sessionId,
        displayTimeframe: normalizedDisplayTimeframe,
        cursorTimestamp: previousCursorBar.time,
      });
      nextState = getState();
    }
    const result = {
      ...clone(nextState),
      rewound: true,
      cursorBar: clone(previousCursorBar),
    };
    emitEvent(replayEvents.PREVIOUS, result);
    return result;
  }

  async function truncateToTimestamp({
    sessionId = getState().sessionId,
    timestamp,
  } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    if (timestamp == null) {
      throw new Error('replay truncate timestamp is required.');
    }
    pausePlayback();
    if (getState().sessionId !== sessionId || getState().status === 'idle') {
      await ensureInitialSession({ sessionId });
    }
    const sourceState = getState();
    if (!sourceState.displayBars.length || !sourceState.cursorTimestamp || !sourceState.startBar) {
      throw new Error('replay initial session must be loaded before truncation.');
    }

    const normalizedDisplayTimeframe = normalizeTimeframe(
      sourceState.displayTimeframe || sourceState.session.timeframe,
      'display timeframe'
    );
    const normalizedReplayTimeframe = normalizeTimeframe(
      sourceState.replayTimeframe || sourceState.session.timeframe,
      'replay timeframe'
    );
    const selectedTimestamp = timestampSeconds(timestamp);
    const startTimestamp = timestampSeconds(sourceState.startBar.time);
    const cursorTimestamp = timestampSeconds(sourceState.cursorTimestamp);
    if (selectedTimestamp < startTimestamp || selectedTimestamp > cursorTimestamp) {
      return {
        ...clone(sourceState),
        truncated: false,
        reason: 'selected-bar-out-of-range',
      };
    }

    const replayBars = normalizedDisplayTimeframe === normalizedReplayTimeframe
      ? sourceState.displayBars
        .filter((bar) => Number(bar?.timestamp) >= startTimestamp && Number(bar?.timestamp) <= cursorTimestamp)
        .sort((left, right) => Number(left.timestamp) - Number(right.timestamp))
      : [];
    const selectedBar = normalizedDisplayTimeframe === normalizedReplayTimeframe
      ? replayBars.find((bar) => Number(bar?.timestamp) === selectedTimestamp)
      : {
        timestamp: selectedTimestamp,
        time: isoFromTimestamp(selectedTimestamp),
      };
    if (!selectedBar) {
      return {
        ...clone(sourceState),
        truncated: false,
        reason: 'selected-bar-unavailable',
      };
    }

    const revealedCount = Math.max(
      0,
      Math.floor((selectedTimestamp - startTimestamp) / timeframeSeconds(normalizedReplayTimeframe))
    );
    const persisted = await persistReplayCursor({
      cursorTimestamp: selectedBar.time,
      revealedCount,
    });
    let displayBars = sourceState.displayBars;
    if (normalizedDisplayTimeframe === normalizedReplayTimeframe) {
      displayBars = filterDisplayBarsForCursor(sourceState.displayBars, {
        cursorTimestamp: selectedBar.time,
        displayTimeframe: normalizedDisplayTimeframe,
        replayTimeframe: normalizedReplayTimeframe,
      });
      assertNoDisplayBarsAfter(displayBars, selectedBar.time);
      await chartSync.renderDisplayBars(displayBars, selectedBar.time, { resumeViewportFollow: true });
      await chartSync.syncChartRightEdgeLimit(selectedBar.time);
    }

    let nextState = setState({
      ...sourceState,
      persistedCursor: clone(persisted.cursor),
      cursorTimestamp: selectedBar.time,
      revealedCount,
      displayBarsTimeframe: normalizedDisplayTimeframe,
      displayBars: clone(displayBars),
      status: revealedCount > 0 ? 'replay-ready' : 'initial-loaded',
    });
    if (normalizedDisplayTimeframe !== normalizedReplayTimeframe) {
      await chartSync.syncChartRightEdgeLimit(selectedBar.time);
      await displayWindowController.projectDisplayForCursor({
        sessionId,
        displayTimeframe: normalizedDisplayTimeframe,
        cursorTimestamp: selectedBar.time,
      });
      nextState = getState();
    }
    const result = {
      ...clone(nextState),
      truncated: true,
      selectedBar: clone(selectedBar),
    };
    emitEvent(replayEvents.TRUNCATED, result);
    return result;
  }

  async function reset({ sessionId = getState().sessionId } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    pausePlayback();
    if (!getState().startBar || getState().sessionId !== sessionId) {
      await loadInitialPrefix({ sessionId });
    }
    const sourceState = getState();
    const normalizedDisplayTimeframe = normalizeTimeframe(
      sourceState.displayTimeframe || sourceState.session.timeframe,
      'display timeframe'
    );
    const normalizedReplayTimeframe = normalizeTimeframe(
      sourceState.replayTimeframe || sourceState.session.timeframe,
      'replay timeframe'
    );
    let displayBars = [
      ...sourceState.prefixBars,
      sourceState.startBar,
    ];
    if (normalizedDisplayTimeframe === normalizedReplayTimeframe) {
      assertNoFutureDisplayBars(displayBars, sourceState.startBar);
      await chartSync.renderDisplayBars(displayBars, sourceState.startBar.time, { resumeViewportFollow: true });
      await chartSync.syncChartRightEdgeLimit(sourceState.startBar.time);
    }

    let nextState = setState({
      ...sourceState,
      persistedCursor: {
        sessionId,
        startBarTimestamp: sourceState.startBar.time,
        cursorTimestamp: sourceState.startBar.time,
        revealedCount: 0,
      },
      cursorTimestamp: sourceState.startBar.time,
      revealedCount: 0,
      displayBarsTimeframe: normalizedDisplayTimeframe,
      displayBars: clone(displayBars),
      status: 'initial-loaded',
    });
    await clearPersistedReplayCursor();
    if (normalizedDisplayTimeframe !== normalizedReplayTimeframe) {
      await chartSync.syncChartRightEdgeLimit(sourceState.startBar.time);
      await displayWindowController.projectDisplayForCursor({
        sessionId,
        displayTimeframe: normalizedDisplayTimeframe,
        cursorTimestamp: sourceState.startBar.time,
      });
      nextState = getState();
    }
    const result = {
      ...clone(nextState),
      reset: true,
    };
    emitEvent(replayEvents.RESET, result);
    return result;
  }

  return {
    next,
    previous,
    reset,
    truncateToTimestamp,
  };
}
