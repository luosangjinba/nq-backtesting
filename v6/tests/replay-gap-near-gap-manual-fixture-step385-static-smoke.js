import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const plan = readFileSync('v6/docs/V6_REPLAY_GAP_NEAR_GAP_MANUAL_FIXTURE_PLAN_STEP384.md', 'utf8');
const doc = readFileSync('v6/docs/V6_REPLAY_GAP_NEAR_GAP_MANUAL_FIXTURE_STEP385.md', 'utf8');
const smoke = readFileSync('v6/tests/replay-gap-near-gap-manual-fixture-step385-smoke.js', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const app = readFileSync('v6/src/app.js', 'utf8');

for (const source of [plan, doc]) {
  assert.match(source, /replay-gap-near-gap-manual-fixture-step385-smoke\.js/);
  assert.match(source, /2026-06-01T16:50/);
  assert.match(source, /2026-06-01T16:58:00\.000Z/);
  assert.match(source, /1m/);
  assert.match(source, /5m/);
  assert.match(source, /15m/);
  assert.match(source, /1D/);
  assert.match(source, /1W/);
  assert.match(source, /1M/);
}

assert.match(doc, /Pre-gap Manual Next count/);
assert.match(doc, /16:58 -> 16:59 -> 18:00 -> 18:01/);
assert.match(doc, /instead of repeating the\s+long-path `86` Manual Next loop/);
assert.match(doc, /Seed index/);
assert.match(doc, /Final index/);
assert.match(doc, /Step 386/);

assert.match(smoke, /REPLAY_COMMANDS\.SET_CURSOR_TIME/);
assert.match(smoke, /2026-06-01T16:58:00\.000Z/);
assert.match(smoke, /2026-06-01T16:50/);
assert.match(smoke, /2026-06-01T18:10/);
assert.match(smoke, /for \(const displayTimeframe of \[1, 5, 15\]\)/);
assert.match(smoke, /for \(const displayTimeframe of \['1D', '1W', '1M'\]\)/);
assert.match(smoke, /preGapManualNextCount/);
assert.match(smoke, /assert\.deepEqual\(item\.path/);
assert.match(smoke, /2026-06-01T16:59:00\.000Z/);
assert.match(smoke, /2026-06-01T18:00:00\.000Z/);
assert.match(smoke, /2026-06-01T18:01:00\.000Z/);
assert.match(smoke, /assert\.equal\(item\.preGapManualNextCount, 2/);
assert.match(smoke, /expectedSeedCursorIndex/);
assert.match(smoke, /expectedCrossedCursorIndex/);
assert.match(smoke, /expectedFinalCursorIndex/);
assert.match(smoke, /projectedBucket\.lastSourceTimestamp/);
assert.match(smoke, /Cursor 18:01/);

assert.equal(step274Pack.includes('near-gap-manual-fixture-step385'), false);
assert.equal(step276Pack.includes('near-gap-manual-fixture-step385'), false);
assert.equal(app.includes('near-gap-manual-fixture-step385'), false);
assert.equal(app.includes('Step 385'), false);

console.log('v6 replay gap near-gap manual fixture step385 static smoke passed');
