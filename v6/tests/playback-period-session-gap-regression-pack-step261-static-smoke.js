import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_PLAYBACK_PERIOD_SESSION_GAP_REGRESSION_PACK_STEP261.md');
const pack = await read('v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js');
const browserSmoke = await read('v6/tests/playback-period-session-gap-browser-step261-smoke.js');
const runtimeSmoke = await read('v6/tests/playback-period-session-gap-step261-smoke.js');
const todo = await read('v6/TODO.md');
const selection = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP260.md');
const step259Doc = await read('v6/docs/V6_MANUAL_NEXT_SESSION_GAP_REGRESSION_PACK_STEP259.md');

const requiredMembers = [
  'playback-period-session-gap-step261-smoke.js',
  'playback-period-session-gap-browser-step261-smoke.js',
  'chart-entry-playback-period-boundary-runtime-smoke.js',
  'chart-entry-playback-period-browser-smoke.js',
  'manual-next-session-gap-regression-pack-step259-smoke.js',
];

for (const member of requiredMembers) {
  assert.match(doc, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(pack, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const required of [
  'Playback Period Session Gap Regression Pack',
  'A 5m playback period can cross the `16:59 -> 18:00` no-bar break',
  'A 15m playback period can cross the same break and continue to `18:05`',
  'Replay `cursorIndex`, `previousAvailable`, and `revealedCount` remain aligned',
  'Browser coverage verifies the 1m source path plus 5m and 15m display',
  'Higher display-timeframe paths validate the projected bucket',
  'Replay runtime owns cursor/reveal state',
  'Playback-period runtime owns the selected period',
  'Chart-entry manual-next runtime owns replay command orchestration',
  'Bar-data runtime owns source-window requests',
  'Chart-data runtime owns pane-local append records',
  'No runtime behavior changes were made',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(selection, /Step 261 should implement \*\*Playback Period Session Gap Regression Pack/);
assert.match(step259Doc, /Manual Next Session Gap Regression Pack/);
assert.match(todo, /Step 261 - Playback Period Session Gap Regression Pack/);
assert.match(todo, /Step 262 - Chart Foundation Next Slice Selection/);
assert.match(pack, /\[playback-period-session-gap-pack\] start/);
assert.match(pack, /\[playback-period-session-gap-pack\] passed/);
assert.match(runtimeSmoke, /period: '5m'/);
assert.match(runtimeSmoke, /period: '15m'/);
assert.match(browserSmoke, /displayTimeframe: 5/);
assert.match(browserSmoke, /displayTimeframe: 15/);
assert.match(browserSmoke, /lastSourceTimestamp/);

console.log('v6 playback period session gap regression pack step 261 static smoke passed');
