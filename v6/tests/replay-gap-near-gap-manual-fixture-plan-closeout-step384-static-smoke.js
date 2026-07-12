import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  todo,
  handoff,
  index,
  doc,
  stepSmoke,
  step274Pack,
  step276Pack,
  app,
] = await Promise.all([
  readFile('v6/TODO.md', 'utf8'),
  readFile('v6/docs/V6_HANDOFF.md', 'utf8'),
  readFile('v6/docs/INDEX.md', 'utf8'),
  readFile('v6/docs/V6_REPLAY_GAP_NEAR_GAP_MANUAL_FIXTURE_PLAN_STEP384.md', 'utf8'),
  readFile('v6/tests/replay-gap-near-gap-manual-fixture-plan-step384-static-smoke.js', 'utf8'),
  readFile('v6/tests/replay-gap-browser-regression-pack-step274-smoke.js', 'utf8'),
  readFile('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8'),
  readFile('v6/src/app.js', 'utf8'),
]);

assert.match(index, /V6_REPLAY_GAP_NEAR_GAP_MANUAL_FIXTURE_PLAN_STEP384\.md/);
assert.match(index, /keeping Step 274 and Step 276 membership unchanged/);
assert.match(index, /selecting the browser\s+probe as the next slice/);

assert.match(todo, /Latest completed replay-gap near-gap fixture plan step:\s+Step 384/);
assert.match(todo, /starting from `2026-06-01T16:58:00\.000Z`/);
assert.match(todo, /Step 274 and\s+Step 276 membership unchanged/);
assert.match(todo, /### Step 385 - Replay Gap Near-Gap Manual Fixture Browser Probe/);
assert.match(todo, /assert Manual Next path `16:58 -> 16:59 -> 18:00 -> 18:01`/);
assert.match(todo, /report Manual Next count and verify it is near `2`, not `86`, before the\s+final post-gap next/);
assert.match(todo, /### Step 384 - Replay Gap Near-Gap Manual Fixture Plan/);

assert.match(handoff, /Worktree at handoff: clean after Step 384 closeout/);
assert.match(handoff, /Latest completed step: Step 384 - Replay Gap Near-Gap Manual Fixture Plan/);
assert.match(handoff, /start with Step 385:\s+replay gap near-gap manual fixture browser probe/);
assert.match(handoff, /Recommended next action is Step 385 - Replay Gap Near-Gap Manual Fixture\s+Browser Probe/);
assert.match(handoff, /replay-gap-near-gap-manual-fixture-plan-step384-static-smoke/);

assert.match(doc, /Replay Gap Near-Gap Manual Fixture Browser Probe/);
assert.match(doc, /replay-gap-near-gap-manual-fixture-step385-smoke\.js/);
assert.match(doc, /approximately `2`\s+Manual Next calls/);
assert.match(doc, /Do not delete the existing long-path coverage/);
assert.match(doc, /No runtime behavior changed in this step/);
assert.match(stepSmoke, /not a Step 274 member yet/);
assert.match(stepSmoke, /not a Step 276 member yet/);

assert.doesNotMatch(step274Pack, /near-gap-manual-fixture/);
assert.doesNotMatch(step276Pack, /near-gap-manual-fixture/);
assert.doesNotMatch(app, /Step 384|NEAR_GAP_MANUAL_FIXTURE|near-gap-manual-fixture/);

console.log('v6 replay gap near-gap manual fixture plan closeout step384 static smoke passed');
