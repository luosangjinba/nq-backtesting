import { BAR_DATA_COMMANDS, CHART_DATA_PROJECTION_COMMANDS } from '../contracts/app-contracts.js';
import { planDisplayTargetHistoryWindow } from '../display-timeframe/display-timeframe-target-history-plan.js';
import { dispatchCommand, hasCommand } from '../runtime/commands.js';
import { normalizeMinuteTimeframe, normalizeOptionalUnixSeconds } from '../time-domain/time-domain.js';
import { isSessionAwareDisplayTimeframe, normalizeDisplayTimeframeValue } from '../time-domain/htf-display-timeframe-domain.js';
import { planViewportTargetHistoryWindow } from './target-history-window-plan.js';

function cloneBars(bars = []) {
  return bars.map((bar) => ({ ...bar }));
}

export function replayCursorTimestamp(replayState = {}) {
  if (!replayState?.cursorTime) return null;
  try {
    return normalizeOptionalUnixSeconds(replayState.cursorTime, { fieldName: 'Leftward history replay cursorTime' });
  } catch {
    return null;
  }
}

function replayStartTimestamp(replayState = {}) {
  if (!replayState?.startTime) return null;
  try {
    return normalizeOptionalUnixSeconds(replayState.startTime, { fieldName: 'Leftward history replay startTime' });
  } catch {
    return null;
  }
}

function summarizeLoadedWindow(record = {}) {
  return {
    barCount: Array.isArray(record.bars) ? record.bars.length : 0,
    cacheHit: Boolean(record.cacheHit),
    history: record.history ? { ...record.history } : null,
    key: record.key || null,
  };
}

export async function createLeftwardSourcePrepend({
  displayTimeframe, loadedBars, loadedWindow, paneId, paneRecord, plannedWindow, replayState,
} = {}) {
  const sourceTimeframe = normalizeMinuteTimeframe(
    loadedWindow?.timeframe ?? plannedWindow?.timeframe ?? replayState?.timeframe ?? 1,
    { fieldName: 'Leftward history extension sourceTimeframe' },
  );
  const targetTimeframe = normalizeDisplayTimeframeValue(
    displayTimeframe ?? paneRecord?.displayTimeframe ?? paneRecord?.timeframe ?? plannedWindow?.timeframe ?? sourceTimeframe,
    { fieldName: 'Leftward history extension displayTimeframe' },
  );
  const shouldProject = isSessionAwareDisplayTimeframe(targetTimeframe)
    || Number(targetTimeframe) > Number(sourceTimeframe);
  if (shouldProject && hasCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT)) {
    const projectionRecord = await dispatchCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, {
      bars: loadedBars,
      cursorTimestamp: replayCursorTimestamp(replayState),
      instrument: paneRecord?.instrument || replayState?.symbol || null,
      paneId,
      sessionStartTimestamp: replayStartTimestamp(replayState) ?? loadedBars?.[0]?.timestamp ?? null,
      sourceTimeframe,
      targetTimeframe,
    });
    return { bars: projectionRecord.bars, projectionRecord, sourceBars: loadedBars };
  }
  return { bars: loadedBars, projectionRecord: null, sourceBars: loadedBars };
}

export async function loadLeftwardTargetPrepend({
  displayTimeframe, instrument, paneId, plannedWindow, sourceTimeframe, targetDisplayBars, targetHistory = {},
} = {}) {
  const targetPlannedWindow = planViewportTargetHistoryWindow({
    displayTimeframe,
    plannedSourceWindow: plannedWindow,
    targetDisplayBars,
  });
  const plan = planDisplayTargetHistoryWindow({
    displayTimeframe,
    enabled: Boolean(targetHistory.enabled),
    end: targetPlannedWindow.end,
    instrument,
    paneId,
    sourceTimeframe,
    start: targetPlannedWindow.start,
  });
  if (plan.command !== BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW) {
    return { reason: plan.reason, status: 'disabled' };
  }
  const targetWindow = await dispatchCommand(plan.command, plan.window);
  const targetBars = cloneBars(targetWindow?.bars);
  if (!targetBars.length) {
    return {
      loadedWindow: summarizeLoadedWindow(targetWindow),
      reason: 'target-history-empty',
      status: 'fallback',
      window: plan.window,
    };
  }
  return {
    bars: targetBars,
    loadedWindow: summarizeLoadedWindow(targetWindow),
    projectionSource: { owner: 'runtime.bar-data', sourceTimeframe, targetTimeframe: plan.window.timeframe },
    reason: plan.reason,
    status: 'applied',
    window: plan.window,
  };
}
