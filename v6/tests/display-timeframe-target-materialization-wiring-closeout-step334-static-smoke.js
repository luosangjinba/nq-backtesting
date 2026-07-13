import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_WIRING_PLAN_STEP334.md', 'utf8');
const plan = await readFile('v6/tests/governance/helpers/replay/display-timeframe-target-materialization-wiring-plan.js', 'utf8');
const smoke = await readFile('v6/tests/display-timeframe-target-materialization-wiring-plan-step334-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/display-timeframe-target-materialization-wiring-boundary-step334-static-smoke.js', 'utf8');

assert.match(index, /V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_WIRING_PLAN_STEP334\.md/);
assert.match(todo, /Latest completed display-timeframe target materialization wiring plan step:\s+Step 334/);
assert.match(todo, /### Step 334 - Display-Timeframe Target Materialization Wiring Plan/);
assert.match(handoff, /Step 334 defined/);
assert.match(handoff, /runtime handoff wiring next/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /display-timeframe-target-materialization-wiring-plan/);
assert.match(doc, /read source replay cursor through `replay\.getState`/);
assert.match(doc, /`chartData\.getSourceBars`/);
assert.match(doc, /`barData\.planTargetWindow`/);
assert.match(doc, /`barData\.loadTargetWindow`/);
assert.match(doc, /`chartData\.replaceBars`/);
assert.match(doc, /Fallback Gates/);
assert.match(doc, /Rollback Criteria/);
assert.match(doc, /Step 335 should implement/);

assert.match(plan, /createDisplayTimeframeTargetMaterializationWiringPlan/);
assert.match(plan, /validateDisplayTimeframeTargetMaterializationWiringPlan/);
assert.match(plan, /runtimeBehaviorChanges: false/);
assert.match(plan, /runtimeWiringReady: false/);
assert.match(plan, /targetHistoryRequestSizingUnchanged: true/);
assert.match(plan, /chartHistoryFastPathUnchanged: true/);

assert.match(smoke, /runtimeWiringAllowed/);
assert.match(smoke, /switching-back-to-1m-loses-source-bars/);
assert.match(boundarySmoke, /wiring plan source must remain read-only/);
assert.match(boundarySmoke, /chartData\.replaceBars/);

console.log('v6 display timeframe target materialization wiring closeout step334 static smoke passed');
