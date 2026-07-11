import {
  BAR_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  DISPLAY_TIMEFRAME_COMMANDS,
  DISPLAY_TIMEFRAME_EVENTS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import {
  normalizeUnixSeconds,
  summarizeProjectionSource,
} from '../time-domain/time-domain.js';
import {
  resolveDisplayTimeframeTargetMaterializationHandoff,
  sourceCursorTimestampFromState,
} from './display-timeframe-target-materialization-handoff.js';
import { planDisplayTargetHistoryWindow } from './display-timeframe-target-history-plan.js';

function latestTimestamp(record = {}) {
  const bar = record.bars?.at?.(-1);
  const value = bar?.timestamp ?? bar?.time;
  try {
    return normalizeUnixSeconds(value, {
      fieldName: 'Display timeframe latest source bar timestamp',
    });
  } catch (_error) {
    return null;
  }
}

export function createDisplayTimeframeRuntime({
  sourceTimeframe = 1,
} = {}) {
  const unregisterCallbacks = [];
  let emit = () => {};

  async function resolveDisplayBars({
    displayTimeframe,
    sourceCursorTimestamp,
    sourceRecord,
    targetHistory = {},
    targetPane,
  }) {
    const plan = planDisplayTargetHistoryWindow({
      displayTimeframe,
      enabled: Boolean(targetHistory.enabled),
      end: targetHistory.end,
      instrument: targetPane.instrument,
      paneId: targetPane.id,
      sourceTimeframe,
      start: targetHistory.start,
    });
    if (plan.command === BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW) {
      if (sourceCursorTimestamp === null) {
        return {
          fallbackReason: 'source-replay-cursor-unavailable',
          plan,
          status: 'fallback',
          targetHistory: {
            barCount: 0,
            reason: 'source-replay-cursor-unavailable',
            status: 'fallback',
            window: plan.window,
          },
        };
      }
      try {
        const plannedWindow = await dispatchCommand(BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW, plan.window);
        const targetRecord = await dispatchCommand(plan.command, plannedWindow);
        const handoff = resolveDisplayTimeframeTargetMaterializationHandoff({
          sourceCursorTimestamp,
          sourceTimeframe,
          targetBars: targetRecord?.bars,
          targetTimeframe: plannedWindow.timeframe,
        });
        if (handoff.status === 'applied') {
          return {
            bars: handoff.bars,
            projectionSource: {
              owner: 'runtime.bar-data',
              sourceTimeframe,
              targetTimeframe: plannedWindow.timeframe,
            },
            status: 'applied',
            targetHistory: {
              barCount: handoff.bars.length,
              reason: plan.reason,
              revealStates: handoff.revealStates,
              status: 'applied',
              window: plannedWindow,
            },
          };
        }
        return {
          fallbackReason: handoff.fallbackReason || 'target-history-empty',
          plan,
          status: 'fallback',
          targetHistory: {
            barCount: Array.isArray(targetRecord?.bars) ? targetRecord.bars.length : 0,
            reason: handoff.fallbackReason || 'target-history-empty',
            revealStates: handoff.revealStates,
            status: 'fallback',
            window: plannedWindow,
          },
        };
      } catch (error) {
        return {
          error,
          fallbackReason: 'target-history-load-failed',
          plan,
          status: 'fallback',
        };
      }
    }

    return {
      fallbackReason: plan.reason,
      plan,
      status: 'fallback',
    };
  }

  async function projectSourceBars({
    cursorTimestamp,
    displayTimeframe,
    sourceRecord,
    targetPane,
    targetHistoryStatus = null,
  }) {
    const projectionRecord = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, {
      bars: sourceRecord.bars,
      cursorTimestamp,
      instrument: targetPane.instrument,
      paneId: targetPane.id,
      sessionStartTimestamp: 0,
      sourceTimeframe,
      targetTimeframe: displayTimeframe,
    });
    return {
      bars: projectionRecord.bars,
      projectionSource: summarizeProjectionSource(projectionRecord),
      targetHistory: targetHistoryStatus,
    };
  }

  async function applyDisplayTimeframe({
    displayTimeframe,
    paneId,
    targetHistory = {},
  } = {}) {
    const targetPane = paneId
      ? await dispatchCommand(PANE_COMMANDS.GET_BY_ID, paneId)
      : await dispatchCommand(PANE_COMMANDS.GET_ACTIVE);
    if (!targetPane) {
      throw new Error('Display timeframe target pane does not exist.');
    }
    const sourceRecord = await dispatchCommand(CHART_DATA_COMMANDS.GET_SOURCE_BARS, {
      paneId: targetPane.id,
    });
    const replayState = await dispatchCommand(REPLAY_COMMANDS.GET_STATE).catch(() => null);
    const sourceCursorTimestamp = sourceCursorTimestampFromState(replayState);
    const latestSourceTimestamp = latestTimestamp(sourceRecord);
    const cursorTimestamp = sourceCursorTimestamp ?? latestSourceTimestamp;
    const resolved = await resolveDisplayBars({
      displayTimeframe,
      sourceCursorTimestamp,
      sourceRecord,
      targetHistory,
      targetPane,
    });
    const displayRecord = resolved.status === 'applied'
      ? resolved
      : await projectSourceBars({
        cursorTimestamp,
        displayTimeframe,
        sourceRecord,
        targetPane,
        targetHistoryStatus: {
          errorMessage: resolved.error?.message || null,
          reason: resolved.fallbackReason,
          status: resolved.fallbackReason === 'target-history-disabled'
            ? 'disabled'
            : 'fallback',
          ...(resolved.targetHistory || {}),
        },
      });
    const pane = await dispatchCommand(PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
      displayTimeframe,
      paneId: targetPane.id,
    });
    const chartRecord = await dispatchCommand(CHART_DATA_COMMANDS.REPLACE_BARS, {
      bars: displayRecord.bars,
      cursorTimestamp,
      paneId: targetPane.id,
      preserveSource: true,
    });
    const viewportRecord = await dispatchCommand(CHART_VIEWPORT_COMMANDS.GET_PANE, {
      paneId: targetPane.id,
    });
    const result = {
      chartRecord,
      pane,
      projectionSource: displayRecord.projectionSource,
      sourceBarCount: sourceRecord.bars.length,
      targetBarCount: displayRecord.bars.length,
      targetHistory: displayRecord.targetHistory,
      viewportRecord,
    };
    emit(DISPLAY_TIMEFRAME_EVENTS.APPLIED, result);
    return result;
  }

  function start({ emitEvent } = {}) {
    emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(DISPLAY_TIMEFRAME_COMMANDS.APPLY, applyDisplayTimeframe),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
    emit = () => {};
  }

  return {
    id: 'runtime.display-timeframe',
    start,
    stop,
  };
}
