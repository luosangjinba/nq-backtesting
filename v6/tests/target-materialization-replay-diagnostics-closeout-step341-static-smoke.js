import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_CONTRACT_STEP341.md', 'utf8');
const contract = await readFile('v6/src/replay/target-materialization-replay-diagnostics-contract.js', 'utf8');
const smoke = await readFile('v6/tests/target-materialization-replay-diagnostics-contract-step341-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-boundary-step341-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_CONTRACT_STEP341\.md/);
assert.match(todo, /Latest completed target materialization diagnostics contract step: Step 341/);
assert.match(todo, /### Step 342 - Target Materialization Replay Diagnostics Runtime State Surface/);
assert.match(handoff, /Latest completed step: Step 341 - Target Materialization Replay Coordination\s+Diagnostics Readout Owner Contract/);
assert.match(handoff, /start with Step 342/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /target-materialization-replay-diagnostics-contract/);
assert.match(doc, /command-event-diagnostic-snapshot/);
assert.match(doc, /Replay remains source `1m` driven/);
assert.match(doc, /Step 342 should implement/);

assert.match(contract, /DIAGNOSTICS_READ_FIELDS/);
assert.match(contract, /createTargetMaterializationReplayDiagnosticsSnapshot/);
assert.match(contract, /runtimeWiringReady:\s*false/);
assert.match(smoke, /sourceCursorAuthority: true/);
assert.match(boundarySmoke, /Step341 contract must stay pure/);

console.log('v6 target materialization replay diagnostics closeout step341 static smoke passed');
