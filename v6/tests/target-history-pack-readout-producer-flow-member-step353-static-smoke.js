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
const step352Smoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
  'utf8',
);
const step352Doc = await readFile(
  'v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_PRODUCER_FLOW_STEP352.md',
  'utf8',
);

const full = selectTargetHistoryPackTests();
assert.equal(full.group, 'all');
assert.equal(full.selectedCount, 8);
assert.equal(full.totalCount, 8);
assert.equal(full.selectedIds.includes('readout-producer-flow'), false);
assert.equal(full.selectedIds.includes('replay-coordination'), false);

const readoutProducerFlow = selectTargetHistoryPackTests({
  members: 'readout-producer-flow',
});
assert.equal(readoutProducerFlow.group, 'members');
assert.equal(readoutProducerFlow.selectedCount, 1);
assert.equal(readoutProducerFlow.totalCount, 8);
assert.deepEqual(readoutProducerFlow.selectedIds, ['readout-producer-flow']);
assert.deepEqual(readoutProducerFlow.scripts, [
  'v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
]);

const readoutProducerFlowFromEnv = createTargetHistoryPackPlanFromEnv({
  TARGET_HISTORY_PACK_MEMBERS: 'readout-producer-flow',
});
assert.deepEqual(readoutProducerFlowFromEnv.selectedIds, ['readout-producer-flow']);
assert.deepEqual(readoutProducerFlowFromEnv.scripts, readoutProducerFlow.scripts);

const existingReplayCoordination = selectTargetHistoryPackTests({
  members: 'replay-coordination',
});
assert.deepEqual(existingReplayCoordination.selectedIds, ['replay-coordination']);
assert.deepEqual(existingReplayCoordination.scripts, [
  'v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
]);

const combinedMembers = selectTargetHistoryPackTests({
  members: 'replay-coordination,readout-producer-flow',
});
assert.deepEqual(combinedMembers.selectedIds, ['replay-coordination', 'readout-producer-flow']);

assert.equal(TARGET_HISTORY_PACK_TESTS.length, 8);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS.length, 4);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[0].id, 'replay-coordination');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[1].id, 'readout-producer-flow');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[1].tags.includes('producer-flow'), true);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[1].tags.includes('readout'), true);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[1].tags.includes('materialization'), true);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[2].id, 'handoff-registration');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[3].id, 'reduced-delay-budget');

assert.match(helper, /readout-producer-flow/);
assert.match(helper, /target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke/);
assert.match(helper, /replay-coordination/);
assert.match(helper, /handoff-registration/);
assert.match(pack, /createTargetHistoryPackPlanFromEnv/);
assert.match(pack, /plan\.scripts/);
assert.match(step352Doc, /optional focused member/);
assert.match(step352Smoke, /DISPLAY_TIMEFRAME_COMMANDS\.APPLY/);
assert.match(step352Smoke, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.match(step352Smoke, /CHART_ENTRY_AUTO_PLAY_COMMANDS\.START/);
assert.doesNotMatch(step352Smoke, /UPDATE_SNAPSHOT/);

console.log('v6 target history pack readout producer flow member step353 static smoke passed');
