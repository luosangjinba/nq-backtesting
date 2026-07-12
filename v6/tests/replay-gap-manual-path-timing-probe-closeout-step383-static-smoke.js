import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [
  todo,
  handoff,
  index,
  doc,
  stepSmoke,
  app,
] = await Promise.all([
  readFile('v6/TODO.md', 'utf8'),
  readFile('v6/docs/V6_HANDOFF.md', 'utf8'),
  readFile('v6/docs/INDEX.md', 'utf8'),
  readFile('v6/docs/V6_REPLAY_GAP_MANUAL_PATH_TIMING_PROBE_STEP383.md', 'utf8'),
  readFile('v6/tests/replay-gap-manual-path-timing-probe-step383-static-smoke.js', 'utf8'),
  readFile('v6/src/app.js', 'utf8'),
]);

assert.match(index, /V6_REPLAY_GAP_MANUAL_PATH_TIMING_PROBE_STEP383\.md/);
assert.match(index, /Manual Next loop dominates cost/);
assert.match(index, /Replay Gap\s+Near-Gap Manual Fixture Plan as the next slice/);

assert.match(todo, /Latest completed replay-gap timing probe step:\s+Step 383/);
assert.match(todo, /same `86` Manual Next calls/);
assert.match(todo, /`1W`\), and `14\.9s` \(`1M`\)/);
assert.match(todo, /### Step 384 - Replay Gap Near-Gap Manual Fixture Plan/);
assert.match(todo, /starting close to\s+`2026-06-01T16:58:00\.000Z`/);
assert.match(todo, /keep at least one long-path manual source assertion available/);
assert.match(todo, /### Step 383 - Replay Gap Manual Path Timing Probe/);

assert.match(handoff, /Worktree at handoff: clean after Step 383 closeout/);
assert.match(handoff, /Latest completed step: Step 383 - Replay Gap Manual Path Timing Probe/);
assert.match(handoff, /start with Step 384:\s+replay gap near-gap manual fixture plan/);
assert.match(handoff, /Recommended next action is Step 384 - Replay Gap Near-Gap Manual Fixture\s+Plan/);
assert.match(handoff, /replay-gap-manual-path-timing-probe-step383-smoke/);
assert.match(handoff, /replay-gap-manual-path-timing-probe-step383-static-smoke/);

assert.match(doc, /same `86` Manual Next calls for all six cases/);
assert.match(doc, /`1W` \| `86` \| `1422\.8ms`/);
assert.match(doc, /`1M` \| `86` \| `2364\.9ms`/);
assert.match(doc, /Replay Gap Near-Gap Manual Fixture Plan/);
assert.match(doc, /Step 274 replay-gap pack membership remains unchanged/);
assert.match(doc, /Step 276 foundation pack membership remains unchanged/);
assert.match(stepSmoke, /manualLoopMs/);
assert.match(stepSmoke, /manualNextCount/);
assert.doesNotMatch(app, /Step 383|TIMING_PROBE_STEP383|Near-Gap Manual Fixture/);

console.log('v6 replay gap manual path timing probe closeout step383 static smoke passed');
