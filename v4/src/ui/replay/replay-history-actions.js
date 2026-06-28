import * as bus from '../../event-bus.js';
import { getReplayHistory } from '../replay-history-store.js';
import { openReplaySessionFromRange } from './replay-session-loader.js';

function getHistorySessionRange(item) {
  const outerRange = item?.primary?.outerRange;
  if (outerRange?.start && outerRange?.end) {
    return {
      start: outerRange.start,
      end: outerRange.end,
    };
  }
  return {
    start: item?.primary?.start || '',
    end: item?.primary?.end || '',
  };
}

export async function loadReplayHistoryItem(id, {
  primaryInstrument,
  setToolbarPrimaryInstrument,
  setToolbarRange,
  applyComparisonState,
  closeHistoryPanel,
  render,
}) {
  const item = getReplayHistory(primaryInstrument).find((historyItem) => historyItem.id === id);
  if (!item) {
    bus.emit('status:update', { text: 'Replay History item not found', isError: true });
    return;
  }

  const cursorTimestamp = item.replay.cursorTimestamp;
  const timeframe = Number(item.primary.timeframe);
  const sessionRange = getHistorySessionRange(item);
  if (!sessionRange.start || !sessionRange.end) {
    bus.emit('status:update', { text: 'Replay History restore failed: missing session range', isError: true });
    return;
  }

  bus.emit('status:update', { text: '恢复 Replay History...', isError: false });
  try {
    const instrument = setToolbarPrimaryInstrument(item.primary.instrument);
    await openReplaySessionFromRange({
      instrument,
      timeframe,
      sessionStart: sessionRange.start,
      sessionEnd: sessionRange.end,
      cursor: cursorTimestamp,
    });
    setToolbarRange(sessionRange.start, sessionRange.end, timeframe);
    applyComparisonState(item.comparison);
    closeHistoryPanel();
    render();
    bus.emit('status:update', { text: `Replay History restored: ${item.label}`, isError: false });
  } catch (err) {
    bus.emit('status:update', { text: `Replay History restore failed: ${err.message}`, isError: true });
  }
}
