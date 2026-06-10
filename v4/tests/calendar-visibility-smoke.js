import assert from 'node:assert/strict';

import { CALENDAR_OBJECT_TYPES } from '../src/calendar/calendar-types.js';
import { setBars } from '../src/data/bar-store.js';
import {
  clearDailyTimeReviews,
  loadDailyTimeReviews,
} from '../src/time-reaction/daily-time-review-store.js';
import {
  getCalendarVisibilitySummaryForItems,
  setCalendarDayGroupObjectsHidden,
} from '../src/ui/inspector/calendar-visibility-actions.js';
import { renderCalendarPanel } from '../src/ui/inspector/calendar-panel.js';
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

clearDailyTimeReviews();
setBars(
  [
    { timestamp: jan10_0930, open: 1, high: 1, low: 1, close: 1 },
    { timestamp: jan10_1000, open: 1, high: 1, low: 1, close: 1 },
  ],
  jan10_0930,
  jan10_1000,
  1
);
assert.doesNotThrow(
  () => renderCalendarPanel({ selectedDate: '2024-01-10', viewDate: '2024-01-10' }),
  'Calendar renders when selected day has no Daily Time review'
);
const emptyDailyTimeCalendar = renderCalendarPanel({ selectedDate: '2024-01-10', viewDate: '2024-01-10' });
assert.match(emptyDailyTimeCalendar, /Bias · No notes yet/, 'Calendar shows merged Bias row');
assert.match(
  emptyDailyTimeCalendar,
  /Opening Thesis Review · No notes yet/,
  'Calendar shows merged Opening Thesis Review row'
);
assert.match(emptyDailyTimeCalendar, /固定时点状态 · No notes yet/, 'Calendar keeps Fixed Time State row');
assert.doesNotMatch(emptyDailyTimeCalendar, /周 Bias 分析/, 'Calendar does not show old weekly bias row');
assert.doesNotMatch(emptyDailyTimeCalendar, /日 Bias 分析/, 'Calendar does not show old daily bias row');
assert.doesNotMatch(emptyDailyTimeCalendar, /09:30 前状态分析/, 'Calendar does not show old pre-open row');
assert.doesNotMatch(emptyDailyTimeCalendar, /09:30-11:00 Summary/, 'Calendar does not show old morning summary row');
assert.doesNotMatch(emptyDailyTimeCalendar, /全天 Summary/, 'Calendar does not show old full-day summary row');

loadDailyTimeReviews([
  {
    date: '2024-01-10',
    instrument: 'NQ',
    bias: { dailyBiasPrediction: 'Daily bullish.' },
    openingThesisReview: { preOpenThesis: 'Pre-open discount thesis.' },
  },
], { preserveUpdatedAt: true });
const populatedDailyTimeCalendar = renderCalendarPanel({ selectedDate: '2024-01-10', viewDate: '2024-01-10' });
assert.match(populatedDailyTimeCalendar, /Bias · Daily bullish\./, 'Calendar previews Bias content');
assert.match(
  populatedDailyTimeCalendar,
  /Opening Thesis Review · Pre-open discount thesis\./,
  'Calendar previews Opening Thesis Review content'
);

clearAnnotations();
clearChartNotes();

console.log('calendar visibility smoke passed');
