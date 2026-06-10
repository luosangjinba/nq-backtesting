import assert from 'node:assert/strict';
import {
  clearChartNotes,
  getChartNoteForBar,
  getChartNoteIdentity,
  getChartNoteRangesForBar,
  getChartNotes,
  upsertChartNote,
  updateChartNote,
} from '../src/chart-notes/chart-note-store.js';
import { isChartNoteInDate } from '../src/chart-notes/chart-note-visible-day.js';

clearChartNotes();

const barNote = upsertChartNote({
  instrument: 'NQ',
  timeframe: 60,
  timestamp: 1_704_896_400,
  text: 'Single bar note',
});

assert.equal(barNote.kind, 'bar');
assert.equal(barNote.display.showGuides, false);
assert.equal(getChartNoteForBar({ instrument: 'NQ', timeframe: 60, timestamp: 1_704_896_400 })?.id, barNote.id);
assert.equal(getChartNoteIdentity(barNote), 'NQ:60:bar:1704896400');
assert.equal(updateChartNote(barNote.id, { display: { showGuides: true } })?.display.showGuides, true);

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

const crossDayRangeNote = upsertChartNote({
  kind: 'range',
  instrument: 'NQ',
  timeframe: 60,
  startTimestamp: Date.UTC(2024, 0, 10, 23, 0) / 1000,
  endTimestamp: Date.UTC(2024, 0, 11, 1, 0) / 1000,
  text: 'Cross day range note',
});

assert.equal(isChartNoteInDate(crossDayRangeNote, '2024-01-10'), true);
assert.equal(isChartNoteInDate(crossDayRangeNote, '2024-01-11'), true);
assert.equal(isChartNoteInDate(crossDayRangeNote, '2024-01-12'), false);

console.log('chart note store smoke passed');
