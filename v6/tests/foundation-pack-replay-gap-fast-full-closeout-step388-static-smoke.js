import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const todo = readFileSync('v6/TODO.md', 'utf8');
const handoff = readFileSync('v6/docs/V6_HANDOFF.md', 'utf8');
const index = readFileSync('v6/docs/INDEX.md', 'utf8');
const doc = readFileSync('v6/docs/V6_FOUNDATION_PACK_REPLAY_GAP_FAST_FULL_SELECTION_STEP388.md', 'utf8');
const selectionStatic = readFileSync('v6/tests/foundation-pack-replay-gap-fast-full-selection-step388-static-smoke.js', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step387Pack = readFileSync('v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js', 'utf8');
const app = readFileSync('v6/src/app.js', 'utf8');

for (const source of [todo, handoff]) {
  assert.match(source, /Step 388 - Foundation Pack Replay Gap Fast\/Full Selection/);
  assert.match(source, /Step 389 - Foundation Pack Replay Gap Fast\/Full\s+Mode Implementation/);
  assert.match(source, /FOUNDATION_REPLAY_GAP_MODE=full/);
  assert.match(source, /fast\s+default/);
}

assert.match(todo, /Latest completed foundation pack replay-gap selection step/);
assert.match(todo, /Completed in this foundation pack replay-gap fast\/full selection commit series/);
assert.match(todo, /Step 276 replay-gap fast\/full mode controls/);
assert.match(todo, /default `fast` mode/);
assert.match(todo, /invalid replay-gap modes fail before running browser members/);

assert.match(handoff, /Worktree at handoff: clean after Step 388 closeout/);
assert.match(handoff, /Latest completed step: Step 388 - Foundation Pack Replay Gap Fast\/Full Selection/);
assert.match(handoff, /node v6\/tests\/foundation-pack-replay-gap-fast-full-selection-step388-static-smoke\.js/);

assert.match(index, /V6_FOUNDATION_PACK_REPLAY_GAP_FAST_FULL_SELECTION_STEP388\.md/);
assert.match(doc, /Step 389 should implement the Step 276 runner control/);
assert.match(selectionStatic, /step276Pack\.includes\('FOUNDATION_REPLAY_GAP_MODE'\), false/);

assert.match(step276Pack, /replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.equal(step276Pack.includes('FOUNDATION_REPLAY_GAP_MODE'), false);
assert.equal(step276Pack.includes('replay-gap-fast-browser-regression-pack-step387'), false);
assert.match(step274Pack, /manual-next-session-gap-browser-step258-smoke\.js/);
assert.match(step387Pack, /replay-gap-near-gap-manual-fixture-step385-smoke\.js/);
assert.equal(app.includes('FOUNDATION_REPLAY_GAP_MODE'), false);

console.log('v6 foundation pack replay gap fast/full closeout step388 static smoke passed');
