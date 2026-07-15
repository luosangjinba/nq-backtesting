import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readNormalized = async (path) => (
  await readFile(path, 'utf8')
).replaceAll(/\s+/g, ' ');

const decision = await readNormalized(
  'v6/docs/V6_REPLAY_HISTORY_LATENCY_REPAIR_STEP462.md',
);
const plan = await readNormalized(
  'v6/docs/V6_FIRST_VALIDATION_VERTICAL_SLICE_PLAN_STEP461.md',
);
const todo = await readNormalized('v6/TODO.md');
const session = await readNormalized(
  'v6/sessions/2026-07-15-step462-replay-history-latency-repair.md',
);

for (const required of [
  'source-bar advance: 77.6 ms',
  'cursor materialization/chart apply: 79.4 ms',
  'exactly the current one-bar window',
  'complete canonical suite then passed 14/14',
  'must not remove these diagnostics or weaken the 160 ms gate',
]) {
  assert.equal(decision.includes(required), true, required);
}

assert.equal(plan.includes('Step 470 is the next authorized target'), true);
assert.equal(todo.includes('## Next Gate — Step 470 Modularity Audit'), true);
assert.equal(decision.includes('Step 463 may begin the validation domain spine'), true);
assert.equal(session.includes('focused browser latency gate: 5/5'), true);

console.log('v6 step462 replay history latency closeout smoke passed');
