import * as bus from '../../event-bus.js';
import { loadPrimaryRangeCommand } from '../../runtime/commands.js';
import { resolveWindowAroundTimestamp } from '../../data/load-range-policy.js';
import { getReplayHistory } from '../replay-history-store.js';
import { isTimestampInRange } from './replay-time-utils.js';

export async function loadReplayHistoryItem(id, {
  primaryInstrument,
  setToolbarPrimaryInstrument,
  setToolbarRange,
  applyComparisonState,
  restoreReplayToTimestamp,
  closeHistoryPanel,
  render,
}) {
  const item = getReplayHistory(primaryInstrument).find((historyItem) => historyItem.id === id);
  if (!item) {
    bus.emit('status:update', { text: 'Replay History item not found', isError: true });
    return;
  }

  const cursorTimestamp = item.replay.cursorTimestamp;
  let loadStart = item.primary.start;
  let loadEnd = item.primary.end;
  let outerRange = item.primary.outerRange;
  const timeframe = Number(item.primary.timeframe);

  if (!isTimestampInRange(cursorTimestamp, loadStart, loadEnd) && outerRange) {
    const resolved = resolveWindowAroundTimestamp(outerRange, cursorTimestamp);
    if (!resolved.ok) {
      bus.emit('status:update', { text: resolved.message, isError: true });
      return;
    }
    loadStart = resolved.start;
    loadEnd = resolved.end;
    outerRange = resolved.outerRange;
  }

  bus.emit('status:update', { text: '恢复 Replay History...', isError: false });
  try {
    const instrument = setToolbarPrimaryInstrument(item.primary.instrument);
    await loadPrimaryRangeCommand({
      start: loadStart,
      end: loadEnd,
      timeframe,
      instrument,
      outerRange,
    });
    setToolbarRange(loadStart, loadEnd, timeframe);

    applyComparisonState(item.comparison);

    if (!restoreReplayToTimestamp(cursorTimestamp, item.replay.speedIndex)) {
      bus.emit('status:update', { text: 'Replay History restore failed: cursor is outside loaded window', isError: true });
      return;
    }
    closeHistoryPanel();
    render();
    bus.emit('status:update', { text: `Replay History restored: ${item.label}`, isError: false });
  } catch (err) {
    bus.emit('status:update', { text: `Replay History restore failed: ${err.message}`, isError: true });
  }
}
