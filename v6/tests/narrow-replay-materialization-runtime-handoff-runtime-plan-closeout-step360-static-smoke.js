import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_RUNTIME_PLAN_STEP360.md',
  'utf8',
);
const runtimePlanSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-runtime-plan.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-step360-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-boundary-step360-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_RUNTIME_PLAN_STEP360\.md/);
assert.match(index, /plan-only future runtime implementation shape/);
assert.match(index, /runtime\s+contract as the next slice/);

assert.match(todo, /Latest completed narrow replay materialization handoff runtime plan step:\s+Step 360/);
assert.match(todo, /### Step 360 - Narrow Replay Materialization Runtime Handoff Runtime Plan/);
assert.match(todo, /Defined future lifecycle: create helper, subscribe on start/);
assert.match(todo, /Did not add runtime to `v6\/src\/app\.js`/);

assert.match(handoff, /Step 360 added the plan-only future runtime implementation plan/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /runtime\.replay-coordination-materialization-handoff/);
assert.match(doc, /replay-coordination-materialization-runtime-handoff/);
assert.match(doc, /chartEntryManualNext:advanced/);
assert.match(doc, /executeNarrowReplayMaterializationRuntimeHandoffPlan/);
assert.match(doc, /pane\.getById/);
assert.match(doc, /replay\.getState/);
assert.match(doc, /chartData\.getSourceBars/);
assert.match(doc, /barData\.planTargetWindow/);
assert.match(doc, /barData\.loadTargetWindow/);
assert.match(doc, /chartData\.replaceBars/);
assert.match(doc, /disable runtime registration/);
assert.match(doc, /no app registration/);
assert.match(doc, /Step 361 should define a runtime contract/);

for (const requiredPlanTerm of [
  'narrow-replay-materialization-runtime-handoff-runtime-plan',
  'runtime.replay-coordination-materialization-handoff',
  'executeNarrowReplayMaterializationRuntimeHandoffPlan',
  'createNarrowReplayMaterializationRuntimeHandoffWiringReadinessAudit',
  'CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED',
  'create-runtime-helper',
  'start-subscribe-manual-next',
  'handle-event-dispatch-wrapper',
  'invoke-pure-executor',
  'stop-cleanup-subscription',
  'disable-runtime-registration',
  'skip-manual-next-advanced-subscription',
  'disable-dispatch-wrapper',
  'executor-fallback-preserves-current-display',
  "runtimeBehaviorChanges: false",
  "runtimeWiringReady: false",
  'narrow-replay-materialization-runtime-handoff-runtime-contract',
]) {
  assert.match(runtimePlanSource, new RegExp(requiredPlanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenPlanTerm of [
  'dispatchCommand(',
  'registerCommand(',
  'subscribeEvent(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(runtimePlanSource.includes(forbiddenPlanTerm), false, `Step360 runtime plan must stay pure: ${forbiddenPlanTerm}`);
}

for (const requiredSmokeTerm of [
  "selectedNextStep, 'narrow-replay-materialization-runtime-handoff-runtime-contract'",
  "executorFunction, 'executeNarrowReplayMaterializationRuntimeHandoffPlan'",
  "runtimeWiringReady, false",
  "appRegistrationDeferred, true",
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(boundarySmoke, /doesNotMatch\(appSource, \/createReplayCoordinationMaterializationRuntimeHandoff\//);
assert.match(boundarySmoke, /doesNotMatch\(replayRuntime, \/PLAN_TARGET_WINDOW\|LOAD_TARGET_WINDOW\|REPLACE_BARS\//);

console.log('v6 narrow replay materialization runtime handoff runtime plan closeout step360 static smoke passed');
