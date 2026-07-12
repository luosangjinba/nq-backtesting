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
  readFile('v6/docs/V6_REPLAY_GAP_REGRESSION_PACK_COST_AUDIT_STEP382.md', 'utf8'),
  readFile('v6/tests/replay-gap-regression-pack-cost-audit-step382-static-smoke.js', 'utf8'),
  readFile('v6/src/app.js', 'utf8'),
]);

assert.match(index, /V6_REPLAY_GAP_REGRESSION_PACK_COST_AUDIT_STEP382\.md/);
assert.match(index, /browser harness shape plus manual-step scenario size/);
assert.match(index, /Replay Gap Manual Path Timing Probe as the next\s+measurement-only slice/);

assert.match(todo, /Latest completed replay-gap cost audit step:\s+Step 382/);
assert.match(todo, /serial child-process member\s+execution, fresh page setup per case, long `15:34 -> 18:00` Manual Next loops/);
assert.match(todo, /### Step 383 - Replay Gap Manual Path Timing Probe/);
assert.match(todo, /measure low-TF manual gap cases/);
assert.match(todo, /measure HTF manual gap cases/);
assert.match(todo, /leave Step 274 pack membership unchanged/);
assert.match(todo, /### Step 382 - Replay Gap Regression Pack Cost Audit/);

assert.match(handoff, /Worktree at handoff: clean after Step 382 closeout/);
assert.match(handoff, /Latest completed step: Step 382 - Replay Gap Regression Pack Cost Audit/);
assert.match(handoff, /start with Step 383:\s+replay gap manual path timing probe/);
assert.match(handoff, /Recommended next action is Step 383 - Replay Gap Manual Path Timing Probe/);
assert.match(handoff, /replay-gap-regression-pack-cost-audit-step382-static-smoke/);

assert.match(doc, /primary cost owner is not production replay behavior/);
assert.match(doc, /browser harness\s+shape plus manual-step scenario size/);
assert.match(doc, /Replay Gap Manual Path Timing Probe/);
assert.match(doc, /leave Step 274 and Step 276 pack membership unchanged/);
assert.match(doc, /No runtime behavior changed in this step/);
assert.match(stepSmoke, /manual-next-session-gap-browser-step258-smoke/);
assert.match(stepSmoke, /htf-manual-next-replay-gap-browser-step273-smoke/);
assert.doesNotMatch(app, /Step 382|COST_AUDIT_STEP382|Replay Gap Manual Path Timing Probe/);

console.log('v6 replay gap regression pack cost audit closeout step382 static smoke passed');
