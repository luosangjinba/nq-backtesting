import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP260.md');
const todo = await read('v6/TODO.md');
const productDirection = await read('v6/docs/V6_PRODUCT_DIRECTION.md');
const architecture = await read('v6/docs/V6_ARCHITECTURE.md');
const step259Doc = await read('v6/docs/V6_MANUAL_NEXT_SESSION_GAP_REGRESSION_PACK_STEP259.md');
const playbackRuntimeSmoke = await read('v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js');
const playbackBrowserSmoke = await read('v6/tests/chart-entry-playback-period-browser-smoke.js');
const manualGapPack = await read('v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js');

const normalizedDoc = doc.replace(/\s+/g, ' ');

for (const required of [
  'Playback Period Session Gap Regression Pack',
  'manual `Next` action to advance multiple source bars',
  'playback-period stepping across the same no-bar session break',
  'Replay runtime owns cursor/reveal state',
  'Playback-period controls own the selected period',
  'Chart-entry manual-next runtime owns replay command orchestration',
  'Bar-data runtime owns source-window requests',
  'Chart-data runtime owns pane-local append records',
  'Display-timeframe runtime owns projection inputs',
  'Chart viewport owns visible-range intent',
  'Chart surface owns rendered chart host state',
  'Do not add indicators',
]) {
  assert.match(normalizedDoc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const filename of [
  'playback-period-session-gap-regression-pack-step261-smoke.js',
  'chart-entry-playback-period-boundary-runtime-smoke.js',
  'chart-entry-playback-period-browser-smoke.js',
  'manual-next-session-gap-regression-pack-step259-smoke.js',
  'manual-next-session-gap-browser-step258-smoke.js',
]) {
  assert.match(doc, new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 260 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Step 261 - Playback Period Session Gap Regression Pack/);
assert.match(productDirection, /run replay with visible K-line latency gates/);
assert.match(architecture, /Replay Runtime[\s\S]*Owns:[\s\S]*replay cursor/);
assert.match(architecture, /Chart Data Runtime[\s\S]*Owns:[\s\S]*pane-local chart bar set/);
assert.match(step259Doc, /Manual Next Session Gap Regression Pack/);
assert.match(step259Doc, /Manual next continues after the gap/);
assert.match(playbackRuntimeSmoke, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.match(playbackBrowserSmoke, /playbackPeriod\.setPeriod/);
assert.match(manualGapPack, /manual-next-session-gap-browser-step258-smoke\.js/);

console.log('v6 chart foundation next slice selection step 260 smoke passed');
