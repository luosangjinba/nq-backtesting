import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readNormalized = async (path) => (
  await readFile(path, 'utf8')
).replaceAll(/\s+/g, ' ');

const plan = await readNormalized(
  'v6/docs/V6_FIRST_VALIDATION_VERTICAL_SLICE_PLAN_STEP461.md',
);
const roadmap = await readNormalized('v6/docs/V6_EXECUTION_ROADMAP.md');
const index = await readNormalized('v6/docs/INDEX.md');
const todo = await readNormalized('v6/TODO.md');
const session = await readNormalized(
  'v6/sessions/2026-07-15-step461-product-foundation-reaudit.md',
);

for (const required of [
  'playbook version -> campaign -> blind trial -> generic observation + trade plan -> outcome/R -> result drillback',
  'Step 462 — Restore Replay/History Latency Gate',
  'Step 463 — Validation Domain Spine',
  'no production UI is added',
  'Step 470 is the next authorized target',
]) {
  assert.equal(plan.includes(required), true, required);
}

assert.equal(roadmap.includes('Post-Stabilization Product Selection — Step 461'), true);
assert.equal(index.includes('V6_FIRST_VALIDATION_VERTICAL_SLICE_PLAN_STEP461.md'), true);
assert.equal(todo.includes('## Next Gate — ETH/RTH Phase A'), true);
assert.equal(session.includes('219.2 ms and 188.3 ms'), true);
assert.equal(session.includes('canonical named suite: 13/14 passed'), true);
assert.equal(session.includes('No production source or product UI changed'), true);

console.log('v6 step461 product foundation closeout smoke passed');
