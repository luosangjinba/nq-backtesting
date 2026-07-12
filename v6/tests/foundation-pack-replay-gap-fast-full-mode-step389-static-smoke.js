import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc388 = readFileSync('v6/docs/V6_FOUNDATION_PACK_REPLAY_GAP_FAST_FULL_SELECTION_STEP388.md', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');
const step274Pack = readFileSync('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8');
const step387Pack = readFileSync('v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js', 'utf8');
const app = readFileSync('v6/src/app.js', 'utf8');

assert.match(doc388, /Foundation Pack Replay Gap Fast\/Full Mode Implementation/);
assert.match(step276Pack, /FOUNDATION_REPLAY_GAP_MODE/);
assert.match(step276Pack, /const REPLAY_GAP_MEMBERS = Object\.freeze/);
assert.match(step276Pack, /fast: 'v6\/tests\/replay-gap-fast-browser-regression-pack-step387-smoke\.js'/);
assert.match(step276Pack, /full: 'v6\/tests\/replay-gap-browser-regression-pack-step274-smoke\.js'/);
assert.match(step276Pack, /process\.env\.FOUNDATION_REPLAY_GAP_MODE \|\| 'fast'/);
assert.match(step276Pack, /invalid FOUNDATION_REPLAY_GAP_MODE/);
assert.match(step276Pack, /expected "fast" or "full"/);
assert.match(step276Pack, /process\.exit\(1\)/);
assert.match(step276Pack, /\.\.\.BASE_TESTS/);
assert.match(step276Pack, /resolveReplayGapMember\(\)/);

assert.match(step274Pack, /manual-next-session-gap-browser-step258-smoke\.js/);
assert.match(step274Pack, /htf-manual-next-replay-gap-browser-step273-smoke\.js/);
assert.match(step387Pack, /replay-gap-near-gap-manual-fixture-step385-smoke\.js/);
assert.match(step387Pack, /htf-auto-play-replay-gap-browser-step273-smoke\.js/);
assert.equal(app.includes('FOUNDATION_REPLAY_GAP_MODE'), false);

assert.match(step276Pack, /if \(!member\) \{/);
assert.match(step276Pack, /\[timeframe-replay-foundation-pack\] invalid FOUNDATION_REPLAY_GAP_MODE="\$\{mode\}"/);
assert.match(step276Pack, /process\.exit\(1\);/);
assert.equal(step276Pack.indexOf('resolveReplayGapMember()') < step276Pack.indexOf('for (const script of TESTS)'), true);

console.log('v6 foundation pack replay gap fast/full mode step389 static smoke passed');
