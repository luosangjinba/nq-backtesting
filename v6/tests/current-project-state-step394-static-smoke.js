import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [todo, handoff, index, step398] = await Promise.all([
  readFile('v6/TODO.md', 'utf8'),
  readFile('v6/docs/V6_HANDOFF.md', 'utf8'),
  readFile('v6/docs/INDEX.md', 'utf8'),
  readFile('v6/docs/V6_ACTIVE_PANE_DATE_LOCATOR_SELECTION_STEP398.md', 'utf8'),
]);

assert.match(todo, /Latest completed foundation selection step: Step 398/);
assert.match(todo, /Next step: Step 399/);
assert.match(handoff, /Latest completed step: Step 398/);
assert.match(index, /V6_ACTIVE_PANE_DATE_LOCATOR_SELECTION_STEP398\.md/);
assert.match(step398, /Step 399 - Active-Pane Loaded-Window Date Locator/);

console.log('v6 current project state step394 static smoke passed');
