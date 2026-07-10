import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP258.md');
const todo = await read('v6/TODO.md');
const productDirection = await read('v6/docs/V6_PRODUCT_DIRECTION.md');
const architecture = await read('v6/docs/V6_ARCHITECTURE.md');
const step257Doc = await read('v6/docs/V6_VISIBLE_KLINE_LATENCY_REGRESSION_PACK_STEP257.md');
const runtimeGapSmoke = await read('v6/tests/manual-next-session-gap-step258-smoke.js');
const browserGapSmoke = await read('v6/tests/manual-next-session-gap-browser-step258-smoke.js');

const normalizedDoc = doc.replace(/\s+/g, ' ');

for (const required of [
  'Manual Next Session Gap Regression Pack',
  'manual `Next` could land inside a no-bar session break',
  'replay state must advance to the next available source K-line',
  'higher display timeframes must keep session-origin bucket alignment',
  'Replay runtime owns cursor/reveal state',
  'Chart-entry manual-next runtime owns the replay command orchestration',
  'Bar-data runtime owns window requests',
  'Chart-data runtime owns pane-local append records',
  'Display-timeframe runtime owns projection inputs',
  'Chart viewport owns visible-range intent',
  'Chart surface owns rendered chart host state',
  'Do not add indicators',
]) {
  assert.match(normalizedDoc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const filename of [
  'manual-next-session-gap-regression-pack-step259-smoke.js',
  'manual-next-session-gap-step258-smoke.js',
  'manual-next-session-gap-browser-step258-smoke.js',
  'chart-entry-manual-next-runtime-smoke.js',
  'manual-next-htf-projection-step197-smoke.js',
  'auto-play-htf-projection-step199-smoke.js',
]) {
  assert.match(doc, new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(todo, /Step 258 - Chart Foundation Next Slice Selection/);
assert.match(todo, /Step 259 - Manual Next Session Gap Regression Pack/);
assert.match(productDirection, /run replay with visible K-line latency gates/);
assert.match(architecture, /Replay Runtime[\s\S]*Owns:[\s\S]*replay cursor/);
assert.match(architecture, /Chart Data Runtime[\s\S]*Owns:[\s\S]*pane-local chart bar set/);
assert.match(step257Doc, /Visible K-Line Latency Regression Pack/);
assert.match(runtimeGapSmoke, /REPLAY_COMMANDS\.SET_CURSOR_TIME/);
assert.match(runtimeGapSmoke, /2026-06-01T18:00:00\.000Z/);
assert.match(browserGapSmoke, /const cases = \[[\s\S]*runCase\(1\)[\s\S]*runCase\(5\)[\s\S]*runCase\(15\)/);
assert.match(browserGapSmoke, /lastSourceTimestamp/);

console.log('v6 chart foundation next slice selection step 258 smoke passed');
