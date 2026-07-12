import assert from 'node:assert/strict';
import {
  createNarrowReplayMaterializationRuntimeHandoffPlan,
  getNarrowReplayMaterializationRuntimeHandoffCommandSequence,
  getNarrowReplayMaterializationRuntimeHandoffEventSequence,
  getNarrowReplayMaterializationRuntimeHandoffFallbackGates,
  getNarrowReplayMaterializationRuntimeHandoffForbiddenSurfaces,
  getNarrowReplayMaterializationRuntimeHandoffPlanId,
  validateNarrowReplayMaterializationRuntimeHandoffPlan,
} from '../src/replay/narrow-replay-materialization-runtime-handoff-plan.js';

assert.equal(
  getNarrowReplayMaterializationRuntimeHandoffPlanId(),
  'narrow-replay-materialization-runtime-handoff-plan',
);

const events = getNarrowReplayMaterializationRuntimeHandoffEventSequence();
assert.deepEqual(events.map((step) => step.id), ['manual-next-advanced-trigger']);
assert.equal(events[0].eventSurface, 'chartEntryManualNext:advanced');
assert.equal(events[0].owner, 'runtime.replay-coordination-materialization-handoff');

const commands = getNarrowReplayMaterializationRuntimeHandoffCommandSequence();
assert.deepEqual(commands.map((step) => step.id), [
  'resolve-pane-context',
  'read-replay-cursor',
  'read-source-bars',
  'plan-target-window',
  'load-target-window',
  'replace-display-bars',
]);
assert.equal(commands.find((step) => step.id === 'resolve-pane-context').commandSurface, 'pane.getById');
assert.equal(commands.find((step) => step.id === 'read-replay-cursor').commandSurface, 'replay.getState');
assert.equal(commands.find((step) => step.id === 'read-source-bars').commandSurface, 'chartData.getSourceBars');
assert.equal(commands.find((step) => step.id === 'plan-target-window').commandSurface, 'barData.planTargetWindow');
assert.equal(commands.find((step) => step.id === 'load-target-window').commandSurface, 'barData.loadTargetWindow');
assert.equal(commands.find((step) => step.id === 'replace-display-bars').commandSurface, 'chartData.replaceBars');
assert.deepEqual(commands.find((step) => step.id === 'replace-display-bars').options, {
  preserveSource: true,
  revealPolicy: 'source-cursor-no-future-target-bars',
});

assert.deepEqual(getNarrowReplayMaterializationRuntimeHandoffFallbackGates().map((gate) => gate.id), [
  'ignore-source-timeframe-display',
  'missing-pane-context',
  'missing-replay-cursor',
  'missing-source-bars',
  'target-window-plan-unavailable',
  'target-window-load-unavailable',
  'target-bars-all-future',
]);

assert.deepEqual(getNarrowReplayMaterializationRuntimeHandoffForbiddenSurfaces(), [
  'replay.next',
  'replay.previous',
  'replay.setCursorTime',
  'chartViewport.resetView',
  'chartViewport.setManualIntent',
  'chart-render-series-write',
  'chart-render-range-write',
  'shell.targetBarsApi',
  'targetMaterializationReplayDiagnostics.updateSnapshot',
]);

const plan = createNarrowReplayMaterializationRuntimeHandoffPlan();
assert.equal(plan.id, 'narrow-replay-materialization-runtime-handoff-plan');
assert.equal(plan.ownerBoundary, 'runtime.replay-coordination-materialization-handoff');
assert.equal(plan.ownerModule, 'replay-coordination-materialization-runtime-handoff');
assert.equal(plan.runtimeBehaviorChanges, false);
assert.equal(plan.runtimeWiringReady, false);
assert.equal(plan.sourceReplayCursorAuthority, '1m');
assert.equal(plan.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(plan.autoPlayCoverage.coveredBy, 'chartEntryManualNext:advanced');
assert.deepEqual(validateNarrowReplayMaterializationRuntimeHandoffPlan(plan), { errors: [], valid: true });

const invalid = validateNarrowReplayMaterializationRuntimeHandoffPlan({
  ...plan,
  commandSequence: [],
  eventSequence: [],
  fallbackGates: [],
  forbiddenSurfaces: [],
  id: 'bad',
  ownerBoundary: 'display-timeframe-runtime',
  ownerModule: 'display-timeframe-target-materialization-handoff',
  runtimeBehaviorChanges: true,
  runtimeWiringReady: true,
  sourceReplayCursorAuthority: '8h',
  targetBarsDisplayMaterializationInputOnly: false,
});
assert.equal(invalid.valid, false);
assert.deepEqual(
  invalid.errors.map((error) => error.field),
  [
    'id',
    'ownerBoundary',
    'ownerModule',
    'runtimeWiringReady',
    'sourceReplayCursorAuthority',
    'targetBarsDisplayMaterializationInputOnly',
    'eventSequence',
    'commandSequence',
    'commandSequence',
    'commandSequence',
    'commandSequence',
    'commandSequence',
    'commandSequence',
    'fallbackGates',
    'fallbackGates',
    'fallbackGates',
    'fallbackGates',
    'fallbackGates',
    'fallbackGates',
    'fallbackGates',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
    'forbiddenSurfaces',
  ],
);

console.log('v6 narrow replay materialization runtime handoff plan step357 smoke passed');
