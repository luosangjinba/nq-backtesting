function dateKeyFromTimestamp(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return '';
  return new Date(value * 1000).toISOString().slice(0, 10);
}

export function getActiveChartNoteDateKey(bars = []) {
  if (!Array.isArray(bars) || !bars.length) return '';
  for (let index = bars.length - 1; index >= 0; index -= 1) {
    const dateKey = dateKeyFromTimestamp(bars[index]?.timestamp);
    if (dateKey) return dateKey;
  }
  return '';
}

export function isChartNoteInDate(note, dateKey) {
  if (!dateKey) return true;
  return dateKeyFromTimestamp(note?.timestamp) === dateKey;
}
