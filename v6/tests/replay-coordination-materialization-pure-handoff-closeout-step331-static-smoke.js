import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const handoff = await readFile('v6/docs/V6_HANDOFF.md', 'utf8');
const doc = await readFile('v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_PURE_HANDOFF_PLAN_STEP331.md', 'utf8');
const plan = await readFile('v6/src/replay/replay-coordination-materialization-pure-handoff-plan.js', 'utf8');
const smoke = await readFile('v6/tests/replay-coordination-materialization-pure-handoff-plan-step331-smoke.js', 'utf8');
const boundarySmoke = await readFile('v6/tests/replay-coordination-materialization-pure-handoff-boundary-step331-static-smoke.js', 'utf8');

assert.match(index, /V6_REPLAY_COORDINATION_MATERIALIZATION_PURE_HANDOFF_PLAN_STEP331\.md/);
assert.match(todo, /Latest completed replay coordination materialization pure handoff plan step:\s+Step 331/);
assert.match(todo, /### Step 331 - Replay Coordination Materialization Pure Handoff Plan/);
assert.match(handoff, /Step 331 mapped display materialization intent/);
assert.match(handoff, /first future wiring point\s+preconditions without runtime wiring/);

assert.match(doc, /Status\s*\n\s*Accepted/);
assert.match(doc, /barData\.planTargetWindow/);
assert.match(doc, /barData\.loadTargetWindow/);
assert.match(doc, /chartData\.replaceBars/);
assert.match(doc, /chartData\.getSourceBars/);
assert.match(doc, /display-timeframe-target-materialization-handoff/);
assert.match(doc, /Step 332 should select the first bounded runtime wiring slice/);

assert.match(plan, /createReplayCoordinationMaterializationPureHandoffPlan/);
assert.match(plan, /validateReplayCoordinationMaterializationPureHandoffPlan/);
assert.match(plan, /chart-render-series-write/);
assert.match(plan, /chart-render-range-write/);
assert.match(plan, /shell\.dispatchTargetHistory/);

assert.match(smoke, /target-window-plan-owner-surface-available/);
assert.match(smoke, /target-bar-reveal-policy-covered/);
assert.match(boundarySmoke, /pure handoff plan must not expose/);
assert.match(boundarySmoke, /barData\.loadTargetWindow/);

console.log('v6 replay coordination materialization pure handoff closeout step331 static smoke passed');
