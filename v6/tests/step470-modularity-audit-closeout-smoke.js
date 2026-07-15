import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const normalize = async (path) => (await readFile(path, 'utf8')).replaceAll(/\s+/g, ' ');

const audit = await normalize('v6/docs/V6_MODULARITY_LARGE_FILE_AUDIT_STEP470.md');
const ethRth = await normalize('v6/docs/V6_ETH_RTH_SESSION_HOURS_PHASE_PLAN.md');
const index = await normalize('v6/docs/INDEX.md');
const todo = await normalize('v6/TODO.md');

for (const required of [
  'shared Replay pane materialization policy before Phase C',
  'leftward-history coordination split before Phase C/D',
  'top-toolbar template extraction before Phase E',
  'No broad cleanup phase is required before ETH/RTH Phase A',
  'ETH/RTH Phase A — Exchange Calendar And Replay Semantics',
]) {
  assert.equal(audit.includes(required), true, required);
}

assert.equal(ethRth.includes('This work follows the Step 470 modularity audit'), true);
assert.equal(index.includes('V6_MODULARITY_LARGE_FILE_AUDIT_STEP470.md'), true);
assert.equal(todo.includes('## Next Gate — ETH/RTH Phase A'), true);
assert.equal(todo.includes('Do not close the next product milestone while this gate remains open.'), true);

console.log('v6 step470 modularity audit closeout smoke passed');
