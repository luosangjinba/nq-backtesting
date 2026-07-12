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
const replayCoordinationSmoke = await readFile(
  'v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
  'utf8',
);
const readoutProducerFlowSmoke = await readFile(
  'v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js',
  'utf8',
);
const step338Doc = await readFile('v6/docs/V6_TARGET_TIMEFRAME_MATERIALIZATION_NEXT_SLICE_SELECTION_STEP338.md', 'utf8');

const full = selectTargetHistoryPackTests();
assert.equal(full.group, 'all');
assert.equal(full.selectedCount, 8);
assert.equal(full.totalCount, 8);
assert.equal(full.selectedIds.includes('replay-coordination'), false);

const replayCoordination = selectTargetHistoryPackTests({
  members: 'replay-coordination',
});
assert.equal(replayCoordination.group, 'members');
assert.equal(replayCoordination.selectedCount, 1);
assert.equal(replayCoordination.totalCount, 8);
assert.deepEqual(replayCoordination.selectedIds, ['replay-coordination']);
assert.deepEqual(replayCoordination.scripts, [
  'v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
]);

const replayCoordinationFromEnv = createTargetHistoryPackPlanFromEnv({
  TARGET_HISTORY_PACK_MEMBERS: 'replay-coordination',
});
assert.deepEqual(replayCoordinationFromEnv.selectedIds, ['replay-coordination']);

const fallbackGroup = selectTargetHistoryPackTests({ group: 'fallback' });
assert.deepEqual(fallbackGroup.selectedIds, [
  'fixed-fallback-readout',
  'daily-fallback',
  'weekly-fallback',
  'monthly-fallback',
]);

const sessionAwareGroup = selectTargetHistoryPackTests({ group: 'session-aware' });
assert.deepEqual(sessionAwareGroup.selectedIds, [
  'daily-sizing',
  'daily-fallback',
  'weekly-sizing',
  'weekly-fallback',
  'monthly-sizing',
  'monthly-fallback',
]);

assert.equal(TARGET_HISTORY_PACK_TESTS.length, 8);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS.length, 2);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[0].id, 'replay-coordination');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[0].tags.includes('replay-coordination'), true);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[0].tags.includes('materialization'), true);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[1].id, 'readout-producer-flow');
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[1].tags.includes('producer-flow'), true);

assert.match(helper, /TARGET_HISTORY_PACK_OPTIONAL_TESTS/);
assert.match(helper, /replay-coordination/);
assert.match(helper, /display-timeframe-target-materialization-replay-coordination-browser-step337-smoke/);
assert.match(helper, /readout-producer-flow/);
assert.match(helper, /target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke/);
assert.match(helper, /TARGET_HISTORY_PACK_MEMBERS/);
assert.match(pack, /createTargetHistoryPackPlanFromEnv/);
assert.match(pack, /plan\.scripts/);
assert.match(replayCoordinationSmoke, /CHART_ENTRY_MANUAL_NEXT_COMMANDS\.NEXT/);
assert.match(replayCoordinationSmoke, /CHART_ENTRY_AUTO_PLAY_COMMANDS\.GET_STATE/);
assert.match(replayCoordinationSmoke, /target-history-no-visible-bars/);
assert.doesNotMatch(readoutProducerFlowSmoke, /UPDATE_SNAPSHOT/);
assert.match(readoutProducerFlowSmoke, /CHART_ENTRY_AUTO_PLAY_COMMANDS\.START/);
assert.match(step338Doc, /target-history-pack-replay-coordination-member/);
assert.match(step338Doc, /TARGET_HISTORY_PACK_MEMBERS/);

console.log('v6 target history pack replay coordination member step339 static smoke passed');
