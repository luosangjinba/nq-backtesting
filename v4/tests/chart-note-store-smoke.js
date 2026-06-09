import assert from 'node:assert/strict';
import {
  clearChartNotes,
  getChartNoteForBar,
  getChartNoteIdentity,
  getChartNoteRangesForBar,
  getChartNotes,
  upsertChartNote,
} from '../src/chart-notes/chart-note-store.js';

clearChartNotes();

const barNote = upsertChartNote({
  instrument: 'NQ',
  timeframe: 60,
  timestamp: 1_704_896_400,
  text: 'Single bar note',
});

assert.equal(barNote.kind, 'bar');
assert.equal(getChartNoteForBar({ instrument: 'NQ', timeframe: 60, timestamp: 1_704_896_400 })?.id, barNote.id);
assert.equal(getChartNoteIdentity(barNote), 'NQ:60:bar:1704896400');

const rangeNote = upsertChartNote({
  kind: 'range',
  instrument: 'NQ',
  timeframe: 60,
  timestamp: 1_704_896_400,
  startTimestamp: 1_704_900_000,
  endTimestamp: 1_704_896_400,
  text: 'Range note',
});

assert.equal(rangeNote.kind, 'range');
assert.equal(rangeNote.startTimestamp, 1_704_896_400);
assert.equal(rangeNote.endTimestamp, 1_704_900_000);
assert.equal(getChartNoteIdentity(rangeNote), 'NQ:60:range:1704896400:1704900000');
assert.equal(
  getChartNoteRangesForBar({ instrument: 'NQ', timeframe: 60, timestamp: 1_704_898_000 })[0]?.id,
  rangeNote.id
);
assert.equal(getChartNotes().length, 2);

console.log('chart note store smoke passed');
