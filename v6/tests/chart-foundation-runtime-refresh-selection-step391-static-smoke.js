import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = readFileSync('v6/docs/V6_CHART_FOUNDATION_RUNTIME_REFRESH_SELECTION_STEP391.md', 'utf8');
const step390Doc = readFileSync('v6/docs/V6_FOUNDATION_REPLAY_GAP_MODE_CLOSEOUT_STEP390.md', 'utf8');
const step381Doc = readFileSync('v6/docs/V6_CHART_FOUNDATION_REGRESSION_REFRESH_STEP381.md', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step387Pack = readFileSync('v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js', 'utf8');
const app = readFileSync('v6/src/app.js', 'utf8');

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /No additional immediate browser runtime refresh is required/);
assert.match(doc, /replay-gap pack cost-control chain can close for now/);
assert.match(doc, /Chart Foundation Post Replay-Gap Cost Control Re-audit/);
assert.match(doc, /Step 392 should/);

for (const runtime of ['105292ms', '90350ms', '44597ms', '24532ms', '28243ms']) {
  assert.match(doc, new RegExp(runtime));
}

for (const source of [doc, step390Doc]) {
  assert.match(source, /node v6\/tests\/timeframe-replay-foundation-regression-pack-step276-smoke\.js/);
  assert.match(source, /FOUNDATION_REPLAY_GAP_MODE=full node v6\/tests\/timeframe-replay-foundation-regression-pack-step276-smoke\.js/);
  assert.match(source, /node v6\/tests\/replay-gap-fast-browser-regression-pack-step387-smoke\.js/);
  assert.match(source, /node v6\/tests\/replay-gap-browser-regression-pack-step274-smoke\.js/);
  assert.match(source, /node v6\/tests\/replay-gap-near-gap-manual-fixture-browser-step385-smoke\.js/);
}

assert.match(step381Doc, /105292ms/);
assert.match(step381Doc, /90350ms/);
assert.match(step276Pack, /FOUNDATION_REPLAY_GAP_MODE/);
assert.match(step276Pack, /fast: 'v6\/tests\/replay-gap-fast-browser-regression-pack-step387-smoke\.js'/);
assert.match(step276Pack, /full: 'v6\/tests\/replay-gap-browser-regression-pack-step274-smoke\.js'/);
assert.match(step276Pack, /process\.env\.FOUNDATION_REPLAY_GAP_MODE \|\| 'fast'/);
assert.match(step274Pack, /manual-next-session-gap-browser-step258-smoke\.js/);
assert.match(step274Pack, /htf-manual-next-replay-gap-browser-step273-smoke\.js/);
assert.match(step387Pack, /replay-gap-near-gap-manual-fixture-browser-step385-smoke\.js/);
assert.match(step387Pack, /auto-play-session-gap-browser-step263-smoke\.js/);
assert.match(step387Pack, /htf-auto-play-replay-gap-browser-step273-smoke\.js/);
assert.equal(app.includes('FOUNDATION_REPLAY_GAP_MODE'), false);

console.log('v6 chart foundation runtime refresh selection step391 static smoke passed');
