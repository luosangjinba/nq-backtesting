import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [todo, handoff, index, step393] = await Promise.all([
  readFile('v6/TODO.md', 'utf8'),
  readFile('v6/docs/V6_HANDOFF.md', 'utf8'),
  readFile('v6/docs/INDEX.md', 'utf8'),
  readFile('v6/docs/V6_PRODUCTION_COMPLEXITY_REDUCTION_STEP393.md', 'utf8'),
]);

assert.match(todo, /Latest completed architecture step: Step 393/);
assert.match(todo, /Next recommended step: Step 394/);
assert.match(handoff, /Latest completed step: Step 393/);
assert.match(index, /V6_PRODUCTION_COMPLEXITY_REDUCTION_STEP393\.md/);
assert.match(step393, /Step 394 should consolidate historical static closeout tests/);

console.log('v6 current project state step394 static smoke passed');
