import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_EVENTS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { executeNarrowReplayMaterializationRuntimeHandoffPlan } from './narrow-replay-materialization-runtime-handoff-executor.js';

const RUNTIME_ID = 'runtime.replay-coordination-materialization-handoff';

function barTimestamp(bar = {}) {
  const timestamp = Number(bar.timestamp ?? bar.time);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function targetWindowFromContext({ paneContext, replayState, sourceRecord } = {}) {
  const bars = Array.isArray(sourceRecord?.bars) ? sourceRecord.bars : [];
  const timestamps = bars.map(barTimestamp).filter(Number.isFinite);
  const cursorValue = replayState?.cursorTimestamp ?? replayState?.cursorTime;
  const cursorMs = typeof cursorValue === 'number'
    ? cursorValue * 1000
    : Date.parse(cursorValue);
  if (!timestamps.length || !Number.isFinite(cursorMs)) {
    return null;
  }
  return {
    end: new Date(cursorMs).toISOString(),
    instrument: paneContext?.instrument,
    start: new Date(Math.min(...timestamps) * 1000).toISOString(),
    timeframe: paneContext?.displayTimeframe,
  };
}

function createMissingDispatchCommand() {
  return async (name) => {
    throw new Error(`Replay coordination materialization handoff dispatch dependency missing for ${name}.`);
  };
}

function createNoopSubscribeEvent() {
  return () => () => {};
}

function normalizeDependencies(dependencies = {}) {
  return {
    dispatchCommand: typeof dependencies.dispatchCommand === 'function'
      ? dependencies.dispatchCommand
      : createMissingDispatchCommand(),
    executor: typeof dependencies.executor === 'function'
      ? dependencies.executor
      : executeNarrowReplayMaterializationRuntimeHandoffPlan,
    subscribeEvent: typeof dependencies.subscribeEvent === 'function'
      ? dependencies.subscribeEvent
      : createNoopSubscribeEvent(),
  };
}

export async function collectReplayCoordinationMaterializationRuntimeHandoffCommandResults({
  dispatchCommand,
  event = {},
} = {}) {
  if (typeof dispatchCommand !== 'function') {
    throw new Error('Replay coordination materialization handoff dispatchCommand dependency is required.');
  }
  const paneId = event.paneId ?? event.id ?? 'main';
  const paneContext = await dispatchCommand(PANE_COMMANDS.GET_BY_ID, paneId);
  const replayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE, { paneId });
  const sourceRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_SOURCE_BARS, { paneId });
  const sourceBars = Array.isArray(sourceRecord) ? sourceRecord : sourceRecord?.bars || [];
  const targetWindow = targetWindowFromContext({ paneContext, replayState, sourceRecord: { bars: sourceBars } });
  const targetWindowPlan = targetWindow
    ? await dispatchCommand(BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW, targetWindow)
    : null;
  const targetWindowLoad = targetWindowPlan
    ? await dispatchCommand(BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW, targetWindowPlan)
    : null;

  return Object.freeze({
    paneContext,
    replayState,
    sourceBars,
    targetWindowLoad,
    targetWindowPlan,
  });
}

export async function buildReplayCoordinationMaterializationRuntimeHandoffResult({
  commandResults = null,
  dispatchCommand,
  event = {},
  executor = executeNarrowReplayMaterializationRuntimeHandoffPlan,
  shouldCommit = () => true,
} = {}) {
  const resolvedCommandResults = commandResults || await collectReplayCoordinationMaterializationRuntimeHandoffCommandResults({
    dispatchCommand,
    event,
  });
  const result = executor({
    commandResults: resolvedCommandResults,
    event,
  });
  if (result?.replaceIntent && !(await shouldCommit(result))) {
    return Object.freeze({
      ...result,
      action: 'stale',
      replaceIntent: null,
      status: 'stale',
    });
  }
  if (result?.replaceIntent) {
    await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, result.replaceIntent);
  }
  return result;
}

export function createReplayCoordinationMaterializationRuntimeHandoff(dependencies = {}) {
  const resolvedDependencies = normalizeDependencies(dependencies);
  const cleanupCallbacks = [];
  let lastResult = null;
  let requestRevision = 0;
  let started = false;

  async function handleManualNextAdvanced(event = {}) {
    requestRevision += 1;
    const revision = requestRevision;
    lastResult = await buildReplayCoordinationMaterializationRuntimeHandoffResult({
      dispatchCommand: resolvedDependencies.dispatchCommand,
      event,
      executor: resolvedDependencies.executor,
      shouldCommit: async (result) => {
        if (!started || revision !== requestRevision) return false;
        const replayState = await resolvedDependencies.dispatchCommand(REPLAY_COMMANDS.GET_STATE);
        const cursor = replayState?.cursorTimestamp ?? replayState?.cursorTime;
        const cursorMs = typeof cursor === 'number' ? cursor * 1000 : Date.parse(cursor);
        return Number.isFinite(cursorMs)
          && Math.floor(cursorMs / 1000) === Number(result.replayCursorTimestamp);
      },
    });
    return lastResult;
  }

  function start() {
    if (started) return;
    started = true;
    cleanupCallbacks.push(
      resolvedDependencies.subscribeEvent(
        CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED,
        (event) => handleManualNextAdvanced(event),
      ),
    );
  }

  function stop() {
    while (cleanupCallbacks.length) {
      const cleanup = cleanupCallbacks.pop();
      if (typeof cleanup === 'function') {
        cleanup();
      }
    }
    started = false;
    requestRevision += 1;
    lastResult = null;
  }

  function getState() {
    return {
      id: RUNTIME_ID,
      lastResult,
      started,
    };
  }

  return {
    getState,
    id: RUNTIME_ID,
    start,
    stop,
  };
}
