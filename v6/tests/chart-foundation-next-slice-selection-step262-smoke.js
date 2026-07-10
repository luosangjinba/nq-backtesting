import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP262.md');
const todo = await read('v6/TODO.md');
const productDirection = await read('v6/docs/V6_PRODUCT_DIRECTION.md');
const architecture = await read('v6/docs/V6_ARCHITECTURE.md');
const step261Doc = await read('v6/docs/V6_PLAYBACK_PERIOD_SESSION_GAP_REGRESSION_PACK_STEP261.md');
const autoPlayRuntime = await read('v6/src/chart-entry/chart-entry-auto-play-runtime.js');
const autoPlayHtf = await read('v6/tests/auto-play-htf-projection-step199-smoke.js');
const playbackGapPack = await read('v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js');

const normalizedDoc = doc.replace(/\s+/g, ' ');

for (const required of [
  'Auto-Play Session Gap Regression Pack',
  'chart-entry auto-play scheduler',
  'Auto-play intentionally delegates each timer tick to the manual-next owner',
  'Chart-entry auto-play runtime owns timer lifecycle',
  'must not dispatch bar-data, chart-data, projection, viewport, or chart-engine commands directly',
  'Chart-entry manual-next runtime owns replay command orchestration',
  'Replay runtime owns cursor/reveal state',
  'Bar-data runtime owns source-window requests',
  'Chart-data runtime owns pane-local append records',
  'Display-timeframe runtime owns projection inputs',
  'Chart viewport owns visible-range intent',
  'Do not add indicators',
]) {
  assert.match(normalizedDoc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const filename of [
  'auto-play-session-gap-regression-pack-step263-smoke.js',
  'chart-entry-auto-play-runtime-smoke.js',
  'chart-entry-auto-play-browser-smoke.js',
  'auto-play-htf-projection-step199-smoke.js',
  'auto-play-htf-visible-latency-browser-step199-smoke.js',
  'playback-period-session-gap-regression-pack-step261-smoke.js',
]) {
  assert.match(doc, new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 262 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Step 263 - Auto-Play Session Gap Regression Pack/);
assert.match(productDirection, /run replay with visible K-line latency gates/);
assert.match(architecture, /Replay Runtime[\s\S]*Owns:[\s\S]*replay cursor/);
assert.match(architecture, /Chart Data Runtime[\s\S]*Owns:[\s\S]*pane-local chart bar set/);
assert.match(step261Doc, /Playback Period Session Gap Regression Pack/);
assert.match(autoPlayRuntime, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.doesNotMatch(autoPlayRuntime, /BAR_DATA_COMMANDS|CHART_DATA_COMMANDS|CHART_DATA_PROJECTION_COMMANDS|CHART_VIEWPORT_COMMANDS/);
assert.match(autoPlayHtf, /createChartEntryAutoPlayRuntime/);
assert.match(playbackGapPack, /playback-period-session-gap-browser-step261-smoke\.js/);

console.log('v6 chart foundation next slice selection step 262 smoke passed');
