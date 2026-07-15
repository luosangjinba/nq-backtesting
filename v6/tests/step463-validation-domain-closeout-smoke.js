import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readNormalized = async (path) => (
  await readFile(path, 'utf8')
).replaceAll(/\s+/g, ' ');

const decision = await readNormalized(
  'v6/docs/V6_VALIDATION_DOMAIN_SPINE_STEP463.md',
);
const plan = await readNormalized(
  'v6/docs/V6_FIRST_VALIDATION_VERTICAL_SLICE_PLAN_STEP461.md',
);
const todo = await readNormalized('v6/TODO.md');
const session = await readNormalized(
  'v6/sessions/2026-07-15-step463-validation-domain-spine.md',
);

for (const required of [
  'Status: complete',
  'native IndexedDB',
  'repository-owned referential and immutability checks',
  'exhaustive offline Node suite: 391/391 passed',
  'must not add observation, trade-plan, outcome, Analytics, Semantic Drawing, or mode-shell behavior',
]) {
  assert.equal(decision.includes(required), true, required);
}

assert.equal(plan.includes('Step 466 is now the next authorized target'), true);
assert.equal(todo.includes('## Next Step — 466'), true);
assert.equal(decision.includes('Step 464 may consume this repository'), true);
assert.equal(session.includes('No production UI, Replay coordination'), true);
assert.equal(session.includes('Step 464 may add only the Blind Trial Coordinator'), true);

console.log('v6 step463 validation domain closeout smoke passed');
