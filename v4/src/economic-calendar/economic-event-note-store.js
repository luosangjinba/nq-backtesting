import * as bus from '../event-bus.js';

let eventNotes = {};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeNoteRecord(input = {}) {
  const eventId = String(input.eventId || input.id || '').trim();
  if (!eventId) return null;
  return {
    eventId,
    note: String(input.note || ''),
    updatedAt: Number(input.updatedAt) || Date.now(),
  };
}

function emitChanged(reason) {
  bus.emit('economic-event-notes:changed', {
    reason,
    notes: getEconomicEventNotes(),
  });
}

export function getEconomicEventNotes() {
  return clone(Object.values(eventNotes));
}

export function getEconomicEventNote(eventId) {
  const note = eventNotes[String(eventId || '')];
  return note ? { ...note } : null;
}

export function updateEconomicEventNote(eventId, patch = {}) {
  const id = String(eventId || '').trim();
  if (!id) return null;
  const existing = eventNotes[id] || { eventId: id, note: '', updatedAt: Date.now() };
  const normalized = normalizeNoteRecord({
    ...existing,
    ...patch,
    eventId: id,
    updatedAt: Date.now(),
  });
  if (!normalized) return null;
  if (existing.note === normalized.note) return { ...existing };
  eventNotes = {
    ...eventNotes,
    [id]: normalized,
  };
  emitChanged('note:update');
  return { ...normalized };
}

export function loadEconomicEventNotes(nextNotes = []) {
  eventNotes = {};
  (Array.isArray(nextNotes) ? nextNotes : [])
    .map(normalizeNoteRecord)
    .filter(Boolean)
    .forEach((note) => {
      eventNotes[note.eventId] = note;
    });
  emitChanged('notes:load');
}
