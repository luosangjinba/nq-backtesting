import { dateKeyFromTimestamp } from '../utils.js';

let focusedDateKey = '';
let focusAnchorDateKey = '';

export function getActiveChartNoteDateKey(bars = []) {
  if (!Array.isArray(bars) || !bars.length) return '';
  for (let index = bars.length - 1; index >= 0; index -= 1) {
    const dateKey = dateKeyFromTimestamp(bars[index]?.timestamp);
    if (dateKey) return dateKey;
  }
  return '';
}

export function setChartNoteFocusedDate(dateKey, bars = []) {
  focusedDateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || '')) ? String(dateKey) : '';
  focusAnchorDateKey = focusedDateKey ? getActiveChartNoteDateKey(bars) : '';
}

export function clearChartNoteFocusedDate() {
  focusedDateKey = '';
  focusAnchorDateKey = '';
}

export function getVisibleChartNoteDateKey(bars = []) {
  const activeDateKey = getActiveChartNoteDateKey(bars);
  if (focusedDateKey) {
    if (focusAnchorDateKey && activeDateKey && activeDateKey !== focusAnchorDateKey) {
      clearChartNoteFocusedDate();
    } else {
      return focusedDateKey;
    }
  }
  return activeDateKey;
}

export function isChartNoteInDate(note, dateKey) {
  if (!dateKey) return true;
  return dateKeyFromTimestamp(note?.timestamp) === dateKey;
}
