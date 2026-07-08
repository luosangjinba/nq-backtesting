import {
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_ENTRY_AUTO_PLAY_EVENTS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';

const BASE_INTERVAL_MS = 500;
const SUPPORTED_SPEEDS = Object.freeze([0.5, 1, 2, 4]);

function normalizeSpeed(value) {
  const speed = Number(value ?? 1);
  if (!SUPPORTED_SPEEDS.includes(speed)) {
    throw new Error(`Chart entry auto play unsupported speed: ${value}`);
  }
  return speed;
}

function intervalForSpeed(speed) {
  return Math.max(1, Math.round(BASE_INTERVAL_MS / normalizeSpeed(speed)));
}

function cloneTick(tick) {
  return tick ? {
    replayState: tick.replayState ? { ...tick.replayState } : null,
    status: tick.status,
  } : null;
}

function normalizePaneIds(payload = {}, fallbackPaneId = 'main') {
  if (Array.isArray(payload.paneIds)) {
    const ids = payload.paneIds
      .map((paneId) => String(paneId || '').trim())
      .filter(Boolean);
    return [...new Set(ids)];
  }
  return [String(payload.paneId || fallbackPaneId || 'main').trim()].filter(Boolean);
}

export function createChartEntryAutoPlayRuntime({
  timer = globalThis,
} = {}) {
  const unregisterCallbacks = [];
  let emit = () => {};
  let timerId = null;
  let ticking = false;
  let state = {
    error: null,
    lastTick: null,
    paneId: 'main',
    paneIds: ['main'],
    playing: false,
    speed: 1,
    status: 'idle',
  };

  function stopTimer() {
    if (timerId !== null) {
      timer.clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer(speed) {
    stopTimer();
    timerId = timer.setInterval(() => {
      void tick();
    }, intervalForSpeed(speed));
  }

  function getState() {
    return {
      error: state.error,
      lastTick: cloneTick(state.lastTick),
      paneId: state.paneId,
      paneIds: [...state.paneIds],
      playing: state.playing,
      speed: state.speed,
      status: state.status,
    };
  }

  function setStopped(status = 'stopped', error = null) {
    stopTimer();
    state = {
      ...state,
      error,
      playing: false,
      status,
    };
    return getState();
  }

  async function tick() {
    if (ticking || !state.playing) return getState();
    ticking = true;
    try {
      const nextState = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
        paneIds: state.paneIds,
      });
      if (nextState?.status === 'error') {
        throw new Error(nextState.error || 'Chart entry manual next failed during auto play.');
      }
      const replayState = nextState?.advanced?.replayState || null;
      state = {
        ...state,
        error: null,
        lastTick: {
          replayState,
          status: nextState?.status || 'unknown',
        },
        status: replayState?.status === 'ended' ? 'ended' : 'playing',
      };
      emit(CHART_ENTRY_AUTO_PLAY_EVENTS.TICKED, getState());
      if (replayState?.status === 'ended') {
        setStopped('ended');
        emit(CHART_ENTRY_AUTO_PLAY_EVENTS.STOPPED, getState());
      }
      return getState();
    } catch (error) {
      const stopped = setStopped('error', error?.message || String(error));
      emit(CHART_ENTRY_AUTO_PLAY_EVENTS.STOPPED, stopped);
      return stopped;
    } finally {
      ticking = false;
    }
  }

  async function start(payload = {}) {
    const speed = normalizeSpeed(payload.speed);
    const paneIds = normalizePaneIds(payload, state.paneId);
    stopTimer();
    const replayState = await dispatchCommand(REPLAY_COMMANDS.PLAY);
    state = {
      error: null,
      lastTick: null,
      paneId: paneIds[0] || 'main',
      paneIds,
      playing: replayState?.status === 'playing',
      speed,
      status: replayState?.status === 'playing' ? 'playing' : String(replayState?.status || 'idle'),
    };
    if (state.playing) {
      startTimer(speed);
      emit(CHART_ENTRY_AUTO_PLAY_EVENTS.STARTED, getState());
    }
    return getState();
  }

  function setSpeed(payload = {}) {
    const speed = normalizeSpeed(payload.speed);
    state = {
      ...state,
      error: null,
      speed,
    };
    if (state.playing) {
      startTimer(speed);
    }
    return getState();
  }

  async function stop() {
    const replayState = await dispatchCommand(REPLAY_COMMANDS.PAUSE);
    const stopped = setStopped(String(replayState?.status || 'stopped'));
    emit(CHART_ENTRY_AUTO_PLAY_EVENTS.STOPPED, stopped);
    return stopped;
  }

  function startRuntime({ emitEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE, () => getState()),
      registerCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.SET_SPEED, setSpeed),
      registerCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START, start),
      registerCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP, stop),
    );
  }

  function stopRuntime() {
    stopTimer();
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    emit = () => {};
    ticking = false;
    state = {
      error: null,
      lastTick: null,
      paneId: 'main',
      paneIds: ['main'],
      playing: false,
      speed: 1,
      status: 'idle',
    };
  }

  return {
    id: 'runtime.chartEntryAutoPlay',
    start: startRuntime,
    stop: stopRuntime,
  };
}
