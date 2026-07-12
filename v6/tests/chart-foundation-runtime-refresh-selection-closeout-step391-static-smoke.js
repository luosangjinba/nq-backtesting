import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const doc = readFileSync('v6/docs/V6_CHART_FOUNDATION_RUNTIME_REFRESH_SELECTION_STEP391.md', 'utf8');
const todo = readFileSync('v6/TODO.md', 'utf8');
const handoff = readFileSync('v6/docs/V6_HANDOFF.md', 'utf8');
const index = readFileSync('v6/docs/INDEX.md', 'utf8');
const step276Pack = readFileSync('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8');

for (const source of [doc, todo, handoff]) {
  assert.match(source, /44597ms/);
  assert.match(source, /105292ms/);
  assert.match(source, /no additional\s+immediate browser runtime refresh/i);
  assert.match(source, /replay-gap pack\s+cost-control chain/);
  assert.match(source, /Step 392/);
}

assert.match(todo, /Step 391 - Chart Foundation Runtime Refresh Selection/);
assert.match(todo, /Step 392 - Chart Foundation Post Replay-Gap Cost Control Re-audit/);
assert.match(handoff, /Latest completed step: Step 391 - Chart Foundation Runtime Refresh Selection/);
assert.match(handoff, /start with Step 392/);
assert.match(index, /V6_CHART_FOUNDATION_RUNTIME_REFRESH_SELECTION_STEP391\.md/);
assert.match(doc, /FOUNDATION_REPLAY_GAP_MODE=full node v6\/tests\/timeframe-replay-foundation-regression-pack-step276-smoke\.js/);
assert.match(doc, /node v6\/tests\/replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.match(doc, /node v6\/tests\/replay-gap-fast-browser-regression-pack-step387-smoke\.js/);
assert.match(step276Pack, /FOUNDATION_REPLAY_GAP_MODE/);
assert.match(step276Pack, /process\.env\.FOUNDATION_REPLAY_GAP_MODE \|\| 'fast'/);

console.log('v6 chart foundation runtime refresh selection closeout step391 static smoke passed');
