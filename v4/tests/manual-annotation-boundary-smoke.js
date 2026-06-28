import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manualSource = readFileSync('v4/src/pda/manual-annotation.js', 'utf8');
const chartNoteSource = readFileSync('v4/src/pda/manual-chart-note-actions.js', 'utf8');
const timeOverlaySource = readFileSync('v4/src/pda/manual-time-overlay-actions.js', 'utf8');

for (const expected of [
  './manual-chart-note-actions.js',
  './manual-time-overlay-actions.js',
  'chartNoteActions.renderMenuItems',
  'timeOverlayActions.renderMenuItems',
]) {
  assert.ok(manualSource.includes(expected), `manual-annotation.js should compose ${expected}`);
}

for (const forbidden of [
  '../chart-notes/chart-note-store.js',
  '../time-overlays/time-overlay-store.js',
  'function showChartNoteEditor',
  'function renderChartNoteMenuItems',
  'function renderTimeOverlayMenuItems',
  "action === 'chart-note-add'",
  "action === 'time-overlay-add-event'",
]) {
  assert.ok(!manualSource.includes(forbidden), `manual-annotation.js regained split workflow: ${forbidden}`);
}

for (const expected of [
  'getChartNoteForBar',
  'upsertChartNote',
  'deleteChartNote',
  'showEditor',
]) {
  assert.ok(chartNoteSource.includes(expected), `chart note workflow should own ${expected}`);
}

for (const expected of [
  'getTimeOverlaySettings',
  'addEventTime',
  'addKillzone',
  'renderClearMenuItems',
]) {
  assert.ok(timeOverlaySource.includes(expected), `time overlay workflow should own ${expected}`);
}

console.log('manual annotation boundary smoke passed');
