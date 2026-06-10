import * as bus from '../event-bus.js';

const DEFAULT_NOTE_COLOR = '#fff7a8';
const DEFAULT_NOTE_POSITION = 'above';
const VALID_POSITIONS = new Set(['above', 'below']);
const VALID_KINDS = new Set(['bar', 'range']);

let chartNotes = [];
let chartNotesVersion = 0;

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

function normalizeKind(value) {
  const kind = normalizeString(value, 'bar').toLowerCase();
  return VALID_KINDS.has(kind) ? kind : 'bar';
}

function emitChanged() {
  chartNotesVersion += 1;
  bus.emit('chart-notes:changed', { chartNotes: getChartNotes() });
}

export function getChartNoteIdentity(note) {
  const kind = normalizeKind(note?.kind);
  if (kind === 'range') {
    return [
      normalizeString(note?.instrument, 'NQ').toUpperCase(),
      normalizeTimeframe(note?.timeframe),
      'range',
      normalizeTimestamp(note?.startTimestamp ?? note?.timestamp),
      normalizeTimestamp(note?.endTimestamp ?? note?.timestamp),
    ].join(':');
  }
  return [
    normalizeString(note?.instrument, 'NQ').toUpperCase(),
    normalizeTimeframe(note?.timeframe),
    'bar',
    normalizeTimestamp(note?.timestamp),
  ].join(':');
}

export function normalizeChartNote(input = {}) {
  const instrument = normalizeString(input.instrument, 'NQ').toUpperCase();
  const timeframe = normalizeTimeframe(input.timeframe);
  const kind = normalizeKind(input.kind);
  const rawStart = normalizeTimestamp(input.startTimestamp ?? input.timestamp);
  const rawEnd = normalizeTimestamp(input.endTimestamp ?? input.timestamp);
  const startTimestamp = kind === 'range' ? Math.min(rawStart, rawEnd) : rawStart;
  const endTimestamp = kind === 'range' ? Math.max(rawStart, rawEnd) : rawStart;
  const timestamp = kind === 'range' ? startTimestamp : rawStart;
  const text = normalizeString(input.text);

  if (!instrument || !timestamp || !text) return null;
  if (kind === 'range' && (!startTimestamp || !endTimestamp || startTimestamp === endTimestamp)) return null;

  const id = normalizeString(
    input.id,
    kind === 'range'
      ? `chart-note-range-${instrument}-${timeframe}-${startTimestamp}-${endTimestamp}`
      : `chart-note-${instrument}-${timeframe}-${timestamp}`
  );
  const createdAt = Number(input.createdAt);
  const updatedAt = Number(input.updatedAt);
  const normalized = {
    id,
    kind,
    instrument,
    timeframe,
    timestamp,
    startTimestamp,
    endTimestamp,
    text,
    position: normalizePosition(input.position),
    color: normalizeString(input.color, DEFAULT_NOTE_COLOR),
    display: {
      hidden: Boolean(input.display?.hidden),
      showGuides: Boolean(input.display?.showGuides),
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

export function getChartNotesVersion() {
  return chartNotesVersion;
}

export function getChartNoteById(id) {
  return chartNotes.find((note) => note.id === id) || null;
}

export function getChartNoteForBar({ instrument = 'NQ', timeframe, timestamp } = {}) {
  const identity = getChartNoteIdentity({ kind: 'bar', instrument, timeframe, timestamp });
  return chartNotes.find((note) => getChartNoteIdentity(note) === identity) || null;
}

export function getChartNoteRangesForBar({ instrument = 'NQ', timeframe, timestamp } = {}) {
  const normalizedInstrument = normalizeString(instrument, 'NQ').toUpperCase();
  const normalizedTimeframe = normalizeTimeframe(timeframe);
  const normalizedTimestamp = normalizeTimestamp(timestamp);
  if (!normalizedTimestamp) return [];
  return chartNotes.filter((note) =>
    normalizeKind(note.kind) === 'range' &&
    note.instrument === normalizedInstrument &&
    Number(note.timeframe) === Number(normalizedTimeframe) &&
    Number(note.startTimestamp) <= normalizedTimestamp &&
    Number(note.endTimestamp) >= normalizedTimestamp
  );
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
