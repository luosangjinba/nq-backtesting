import assert from 'node:assert/strict';
import {
  TARGET_HISTORY_PACK_OPTIONAL_TESTS,
  TARGET_HISTORY_PACK_TESTS,
  selectTargetHistoryPackTests,
} from './helpers/target-history-pack-cost-control.js';

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

const fallback = selectTargetHistoryPackTests({ group: 'fallback' });
assert.equal(fallback.selectedCount, 4);
assert.deepEqual(fallback.selectedIds, [
  'fixed-fallback-readout',
  'daily-fallback',
  'weekly-fallback',
  'monthly-fallback',
]);

const sessionAware = selectTargetHistoryPackTests({ group: 'session-aware' });
assert.equal(sessionAware.selectedCount, 6);
assert.deepEqual(sessionAware.selectedIds, [
  'daily-sizing',
  'daily-fallback',
  'weekly-sizing',
  'weekly-fallback',
  'monthly-sizing',
  'monthly-fallback',
]);

const sizing = selectTargetHistoryPackTests({ group: 'sizing' });
assert.equal(sizing.selectedCount, 3);
assert.deepEqual(sizing.selectedIds, [
  'daily-sizing',
  'weekly-sizing',
  'monthly-sizing',
]);

const targeted = selectTargetHistoryPackTests({
  members: 'weekly-sizing,monthly-fallback',
});
assert.equal(targeted.group, 'members');
assert.deepEqual(targeted.scripts, [
  'v6/tests/weekly-target-history-request-sizing-browser-step303-smoke.js',
  'v6/tests/monthly-target-history-fallback-browser-step307-smoke.js',
]);

const replayCoordination = selectTargetHistoryPackTests({
  members: 'replay-coordination',
});
assert.equal(replayCoordination.group, 'members');
assert.equal(replayCoordination.selectedCount, 1);
assert.deepEqual(replayCoordination.selectedIds, ['replay-coordination']);
assert.deepEqual(replayCoordination.scripts, [
  'v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js',
]);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS.length, 1);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS[0].id, 'replay-coordination');
assert.equal(full.selectedCount, 8);

assert.throws(() => selectTargetHistoryPackTests({ group: 'unknown' }), /Unknown target-history pack group/);
assert.throws(() => selectTargetHistoryPackTests({ members: 'unknown-member' }), /Unknown target-history pack member/);
assert.equal(TARGET_HISTORY_PACK_TESTS.every((test) => test.script.startsWith('v6/tests/')), true);
assert.equal(TARGET_HISTORY_PACK_OPTIONAL_TESTS.every((test) => test.script.startsWith('v6/tests/')), true);

console.log('v6 target history pack cost control step309 smoke passed');
