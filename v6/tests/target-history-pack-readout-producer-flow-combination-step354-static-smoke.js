import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  TARGET_HISTORY_PACK_OPTIONAL_TESTS,
  TARGET_HISTORY_PACK_TESTS,
  createTargetHistoryPackPlanFromEnv,
  selectTargetHistoryPackTests,
} from './helpers/target-history-pack-cost-control.js';

const helper = await readFile('v6/tests/helpers/target-history-pack-cost-control.js', 'utf8');
const pack = await readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8');
const step337Smoke = await readFile(
  'v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
  'utf8',
);
const step352Smoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
  'utf8',
);
const step353Doc = await readFile(
  'v6/docs/V6_TARGET_HISTORY_PACK_READOUT_PRODUCER_FLOW_MEMBER_STEP353.md',
  'utf8',
);

const full = selectTargetHistoryPackTests();
assert.equal(full.group, 'all');
assert.equal(full.selectedCount, 8);
assert.equal(full.totalCount, 8);
assert.deepEqual(full.selectedIds, [
  'fixed-success-readout',
  'fixed-fallback-readout',
  'daily-sizing',
  'daily-fallback',
  'weekly-sizing',
  'weekly-fallback',
  'monthly-sizing',
  'monthly-fallback',
]);
assert.equal(full.selectedIds.includes('replay-coordination'), false);
assert.equal(full.selectedIds.includes('readout-producer-flow'), false);

const combination = selectTargetHistoryPackTests({
  members: 'replay-coordination,readout-producer-flow',
});
assert.equal(combination.group, 'members');
assert.equal(combination.selectedCount, 2);
assert.equal(combination.totalCount, 8);
assert.deepEqual(combination.selectedIds, ['replay-coordination', 'readout-producer-flow']);
assert.deepEqual(combination.scripts, [
  'v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
  'v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
]);

const reversedCombination = selectTargetHistoryPackTests({
  members: 'readout-producer-flow,replay-coordination',
});
assert.deepEqual(reversedCombination.selectedIds, ['readout-producer-flow', 'replay-coordination']);

const combinationFromEnv = createTargetHistoryPackPlanFromEnv({
  TARGET_HISTORY_PACK_MEMBERS: 'replay-coordination,readout-producer-flow',
});
assert.deepEqual(combinationFromEnv.selectedIds, combination.selectedIds);
assert.deepEqual(combinationFromEnv.scripts, combination.scripts);

const replayCoordination = selectTargetHistoryPackTests({ members: 'replay-coordination' });
assert.deepEqual(replayCoordination.selectedIds, ['replay-coordination']);
const readoutProducerFlow = selectTargetHistoryPackTests({ members: 'readout-producer-flow' });
assert.deepEqual(readoutProducerFlow.selectedIds, ['readout-producer-flow']);

assert.equal(TARGET_HISTORY_PACK_TESTS.length, 8);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS.length, 2);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[0].id, 'replay-coordination');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[1].id, 'readout-producer-flow');

assert.match(helper, /TARGET_HISTORY_PACK_OPTIONAL_TESTS/);
assert.match(helper, /replay-coordination/);
assert.match(helper, /readout-producer-flow/);
assert.match(pack, /for \(const script of TESTS\)/);
assert.match(pack, /\[target-history-readout-pack\] start/);
assert.match(step337Smoke, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.match(step337Smoke, /CHART_ENTRY_AUTO_PLAY_COMMANDS\.GET_STATE/);
assert.match(step352Smoke, /CHART_ENTRY_AUTO_PLAY_COMMANDS\.START/);
assert.doesNotMatch(step352Smoke, /UPDATE_SNAPSHOT/);
assert.match(step353Doc, /TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow/);

console.log('v6 target history pack readout producer flow combination step354 static smoke passed');
