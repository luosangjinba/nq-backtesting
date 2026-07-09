import {
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  DEFAULT_WALL_COMMANDS,
  DEFAULT_WALL_EVENTS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, hasCommand, registerCommand } from '../runtime/commands.js';
import {
  advanceDefaultWallReplayState,
  createDefaultWallReplayState,
} from './default-wall-replay.js';
import {
  createDefaultWallPaneNextOperation,
  createDefaultWallPaneReplacePayload,
} from './default-wall-pane-projection.js';
import { normalizeMinuteTimeframe } from '../time-domain/time-domain.js';

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

function cloneTimeframes(timeframesByPaneId = new Map()) {
  return Object.fromEntries([...timeframesByPaneId.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function cloneStates(states = []) {
  return states.map(cloneState);
}

function cursorTimestampFromState(state) {
  const timestamp = state?.latestBar?.timestamp;
  if (!Number.isFinite(timestamp)) {
    throw new Error('Default wall state must include a latest bar timestamp.');
  }
  return timestamp;
}

function normalizePaneIds({ paneId, paneIds } = {}) {
  const ids = Array.isArray(paneIds) && paneIds.length ? paneIds : [paneId];
  const normalized = ids.map((id) => String(id || '').trim()).filter(Boolean);
  if (!normalized.length) {
    return [undefined];
  }
  const seen = new Set();
  normalized.forEach((id) => {
    if (seen.has(id)) {
      throw new Error(`Default wall replay duplicate pane id: ${id}`);
    }
    seen.add(id);
  });
  return normalized;
}

function normalizeDisplayTimeframe(value = 1) {
  try {
    return normalizeMinuteTimeframe(value, {
      allowSuffix: false,
      fieldName: 'Default wall pane displayTimeframe',
    });
  } catch (_error) {
    throw new Error('Default wall pane displayTimeframe must be a positive integer.');
  }
}

async function getViewportRecord(paneId) {
  return dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId });
}

export function createDefaultWallRuntime() {
  const unregisterCallbacks = [];
  let emit = () => {};
  let paneStates = [];
  let paneTimeframes = new Map();

  async function resolvePaneDisplayTimeframe(paneId, explicitTimeframes = {}) {
    if (Object.hasOwn(explicitTimeframes, paneId)) {
      return normalizeDisplayTimeframe(explicitTimeframes[paneId]);
    }
    if (hasCommand(PANE_COMMANDS.GET_BY_ID)) {
      const pane = await dispatchCommand(PANE_COMMANDS.GET_BY_ID, paneId);
      if (pane?.displayTimeframe) {
        return normalizeDisplayTimeframe(pane.displayTimeframe);
      }
    }
    return 1;
  }

  async function buildResult({
    chartRecord = null,
    chartRecords = [],
    replayState,
  } = {}) {
    const viewportRecords = await Promise.all(
      paneStates.map((paneState) => getViewportRecord(paneState.paneId)),
    );
    const activeViewportRecord = viewportRecords[0] || null;
    const activeState = paneStates[0] || null;
    return {
      activeProjection: activeViewportRecord?.projection || activeState?.projection || null,
      chartRecord,
      chartRecords,
      displayTimeframes: cloneTimeframes(paneTimeframes),
      replayState,
      state: cloneState(activeState),
      states: cloneStates(paneStates),
      viewportRecord: activeViewportRecord,
      viewportRecords,
    };
  }

  async function load(payload = {}) {
    const replayState = await dispatchCommand(REPLAY_COMMANDS.LOAD_SESSION, payload.session);
    paneStates = normalizePaneIds(payload).map((paneId) => createDefaultWallReplayState({
      bars: payload.bars,
      latestOffsetBars: payload.latestOffsetBars,
      paneId,
      prefixBars: payload.prefixBars,
      spanBars: payload.spanBars,
      startIndex: replayState.cursorIndex,
    }));
    paneTimeframes = new Map(await Promise.all(paneStates.map(async (paneState) => [
      paneState.paneId,
      await resolvePaneDisplayTimeframe(paneState.paneId, payload.paneDisplayTimeframes || {}),
    ])));
    await Promise.all(paneStates.map((paneState) => dispatchCommand(CHART_VIEWPORT_COMMANDS.ENSURE_INTENT, {
      cursorTimestamp: cursorTimestampFromState(paneState),
      latestOffsetBars: paneState.settings.latestOffsetBars,
      paneId: paneState.paneId,
    })));
    const chartRecords = await Promise.all(paneStates.map((paneState) => dispatchCommand(
      CHART_DATA_COMMANDS.REPLACE_BARS,
      createDefaultWallPaneReplacePayload(paneState, {
        displayTimeframe: paneTimeframes.get(paneState.paneId),
      }),
    )));
    const result = await buildResult({
      chartRecord: chartRecords[0] || null,
      chartRecords,
      replayState,
    });
    emit(DEFAULT_WALL_EVENTS.LOADED, result);
    return result;
  }

  async function next() {
    if (!paneStates.length) {
      throw new Error('Default wall replay is not loaded.');
    }
    if (!paneStates[0].forwardBars.length) {
      return buildResult({
        chartRecords: [],
        replayState: await dispatchCommand(REPLAY_COMMANDS.GET_STATE),
      });
    }
    const replayState = await dispatchCommand(REPLAY_COMMANDS.NEXT);
    paneStates = paneStates.map(advanceDefaultWallReplayState);
    const operations = paneStates.map((paneState) => createDefaultWallPaneNextOperation(paneState, {
      displayTimeframe: paneTimeframes.get(paneState.paneId),
    }));
    const chartRecords = await Promise.all(operations.map(({ operation, payload }) => dispatchCommand(
      operation === 'append' ? CHART_DATA_COMMANDS.APPEND_BARS : CHART_DATA_COMMANDS.REPLACE_BARS,
      payload,
    )));
    const result = await buildResult({
      chartRecord: operations[0]?.payload || null,
      chartRecords,
      replayState,
    });
    emit(DEFAULT_WALL_EVENTS.ADVANCED, result);
    return result;
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(DEFAULT_WALL_COMMANDS.LOAD, load),
      registerCommand(DEFAULT_WALL_COMMANDS.NEXT, next),
      registerCommand(DEFAULT_WALL_COMMANDS.GET_STATE, () => cloneState(paneStates[0])),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    emit = () => {};
    paneStates = [];
    paneTimeframes = new Map();
  }

  return {
    id: 'runtime.default-wall',
    start,
    stop,
  };
}
