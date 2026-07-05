import {
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  DEFAULT_WALL_COMMANDS,
  DEFAULT_WALL_EVENTS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import {
  advanceDefaultWallReplayState,
  createDefaultWallChartAppendPayload,
  createDefaultWallChartReplacePayload,
  createDefaultWallReplayState,
} from './default-wall-replay.js';

function cloneState(state) {
  return state ? {
    chartBarCount: state.chartBars.length,
    cursorIndex: state.cursorIndex,
    forwardBarCount: state.forwardBars.length,
    latestBar: state.latestBar ? { ...state.latestBar } : null,
    paneId: state.paneId,
    projection: { ...state.projection },
    settings: { ...state.settings },
  } : null;
}

function cursorTimestampFromState(state) {
  const timestamp = state?.latestBar?.timestamp;
  if (!Number.isFinite(timestamp)) {
    throw new Error('Default wall state must include a latest bar timestamp.');
  }
  return timestamp;
}

export function createDefaultWallRuntime() {
  const unregisterCallbacks = [];
  let emit = () => {};
  let state = null;

  async function load(payload = {}) {
    const replayState = await dispatchCommand(REPLAY_COMMANDS.LOAD_SESSION, payload.session);
    state = createDefaultWallReplayState({
      bars: payload.bars,
      latestOffsetBars: payload.latestOffsetBars,
      paneId: payload.paneId,
      prefixBars: payload.prefixBars,
      spanBars: payload.spanBars,
      startIndex: replayState.cursorIndex,
    });
    await dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
      cursorTimestamp: cursorTimestampFromState(state),
      latestOffsetBars: state.settings.latestOffsetBars,
      paneId: state.paneId,
    });
    const chartRecord = await dispatchCommand(
      CHART_DATA_COMMANDS.REPLACE_BARS,
      createDefaultWallChartReplacePayload(state),
    );
    const result = {
      chartRecord,
      replayState,
      state: cloneState(state),
    };
    emit(DEFAULT_WALL_EVENTS.LOADED, result);
    return result;
  }

  async function next() {
    if (!state) {
      throw new Error('Default wall replay is not loaded.');
    }
    if (!state.forwardBars.length) {
      return {
        chartRecord: null,
        replayState: await dispatchCommand(REPLAY_COMMANDS.GET_STATE),
        state: cloneState(state),
      };
    }
    const replayState = await dispatchCommand(REPLAY_COMMANDS.NEXT);
    state = advanceDefaultWallReplayState(state);
    const chartRecord = await dispatchCommand(
      CHART_DATA_COMMANDS.APPEND_BARS,
      createDefaultWallChartAppendPayload(state),
    );
    const result = {
      chartRecord,
      replayState,
      state: cloneState(state),
    };
    emit(DEFAULT_WALL_EVENTS.ADVANCED, result);
    return result;
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(DEFAULT_WALL_COMMANDS.LOAD, load),
      registerCommand(DEFAULT_WALL_COMMANDS.NEXT, next),
      registerCommand(DEFAULT_WALL_COMMANDS.GET_STATE, () => cloneState(state)),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    emit = () => {};
    state = null;
  }

  return {
    id: 'runtime.default-wall',
    start,
    stop,
  };
}
