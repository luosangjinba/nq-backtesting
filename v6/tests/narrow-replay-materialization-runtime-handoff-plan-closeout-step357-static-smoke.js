import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_PLAN_STEP357.md',
  'utf8',
);
const planSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-plan.js',
  'utf8',
);
const planSmoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-plan-step357-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-plan-boundary-step357-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_PLAN_STEP357\.md/);
assert.match(index, /Manual Next advanced trigger/);
assert.match(index, /pure executor harness as the next slice/);

assert.match(todo, /Latest completed narrow replay materialization handoff plan step:\s+Step 357/);
assert.match(todo, /### Step 357 - Narrow Replay Materialization Runtime Handoff Plan/);
assert.match(todo, /Defined `chartEntryManualNext:advanced` as the future trigger/);
assert.match(todo, /Defined fallback gates before runtime wiring/);

assert.match(handoff, /Step 357 added the plan-only narrow replay materialization runtime handoff\s+helper/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /runtime\.replay-coordination-materialization-handoff/);
assert.match(doc, /replay-coordination-materialization-runtime-handoff/);
assert.match(doc, /chartEntryManualNext:advanced/);
assert.match(doc, /pane\.getById/);
assert.match(doc, /replay\.getState/);
assert.match(doc, /chartData\.getSourceBars/);
assert.match(doc, /barData\.planTargetWindow/);
assert.match(doc, /barData\.loadTargetWindow/);
assert.match(doc, /chartData\.replaceBars/);
assert.match(doc, /source `1m` display: do not request target bars/);
assert.match(doc, /no event subscription registration/);
assert.match(doc, /Step 358 should add a pure executor harness/);

for (const requiredPlanTerm of [
  'narrow-replay-materialization-runtime-handoff-plan',
  'runtime.replay-coordination-materialization-handoff',
  'replay-coordination-materialization-runtime-handoff',
  'CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED',
  'PANE_COMMANDS.GET_BY_ID',
  'REPLAY_COMMANDS.GET_STATE',
  'CHART_DATA_COMMANDS.GET_SOURCE_BARS',
  'BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW',
  'BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW',
  'CHART_DATA_COMMANDS.REPLACE_BARS',
  'runtimeBehaviorChanges: false',
  'runtimeWiringReady: false',
  "sourceReplayCursorAuthority: '1m'",
]) {
  assert.match(planSource, new RegExp(requiredPlanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenPlanTerm of [
  'dispatchCommand(',
  'registerCommand(',
  'subscribeEvent(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(planSource.includes(forbiddenPlanTerm), false, `Step357 plan must stay pure: ${forbiddenPlanTerm}`);
}

for (const requiredSmokeTerm of [
  "eventSurface, 'chartEntryManualNext:advanced'",
  "commandSurface, 'pane.getById'",
  "commandSurface, 'replay.getState'",
  "commandSurface, 'chartData.getSourceBars'",
  "commandSurface, 'barData.planTargetWindow'",
  "commandSurface, 'barData.loadTargetWindow'",
  "commandSurface, 'chartData.replaceBars'",
  "runtimeWiringReady, false",
]) {
  assert.match(planSmoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(boundarySmoke, /runtimeSource/);
assert.match(boundarySmoke, /doesNotMatch\(\s+runtimeSource,\s+\/narrow-replay-materialization-runtime-handoff-plan\|runtime\\\.replay-coordination-materialization-handoff\//);
assert.match(boundarySmoke, /doesNotMatch\(replayRuntime, \/PLAN_TARGET_WINDOW\|LOAD_TARGET_WINDOW\|REPLACE_BARS\//);

console.log('v6 narrow replay materialization runtime handoff plan closeout step357 static smoke passed');
