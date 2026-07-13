import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [todo, handoff, index, step394] = await Promise.all([
  readFile('v6/TODO.md', 'utf8'),
  readFile('v6/docs/V6_HANDOFF.md', 'utf8'),
  readFile('v6/docs/INDEX.md', 'utf8'),
  readFile('v6/docs/V6_HISTORICAL_STATIC_TEST_AUDIT_STEP394.md', 'utf8'),
]);

assert.match(todo, /Latest completed test-architecture step: Step 394/);
assert.match(todo, /Next recommended step: Step 395/);
assert.match(handoff, /Latest completed step: Step 394/);
assert.match(index, /V6_HISTORICAL_STATIC_TEST_AUDIT_STEP394\.md/);
assert.match(step394, /Step 395 should modularize/);

console.log('v6 current project state step394 static smoke passed');
