import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const todo = readFileSync('v6/TODO.md', 'utf8');
const handoff = readFileSync('v6/docs/V6_HANDOFF.md', 'utf8');
const index = readFileSync('v6/docs/INDEX.md', 'utf8');
const doc = readFileSync('v6/docs/V6_REPLAY_GAP_NEAR_GAP_MANUAL_FIXTURE_STEP385.md', 'utf8');
const fixtureStatic = readFileSync('v6/tests/replay-gap-near-gap-manual-fixture-step385-static-smoke.js', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const app = readFileSync('v6/src/app.js', 'utf8');

for (const source of [todo, handoff]) {
  assert.match(source, /Step 385 - Replay Gap Near-Gap Manual Fixture Browser Probe/);
  assert.match(source, /Step 386 - Replay Gap Fast Pack Integration\s+Selection/);
  assert.match(source, /16:58 -> 16:59 -> 18:00 -> 18:01/);
  assert.match(source, /2`? pre-gap Manual Next calls/);
}

assert.match(todo, /Latest completed replay-gap near-gap fixture browser step/);
assert.match(todo, /Completed in this replay-gap near-gap manual fixture browser commit series/);
assert.match(todo, /node v6\/tests\/replay-gap-near-gap-manual-fixture-step385-smoke\.js/);
assert.match(todo, /Step 274 and Step 276 pack membership unchanged/);
assert.match(todo, /keep at least one long-path manual source assertion available/);

assert.match(handoff, /Worktree at handoff: clean after Step 385 closeout/);
assert.match(handoff, /Latest completed step: Step 385 - Replay Gap Near-Gap Manual Fixture Browser Probe/);
assert.match(handoff, /node v6\/tests\/replay-gap-near-gap-manual-fixture-step385-smoke\.js/);
assert.match(handoff, /node v6\/tests\/replay-gap-near-gap-manual-fixture-step385-static-smoke\.js/);

assert.match(index, /V6_REPLAY_GAP_NEAR_GAP_MANUAL_FIXTURE_STEP385\.md/);
assert.match(doc, /Step 386 should decide how to use the proven near-gap fixture/);
assert.match(doc, /Step 274 replay-gap pack\s+membership, or Step 276 foundation pack membership/);
assert.match(fixtureStatic, /step274Pack\.includes\('near-gap-manual-fixture-step385'\), false/);
assert.match(fixtureStatic, /step276Pack\.includes\('near-gap-manual-fixture-step385'\), false/);

assert.equal(step274Pack.includes('near-gap-manual-fixture-step385'), false);
assert.equal(step276Pack.includes('near-gap-manual-fixture-step385'), false);
assert.equal(app.includes('near-gap-manual-fixture-step385'), false);

console.log('v6 replay gap near-gap manual fixture closeout step385 static smoke passed');
