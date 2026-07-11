import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_RUNTIME_WIRING_SELECTION_STEP332.md', 'utf8');
const selector = await readFile('v6/src/replay/replay-coordination-materialization-runtime-wiring-selection.js', 'utf8');
const smoke = await readFile('v6/tests/replay-coordination-materialization-runtime-wiring-selection-step332-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/replay-coordination-materialization-runtime-wiring-boundary-step332-static-smoke.js', 'utf8');

assert.match(index, /V6_REPLAY_COORDINATION_MATERIALIZATION_RUNTIME_WIRING_SELECTION_STEP332\.md/);
assert.match(todo, /Latest completed replay coordination materialization runtime wiring selection\s+step: Step 332/);
assert.match(todo, /### Step 332 - Replay Coordination Materialization Runtime Wiring Slice Selection/);
assert.match(handoff, /Step 332 selected/);
assert.match(handoff, /display-timeframe-target-materialization-readiness-audit/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /display-timeframe-target-materialization-readiness-audit/);
assert.match(doc, /display-timeframe-target-materialization-handoff/);
assert.match(doc, /the selection step does not add runtime wiring/);
assert.match(doc, /Step 333 should implement the read-only/);

assert.match(selector, /selectReplayCoordinationMaterializationRuntimeWiringSlice/);
assert.match(selector, /pure-handoff-plan-ready-select-readiness-audit-before-runtime-wiring/);
assert.match(selector, /readiness-audit-missing-do-not-start-runtime-wiring/);
assert.match(selector, /target-history-request-sizing-unchanged/);
assert.match(selector, /chart-history-fast-path-unchanged/);

assert.match(smoke, /display-timeframe-target-materialization-readiness-audit/);
assert.match(smoke, /readiness-audit-missing-do-not-start-runtime-wiring/);
assert.match(boundarySmoke, /runtime wiring selector must not expose/);
assert.match(boundarySmoke, /no-runtime-wiring-in-selection-step/);

console.log('v6 replay coordination materialization runtime wiring closeout step332 static smoke passed');
