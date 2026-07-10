import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_AUTO_PLAY_SESSION_GAP_REGRESSION_PACK_STEP263.md');
const pack = await read('v6/tests/auto-play-session-gap-regression-pack-step263-smoke.js');
const browserSmoke = await read('v6/tests/auto-play-session-gap-browser-step263-smoke.js');
const runtimeSmoke = await read('v6/tests/auto-play-session-gap-step263-smoke.js');
const ownershipSmoke = await read('v6/tests/auto-play-session-gap-ownership-step263-smoke.js');
const todo = await read('v6/TODO.md');
const selection = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP262.md');
const step261Doc = await read('v6/docs/V6_PLAYBACK_PERIOD_SESSION_GAP_REGRESSION_PACK_STEP261.md');

const requiredMembers = [
  'auto-play-session-gap-ownership-step263-smoke.js',
  'auto-play-session-gap-step263-smoke.js',
  'auto-play-session-gap-browser-step263-smoke.js',
  'chart-entry-auto-play-runtime-smoke.js',
  'chart-entry-auto-play-browser-smoke.js',
  'auto-play-htf-projection-step199-smoke.js',
  'auto-play-htf-visible-latency-browser-step199-smoke.js',
  'playback-period-session-gap-regression-pack-step261-smoke.js',
];

for (const member of requiredMembers) {
  assert.match(doc, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(pack, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const required of [
  'Auto-Play Session Gap Regression Pack',
  'Auto-play crosses the `16:59 -> 18:00` no-bar break',
  'Auto-play continues beyond the first post-break source bar to `18:01`',
  'Replay `cursorIndex`, `previousAvailable`, and `revealedCount` remain aligned',
  'Browser coverage verifies the 1m source path and 5m display projection path',
  'Source ownership coverage proves auto-play still delegates to manual-next',
  'Chart-entry auto-play runtime owns timer lifecycle',
  'Chart-entry manual-next runtime owns replay command orchestration',
  'Replay runtime owns cursor/reveal state',
  'Bar-data runtime owns source-window requests',
  'Chart-data runtime owns pane-local append records',
  'No runtime behavior changes were made',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(selection, /Step 263 should implement \*\*Auto-Play Session Gap Regression Pack/);
assert.match(step261Doc, /Playback Period Session Gap Regression Pack/);
assert.match(todo, /Step 263 - Auto-Play Session Gap Regression Pack/);
assert.match(todo, /Step 264 - Chart Foundation Next Slice Selection/);
assert.match(pack, /\[auto-play-session-gap-pack\] start/);
assert.match(pack, /\[auto-play-session-gap-pack\] passed/);
assert.match(runtimeSmoke, /18:00:00\.000Z/);
assert.match(runtimeSmoke, /18:01:00\.000Z/);
assert.match(browserSmoke, /displayTimeframe === 1/);
assert.match(browserSmoke, /runCase\(5\)/);
assert.match(browserSmoke, /lastSourceTimestamp/);
assert.match(ownershipSmoke, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.match(ownershipSmoke, /BAR_DATA_COMMANDS/);

console.log('v6 auto-play session gap regression pack step 263 static smoke passed');
