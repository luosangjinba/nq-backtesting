import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_BROWSER_READ_STEP347.md', 'utf8');
const browserSmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-browser-read-step347-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-browser-read-boundary-step347-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_BROWSER_READ_STEP347\.md/);
assert.match(todo, /Latest completed target materialization diagnostics browser read step: Step\s+347/);
assert.match(todo, /### Step 348 - Target Materialization Replay Diagnostics Readout Owner Plan/);
assert.match(todo, /do not wire visible UI yet unless this step explicitly remains a plan-only\s+owner contract/);
assert.match(handoff, /Latest completed step: Step 347 - Target Materialization Replay Diagnostics\s+Browser Read Coverage/);
assert.match(handoff, /start with Step 348/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /Display-Timeframe Runtime applies `8h` target materialization/);
assert.match(doc, /Manual Next advances the replay cursor/);
assert.match(doc, /Auto Play starts, ticks, and stops/);
assert.match(doc, /It did not modify Display-Timeframe, Manual Next, or Auto Play runtimes/);
assert.match(doc, /Step 348 should define the diagnostics readout owner and visibility plan/);

assert.match(browserSmoke, /TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS\.GET_SNAPSHOT/);
assert.match(browserSmoke, /afterDisplayApplyDiagnostics/);
assert.match(browserSmoke, /afterManualNextDiagnostics/);
assert.match(browserSmoke, /afterAutoStartDiagnostics/);
assert.match(browserSmoke, /afterAutoTickDiagnostics/);
assert.match(browserSmoke, /afterAutoStopDiagnostics/);
assert.match(boundarySmoke, /browser read smoke must cover/);

console.log('v6 target materialization replay diagnostics browser read closeout step347 static smoke passed');
