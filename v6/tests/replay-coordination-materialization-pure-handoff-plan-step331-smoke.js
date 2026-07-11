import assert from 'node:assert/strict';
import {
  createReplayCoordinationMaterializationHandoffIntent,
  createReplayCoordinationMaterializationPureHandoffPlan,
  getReplayCoordinationMaterializationForbiddenSurfaces,
  getReplayCoordinationMaterializationHandoffOwnerSurfaces,
  getReplayCoordinationMaterializationHandoffPlanId,
  validateReplayCoordinationMaterializationPureHandoffPlan,
} from '../src/replay/replay-coordination-materialization-pure-handoff-plan.js';

assert.equal(getReplayCoordinationMaterializationHandoffPlanId(), 'replay-coordination-materialization-pure-handoff-plan');

assert.deepEqual(createReplayCoordinationMaterializationHandoffIntent(), {
  displayTimeframe: '8h',
  instrument: 'NQ',
  paneId: 'main',
  replayCursorTimestamp: null,
  targetHistoryEnd: null,
  targetHistoryStart: null,
});

const customIntent = createReplayCoordinationMaterializationHandoffIntent({
  displayTimeframe: '1D',
  instrument: 'nq',
  paneId: 'secondary',
  replayCursorTimestamp: 1780300800,
  targetHistoryEnd: '2026-06-02 16:00',
  targetHistoryStart: '2026-06-01 18:00',
});
assert.deepEqual(customIntent, {
  displayTimeframe: '1D',
  instrument: 'NQ',
  paneId: 'secondary',
  replayCursorTimestamp: 1780300800,
  targetHistoryEnd: '2026-06-02 16:00',
  targetHistoryStart: '2026-06-01 18:00',
});
assert.equal(Object.isFrozen(customIntent), true);

const surfaces = getReplayCoordinationMaterializationHandoffOwnerSurfaces();
assert.deepEqual(surfaces.map((surface) => surface.id), [
  'display-materialization-intent',
  'target-window-plan',
  'target-window-load',
  'target-bar-reveal-state',
  'display-bars-apply',
  'source-bars-preservation-check',
  'viewport-reapply',
]);
assert.equal(surfaces.find((surface) => surface.id === 'target-window-plan').commandSurface, 'barData.planTargetWindow');
assert.equal(surfaces.find((surface) => surface.id === 'target-window-load').commandSurface, 'barData.loadTargetWindow');
assert.equal(surfaces.find((surface) => surface.id === 'display-bars-apply').commandSurface, 'chartData.replaceBars');
assert.equal(surfaces.find((surface) => surface.id === 'source-bars-preservation-check').commandSurface, 'chartData.getSourceBars');

assert.deepEqual(getReplayCoordinationMaterializationForbiddenSurfaces(), [
  'replay.setCursorTime',
  'replay.next',
  'replay.previous',
  'chartViewport.project',
  'chartEngine.setData',
  'chartEngine.setVisibleLogicalRange',
  'shell.dispatchTargetHistory',
]);

const plan = createReplayCoordinationMaterializationPureHandoffPlan(customIntent);
assert.equal(plan.id, 'replay-coordination-materialization-pure-handoff-plan');
assert.deepEqual(plan.intent, customIntent);
assert.equal(plan.runtimeWiringReady, false);
assert.equal(plan.sourceReplayCursorAuthority, true);
assert.equal(plan.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(plan.futureWiringPoint.id, 'display-timeframe-target-materialization-handoff');
assert.equal(plan.futureWiringPoint.owner, 'display-timeframe-runtime');
assert.deepEqual(plan.futureWiringPoint.preconditions, [
  'pure-handoff-plan-accepted',
  'target-window-plan-owner-surface-available',
  'target-window-load-owner-surface-available',
  'chart-data-replace-owner-surface-available',
  'source-1m-replay-cursor-available',
  'target-bar-reveal-policy-covered',
]);
assert.deepEqual(validateReplayCoordinationMaterializationPureHandoffPlan(plan), { errors: [], valid: true });

const invalid = validateReplayCoordinationMaterializationPureHandoffPlan({
  ...plan,
  forbiddenSurfaces: [],
  id: 'bad',
  ownerSurfaces: [],
  runtimeWiringReady: true,
  sourceReplayCursorAuthority: false,
  targetBarsDisplayMaterializationInputOnly: false,
});
assert.equal(invalid.valid, false);
assert.deepEqual(
  invalid.errors.map((error) => error.field),
  [
    'ownerSurfaces',
    'ownerSurfaces',
    'ownerSurfaces',
    'ownerSurfaces',
    'ownerSurfaces',
    'ownerSurfaces',
    'ownerSurfaces',
    'id',
    'runtimeWiringReady',
    'sourceReplayCursorAuthority',
    'targetBarsDisplayMaterializationInputOnly',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
  ],
);

console.log('v6 replay coordination materialization pure handoff plan step331 smoke passed');
