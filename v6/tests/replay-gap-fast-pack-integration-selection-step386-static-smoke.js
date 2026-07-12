import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = readFileSync('v6/docs/V6_REPLAY_GAP_FAST_PACK_INTEGRATION_SELECTION_STEP386.md', 'utf8');
const step385Doc = readFileSync('v6/docs/V6_REPLAY_GAP_NEAR_GAP_MANUAL_FIXTURE_STEP385.md', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const app = readFileSync('v6/src/app.js', 'utf8');

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /fast\/full replay-gap pack split/);
assert.match(doc, /Replay Gap Fast Browser Pack Implementation/);
assert.match(doc, /replay-gap-fast-browser-regression-pack-step387-smoke\.js/);
assert.match(doc, /replay-gap-near-gap-manual-fixture-step385-smoke\.js/);
assert.match(doc, /auto-play-session-gap-browser-step263-smoke\.js/);
assert.match(doc, /htf-auto-play-replay-gap-browser-step273-smoke\.js/);
assert.match(doc, /manual-next-session-gap-browser-step258-smoke\.js/);
assert.match(doc, /Step 274 replay-gap pack membership remains unchanged/);
assert.match(doc, /Step 276 foundation pack membership remains unchanged/);
assert.match(doc, /Step 276 should keep using the\s+full Step 274 command/);
assert.match(doc, /one long-path manual source assertion/);
assert.match(doc, /Runtime behavior remains unchanged/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(step385Doc, /16:58 -> 16:59 -> 18:00 -> 18:01/);
assert.match(step385Doc, /`2`\s+Manual Next calls/);

for (const member of [
  'manual-next-session-gap-browser-step258-smoke.js',
  'auto-play-session-gap-browser-step263-smoke.js',
  'htf-manual-next-replay-gap-browser-step273-smoke.js',
  'htf-auto-play-replay-gap-browser-step273-smoke.js',
]) {
  assert.match(step274Pack, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(step276Pack, /replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.equal(step274Pack.includes('replay-gap-fast-browser-regression-pack-step387'), false);
assert.equal(step276Pack.includes('replay-gap-fast-browser-regression-pack-step387'), false);
assert.equal(app.includes('replay-gap-fast-browser-regression-pack-step387'), false);
assert.equal(app.includes('Step 386'), false);

console.log('v6 replay gap fast pack integration selection step386 static smoke passed');
