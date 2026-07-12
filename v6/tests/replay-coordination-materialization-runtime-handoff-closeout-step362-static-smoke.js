import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_UNWIRED_RUNTIME_SKELETON_STEP362.md',
  'utf8',
);
const skeletonSource = await readFile(
  'v6/src/replay/replay-coordination-materialization-runtime-handoff.js',
  'utf8',
);
const smoke = await readFile(
  'v6/tests/replay-coordination-materialization-runtime-handoff-step362-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/replay-coordination-materialization-runtime-handoff-boundary-step362-static-smoke.js',
  'utf8',
);

assert.match(index, /V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_UNWIRED_RUNTIME_SKELETON_STEP362\.md/);
assert.match(index, /unwired runtime skeleton/);
assert.match(index, /app\s+registration readiness audit as the next slice/);

assert.match(todo, /Latest completed narrow replay materialization handoff unwired skeleton step:\s+Step 362/);
assert.match(todo, /### Step 363 - Narrow Replay Materialization Runtime Handoff App Registration Readiness Audit/);
assert.match(todo, /### Step 362 - Narrow Replay Materialization Runtime Handoff Unwired Runtime Skeleton/);
assert.match(todo, /Did not add runtime to `v6\/src\/app\.js`/);
assert.match(todo, /Did not import real runtime command\/event bus helpers/);

assert.match(handoff, /Worktree at handoff: clean after Step 362 closeout/);
assert.match(handoff, /Latest completed step: Step 362 - Narrow Replay Materialization Runtime\s+Handoff Unwired Runtime Skeleton/);
assert.match(handoff, /Step 362 added the unwired runtime skeleton/);
assert.match(handoff, /start with Step 363/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /createReplayCoordinationMaterializationRuntimeHandoff\(dependencies\)/);
assert.match(doc, /not registered in `v6\/src\/app\.js`/);
assert.match(doc, /collectReplayCoordinationMaterializationRuntimeHandoffCommandResults/);
assert.match(doc, /buildReplayCoordinationMaterializationRuntimeHandoffResult/);
assert.match(doc, /subscribeEvent/);
assert.match(doc, /dispatchCommand/);
assert.match(doc, /pane\.getById/);
assert.match(doc, /chartData\.replaceBars/);
assert.match(doc, /Step 363 should perform an app-registration readiness audit/);

for (const requiredSkeletonTerm of [
  'createReplayCoordinationMaterializationRuntimeHandoff',
  'collectReplayCoordinationMaterializationRuntimeHandoffCommandResults',
  'buildReplayCoordinationMaterializationRuntimeHandoffResult',
  'runtime.replay-coordination-materialization-handoff',
  'executeNarrowReplayMaterializationRuntimeHandoffPlan',
  'CHART_ENTRY_MANUAL_NEXT_EVENTS.ADVANCED',
  'PANE_COMMANDS.GET_BY_ID',
  'REPLAY_COMMANDS.GET_STATE',
  'CHART_DATA_COMMANDS.GET_SOURCE_BARS',
  'BAR_DATA_COMMANDS.PLAN_TARGET_WINDOW',
  'BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW',
  'CHART_DATA_COMMANDS.REPLACE_BARS',
]) {
  assert.match(skeletonSource, new RegExp(requiredSkeletonTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

for (const forbiddenSkeletonTerm of [
  "from '../runtime/commands.js'",
  "from '../runtime/events.js'",
  'registerCommand(',
  'emitEvent(',
  'fetch(',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(skeletonSource.includes(forbiddenSkeletonTerm), false, `Step362 skeleton must stay unwired: ${forbiddenSkeletonTerm}`);
}

for (const requiredSmokeTerm of [
  "runtime.id, 'runtime.replay-coordination-materialization-handoff'",
  "subscribedEvent, 'chartEntryManualNext:advanced'",
  "cleanupCount, 1",
]) {
  assert.match(smoke, new RegExp(requiredSmokeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(boundarySmoke, /doesNotMatch\(appSource, \/createReplayCoordinationMaterializationRuntimeHandoff\//);
assert.match(boundarySmoke, /doesNotMatch\(replayRuntime, \/PLAN_TARGET_WINDOW\|LOAD_TARGET_WINDOW\|REPLACE_BARS\//);

console.log('v6 replay coordination materialization runtime handoff closeout step362 static smoke passed');
