import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc386 = readFileSync('v6/docs/V6_REPLAY_GAP_FAST_PACK_INTEGRATION_SELECTION_STEP386.md', 'utf8');
const fastPack = readFileSync('v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js', 'utf8');
const step385Fixture = readFileSync('v6/tests/replay-gap-near-gap-manual-fixture-browser-step385-smoke.js', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const app = readFileSync('v6/src/app.js', 'utf8');

assert.match(doc386, /Replay Gap Fast Browser Pack Implementation/);
assert.match(doc386, /replay-gap-fast-browser-regression-pack-step387-smoke\.js/);

for (const member of [
  'replay-gap-near-gap-manual-fixture-browser-step385-smoke.js',
  'auto-play-session-gap-browser-step263-smoke.js',
  'htf-auto-play-replay-gap-browser-step273-smoke.js',
]) {
  assert.match(fastPack, new RegExp(member.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(fastPack, /const TESTS = Object\.freeze/);
assert.match(fastPack, /\[replay-gap-fast-browser-pack\] start/);
assert.match(fastPack, /\[replay-gap-fast-browser-pack\] passed/);
assert.match(fastPack, /spawn\(process\.execPath, \[script\]/);
assert.match(fastPack, /break;/);
assert.match(fastPack, /process\.exit\(failed\.code \|\| 1\)/);

assert.match(step385Fixture, /2026-06-01T16:58:00\.000Z/);
assert.match(step385Fixture, /assert\.equal\(item\.preGapManualNextCount, 2/);

for (const fullMember of [
  'manual-next-session-gap-browser-step258-smoke.js',
  'auto-play-session-gap-browser-step263-smoke.js',
  'htf-manual-next-replay-gap-browser-step273-smoke.js',
  'htf-auto-play-replay-gap-browser-step273-smoke.js',
]) {
  assert.match(step274Pack, new RegExp(fullMember.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(step276Pack, /replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.equal(step274Pack.includes('replay-gap-fast-browser-regression-pack-step387'), false);
assert.match(step276Pack, /replay-gap-fast-browser-regression-pack-step387-smoke\.js/);
assert.equal(app.includes('replay-gap-fast-browser-regression-pack-step387'), false);
assert.equal(app.includes('Step 387'), false);

console.log('v6 replay gap fast browser regression pack step387 static smoke passed');
