import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const todo = readFileSync('v6/TODO.md', 'utf8');
const handoff = readFileSync('v6/docs/V6_HANDOFF.md', 'utf8');
const index = readFileSync('v6/docs/INDEX.md', 'utf8');
const doc = readFileSync('v6/docs/V6_FOUNDATION_REPLAY_GAP_MODE_CLOSEOUT_STEP390.md', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step387Pack = readFileSync('v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js', 'utf8');

for (const source of [todo, handoff, doc]) {
  assert.match(source, /node v6\/tests\/timeframe-replay-foundation-regression-pack-step276-smoke\.js/);
  assert.match(source, /FOUNDATION_REPLAY_GAP_MODE=full node v6\/tests\/timeframe-replay-foundation-regression-pack-step276-smoke\.js/);
}

for (const source of [todo, handoff]) {
  assert.match(source, /Step 390 - Foundation Replay Gap Mode Documentation Closeout/);
  assert.match(source, /Step 391 - Chart Foundation Runtime Refresh\s+Selection/);
  assert.match(source, /44597ms/);
  assert.match(source, /105292ms/);
}

assert.match(todo, /Latest completed foundation replay-gap mode documentation step/);
assert.match(todo, /Completed in this foundation replay-gap mode documentation closeout commit/);
assert.match(handoff, /Worktree at handoff: clean after Step 390 closeout/);
assert.match(handoff, /Latest completed step: Step 390 - Foundation Replay Gap Mode Documentation Closeout/);
assert.match(handoff, /node v6\/tests\/foundation-replay-gap-mode-closeout-step390-static-smoke\.js/);

assert.match(index, /V6_FOUNDATION_REPLAY_GAP_MODE_CLOSEOUT_STEP390\.md/);
assert.match(doc, /Step 391 should refresh the chart-foundation regression documentation/);
assert.match(step276Pack, /FOUNDATION_REPLAY_GAP_MODE/);
assert.match(step274Pack, /manual-next-session-gap-browser-step258-smoke\.js/);
assert.match(step387Pack, /replay-gap-near-gap-manual-fixture-step385-smoke\.js/);

console.log('v6 foundation replay gap mode doc closeout step390 static smoke passed');
