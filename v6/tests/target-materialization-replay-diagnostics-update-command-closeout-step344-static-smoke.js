import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_UPDATE_COMMAND_STEP344.md', 'utf8');
const contracts = await readFile('v6/src/contracts/app-contracts.js', 'utf8');
const runtime = await readFile('v6/src/replay/target-materialization-replay-diagnostics-runtime.js', 'utf8');
const updateSmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-update-command-step344-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-update-command-boundary-step344-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_UPDATE_COMMAND_STEP344\.md/);
assert.match(todo, /Latest completed target materialization diagnostics update command step:\s+Step 344/);
assert.match(todo, /### Step 345 - Target Materialization Replay Diagnostics Producer Payload Mappers/);
assert.match(todo, /do not dispatch `updateSnapshot` from producer runtimes yet/);
assert.match(handoff, /Latest completed step: Step 344 - Target Materialization Replay Diagnostics\s+Update Command Surface/);
assert.match(handoff, /start with Step 345/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /targetMaterializationReplayDiagnostics\.updateSnapshot/);
assert.match(doc, /Invalid updates return `status: rejected`/);
assert.match(doc, /Invalid updates do not\s+corrupt runtime state/);
assert.match(doc, /It did not subscribe to Display-Timeframe, Manual Next, or Auto Play producer\s+events/);
assert.match(doc, /Step 345 should add pure producer payload mappers/);

assert.match(contracts, /UPDATE_SNAPSHOT:\s*'targetMaterializationReplayDiagnostics\.updateSnapshot'/);
assert.match(runtime, /registerCommand\(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.UPDATE_SNAPSHOT/);
assert.match(runtime, /status:\s*'rejected'/);
assert.match(runtime, /rejectedSnapshot/);
assert.match(updateSmoke, /afterRejected/);
assert.match(boundarySmoke, /subscribeEvent/);
assert.match(boundarySmoke, /displayRuntime/);
assert.match(boundarySmoke, /manualNextRuntime/);
assert.match(boundarySmoke, /autoPlayRuntime/);

console.log('v6 target materialization replay diagnostics update command closeout step344 static smoke passed');
