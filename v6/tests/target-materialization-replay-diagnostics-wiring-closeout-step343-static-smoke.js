import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_WIRING_PLAN_STEP343.md', 'utf8');
const plan = await readFile('v6/src/replay/target-materialization-replay-diagnostics-wiring-plan.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-wiring-boundary-step343-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_WIRING_PLAN_STEP343\.md/);
assert.match(todo, /Latest completed target materialization diagnostics wiring plan step: Step\s+343/);
assert.match(todo, /### Step 344 - Target Materialization Replay Diagnostics Update Command Surface/);
assert.match(todo, /do not subscribe to Display-Timeframe, Manual Next, or Auto Play producer\s+events yet/);
assert.match(handoff, /Latest completed step: Step 343 - Target Materialization Replay Diagnostics\s+Runtime Wiring Plan/);
assert.match(handoff, /start with Step 344/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /displayTimeframe:applied/);
assert.match(doc, /chartEntryManualNext:advanced/);
assert.match(doc, /chartEntryAutoPlay:ticked/);
assert.match(doc, /targetMaterializationReplayDiagnostics\.updateSnapshot/);
assert.match(doc, /targetMaterializationReplayDiagnostics\.getSnapshot/);
assert.match(doc, /targetMaterializationReplayDiagnostics:snapshotReady/);
assert.match(doc, /It did not add `updateSnapshot`, subscribe to producer events, wire visible UI/);
assert.match(doc, /Step 344 should implement/);

assert.match(plan, /createTargetMaterializationReplayDiagnosticsWiringPlan/);
assert.match(plan, /runtimeBehaviorChanges: false/);
assert.match(plan, /runtimeWiringReady: false/);
assert.match(plan, /updateCommandReady: false/);
assert.match(plan, /shellVisibleUiReady: false/);
assert.match(plan, /targetHistoryRequestSizingUnchanged: true/);
assert.match(plan, /chartHistoryFastPathUnchanged: true/);
assert.match(boundarySmoke, /diagnosticsRuntime/);
assert.match(boundarySmoke, /displayRuntime/);
assert.match(boundarySmoke, /manualNextRuntime/);
assert.match(boundarySmoke, /autoPlayRuntime/);

console.log('v6 target materialization replay diagnostics wiring closeout step343 static smoke passed');
