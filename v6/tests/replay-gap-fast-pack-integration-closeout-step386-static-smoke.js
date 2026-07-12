import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const todo = readFileSync('v6/TODO.md', 'utf8');
const handoff = readFileSync('v6/docs/V6_HANDOFF.md', 'utf8');
const index = readFileSync('v6/docs/INDEX.md', 'utf8');
const doc = readFileSync('v6/docs/V6_REPLAY_GAP_FAST_PACK_INTEGRATION_SELECTION_STEP386.md', 'utf8');
const selectionStatic = readFileSync('v6/tests/replay-gap-fast-pack-integration-selection-step386-static-smoke.js', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const app = readFileSync('v6/src/app.js', 'utf8');

for (const source of [todo, handoff]) {
  assert.match(source, /Step 386 - Replay Gap Fast Pack Integration Selection/);
  assert.match(source, /Step 387 - Replay Gap Fast Browser Pack\s+Implementation/);
  assert.match(source, /fast\/full replay-gap pack split/);
  assert.match(source, /Step 274/);
  assert.match(source, /Step 276/);
}

assert.match(todo, /Latest completed replay-gap fast pack selection step/);
assert.match(todo, /Completed in this replay-gap fast pack integration selection commit series/);
assert.match(todo, /replay-gap-fast-browser-regression-pack-step387-smoke\.js/);
assert.match(todo, /replay-gap-near-gap-manual-fixture-step385-smoke\.js/);
assert.match(todo, /auto-play-session-gap-browser-step263-smoke\.js/);
assert.match(todo, /htf-auto-play-replay-gap-browser-step273-smoke\.js/);
assert.match(todo, /Preserved at least one long-path manual source assertion/);

assert.match(handoff, /Worktree at handoff: clean after Step 386 closeout/);
assert.match(handoff, /Latest completed step: Step 386 - Replay Gap Fast Pack Integration Selection/);
assert.match(handoff, /node v6\/tests\/replay-gap-fast-pack-integration-selection-step386-static-smoke\.js/);

assert.match(index, /V6_REPLAY_GAP_FAST_PACK_INTEGRATION_SELECTION_STEP386\.md/);
assert.match(doc, /Step 387 should implement a new fast replay-gap browser pack command/);
assert.match(selectionStatic, /Step 276 should keep using the\\s\+full Step 274 command/);

assert.match(step274Pack, /manual-next-session-gap-browser-step258-smoke\.js/);
assert.match(step274Pack, /htf-manual-next-replay-gap-browser-step273-smoke\.js/);
assert.match(step276Pack, /replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.equal(step274Pack.includes('replay-gap-fast-browser-regression-pack-step387'), false);
assert.equal(step276Pack.includes('replay-gap-fast-browser-regression-pack-step387'), false);
assert.equal(app.includes('replay-gap-fast-browser-regression-pack-step387'), false);

console.log('v6 replay gap fast pack integration closeout step386 static smoke passed');
