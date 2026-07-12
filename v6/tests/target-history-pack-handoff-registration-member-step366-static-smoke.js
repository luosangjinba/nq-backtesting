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
const step365Smoke = await readFile(
  'v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js',
  'utf8',
);
const step365Doc = await readFile(
  'v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_RUNTIME_HANDOFF_APP_REGISTRATION_STEP365.md',
  'utf8',
);

const full = selectTargetHistoryPackTests();
assert.equal(full.group, 'all');
assert.equal(full.selectedCount, 8);
assert.equal(full.totalCount, 8);
assert.equal(full.selectedIds.includes('handoff-registration'), false);
assert.equal(full.selectedIds.includes('replay-coordination'), false);
assert.equal(full.selectedIds.includes('readout-producer-flow'), false);

const handoffRegistration = selectTargetHistoryPackTests({
  members: 'handoff-registration',
});
assert.equal(handoffRegistration.group, 'members');
assert.equal(handoffRegistration.selectedCount, 1);
assert.equal(handoffRegistration.totalCount, 8);
assert.deepEqual(handoffRegistration.selectedIds, ['handoff-registration']);
assert.deepEqual(handoffRegistration.scripts, [
  'v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js',
]);

const handoffRegistrationFromEnv = createTargetHistoryPackPlanFromEnv({
  TARGET_HISTORY_PACK_MEMBERS: 'handoff-registration',
});
assert.deepEqual(handoffRegistrationFromEnv.selectedIds, ['handoff-registration']);
assert.deepEqual(handoffRegistrationFromEnv.scripts, handoffRegistration.scripts);

const combinedMembers = selectTargetHistoryPackTests({
  members: 'replay-coordination,readout-producer-flow,handoff-registration',
});
assert.deepEqual(combinedMembers.selectedIds, [
  'replay-coordination',
  'readout-producer-flow',
  'handoff-registration',
]);
assert.deepEqual(combinedMembers.scripts, [
  'v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
  'v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
  'v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js',
]);

assert.equal(TARGET_HISTORY_PACK_TESTS.length, 8);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS.length, 3);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[0].id, 'replay-coordination');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[1].id, 'readout-producer-flow');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[2].id, 'handoff-registration');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[2].tags.includes('app-registration'), true);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[2].tags.includes('handoff-registration'), true);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[2].tags.includes('materialization'), true);

assert.match(helper, /handoff-registration/);
assert.match(helper, /replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke/);
assert.match(pack, /createTargetHistoryPackPlanFromEnv/);
assert.match(pack, /plan\.scripts/);
assert.match(step365Doc, /optional target-history diagnostics regression pack member/);
assert.match(step365Smoke, /runtime\.replay-coordination-materialization-handoff/);
assert.match(step365Smoke, /registrySnapshot\.started\.includes\(RUNTIME_ID\)/);
assert.match(step365Smoke, /afterManualNext\.latestSourceTimestamp/);
assert.match(step365Smoke, /entry\.kind === 'target' && entry\.tf === '8h'/);
assert.doesNotMatch(step365Smoke, /UPDATE_SNAPSHOT/);

console.log('v6 target history pack handoff registration member step366 static smoke passed');
