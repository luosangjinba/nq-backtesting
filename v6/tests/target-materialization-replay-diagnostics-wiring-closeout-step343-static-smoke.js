import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_WIRING_PLAN_STEP343.md', 'utf8');
const plan = await readFile('v6/tests/governance/helpers/replay/target-materialization-replay-diagnostics-wiring-plan.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-wiring-boundary-step343-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_WIRING_PLAN_STEP343\.md/);
assert.match(todo, /### Step 343 - Target Materialization Replay Diagnostics Runtime Wiring Plan/);
assert.match(todo, /Added the pure diagnostics runtime wiring plan/);
assert.match(handoff, /Step 343 defined the pure producer\/consumer wiring plan/);
assert.match(handoff, /Step 343\s+defines the diagnostics producer\/consumer wiring plan/);

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
