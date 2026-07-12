import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const todo = readFileSync('v6/TODO.md', 'utf8');
const handoff = readFileSync('v6/docs/V6_HANDOFF.md', 'utf8');
const index = readFileSync('v6/docs/INDEX.md', 'utf8');
const doc = readFileSync('v6/docs/V6_REPLAY_GAP_FAST_BROWSER_PACK_STEP387.md', 'utf8');
const fastPack = readFileSync('v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js', 'utf8');
const fastPackStatic = readFileSync('v6/tests/replay-gap-fast-browser-regression-pack-step387-static-smoke.js', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const app = readFileSync('v6/src/app.js', 'utf8');

for (const source of [todo, handoff]) {
  assert.match(source, /Step 387 - Replay Gap Fast Browser Pack Implementation/);
  assert.match(source, /Step 388 - Foundation Pack Replay Gap Fast\/Full\s+Selection/);
  assert.match(source, /replay-gap-fast-browser-regression-pack-step387-smoke\.js/);
  assert.match(source, /24532ms/);
}

assert.match(todo, /Latest completed replay-gap fast pack implementation step/);
assert.match(todo, /Completed in this replay-gap fast browser pack implementation commit series/);
assert.match(todo, /Preserved Step 276 membership; it still uses the full Step 274 command/);

assert.match(handoff, /Worktree at handoff: clean after Step 387 closeout/);
assert.match(handoff, /Latest completed step: Step 387 - Replay Gap Fast Browser Pack Implementation/);
assert.match(handoff, /Step 276 still uses Step 274 for now/);

assert.match(index, /V6_REPLAY_GAP_FAST_BROWSER_PACK_STEP387\.md/);
assert.match(doc, /Step 388 should decide how to use the fast pack/);
assert.match(doc, /Step 276 remains unchanged and still uses the full Step 274 command/);
assert.match(fastPackStatic, /step274Pack\.includes\('replay-gap-fast-browser-regression-pack-step387'\), false/);
assert.match(fastPackStatic, /step276Pack\.includes\('replay-gap-fast-browser-regression-pack-step387'\), false/);

for (const member of [
  'replay-gap-near-gap-manual-fixture-step385-smoke.js',
  'auto-play-session-gap-browser-step263-smoke.js',
  'htf-auto-play-replay-gap-browser-step273-smoke.js',
]) {
  assert.match(fastPack, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(step274Pack, /manual-next-session-gap-browser-step258-smoke\.js/);
assert.match(step274Pack, /htf-manual-next-replay-gap-browser-step273-smoke\.js/);
assert.match(step276Pack, /replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.equal(step274Pack.includes('replay-gap-fast-browser-regression-pack-step387'), false);
assert.equal(step276Pack.includes('replay-gap-fast-browser-regression-pack-step387'), false);
assert.equal(app.includes('replay-gap-fast-browser-regression-pack-step387'), false);

console.log('v6 replay gap fast browser pack closeout step387 static smoke passed');
