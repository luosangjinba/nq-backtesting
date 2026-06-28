import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panelSource = readFileSync('v4/src/ui/inspector/calendar-panel.js', 'utf8');
const dataSource = readFileSync('v4/src/ui/inspector/calendar/calendar-panel-data.js', 'utf8');
const viewSource = readFileSync('v4/src/ui/inspector/calendar/calendar-panel-view.js', 'utf8');
const dayGroupsSource = readFileSync('v4/src/ui/inspector/calendar/calendar-day-groups.js', 'utf8');
const dailyTimeSource = readFileSync('v4/src/ui/inspector/calendar/calendar-daily-time-summary.js', 'utf8');

for (const importPath of [
  './calendar/calendar-panel-data.js',
  './calendar/calendar-panel-view.js',
  './calendar/calendar-daily-time-summary.js',
  './calendar/calendar-day-groups.js',
]) {
  assert.match(panelSource, new RegExp(importPath.replaceAll('.', '\\.')));
}

for (const forbidden of [
  'function getLoadedDateRange',
  'function getMonthCells',
  'function getDayObjectOverview',
  'function createChartNoteItem',
  'function addChartNotesGroup',
  'function addTimeReactionGroup',
  'DAILY_TIME_REVIEW_CALENDAR_ROWS',
  'const WEEKDAYS',
  'const MONTHS',
  'resolveInspectorCalendarDate',
  'getDailyRegimeSummary',
]) {
  assert.equal(
    panelSource.includes(forbidden),
    false,
    `calendar-panel.js should not own split calendar data/view logic: ${forbidden}`
  );
}

for (const expected of [
  'buildCalendarPanelData',
  'getLoadedDateRange',
  'getMonthCells',
  'resolveInspectorCalendarDate',
  'getDailyRegimeSummary',
]) {
  assert.match(dataSource, new RegExp(expected), `calendar-panel-data.js should own ${expected}`);
}

for (const expected of [
  'renderCalendarPanelView',
  'const WEEKDAYS',
  'const MONTHS',
]) {
  assert.match(viewSource, new RegExp(expected), `calendar-panel-view.js should own ${expected}`);
}

for (const expected of [
  'getCalendarObjectGroups',
  'getDayObjectOverview',
  'addChartNotesGroup',
]) {
  assert.match(dayGroupsSource, new RegExp(expected), `calendar-day-groups.js should own ${expected}`);
}

for (const expected of [
  'DAILY_TIME_REVIEW_CALENDAR_ROWS',
  'addTimeReactionGroup',
  'getCalendarDateTimestamp',
]) {
  assert.match(dailyTimeSource, new RegExp(expected), `calendar-daily-time-summary.js should own ${expected}`);
}

console.log('inspector calendar panel boundary smoke passed');
