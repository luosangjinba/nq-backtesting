import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createReplayCoordinationMaterializationPureHandoffPlan } from '../src/replay/replay-coordination-materialization-pure-handoff-plan.js';

const step330Doc = await readFile('v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_HANDOFF_SELECTION_STEP330.md', 'utf8');
const planSource = await readFile('v6/src/replay/replay-coordination-materialization-pure-handoff-plan.js', 'utf8');
const appContracts = await readFile('v6/src/contracts/app-contracts.js', 'utf8');
const step331Smoke = await readFile('v6/tests/replay-coordination-materialization-pure-handoff-plan-step331-smoke.js', 'utf8');

assert.match(step330Doc, /replay-coordination-materialization-pure-handoff-plan/);
assert.match(step330Doc, /maps display\s+materialization intent to existing owner surfaces/);
assert.match(step330Doc, /the selection step must not add runtime wiring/);

assert.match(appContracts, /LOAD_TARGET_WINDOW: 'barData\.loadTargetWindow'/);
assert.match(appContracts, /PLAN_TARGET_WINDOW: 'barData\.planTargetWindow'/);
assert.match(appContracts, /REPLACE_BARS: 'chartData\.replaceBars'/);
assert.match(appContracts, /GET_SOURCE_BARS: 'chartData\.getSourceBars'/);

const plan = createReplayCoordinationMaterializationPureHandoffPlan({
  displayTimeframe: '1W',
  instrument: 'NQ',
  paneId: 'main',
  replayCursorTimestamp: 1780300800,
});
assert.equal(plan.runtimeWiringReady, false);
assert.equal(plan.sourceReplayCursorAuthority, true);
assert.equal(plan.ownerSurfaces.some((surface) => surface.commandSurface === 'barData.loadTargetWindow'), true);
assert.equal(plan.ownerSurfaces.some((surface) => surface.commandSurface === 'chartData.replaceBars'), true);
assert.equal(plan.forbiddenSurfaces.includes('replay.setCursorTime'), true);
assert.equal(plan.forbiddenSurfaces.includes('chart-render-series-write'), true);
assert.equal(plan.forbiddenSurfaces.includes('chart-render-range-write'), true);

assert.match(planSource, /display-timeframe-target-materialization-handoff/);
assert.match(planSource, /source-1m-replay-cursor-available/);
assert.match(planSource, /target-bar-reveal-policy-covered/);
assert.match(planSource, /barData\.planTargetWindow/);
assert.match(planSource, /barData\.loadTargetWindow/);
assert.match(planSource, /chartData\.replaceBars/);
assert.match(planSource, /chartData\.getSourceBars/);
assert.match(step331Smoke, /runtimeWiringReady, false/);

for (const forbiddenToken of [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_HISTORY_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'REPLAY_COMMANDS',
  'dispatchCommand',
  'registerCommand',
  'subscribeEvent',
  'emitEvent',
  'fetch(',
  'localStorage',
  'XMLHttpRequest',
  'setData(',
  'setVisibleLogicalRange(',
]) {
  assert.equal(planSource.includes(forbiddenToken), false, `pure handoff plan must not expose ${forbiddenToken}`);
}

console.log('v6 replay coordination materialization pure handoff boundary step331 static smoke passed');
