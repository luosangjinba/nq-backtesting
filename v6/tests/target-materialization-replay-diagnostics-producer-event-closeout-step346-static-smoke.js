import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_PRODUCER_EVENT_RUNTIME_STEP346.md', 'utf8');
const runtime = await readFile('v6/src/replay/target-materialization-replay-diagnostics-runtime.js', 'utf8');
const runtimeSmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-producer-event-runtime-step346-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-producer-event-boundary-step346-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_PRODUCER_EVENT_RUNTIME_STEP346\.md/);
assert.match(todo, /Latest completed target materialization diagnostics event wiring step: Step\s+346/);
assert.match(todo, /### Step 347 - Target Materialization Replay Diagnostics Browser Read Coverage/);
assert.match(todo, /browser\/runtime-read coverage proving real Display-Timeframe, Manual Next,\s+and Auto Play flows/);
assert.match(handoff, /Latest completed step: Step 346 - Target Materialization Replay Diagnostics\s+Producer Event Runtime Wiring/);
assert.match(handoff, /start with Step 347/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /displayTimeframe:applied/);
assert.match(doc, /chartEntryManualNext:advanced/);
assert.match(doc, /chartEntryAutoPlay:started/);
assert.match(doc, /chartEntryAutoPlay:ticked/);
assert.match(doc, /chartEntryAutoPlay:stopped/);
assert.match(doc, /It did not modify Display-Timeframe, Manual Next, or Auto Play runtimes/);
assert.match(doc, /Step 347 should add browser\/runtime-read coverage/);

assert.match(runtime, /subscribeEvent/);
assert.match(runtime, /mapTargetMaterializationReplayDiagnosticsProducerPayload/);
assert.match(runtime, /updateSnapshot\(update\)/);
assert.match(runtimeSmoke, /listenerCount\(DISPLAY_TIMEFRAME_EVENTS\.APPLIED\), 1/);
assert.match(runtimeSmoke, /listenerCount\(DISPLAY_TIMEFRAME_EVENTS\.APPLIED\), 0/);
assert.match(boundarySmoke, /producer event wiring must not use/);

console.log('v6 target materialization replay diagnostics producer event closeout step346 static smoke passed');
