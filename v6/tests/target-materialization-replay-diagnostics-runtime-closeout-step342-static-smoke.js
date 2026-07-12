import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_RUNTIME_STEP342.md', 'utf8');
const contracts = await readFile('v6/src/contracts/app-contracts.js', 'utf8');
const runtime = await readFile('v6/src/replay/target-materialization-replay-diagnostics-runtime.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-runtime-boundary-step342-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_RUNTIME_STEP342\.md/);
assert.match(todo, /### Step 342 - Target Materialization Replay Diagnostics Runtime State Surface/);
assert.match(todo, /Added the read-only diagnostics runtime state surface/);
assert.match(handoff, /Step 342 added the smallest read-only diagnostics runtime state surface/);
assert.match(handoff, /Step 342 adds the read-only diagnostics runtime snapshot surface/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /targetMaterializationReplayDiagnostics\.getSnapshot/);
assert.match(doc, /targetMaterializationReplayDiagnostics:snapshotReady/);
assert.match(doc, /read-only diagnostic snapshot state/);
assert.match(doc, /Replay remains source `1m` driven/);
assert.match(doc, /Step 343 should plan/);
assert.doesNotMatch(doc, /visible shell UI changes\.\s*\n\s*\n## Verification[\s\S]*implemented live runtime handoff/);

assert.match(contracts, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS/);
assert.match(contracts, /GET_SNAPSHOT:\s*'targetMaterializationReplayDiagnostics\.getSnapshot'/);
assert.match(contracts, /SNAPSHOT_READY:\s*'targetMaterializationReplayDiagnostics:snapshotReady'/);
assert.match(runtime, /createTargetMaterializationReplayDiagnosticsRuntime/);
assert.match(runtime, /registerCommand\(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.GET_SNAPSHOT/);
assert.match(runtime, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS\.SNAPSHOT_READY/);
assert.doesNotMatch(runtime, /LOAD_TARGET_WINDOW|PLAN_TARGET_WINDOW|REPLAY_COMMANDS\.NEXT|setData\(|setVisibleLogicalRange\(/);

assert.match(boundarySmoke, /fetchV4TargetBars|\/v4\/target_bars/);
assert.match(boundarySmoke, /CHART_DATA_COMMANDS|CHART_VIEWPORT_COMMANDS/);
assert.match(boundarySmoke, /displayRuntime, manualNextRuntime, autoPlayRuntime, replayRuntime/);

console.log('v6 target materialization replay diagnostics runtime closeout step342 static smoke passed');
