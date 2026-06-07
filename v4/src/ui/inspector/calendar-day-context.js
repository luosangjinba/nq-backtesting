import { getReplayVisibleBars } from '../replay-controls.js';

export function dateKeyFromTimestamp(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return '';
  return new Date(value * 1000).toISOString().slice(0, 10);
}

export function getReplayCalendarDate() {
  const replayBars = getReplayVisibleBars();
  if (!Array.isArray(replayBars) || replayBars.length === 0) return '';
  const latest = replayBars[replayBars.length - 1];
  return dateKeyFromTimestamp(latest?.timestamp);
}

export function resolveInspectorCalendarDate({ selectedDate = '', fallbackDate = '' } = {}) {
  return selectedDate || getReplayCalendarDate() || fallbackDate || '';
}
