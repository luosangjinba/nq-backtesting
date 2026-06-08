import { getReplayVisibleBars } from '../replay-controls.js';
import { dateKeyFromTimestamp } from '../../utils.js';

export { dateKeyFromTimestamp };

export function getReplayCalendarDate() {
  const replayBars = getReplayVisibleBars();
  if (!Array.isArray(replayBars) || replayBars.length === 0) return '';
  const latest = replayBars[replayBars.length - 1];
  return dateKeyFromTimestamp(latest?.timestamp);
}

export function resolveInspectorCalendarDate({
  selectedDate = '',
  fallbackDate = '',
  replayDate = getReplayCalendarDate(),
} = {}) {
  return selectedDate || replayDate || fallbackDate || '';
}
