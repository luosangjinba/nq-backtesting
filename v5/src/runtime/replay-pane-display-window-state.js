import { CHART_COMMANDS } from '../contracts/chart-contracts.js';
import {
  earliestBarTimestamp,
} from './replay-runtime-state.js';

export const DEFAULT_REPLAY_PANE_ID = 'primary';

export function normalizeReplayPaneId(value) {
  const paneId = String(value || DEFAULT_REPLAY_PANE_ID).trim();
  return paneId || DEFAULT_REPLAY_PANE_ID;
}

export function displayWindowDemandKey({
  sessionId,
  instrument,
  paneId = DEFAULT_REPLAY_PANE_ID,
  displayTimeframe,
  anchor,
  direction,
  count,
} = {}) {
  return [
    sessionId,
    instrument,
    normalizeReplayPaneId(paneId),
    displayTimeframe,
    anchor,
    direction,
    count,
  ].join('|');
}

export async function resolvePaneDisplayWindowBase({
  targetPaneId = DEFAULT_REPLAY_PANE_ID,
  normalizedDisplayTimeframe,
  dispatchCommand,
  chartCommands = CHART_COMMANDS,
} = {}) {
  const normalizedPaneId = normalizeReplayPaneId(targetPaneId);
  const paneDisplayState = await dispatchCommand(
    chartCommands.GET_RENDERED_BARS,
    { paneId: normalizedPaneId }
  ).catch(() => null);
  const baseDisplayBars = Array.isArray(paneDisplayState?.bars) ? paneDisplayState.bars : [];
  const baseDisplayBarsTimeframe = paneDisplayState?.displayContext?.displayTimeframe;
  const baseDisplayRevision = paneDisplayState?.displayContext?.displayRevision;
  const shouldMergeDisplayBars = baseDisplayBars.length > 0
    && Number(baseDisplayBarsTimeframe || normalizedDisplayTimeframe) === normalizedDisplayTimeframe;
  return {
    paneDisplayState,
    baseDisplayBars,
    baseDisplayBarsTimeframe,
    currentEarliestTimestamp: earliestBarTimestamp(baseDisplayBars),
    baseDisplayRevision,
    shouldMergeDisplayBars,
    targetPaneId: normalizedPaneId,
  };
}

export function summarizeDisplayWindowAttempt({ window, windowDisplayBars } = {}) {
  const nextEarliestTimestamp = earliestBarTimestamp(windowDisplayBars);
  return {
    key: window.key,
    start: window.start,
    end: window.end,
    anchor: window.anchor,
    cached: Boolean(window.cached),
    barCount: window.bars.length,
    displayBarCount: windowDisplayBars.length,
    earliestTimestamp: Number.isFinite(nextEarliestTimestamp) ? nextEarliestTimestamp : null,
  };
}
