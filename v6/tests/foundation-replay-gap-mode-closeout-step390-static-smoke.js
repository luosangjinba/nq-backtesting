import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = readFileSync('v6/docs/V6_FOUNDATION_REPLAY_GAP_MODE_CLOSEOUT_STEP390.md', 'utf8');
const todo = readFileSync('v6/TODO.md', 'utf8');
const handoff = readFileSync('v6/docs/V6_HANDOFF.md', 'utf8');
const index = readFileSync('v6/docs/INDEX.md', 'utf8');
const step389Doc = readFileSync('v6/docs/V6_FOUNDATION_PACK_REPLAY_GAP_MODE_STEP389.md', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step387Pack = readFileSync('v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js', 'utf8');
const app = readFileSync('v6/src/app.js', 'utf8');

for (const source of [doc, todo]) {
  assert.match(source, /node v6\/tests\/timeframe-replay-foundation-regression-pack-step276-smoke\.js/);
  assert.match(source, /FOUNDATION_REPLAY_GAP_MODE=full node v6\/tests\/timeframe-replay-foundation-regression-pack-step276-smoke\.js/);
  assert.match(source, /node v6\/tests\/replay-gap-fast-browser-regression-pack-step387-smoke\.js/);
  assert.match(source, /node v6\/tests\/replay-gap-browser-regression-pack-step274-smoke\.js/);
}

assert.match(handoff, /FOUNDATION_REPLAY_GAP_MODE=full/);
assert.match(handoff, /node v6\/tests\/timeframe-replay-foundation-regression-pack-step276-smoke\.js/);

assert.match(doc, /Status\s*\n\s*Completed/);
assert.match(doc, /Default Foundation Command/);
assert.match(doc, /Full Replay-Gap Foundation Command/);
assert.match(doc, /Direct Replay-Gap Commands/);
assert.match(doc, /Step 391 should refresh the chart-foundation regression documentation/);
assert.match(doc, /44597ms/);

assert.match(step389Doc, /FOUNDATION_REPLAY_GAP_MODE=full node v6\/tests\/timeframe-replay-foundation-regression-pack-step276-smoke\.js/);
assert.match(step276Pack, /FOUNDATION_REPLAY_GAP_MODE/);
assert.match(step276Pack, /replay-gap-fast-browser-regression-pack-step387-smoke\.js/);
assert.match(step276Pack, /replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.match(step274Pack, /manual-next-session-gap-browser-step258-smoke\.js/);
assert.match(step387Pack, /replay-gap-near-gap-manual-fixture-step385-smoke\.js/);
assert.equal(app.includes('FOUNDATION_REPLAY_GAP_MODE=full'), false);
assert.match(index, /V6_FOUNDATION_PACK_REPLAY_GAP_MODE_STEP389\.md/);

console.log('v6 foundation replay gap mode closeout step390 static smoke passed');
