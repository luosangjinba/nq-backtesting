import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const navigatorSource = readFileSync('v4/src/ui/calendar-navigator.js', 'utf8');

const requiredImports = [
  './calendar/calendar-date-range-history.js',
  './calendar/calendar-date-range-store.js',
  './calendar/calendar-date-utils.js',
  './calendar/calendar-range-loader.js',
  './calendar/calendar-navigator-view.js',
];

for (const importPath of requiredImports) {
  assert.match(navigatorSource, new RegExp(importPath.replaceAll('.', '\\.')));
}

const forbiddenInNavigator = [
  'RANGE_HISTORY_STORAGE_KEY',
  'RANGE_HISTORY_STORAGE_VERSION',
  'getWorkspaceDocument',
  'putWorkspaceDocument',
  'function renderRangeHistory',
  'function renderMonth',
  'function escapeHtml',
  'function dateTimePartsFromInput',
  'function formatLoadedRangeLabel',
  'function getMonthCells',
  'resolveChartLoadRange',
  'loadPrimaryRangeCommand',
  'const dateRangeState',
  'function selectRangeDate',
];

for (const forbidden of forbiddenInNavigator) {
  assert.equal(
    navigatorSource.includes(forbidden),
    false,
    `calendar-navigator.js should not own ${forbidden}`
  );
}

console.log('calendar split boundary smoke passed');
