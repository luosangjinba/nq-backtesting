import * as bus from '../event-bus.js';

const DEFAULT_NOTE_COLOR = '#fff7a8';
const DEFAULT_NOTE_POSITION = 'above';
const VALID_POSITIONS = new Set(['above', 'below']);

let chartNotes = [];

function normalizeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeTimeframe(value) {
  const timeframe = Number(value);
  return Number.isFinite(timeframe) && timeframe > 0 ? timeframe : 60;
}

function normalizeTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? Math.floor(timestamp) : 0;
}

function normalizePosition(value) {
  const position = normalizeString(value, DEFAULT_NOTE_POSITION).toLowerCase();
  return VALID_POSITIONS.has(position) ? position : DEFAULT_NOTE_POSITION;
}

function emitChanged() {
  bus.emit('chart-notes:changed', { chartNotes: getChartNotes() });
}

export function getChartNoteIdentity(note) {
  return [
    normalizeString(note?.instrument, 'NQ').toUpperCase(),
    normalizeTimeframe(note?.timeframe),
    normalizeTimestamp(note?.timestamp),
  ].join(':');
}

export function normalizeChartNote(input = {}) {
  const instrument = normalizeString(input.instrument, 'NQ').toUpperCase();
  const timeframe = normalizeTimeframe(input.timeframe);
  const timestamp = normalizeTimestamp(input.timestamp);
  const text = normalizeString(input.text);

  if (!instrument || !timestamp || !text) return null;

  const id = normalizeString(input.id, `chart-note-${instrument}-${timeframe}-${timestamp}`);
  const createdAt = Number(input.createdAt);
  const updatedAt = Number(input.updatedAt);
  const normalized = {
    id,
    instrument,
    timeframe,
    timestamp,
    text,
    position: normalizePosition(input.position),
    color: normalizeString(input.color, DEFAULT_NOTE_COLOR),
    display: {
      hidden: Boolean(input.display?.hidden),
    },
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now(),
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : Date.now(),
  };

  const importedFromId = normalizeString(input.importedFromId);
  if (importedFromId) normalized.importedFromId = importedFromId;

  return normalized;
}

export function getChartNotes() {
  return [...chartNotes];
}

export function getChartNoteById(id) {
  return chartNotes.find((note) => note.id === id) || null;
}

export function getChartNoteForBar({ instrument = 'NQ', timeframe, timestamp } = {}) {
  const identity = getChartNoteIdentity({ instrument, timeframe, timestamp });
  return chartNotes.find((note) => getChartNoteIdentity(note) === identity) || null;
}

export function upsertChartNote(input = {}) {
  const normalized = normalizeChartNote(input);
  if (!normalized) return null;

  const identity = getChartNoteIdentity(normalized);
  const existingIndex = chartNotes.findIndex((note) => getChartNoteIdentity(note) === identity);
  if (existingIndex >= 0) {
    let updated = null;
    chartNotes = chartNotes.map((note, index) => {
      if (index !== existingIndex) return note;
      updated = {
        ...note,
        ...normalized,
        id: note.id,
        createdAt: note.createdAt,
        updatedAt: Date.now(),
      };
      return updated;
    });
    emitChanged();
    return updated;
  }

  chartNotes = [...chartNotes, normalized].sort((a, b) => a.timestamp - b.timestamp);
  emitChanged();
  return normalized;
}

export function updateChartNote(id, patch = {}) {
  let updated = null;
  chartNotes = chartNotes.map((note) => {
    if (note.id !== id) return note;
    const normalized = normalizeChartNote({
      ...note,
      ...patch,
      id: note.id,
      createdAt: note.createdAt,
      updatedAt: Date.now(),
    });
    if (!normalized) return note;
    updated = normalized;
    return updated;
  });
  if (updated) emitChanged();
  return updated;
}

export function deleteChartNote(id) {
  const before = chartNotes.length;
  chartNotes = chartNotes.filter((note) => note.id !== id);
  if (chartNotes.length !== before) {
    emitChanged();
    return true;
  }
  return false;
}

export function loadChartNotes(nextNotes = []) {
  const seen = new Set();
  chartNotes = (Array.isArray(nextNotes) ? nextNotes : [])
    .map((note) => normalizeChartNote(note))
    .filter(Boolean)
    .filter((note) => {
      const identity = getChartNoteIdentity(note);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    })
    .sort((a, b) => a.timestamp - b.timestamp);
  emitChanged();
}

export function clearChartNotes() {
  if (!chartNotes.length) return false;
  chartNotes = [];
  emitChanged();
  return true;
}
