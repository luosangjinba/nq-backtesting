import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile('v6/src/validation-observation/observation-evidence-runtime.js', 'utf8');
for (const forbidden of ["../replay/replay-runtime", "../chart-engine/", "../bar-data/", "lightweight-charts"]) {
  assert.equal(runtime.includes(forbidden), false, forbidden);
}
assert.equal(runtime.includes('REPLAY_COMMANDS.GET_STATE'), true);
assert.equal(runtime.includes('PANE_COMMANDS.GET_ACTIVE'), true);
assert.equal(runtime.includes('REPLAY_COMMANDS.NEXT'), false);
console.log('v6 observation evidence boundary step465 static smoke passed');
