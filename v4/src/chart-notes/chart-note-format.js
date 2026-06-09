export function formatChartNoteTime(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return '';
  const date = new Date(value * 1000);
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

export function formatChartNoteDisplayText(note = {}) {
  const timeLabel = note.kind === 'range'
    ? `${formatChartNoteTime(note.startTimestamp || note.timestamp)}-${formatChartNoteTime(note.endTimestamp || note.timestamp)}`
    : formatChartNoteTime(note.timestamp);
  return [timeLabel, String(note.text || '').trim()]
    .filter(Boolean)
    .join(' ');
}
