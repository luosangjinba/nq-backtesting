import {
  BAR_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  DISPLAY_TIMEFRAME_COMMANDS,
  DISPLAY_TIMEFRAME_EVENTS,
  PANE_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand, registerCommand } from '../runtime/commands.js';
import {
  normalizeUnixSeconds,
  summarizeProjectionSource,
} from '../time-domain/time-domain.js';
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
    cursorTimestamp,
    displayTimeframe,
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
      try {
        const targetRecord = await dispatchCommand(plan.command, plan.window);
        if (Array.isArray(targetRecord?.bars) && targetRecord.bars.length) {
          return {
            bars: targetRecord.bars,
            projectionSource: {
              owner: 'runtime.bar-data',
              sourceTimeframe,
              targetTimeframe: plan.window.timeframe,
            },
            status: 'applied',
            targetHistory: {
              barCount: targetRecord.bars.length,
              reason: plan.reason,
              status: 'applied',
              window: plan.window,
            },
          };
        }
        return {
          fallbackReason: 'target-history-empty',
          plan,
          status: 'fallback',
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
    const cursorTimestamp = latestTimestamp(sourceRecord);
    const resolved = await resolveDisplayBars({
      cursorTimestamp,
      displayTimeframe,
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
