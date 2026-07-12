import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_PRODUCER_PAYLOAD_MAPPERS_STEP345.md', 'utf8');
const mapper = await readFile('v6/src/replay/target-materialization-replay-diagnostics-producer-payload-mappers.js', 'utf8');
const mapperSmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-step345-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-boundary-step345-static-smoke.js', 'utf8');

assert.match(index, /V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_PRODUCER_PAYLOAD_MAPPERS_STEP345\.md/);
assert.match(todo, /Latest completed target materialization diagnostics mapper step: Step 345/);
assert.match(todo, /### Step 346 - Target Materialization Replay Diagnostics Producer Event Runtime Wiring/);
assert.match(todo, /do not modify Display-Timeframe, Manual Next, or Auto Play runtimes/);
assert.match(handoff, /Latest completed step: Step 345 - Target Materialization Replay Diagnostics\s+Producer Payload Mappers/);
assert.match(handoff, /start with Step 346/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /displayTimeframe:applied/);
assert.match(doc, /chartEntryManualNext:advanced/);
assert.match(doc, /chartEntryAutoPlay:started/);
assert.match(doc, /chartEntryAutoPlay:ticked/);
assert.match(doc, /chartEntryAutoPlay:stopped/);
assert.match(doc, /Malformed producer payloads return safe partial updates or `null`/);
assert.match(doc, /Step 346 should wire producer event subscriptions/);

assert.match(mapper, /mapDisplayTimeframeAppliedToDiagnosticsUpdate/);
assert.match(mapper, /mapManualNextAdvancedToDiagnosticsUpdate/);
assert.match(mapper, /mapAutoPlayStateToDiagnosticsUpdate/);
assert.match(mapper, /mapTargetMaterializationReplayDiagnosticsProducerPayload/);
assert.match(mapperSmoke, /validateTargetMaterializationReplayDiagnosticsSnapshot/);
assert.match(boundarySmoke, /producer payload mapper must remain pure/);

console.log('v6 target materialization replay diagnostics producer payload mappers closeout step345 static smoke passed');
