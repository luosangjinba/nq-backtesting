import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_RUNTIME_HANDOFF_STEP335.md', 'utf8');
const runtime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const helper = await readFile('v6/src/display-timeframe/display-timeframe-target-materialization-handoff.js', 'utf8');
const policy = await readFile('v6/src/materialization/target-bar-reveal-policy.js', 'utf8');
const runtimeSmoke = await readFile('v6/tests/display-timeframe-target-materialization-runtime-step335-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/display-timeframe-target-materialization-runtime-boundary-step335-static-smoke.js', 'utf8');

assert.match(index, /V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_RUNTIME_HANDOFF_STEP335\.md/);
assert.match(todo, /### Step 335 - Display-Timeframe Target Materialization Runtime Handoff Wiring/);
assert.match(todo, /Display-Timeframe Runtime target-history application\s+through `replay\.getState`/);
assert.match(handoff, /Step 335 wired Display-Timeframe Runtime target materialization/);
assert.match(handoff, /Step 335\s+implements the first runtime handoff slice inside Display-Timeframe Runtime/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /Display-Timeframe Runtime now follows/);
assert.match(doc, /`replay\.getState`/);
assert.match(doc, /`barData\.planTargetWindow`/);
assert.match(doc, /`barData\.loadTargetWindow`/);
assert.match(doc, /`chartData\.replaceBars`/);
assert.match(doc, /`preserveSource: true`/);
assert.match(doc, /Step 336 should verify/);

assert.match(runtime, /REPLAY_COMMANDS\.GET_STATE/);
assert.match(runtime, /BAR_DATA_COMMANDS\.PLAN_TARGET_WINDOW/);
assert.match(runtime, /BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(runtime, /resolveDisplayTimeframeTargetMaterializationHandoff/);
assert.match(runtime, /preserveSource:\s*true/);
assert.match(helper, /sourceCursorTimestampFromState/);
assert.match(helper, /target-history-no-visible-bars/);
assert.match(policy, /source-cursor-inside-target-bucket/);
assert.match(policy, /target-bar-start-after-source-cursor/);

assert.match(runtimeSmoke, /source-replay-cursor-unavailable/);
assert.match(runtimeSmoke, /target-bar-start-after-source-cursor/);
assert.match(runtimeSmoke, /GET_SOURCE_BARS/);
assert.match(boundarySmoke, /shellSource/);
assert.match(boundarySmoke, /display-timeframe runtime handoff must not use/);

console.log('v6 display timeframe target materialization runtime closeout step335 static smoke passed');
