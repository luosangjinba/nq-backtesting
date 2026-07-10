import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_MANUAL_NEXT_SESSION_GAP_REGRESSION_PACK_STEP259.md');
const pack = await read('v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js');
const todo = await read('v6/TODO.md');
const selection = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP258.md');
const replayDomain = await read('v6/src/replay/replay-domain.js');
const browserGapSmoke = await read('v6/tests/manual-next-session-gap-browser-step258-smoke.js');

const requiredMembers = [
  'manual-next-session-gap-step258-smoke.js',
  'manual-next-session-gap-browser-step258-smoke.js',
  'chart-entry-manual-next-runtime-smoke.js',
  'manual-next-htf-projection-step197-smoke.js',
  'auto-play-htf-projection-step199-smoke.js',
];

for (const member of requiredMembers) {
  assert.match(doc, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(pack, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const required of [
  'Manual Next Session Gap Regression Pack',
  'Manual next skips no-bar session breaks from `16:59`',
  'Replay cursor-time alignment keeps `cursorIndex`, `previousAvailable`, and',
  'Manual next continues after the gap',
  'Browser coverage verifies the source 1m path plus 5m and 15m',
  'Higher display-timeframe paths validate the projected bucket',
  'Replay runtime owns cursor/reveal state',
  'Chart-entry manual-next runtime owns replay command orchestration',
  'Bar-data runtime owns window requests',
  'Chart-data runtime owns pane-local append records',
  'No runtime behavior changes were made',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(selection, /Step 259 should implement \*\*Manual Next Session Gap Regression Pack/);
assert.match(todo, /Step 259 - Manual Next Session Gap Regression Pack/);
assert.match(todo, /Step 260 - Chart Foundation Next Slice Selection/);
assert.match(pack, /\[manual-next-session-gap-pack\] start/);
assert.match(pack, /\[manual-next-session-gap-pack\] passed/);
assert.match(replayDomain, /previousAvailable: cursorIndex > 0/);
assert.match(replayDomain, /revealedCount: cursorIndex \+ 1/);
assert.match(browserGapSmoke, /18:00:00\.000Z/);
assert.match(browserGapSmoke, /18:01:00\.000Z/);
assert.match(browserGapSmoke, /lastSourceTimestamp/);

console.log('v6 manual next session gap regression pack step 259 static smoke passed');
