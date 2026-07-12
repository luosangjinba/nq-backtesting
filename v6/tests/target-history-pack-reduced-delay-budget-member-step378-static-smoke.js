import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  TARGET_HISTORY_PACK_OPTIONAL_TESTS,
  TARGET_HISTORY_PACK_TESTS,
  selectTargetHistoryPackTests,
} from './helpers/target-history-pack-cost-control.js';

const helper = await readFile('v6/tests/helpers/target-history-pack-cost-control.js', 'utf8');
const packRunner = await readFile(
  'v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js',
  'utf8',
);
const budgetSmoke = await readFile(
  'v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js',
  'utf8',
);

const defaultPlan = selectTargetHistoryPackTests();
assert.equal(defaultPlan.selectedCount, 8);
assert.equal(defaultPlan.totalCount, 8);
assert.deepEqual(defaultPlan.selectedIds, TARGET_HISTORY_PACK_TESTS.map((test) => test.id));
assert.equal(defaultPlan.selectedIds.includes('reduced-delay-budget'), false);
assert.equal(defaultPlan.scripts.includes(
  'v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js',
), false);

const reducedDelayBudget = selectTargetHistoryPackTests({
  members: 'reduced-delay-budget',
});
assert.deepEqual(reducedDelayBudget.selectedIds, ['reduced-delay-budget']);
assert.deepEqual(reducedDelayBudget.scripts, [
  'v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js',
]);

const combined = selectTargetHistoryPackTests({
  members: 'replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget',
});
assert.deepEqual(combined.selectedIds, [
  'replay-coordination',
  'readout-producer-flow',
  'handoff-registration',
  'reduced-delay-budget',
]);

assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[0].id, 'replay-coordination');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[1].id, 'readout-producer-flow');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[2].id, 'handoff-registration');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[3].id, 'reduced-delay-budget');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[3].tags.includes('reduced-delay'), true);

assert.match(helper, /reduced-delay-budget/);
assert.match(helper, /high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke/);
assert.match(helper, /TARGET_HISTORY_PACK_MEMBERS/);
assert.match(packRunner, /createTargetHistoryPackPlanFromEnv/);
assert.match(budgetSmoke, /TARGET_FETCH_BUDGET_MS = 300/);

console.log('v6 target-history pack reduced delay budget member step378 static smoke passed');
