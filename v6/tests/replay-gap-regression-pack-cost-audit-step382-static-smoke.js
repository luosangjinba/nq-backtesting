import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  doc,
  pack,
  manualLowTf,
  htfManual,
  htfFixture,
  autoLowTf,
] = await Promise.all([
  readFile('v6/docs/V6_REPLAY_GAP_REGRESSION_PACK_COST_AUDIT_STEP382.md', 'utf8'),
  readFile('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8'),
  readFile('v6/tests/manual-next-session-gap-browser-step258-smoke.js', 'utf8'),
  readFile('v6/tests/htf-manual-next-replay-gap-browser-step273-smoke.js', 'utf8'),
  readFile('v6/tests/helpers/htf-replay-gap-browser-fixture.js', 'utf8'),
  readFile('v6/tests/auto-play-session-gap-browser-step263-smoke.js', 'utf8'),
]);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /No runtime behavior changed in this step/);
assert.match(doc, /`105292ms`/);
assert.match(doc, /`90350ms`/);
assert.match(doc, /manual-next-session-gap-browser-step258-smoke\.js`: `27270ms`/);
assert.match(doc, /htf-manual-next-replay-gap-browser-step273-smoke\.js`: `50161ms`/);
assert.match(doc, /primary cost owner is not production replay behavior/);
assert.match(doc, /browser harness\s+shape plus manual-step scenario size/);
assert.match(doc, /repeated browser\/page setup cost/);
assert.match(doc, /long manual replay advancement cost/);
assert.match(doc, /HTF projection cost/);
assert.match(doc, /Step 383 Recommendation/);
assert.match(doc, /Replay Gap Manual Path Timing Probe/);
assert.match(doc, /leave Step 274 and Step 276 pack membership unchanged/);
assert.match(doc, /Step 274 replay-gap assertions remain intact/);
assert.match(doc, /Replay cursor movement and no-bar gap skipping remain unchanged/);

for (const member of [
  'manual-next-session-gap-browser-step258-smoke.js',
  'auto-play-session-gap-browser-step263-smoke.js',
  'htf-manual-next-replay-gap-browser-step273-smoke.js',
  'htf-auto-play-replay-gap-browser-step273-smoke.js',
]) {
  assert.match(pack, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(pack, /for \(const script of TESTS\)/);
assert.match(pack, /spawn\(process\.execPath, \[script\]/);

assert.match(manualLowTf, /await runCase\(1\)/);
assert.match(manualLowTf, /await runCase\(5\)/);
assert.match(manualLowTf, /await runCase\(15\)/);
assert.match(manualLowTf, /openV6Page/);
assert.match(manualLowTf, /2026-06-01T15:34/);
assert.match(manualLowTf, /for \(let index = 0; index < 100; index \+= 1\)/);
assert.match(manualLowTf, /cursorIndex, 146/);

assert.match(htfManual, /runHtfReplayGapBrowserPack\(\{ mode: 'manual' \}\)/);
assert.match(htfFixture, /const HTF_TARGETS = Object\.freeze\(\['1D', '1W', '1M'\]\)/);
assert.match(htfFixture, /for \(const displayTimeframe of HTF_TARGETS\)/);
assert.match(htfFixture, /openV6Page/);
assert.match(htfFixture, /mode === 'auto' \? '2026-06-01T16:50' : '2026-06-01T15:34'/);
assert.match(htfFixture, /for \(let index = 0; index < 100; index \+= 1\)/);
assert.match(htfFixture, /expectedFinalCursorIndex: mode === 'auto' \? 71 : 147/);

assert.match(autoLowTf, /2026-06-01T16:50/);
assert.match(autoLowTf, /SET_CURSOR_TIME/);
assert.match(autoLowTf, /2026-06-01T16:58:00\.000Z/);

console.log('v6 replay gap regression pack cost audit step382 static smoke passed');
