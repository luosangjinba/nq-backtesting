import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = readFileSync('v6/docs/V6_FOUNDATION_PACK_REPLAY_GAP_FAST_FULL_SELECTION_STEP388.md', 'utf8');
const step387Doc = readFileSync('v6/docs/V6_REPLAY_GAP_FAST_BROWSER_PACK_STEP387.md', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step387Pack = readFileSync('v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js', 'utf8');
const app = readFileSync('v6/src/app.js', 'utf8');

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /foundation replay-gap fast\/full mode controls with fast default/);
assert.match(doc, /FOUNDATION_REPLAY_GAP_MODE=full/);
assert.match(doc, /FOUNDATION_REPLAY_GAP_MODE=fast/);
assert.match(doc, /unset \/ `fast`/);
assert.match(doc, /replay-gap-fast-browser-regression-pack-step387-smoke\.js/);
assert.match(doc, /replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.match(doc, /Invalid modes should fail early/);
assert.match(doc, /Foundation Pack Replay Gap Fast\/Full Mode Implementation/);
assert.match(doc, /Step 274 replay-gap pack membership remains unchanged/);
assert.match(doc, /Step 387 fast pack membership remains unchanged/);
assert.match(doc, /Runtime behavior remains unchanged/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(step387Doc, /\[replay-gap-fast-browser-pack\] passed 3\/3 in 24532ms/);
assert.match(step387Doc, /Step 276 remains unchanged/);

assert.match(step276Pack, /replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.match(step276Pack, /FOUNDATION_REPLAY_GAP_MODE/);
assert.match(step276Pack, /replay-gap-fast-browser-regression-pack-step387-smoke\.js/);

for (const fullMember of [
  'manual-next-session-gap-browser-step258-smoke.js',
  'auto-play-session-gap-browser-step263-smoke.js',
  'htf-manual-next-replay-gap-browser-step273-smoke.js',
  'htf-auto-play-replay-gap-browser-step273-smoke.js',
]) {
  assert.match(step274Pack, new RegExp(fullMember.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const fastMember of [
  'replay-gap-near-gap-manual-fixture-step385-smoke.js',
  'auto-play-session-gap-browser-step263-smoke.js',
  'htf-auto-play-replay-gap-browser-step273-smoke.js',
]) {
  assert.match(step387Pack, new RegExp(fastMember.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.equal(app.includes('FOUNDATION_REPLAY_GAP_MODE'), false);
assert.equal(app.includes('Step 388'), false);

console.log('v6 foundation pack replay gap fast/full selection step388 static smoke passed');
