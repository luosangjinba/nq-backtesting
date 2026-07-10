import { REPLAY_COMMANDS, REPLAY_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import {
  createReplayStateFromSession,
  markReplayPaused,
  markReplayPlaying,
  nextReplayState,
  previousReplayState,
  resetReplayState,
  setReplayCursorTime,
} from './replay-domain.js';

function cloneState(state) {
  return state ? { ...state } : null;
}

export function createReplayRuntime({
  enableInternalTimer = true,
  playIntervalMs = 500,
  timer = globalThis,
} = {}) {
  const unregisterCallbacks = [];
  let emit = () => {};
  let playbackTimerId = null;
  let state = null;

  function stopTimer() {
    if (playbackTimerId !== null) {
      timer.clearInterval(playbackTimerId);
      playbackTimerId = null;
    }
  }

  function setState(nextState) {
    state = nextState;
    if (state?.status === 'ended') {
      stopTimer();
    }
    return cloneState(state);
  }

  function requireState() {
    if (!state) {
      throw new Error('Replay session is not loaded.');
    }
    return state;
  }

  function loadSession(session) {
    stopTimer();
    const loaded = setState(createReplayStateFromSession(session));
    emit(REPLAY_EVENTS.LOADED, loaded);
    return loaded;
  }

  function next() {
    const advanced = setState(nextReplayState(requireState()));
    emit(REPLAY_EVENTS.ADVANCED, advanced);
    if (advanced.status === 'ended') {
      emit(REPLAY_EVENTS.PLAYBACK_CHANGED, advanced);
    }
    return advanced;
  }

  function previous() {
    const beforeStatus = requireState().status;
    stopTimer();
    const rewound = setState(previousReplayState(requireState()));
    emit(REPLAY_EVENTS.REWOUND, rewound);
    if (beforeStatus === 'playing' || beforeStatus === 'ended') {
      emit(REPLAY_EVENTS.PLAYBACK_CHANGED, rewound);
    }
    return rewound;
  }

  function reset() {
    stopTimer();
    const resetState = setState(resetReplayState(requireState()));
    emit(REPLAY_EVENTS.RESET, resetState);
    return resetState;
  }

  function setCursorTime(payload = {}) {
    const nextState = setState(setReplayCursorTime(requireState(), payload.cursorTime ?? payload.time));
    emit(REPLAY_EVENTS.ADVANCED, nextState);
    if (nextState.status === 'ended') {
      emit(REPLAY_EVENTS.PLAYBACK_CHANGED, nextState);
    }
    return nextState;
  }

  function pause() {
    stopTimer();
    const paused = setState(markReplayPaused(requireState()));
    emit(REPLAY_EVENTS.PLAYBACK_CHANGED, paused);
    return paused;
  }

  function play() {
    const playing = setState(markReplayPlaying(requireState()));
    emit(REPLAY_EVENTS.PLAYBACK_CHANGED, playing);
    if (!enableInternalTimer || playing.status !== 'playing' || playbackTimerId !== null) {
      return playing;
    }
    playbackTimerId = timer.setInterval(() => {
      next();
    }, playIntervalMs);
    return playing;
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(REPLAY_COMMANDS.LOAD_SESSION, loadSession),
      registerCommand(REPLAY_COMMANDS.GET_STATE, () => cloneState(state)),
      registerCommand(REPLAY_COMMANDS.NEXT, next),
      registerCommand(REPLAY_COMMANDS.PREVIOUS, previous),
      registerCommand(REPLAY_COMMANDS.RESET, reset),
      registerCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, setCursorTime),
      registerCommand(REPLAY_COMMANDS.PLAY, play),
      registerCommand(REPLAY_COMMANDS.PAUSE, pause)
    );
  }

  function stop() {
    stopTimer();
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    emit = () => {};
    state = null;
  }

  return {
    id: 'runtime.replay',
    start,
    stop,
  };
}
