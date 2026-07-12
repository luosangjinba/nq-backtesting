import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const todo = readFileSync('v6/TODO.md', 'utf8');
const handoff = readFileSync('v6/docs/V6_HANDOFF.md', 'utf8');
const index = readFileSync('v6/docs/INDEX.md', 'utf8');
const doc = readFileSync('v6/docs/V6_FOUNDATION_PACK_REPLAY_GAP_MODE_STEP389.md', 'utf8');
const modeStatic = readFileSync('v6/tests/foundation-pack-replay-gap-fast-full-mode-step389-static-smoke.js', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step387Pack = readFileSync('v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js', 'utf8');
const app = readFileSync('v6/src/app.js', 'utf8');

for (const source of [todo, handoff]) {
  assert.match(source, /Step 389 - Foundation Pack Replay Gap Fast\/Full Mode Implementation/);
  assert.match(source, /Step 390 - Foundation Replay Gap Mode\s+Documentation Closeout/);
  assert.match(source, /node v6\/tests\/timeframe-replay-foundation-regression-pack-step276-smoke\.js/);
  assert.match(source, /FOUNDATION_REPLAY_GAP_MODE=full/);
}

assert.match(todo, /Latest completed foundation pack replay-gap mode step/);
assert.match(todo, /FOUNDATION_REPLAY_GAP_MODE=full node v6\/tests\/timeframe-replay-foundation-regression-pack-step276-smoke\.js/);
assert.match(todo, /Default Step 276 fast run passed `8\/8` in `44597ms`/);
assert.match(handoff, /Worktree at handoff: clean after Step 389 closeout/);
assert.match(handoff, /Latest completed step: Step 389 - Foundation Pack Replay Gap Fast\/Full Mode Implementation/);
assert.match(handoff, /node v6\/tests\/foundation-pack-replay-gap-fast-full-mode-step389-static-smoke\.js/);
assert.match(index, /V6_FOUNDATION_PACK_REPLAY_GAP_MODE_STEP389\.md/);
assert.match(doc, /Step 390 should add a small verification\/pack documentation closeout/);
assert.match(modeStatic, /FOUNDATION_REPLAY_GAP_MODE/);

assert.match(step276Pack, /FOUNDATION_REPLAY_GAP_MODE/);
assert.match(step276Pack, /replay-gap-fast-browser-regression-pack-step387-smoke\.js/);
assert.match(step276Pack, /replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.match(step274Pack, /manual-next-session-gap-browser-step258-smoke\.js/);
assert.match(step387Pack, /replay-gap-near-gap-manual-fixture-step385-smoke\.js/);
assert.equal(app.includes('FOUNDATION_REPLAY_GAP_MODE'), false);

console.log('v6 foundation pack replay gap mode closeout step389 static smoke passed');
