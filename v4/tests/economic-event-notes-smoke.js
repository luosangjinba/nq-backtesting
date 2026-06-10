import assert from 'node:assert/strict';

import {
  getEconomicEventNote,
  getEconomicEventNotes,
  loadEconomicEventNotes,
  updateEconomicEventNote,
} from '../src/economic-calendar/economic-event-note-store.js';

loadEconomicEventNotes([]);
assert.equal(getEconomicEventNotes().length, 0, 'starts empty');

const note = updateEconomicEventNote('event-1', { note: 'FOMC reaction plan.' });
assert.equal(note.eventId, 'event-1');
assert.equal(note.note, 'FOMC reaction plan.');
assert.equal(getEconomicEventNote('event-1').note, 'FOMC reaction plan.');

loadEconomicEventNotes([
  { eventId: 'event-2', note: 'CPI context.', updatedAt: 123 },
  { eventId: '', note: 'ignored' },
]);
assert.equal(getEconomicEventNotes().length, 1, 'invalid notes are ignored');
assert.equal(getEconomicEventNote('event-2').note, 'CPI context.');
assert.equal(getEconomicEventNote('event-1'), null);

console.log('economic event notes smoke passed');
