import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('v6/src/chart-entry/chart-entry-auto-play-runtime.js', 'utf8');

for (const required of [
  'CHART_ENTRY_MANUAL_NEXT_COMMANDS',
  'CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT',
  'CHART_ENTRY_AUTO_PLAY_COMMANDS.START',
  'CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP',
]) {
  assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbidden of [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_DATA_PROJECTION_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'setVisibleLogicalRange',
  'setData',
  'update(',
]) {
  assert.doesNotMatch(source, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

console.log('v6 auto-play session gap ownership step 263 smoke passed');
