import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_TIMEFRAME_REPLAY_FOUNDATION_REGRESSION_PACK_STEP276.md');
const index = await read('v6/docs/INDEX.md');
const selection = await read('v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP275.md');
const step274Pack = await read('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js');
const todo = await read('v6/TODO.md');

const requiredMembers = [
  'display-timeframe-browser-smoke.js',
  'timeframe-menu-parity-browser-smoke.js',
  'display-timeframe-leftward-auto-chain-browser-smoke.js',
  'daily-projection-browser-step268-smoke.js',
  'weekly-projection-browser-step269-smoke.js',
  'monthly-projection-browser-step270-smoke.js',
  'replay-gap-browser-regression-pack-step274-smoke.js',
];

for (const member of requiredMembers) {
  assert.match(doc, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(selection, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const required of [
  'Timeframe/Replay Foundation Regression Pack',
  'test orchestration only',
  'Step 274 replay-gap browser pack must be included as a single member',
  'Do not duplicate the Step 274 member list',
  'No production display-timeframe',
  'Existing runtime/projection/pane/owner/boundary behavior remains unchanged',
]) {
  assert.match(doc, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(doc, /node v6\/tests\/timeframe-replay-foundation-regression-pack-step276-smoke\.js/);
assert.match(index, /V6_TIMEFRAME_REPLAY_FOUNDATION_REGRESSION_PACK_STEP276/);
assert.match(todo, /Step 276 - Timeframe\/Replay Foundation Regression Runner/);
assert.match(step274Pack, /manual-next-session-gap-browser-step258-smoke\.js/);
assert.match(step274Pack, /htf-auto-play-replay-gap-browser-step273-smoke\.js/);

console.log('v6 timeframe replay foundation regression pack step276 static smoke passed');
