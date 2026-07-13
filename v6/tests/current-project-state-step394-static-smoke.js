import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [todo, handoff, index, step396] = await Promise.all([
  readFile('v6/TODO.md', 'utf8'),
  readFile('v6/docs/V6_HANDOFF.md', 'utf8'),
  readFile('v6/docs/INDEX.md', 'utf8'),
  readFile('v6/docs/V6_REPLAY_TRANSPORT_PERIOD_MENU_MODULARIZATION_STEP396.md', 'utf8'),
]);

assert.match(todo, /Latest completed shell modularization step: Step 396/);
assert.match(todo, /Next recommended step: Step 397/);
assert.match(handoff, /Latest completed step: Step 396/);
assert.match(index, /V6_REPLAY_TRANSPORT_PERIOD_MENU_MODULARIZATION_STEP396\.md/);
assert.match(step396, /Step 397 should extract/);

console.log('v6 current project state step394 static smoke passed');
