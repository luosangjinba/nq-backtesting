import assert from 'node:assert/strict';

import { CALENDAR_OBJECT_TYPES } from '../src/calendar/calendar-types.js';
import {
  getCalendarVisibilitySummaryForItems,
  setCalendarDayGroupObjectsHidden,
} from '../src/ui/inspector/calendar-visibility-actions.js';
import {
  dateKeyFromTimestamp,
  resolveInspectorCalendarDate,
} from '../src/ui/inspector/calendar-day-context.js';
import {
  clearAnnotations,
  getAnnotationById,
  loadAnnotations,
} from '../src/pda/pda-store.js';
import {
  clearChartNotes,
  getChartNoteById,
  loadChartNotes,
} from '../src/chart-notes/chart-note-store.js';

const jan10_0930 = Date.UTC(2024, 0, 10, 9, 30, 0) / 1000;
const jan10_1000 = Date.UTC(2024, 0, 10, 10, 0, 0) / 1000;
const jan11_0930 = Date.UTC(2024, 0, 11, 9, 30, 0) / 1000;

function makePda(id, timestamp, hidden = false) {
  return {
    id,
    type: 'fvg',
    source: 'manual',
    sourceInstrument: 'NQ',
    sourceTimeframe: 1,
    timestamp,
    price: 16800,
    display: { hidden },
  };
}

function makeChartNote(id, timestamp, hidden = false) {
  return {
    id,
    instrument: 'NQ',
    timeframe: 1,
    timestamp,
    text: id,
    display: { hidden },
  };
}

assert.equal(dateKeyFromTimestamp(jan10_0930), '2024-01-10');
assert.equal(
  resolveInspectorCalendarDate({
    selectedDate: '2024-01-10',
    replayDate: '2024-01-11',
    fallbackDate: '2024-01-09',
  }),
  '2024-01-10',
  'selected calendar date must stay selectable ahead of replay date'
);
assert.equal(
  resolveInspectorCalendarDate({
    replayDate: '2024-01-11',
    fallbackDate: '2024-01-09',
  }),
  '2024-01-11',
  'replay date should drive inspector when no explicit date is selected'
);

loadAnnotations([
  makePda('pda-visible', jan10_0930, false),
  makePda('pda-hidden', jan10_1000, true),
  makePda('pda-other-day', jan11_0930, false),
]);
loadChartNotes([
  makeChartNote('note-visible', jan10_0930, false),
  makeChartNote('note-hidden', jan10_1000, true),
  makeChartNote('note-other-day', jan11_0930, false),
]);

const mixedSummary = getCalendarVisibilitySummaryForItems([
  { ref: { type: CALENDAR_OBJECT_TYPES.PDA, id: 'pda-visible' } },
  { ref: { type: CALENDAR_OBJECT_TYPES.PDA, id: 'pda-hidden' } },
  { ref: { type: CALENDAR_OBJECT_TYPES.PDA, id: 'pda-hidden' } },
  { ref: { type: CALENDAR_OBJECT_TYPES.ORDER_SETUP, id: 'ignored-order' } },
]);
assert.deepEqual(mixedSummary, {
  total: 2,
  visible: 1,
  hidden: 1,
  state: 'mixed',
});

const chartNoteMixedSummary = getCalendarVisibilitySummaryForItems([
  { ref: { type: CALENDAR_OBJECT_TYPES.CHART_NOTE, id: 'note-visible' } },
  { ref: { type: CALENDAR_OBJECT_TYPES.CHART_NOTE, id: 'note-hidden' } },
  { ref: { type: CALENDAR_OBJECT_TYPES.CHART_NOTE, id: 'note-hidden' } },
]);
assert.deepEqual(chartNoteMixedSummary, {
  total: 2,
  visible: 1,
  hidden: 1,
  state: 'mixed',
});

assert.equal(
  setCalendarDayGroupObjectsHidden('2024-01-10', CALENDAR_OBJECT_TYPES.CHART_NOTE, true),
  1,
  'only the visible Jan 10 chart note should change when hiding the day Chart Notes group'
);
assert.equal(getChartNoteById('note-visible')?.display?.hidden, true);
assert.equal(getChartNoteById('note-hidden')?.display?.hidden, true);
assert.equal(
  getChartNoteById('note-other-day')?.display?.hidden,
  false,
  'chart notes from another calendar date must not be changed'
);

const chartNoteUncheckedSummary = getCalendarVisibilitySummaryForItems([
  { ref: { type: CALENDAR_OBJECT_TYPES.CHART_NOTE, id: 'note-visible' } },
  { ref: { type: CALENDAR_OBJECT_TYPES.CHART_NOTE, id: 'note-hidden' } },
]);
assert.deepEqual(chartNoteUncheckedSummary, {
  total: 2,
  visible: 0,
  hidden: 2,
  state: 'unchecked',
});

assert.equal(
  setCalendarDayGroupObjectsHidden('2024-01-10', CALENDAR_OBJECT_TYPES.CHART_NOTE, false),
  2,
  'both hidden Jan 10 chart notes should change when showing the day Chart Notes group'
);
const chartNoteCheckedSummary = getCalendarVisibilitySummaryForItems([
  { ref: { type: CALENDAR_OBJECT_TYPES.CHART_NOTE, id: 'note-visible' } },
  { ref: { type: CALENDAR_OBJECT_TYPES.CHART_NOTE, id: 'note-hidden' } },
]);
assert.deepEqual(chartNoteCheckedSummary, {
  total: 2,
  visible: 2,
  hidden: 0,
  state: 'checked',
});

assert.equal(
  setCalendarDayGroupObjectsHidden('2024-01-10', CALENDAR_OBJECT_TYPES.PDA, true),
  1,
  'only the visible Jan 10 PDA should change when hiding the day PDA group'
);
assert.equal(getAnnotationById('pda-visible')?.display?.hidden, true);
assert.equal(getAnnotationById('pda-hidden')?.display?.hidden, true);
assert.equal(
  getAnnotationById('pda-other-day')?.display?.hidden,
  false,
  'PDA objects from another calendar date must not be changed'
);

const uncheckedSummary = getCalendarVisibilitySummaryForItems([
  { ref: { type: CALENDAR_OBJECT_TYPES.PDA, id: 'pda-visible' } },
  { ref: { type: CALENDAR_OBJECT_TYPES.PDA, id: 'pda-hidden' } },
]);
assert.deepEqual(uncheckedSummary, {
  total: 2,
  visible: 0,
  hidden: 2,
  state: 'unchecked',
});

assert.equal(
  setCalendarDayGroupObjectsHidden('2024-01-10', CALENDAR_OBJECT_TYPES.PDA, false),
  2,
  'both hidden Jan 10 PDA objects should change when showing the day PDA group'
);
const checkedSummary = getCalendarVisibilitySummaryForItems([
  { ref: { type: CALENDAR_OBJECT_TYPES.PDA, id: 'pda-visible' } },
  { ref: { type: CALENDAR_OBJECT_TYPES.PDA, id: 'pda-hidden' } },
]);
assert.deepEqual(checkedSummary, {
  total: 2,
  visible: 2,
  hidden: 0,
  state: 'checked',
});

assert.deepEqual(getCalendarVisibilitySummaryForItems([]), {
  total: 0,
  visible: 0,
  hidden: 0,
  state: 'disabled',
});

clearAnnotations();
clearChartNotes();

console.log('calendar visibility smoke passed');
