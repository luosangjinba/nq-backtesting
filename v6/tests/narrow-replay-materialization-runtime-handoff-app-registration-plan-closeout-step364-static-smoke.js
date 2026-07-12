import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile(
  'v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_APP_REGISTRATION_PLAN_STEP364.md',
  'utf8',
);
const planSource = await readFile(
  'v6/src/replay/narrow-replay-materialization-runtime-handoff-app-registration-plan.js',
  'utf8',
);
const appSource = await readFile('v6/src/app.js', 'utf8');
const smoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-step364-smoke.js',
  'utf8',
);
const boundarySmoke = await readFile(
  'v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-boundary-step364-static-smoke.js',
  'utf8',
);

assert.match(
  index,
  /V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_APP_REGISTRATION_PLAN_STEP364\.md/,
);
assert.match(index, /plan-only app registration slice/);
assert.match(index, /live app registration as the next slice/);

assert.match(
  todo,
  /Latest completed narrow replay materialization handoff app registration plan\s+step:\s+Step 364/,
);
assert.match(todo, /### Step 365 - Replay Coordination Materialization Runtime Handoff App Registration/);
assert.match(todo, /### Step 364 - Narrow Replay Materialization Runtime Handoff App Registration Plan/);
assert.match(todo, /Did not modify `v6\/src\/app\.js`/);
assert.match(todo, /Did not register runtime, subscribe to events, dispatch commands/);

assert.match(handoff, /Worktree at handoff: clean after Step 364 closeout/);
assert.match(handoff, /Latest completed step: Step 364 - Narrow Replay Materialization Runtime\s+Handoff App Registration Plan/);
assert.match(handoff, /Step 364 added the plan-only app registration helper/);
assert.match(handoff, /start with Step 365/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /Minimal Future App Diff/);
assert.match(doc, /Dependency Injection Plan/);
assert.match(doc, /Focused Future Browser Smoke/);
assert.match(doc, /Rollback Gates/);
assert.match(doc, /no `v6\/src\/app\.js` modification/);
assert.match(doc, /Step 365 should implement the planned app registration/);

for (const requiredPlanTerm of [
  'narrow-replay-materialization-runtime-handoff-app-registration-plan',
  'runtime.replay-coordination-materialization-handoff',
  'add-dispatch-command-import',
  'add-runtime-factory-import',
  'register-runtime-after-manual-next',
  'registry.registerRuntime(createReplayCoordinationMaterializationRuntimeHandoff({ subscribeEvent, dispatchCommand }));',
  'replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js',
  'remove-runtime-registration-call-from-app',
  "appJsChangesNow: false",
  "runtimeRegistrationWired: false",
]) {
  assert.match(planSource, new RegExp(requiredPlanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(appSource, /registry\.registerRuntime\(createChartEntryManualNextRuntime\(\)\)/);
assert.match(appSource, /registry\.registerRuntime\(createChartEntryManualPreviousRuntime\(\)\)/);

assert.match(smoke, /selectedNextStep,\s+'replay-coordination-materialization-runtime-handoff-app-registration'/);
assert.match(boundarySmoke, /Step364 plan must stay pure/);

console.log('v6 narrow replay materialization runtime handoff app registration plan closeout step364 static smoke passed');
