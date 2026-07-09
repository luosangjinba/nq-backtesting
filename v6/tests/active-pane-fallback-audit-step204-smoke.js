import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_ACTIVE_PANE_FALLBACK_NARROWING_STEP204.md');
const index = await read('v6/docs/INDEX.md');
const manualNext = await read('v6/src/chart-entry/chart-entry-manual-next-runtime.js');
const preparation = await read('v6/src/chart-entry/chart-entry-projection-preparation-runtime.js');
const leftwardHistory = await read('v6/src/chart-history/leftward-history-extension-runtime.js');
const displayTimeframe = await read('v6/src/display-timeframe/display-timeframe-runtime.js');
const playbackPeriod = await read('v6/src/playback-period/playback-period-runtime.js');

[
  'Remove Compatibility Fallback',
  'Keep Current-Pane Semantics',
  'chart-entry-manual-next-runtime.js',
  'chart-entry-projection-preparation-runtime.js',
  'leftward-history-extension-runtime.js',
  'display-timeframe-runtime.js',
  'playback-period-runtime.js',
].forEach((text) => assert.equal(doc.includes(text), true));

assert.match(index, /V6_ACTIVE_PANE_FALLBACK_NARROWING_STEP204\.md/);

[
  manualNext,
  preparation,
  leftwardHistory,
].forEach((source) => {
  assert.equal(source.includes('PANE_COMMANDS.GET_ACTIVE'), true);
});

[
  displayTimeframe,
  playbackPeriod,
].forEach((source) => {
  assert.equal(source.includes('PANE_COMMANDS.GET_ACTIVE'), true);
});

console.log('v6 active pane fallback audit step 204 smoke passed');
