import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  doc,
  probe,
  step274Pack,
  step276Pack,
  app,
] = await Promise.all([
  readFile('v6/docs/V6_REPLAY_GAP_MANUAL_PATH_TIMING_PROBE_STEP383.md', 'utf8'),
  readFile('v6/tests/replay-gap-manual-path-timing-probe-browser-step383-smoke.js', 'utf8'),
  readFile('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8'),
  readFile('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8'),
  readFile('v6/src/app.js', 'utf8'),
]);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /No runtime behavior changed in this step/);
assert.match(doc, /replay-gap-manual-path-timing-probe-browser-step383-smoke\.js/);
assert.match(doc, /low-TF manual cases: `1m`, `5m`, `15m`/);
assert.match(doc, /HTF manual cases: `1D`, `1W`, `1M`/);
assert.match(doc, /dominant cost is the Manual Next loop/);
assert.match(doc, /same `86` Manual Next calls for all six cases/);
assert.match(doc, /`1W` \| `86` \| `1422\.8ms` \| `203\.2ms` \| `35\.3ms` \| `17361\.9ms`/);
assert.match(doc, /`1M` \| `86` \| `2364\.9ms` \| `231\.0ms` \| `35\.3ms` \| `14931\.7ms`/);
assert.match(doc, /Replay Gap Near-Gap Manual Fixture Plan/);
assert.match(doc, /Step 274 replay-gap pack membership remains unchanged/);
assert.match(doc, /Step 276 foundation pack membership remains unchanged/);

for (const literal of [
  'pageSetupMs',
  'sessionApplyMs',
  'timeframeApplyMs',
  'manualLoopMs',
  'manualNextCount',
  'finalNextMs',
  'assertionReadoutMs',
  'cleanupMs',
  'for (const displayTimeframe of [1, 5, 15])',
  "for (const displayTimeframe of ['1D', '1W', '1M'])",
  '2026-06-01T15:34',
  '2026-06-01T18:00:00.000Z',
  '2026-06-01T18:01:00.000Z',
]) {
  assert.match(probe, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(probe, /assert\.equal\(item\.crossedReplay\.cursorIndex, 146/);
assert.match(probe, /assert\.equal\(item\.replay\.cursorIndex, 147/);
assert.match(probe, /assert\.equal\(item\.replay\.revealedCount, 148/);
assert.match(probe, /FINAL_SOURCE_TIMESTAMP/);

assert.match(step274Pack, /manual-next-session-gap-browser-step258-smoke\.js/);
assert.match(step274Pack, /htf-manual-next-replay-gap-browser-step273-smoke\.js/);
assert.match(step276Pack, /replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.doesNotMatch(app, /replay-gap-manual-path-timing-probe-step383|Step 383|Near-Gap Manual Fixture/);

console.log('v6 replay gap manual path timing probe step383 static smoke passed');
