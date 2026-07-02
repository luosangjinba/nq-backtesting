import { dispatchCommand, hasCommand, registerCommand } from './commands.js';
import { subscribeEvent } from './events.js';
import { CHART_COMMANDS, CHART_EVENTS } from '../contracts/chart-contracts.js';
import { REPLAY_COMMANDS, REPLAY_EVENTS } from '../contracts/replay-contracts.js';
import { SESSION_COMMANDS } from '../contracts/session-contracts.js';
import { createReplayBootstrapController } from './replay-bootstrap-controller.js';
import { createReplayChartSync } from './replay-chart-sync.js';
import { createReplayDisplayWindowController } from './replay-display-window-controller.js';
import { createReplayNavigationController } from './replay-navigation-controller.js';
import { createReplayPlaybackController } from './replay-playback-controller.js';
import { createReplayPrefixController } from './replay-prefix-controller.js';
import {
  cloneReplayValue as clone,
  createCountdownSnapshot,
  emptyReplayState,
} from './replay-runtime-state.js';

export { REPLAY_COMMANDS, REPLAY_EVENTS };
export {
  assertNoDisplayBarsAfter,
  assertNoFutureDisplayBars,
  canRevealBar,
  computePrefixBarCount,
  isAtOrAfterSessionEnd,
  isDisplayBarAllowed,
  mergeSparseDisplayBars,
  splitRetainedPrefixChunks,
} from './replay-runtime-state.js';

export function createReplayRuntime() {
  const unregisterCallbacks = [];
  let state = emptyReplayState();
  let emit = () => {};
  const chartSync = createReplayChartSync({
    getState: () => state,
    dispatchCommand,
    hasCommand,
    chartCommands: CHART_COMMANDS,
  });
  const prefixController = createReplayPrefixController({
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
      return state;
    },
    dispatchCommand,
    chartSync,
    emitEvent: (eventName, payload) => emit(eventName, payload),
  });
  const bootstrapController = createReplayBootstrapController({
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
      return state;
    },
    dispatchCommand,
    chartSync,
    resetPrefixAnchors: () => prefixController.resetAnchors(),
    emitEvent: (eventName, payload) => emit(eventName, payload),
  });
  const displayWindowController = createReplayDisplayWindowController({
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
      return state;
    },
    dispatchCommand,
    chartSync,
    ensureInitialSession: (payload) => bootstrapController.loadInitialSession(payload),
    emitEvent: (eventName, payload) => emit(eventName, payload),
  });
  let playbackController = null;
  const navigationController = createReplayNavigationController({
    getState: () => state,
    setState: (nextState) => {
      state = nextState;
      return state;
    },
    dispatchCommand,
    chartSync,
    displayWindowController,
    ensureInitialSession: (payload) => bootstrapController.loadInitialSession(payload),
    loadInitialPrefix: (payload) => bootstrapController.loadInitialPrefix(payload),
    persistReplayCursor: (payload) => persistReplayCursor(payload),
    clearPersistedReplayCursor: () => clearPersistedReplayCursor(),
    pausePlayback: (payload) => playbackController.pause(payload),
    emitEvent: (eventName, payload) => emit(eventName, payload),
  });
  playbackController = createReplayPlaybackController({
    getSessionId: () => state.sessionId,
    advanceReplay: (payload) => navigationController.next(payload),
    emitEvent: (eventName, payload) => emit(eventName, payload),
  });

  function replaySnapshot(extra = {}) {
    const snapshot = clone(state);
    return {
      ...snapshot,
      countdown: createCountdownSnapshot(snapshot),
      ...extra,
    };
  }

  async function persistReplayCursor({ cursorTimestamp, revealedCount }) {
    return dispatchCommand(SESSION_COMMANDS.UPDATE_CURSOR, {
      sessionId: state.sessionId,
      startBarTimestamp: state.startBar?.time || state.startBarTimestamp,
      cursorTimestamp,
      revealedCount,
    });
  }

  async function clearPersistedReplayCursor() {
    return dispatchCommand(SESSION_COMMANDS.UPDATE_CURSOR, {
      sessionId: state.sessionId,
      startBarTimestamp: state.startBar?.time || state.startBarTimestamp,
      cursorTimestamp: state.startBar?.time || state.startBarTimestamp,
      revealedCount: 0,
    });
  }

  function getDisplayContext() {
    return displayWindowController.displayContextSnapshot();
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || emit;
    unregisterCallbacks.push(
      registerCommand(REPLAY_COMMANDS.RESOLVE_START_BAR, (payload) => bootstrapController.resolveStartBar(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_INITIAL_PREFIX, (payload) => bootstrapController.loadInitialPrefix(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_INITIAL_SESSION, (payload) => bootstrapController.loadInitialSession(payload)),
      registerCommand(REPLAY_COMMANDS.LOAD_PREFIX_DEMAND, (payload) => prefixController.loadPrefixDemand(payload)),
      registerCommand(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, (payload) => displayWindowController.setDisplayTimeframe(payload)),
      registerCommand(REPLAY_COMMANDS.GET_DISPLAY_CONTEXT, () => getDisplayContext()),
      registerCommand(REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW, (payload) => displayWindowController.loadDisplayWindow(payload)),
      registerCommand(REPLAY_COMMANDS.APPLY_PREFIX_RETENTION, (payload) => prefixController.applyPrefixRetention(payload)),
      registerCommand(REPLAY_COMMANDS.NEXT, (payload) => navigationController.next(payload)),
      registerCommand(REPLAY_COMMANDS.PREVIOUS, (payload) => navigationController.previous(payload)),
      registerCommand(REPLAY_COMMANDS.TRUNCATE_TO_TIMESTAMP, (payload) => navigationController.truncateToTimestamp(payload)),
      registerCommand(REPLAY_COMMANDS.PLAY, (payload) => playbackController.play(payload)),
      registerCommand(REPLAY_COMMANDS.PAUSE, (payload) => playbackController.pause(payload)),
      registerCommand(REPLAY_COMMANDS.RESET, (payload) => navigationController.reset(payload)),
      registerCommand(REPLAY_COMMANDS.GET_PLAYBACK_STATE, () => playbackController.snapshot()),
      registerCommand(REPLAY_COMMANDS.GET_STATE, () => replaySnapshot()),
      subscribeEvent(CHART_EVENTS.PREFIX_DEMAND, (payload) => {
        dispatchCommand(REPLAY_COMMANDS.LOAD_PREFIX_DEMAND, payload).catch((error) => {
          queueMicrotask(() => {
            throw error;
          });
        });
      }),
      subscribeEvent(CHART_EVENTS.VISIBLE_RANGE_CHANGED, (payload) => {
        dispatchCommand(REPLAY_COMMANDS.APPLY_PREFIX_RETENTION, payload).catch((error) => {
          queueMicrotask(() => {
            throw error;
          });
        });
      })
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    playbackController.reset();
    state = emptyReplayState();
    bootstrapController.reset();
    prefixController.resetAnchors();
    displayWindowController.reset();
  }

  return {
    id: 'runtime.replay',
    start,
    stop,
  };
}
