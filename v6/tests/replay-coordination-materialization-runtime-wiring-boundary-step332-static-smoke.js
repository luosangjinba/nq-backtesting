import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createReplayCoordinationMaterializationPureHandoffPlan } from '../src/replay/replay-coordination-materialization-pure-handoff-plan.js';
import { selectReplayCoordinationMaterializationRuntimeWiringSlice } from '../src/replay/replay-coordination-materialization-runtime-wiring-selection.js';

const step331Doc = await readFile('v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_PURE_HANDOFF_PLAN_STEP331.md', 'utf8');
const selectorSource = await readFile('v6/src/replay/replay-coordination-materialization-runtime-wiring-selection.js', 'utf8');
const planSource = await readFile('v6/src/replay/replay-coordination-materialization-pure-handoff-plan.js', 'utf8');

assert.match(step331Doc, /display-timeframe-target-materialization-handoff/);
assert.match(step331Doc, /Step 332 should select the first bounded runtime wiring slice/);
assert.match(step331Doc, /read-only wiring readiness\s+audit/);

const selection = selectReplayCoordinationMaterializationRuntimeWiringSlice({
  plan: createReplayCoordinationMaterializationPureHandoffPlan(),
});
assert.equal(selection.status, 'selected');
assert.equal(selection.selectedSlice, 'display-timeframe-target-materialization-readiness-audit');
assert.equal(selection.reason, 'pure-handoff-plan-ready-select-readiness-audit-before-runtime-wiring');
assert.equal(selection.acceptanceGates.includes('no-runtime-wiring-in-selection-step'), true);

assert.match(selectorSource, /display-timeframe-target-materialization-readiness-audit/);
assert.match(selectorSource, /readiness-audit-missing-do-not-start-runtime-wiring/);
assert.match(selectorSource, /target-history-request-sizing-unchanged/);
assert.match(selectorSource, /chart-history-fast-path-unchanged/);
assert.match(planSource, /display-timeframe-target-materialization-handoff/);

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
  assert.equal(selectorSource.includes(forbiddenToken), false, `runtime wiring selector must not expose ${forbiddenToken}`);
}

console.log('v6 replay coordination materialization runtime wiring boundary step332 static smoke passed');
