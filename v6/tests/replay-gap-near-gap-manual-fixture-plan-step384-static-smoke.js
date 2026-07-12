import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  doc,
  timingDoc,
  step274Pack,
  step276Pack,
  app,
] = await Promise.all([
  readFile('v6/docs/V6_REPLAY_GAP_NEAR_GAP_MANUAL_FIXTURE_PLAN_STEP384.md', 'utf8'),
  readFile('v6/docs/V6_REPLAY_GAP_MANUAL_PATH_TIMING_PROBE_STEP383.md', 'utf8'),
  readFile('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8'),
  readFile('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8'),
  readFile('v6/src/app.js', 'utf8'),
]);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /No runtime behavior changed in this step/);
assert.match(doc, /session start: `2026-06-01T16:50`/);
assert.match(doc, /session end: `2026-06-01T18:10`/);
assert.match(doc, /set replay cursor to `2026-06-01T16:58:00\.000Z`/);
assert.match(doc, /First Manual Next \| `2026-06-01T16:59:00\.000Z`/);
assert.match(doc, /Gap-crossing Manual Next \| `2026-06-01T18:00:00\.000Z`/);
assert.match(doc, /Post-gap Manual Next \| `2026-06-01T18:01:00\.000Z`/);
assert.match(doc, /approximately `2`\s+Manual Next calls/);
assert.match(doc, /low-TF source\/projection cases: `1m`, `5m`, `15m`/);
assert.match(doc, /HTF projection cases: `1D`, `1W`, `1M`/);
assert.match(doc, /requested display timeframe is applied/);
assert.match(doc, /replay cursor time, cursor index, and revealed count stay aligned/);
assert.match(doc, /projection metadata includes the final source timestamp/);
assert.match(doc, /footer cursor reads `Cursor 18:01`/);
assert.match(doc, /Do not delete the existing long-path coverage/);
assert.match(doc, /existing `1m`\s+`manual-next-session-gap-browser-step258-smoke\.js` path/);
assert.match(doc, /replay-gap-near-gap-manual-fixture-step385-smoke\.js/);
assert.match(doc, /not a Step 274 member yet/);
assert.match(doc, /not a Step 276 member yet/);
assert.match(doc, /Replay Gap Near-Gap Manual Fixture Browser Probe/);
assert.match(doc, /pre-gap Manual Next count is near `2`, not `86`/);
assert.match(doc, /Step 274 replay-gap pack membership remains unchanged/);
assert.match(doc, /Step 276 foundation pack membership remains unchanged/);

assert.match(timingDoc, /same `86` Manual Next calls for all six cases/);
assert.match(timingDoc, /dominant cost is the Manual Next loop/);

assert.match(step274Pack, /manual-next-session-gap-browser-step258-smoke\.js/);
assert.match(step274Pack, /htf-manual-next-replay-gap-browser-step273-smoke\.js/);
assert.doesNotMatch(step274Pack, /near-gap-manual-fixture/);
assert.match(step276Pack, /replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.doesNotMatch(step276Pack, /near-gap-manual-fixture/);
assert.doesNotMatch(app, /Step 384|NEAR_GAP_MANUAL_FIXTURE|near-gap-manual-fixture/);

console.log('v6 replay gap near-gap manual fixture plan step384 static smoke passed');
