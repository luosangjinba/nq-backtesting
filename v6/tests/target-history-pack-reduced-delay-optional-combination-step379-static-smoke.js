import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  TARGET_HISTORY_PACK_TESTS,
  selectTargetHistoryPackTests,
} from './helpers/target-history-pack-cost-control.js';

const helper = await readFile('v6/tests/helpers/target-history-pack-cost-control.js', 'utf8');
const packRunner = await readFile(
  'v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js',
  'utf8',
);

const defaultPlan = selectTargetHistoryPackTests();
assert.equal(defaultPlan.selectedCount, 8);
assert.equal(defaultPlan.totalCount, 8);
assert.deepEqual(defaultPlan.selectedIds, TARGET_HISTORY_PACK_TESTS.map((test) => test.id));
assert.equal(defaultPlan.selectedIds.includes('reduced-delay-budget'), false);

const combined = selectTargetHistoryPackTests({
  members: 'replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget',
});
assert.equal(combined.group, 'members');
assert.equal(combined.selectedCount, 4);
assert.equal(combined.totalCount, 8);
assert.deepEqual(combined.selectedIds, [
  'replay-coordination',
  'readout-producer-flow',
  'handoff-registration',
  'reduced-delay-budget',
]);
assert.deepEqual(combined.scripts, [
  'v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
  'v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
  'v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js',
  'v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js',
]);

assert.match(helper, /replay-coordination/);
assert.match(helper, /readout-producer-flow/);
assert.match(helper, /handoff-registration/);
assert.match(helper, /reduced-delay-budget/);
assert.match(packRunner, /plan\.selectedIds\.join\(','\)/);

console.log('v6 target-history pack reduced delay optional combination step379 static smoke passed');
