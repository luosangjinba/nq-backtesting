import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readNormalized = async (path) => (
  await readFile(path, 'utf8')
).replaceAll(/\s+/g, ' ');

const decision = await readNormalized('v6/docs/V6_BLIND_TRIAL_COORDINATOR_STEP464.md');
const plan = await readNormalized('v6/docs/V6_FIRST_VALIDATION_VERTICAL_SLICE_PLAN_STEP461.md');
const todo = await readNormalized('v6/TODO.md');
const session = await readNormalized('v6/sessions/2026-07-15-step464-blind-trial-coordinator.md');

for (const required of [
  'Status: complete',
  'Replay remains the only owner of session, cursor, reveal, and playback state',
  'visibleThroughTime === cursorTime',
  'current Replay cursor precedes the stored start visible-through boundary',
  'exhaustive offline Node suite: 398/398 passed',
]) {
  assert.equal(decision.includes(required), true, required);
}

assert.equal(plan.includes('Step 469 is now the next authorized target'), true);
assert.equal(todo.includes('## Next Gate — Step 469 Human Acceptance'), true);
assert.equal(session.includes('It never rewrites start provenance or navigates Replay'), true);
assert.equal(session.includes('Step 465 may add one generic prospective observation'), true);

console.log('v6 step464 blind trial coordinator closeout smoke passed');
