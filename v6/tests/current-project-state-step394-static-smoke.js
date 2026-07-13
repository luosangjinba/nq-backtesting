import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [todo, handoff, index, step397] = await Promise.all([
  readFile('v6/TODO.md', 'utf8'),
  readFile('v6/docs/V6_HANDOFF.md', 'utf8'),
  readFile('v6/docs/INDEX.md', 'utf8'),
  readFile('v6/docs/V6_REPLAY_TRANSPORT_PRESENTATION_MODULARIZATION_STEP397.md', 'utf8'),
]);

assert.match(todo, /Latest completed shell modularization step: Step 397/);
assert.match(todo, /Next recommended step: Step 398/);
assert.match(handoff, /Latest completed step: Step 397/);
assert.match(index, /V6_REPLAY_TRANSPORT_PRESENTATION_MODULARIZATION_STEP397\.md/);
assert.match(step397, /Step 398 should return/);

console.log('v6 current project state step394 static smoke passed');
