import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createReplayCoordinationMaterializationPureHandoffPlan } from '../src/replay/replay-coordination-materialization-pure-handoff-plan.js';
import { createDisplayTimeframeTargetMaterializationReadinessReport } from '../src/replay/display-timeframe-target-materialization-readiness-audit.js';

const appContracts = await readFile('v6/src/contracts/app-contracts.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const barDataRuntime = await readFile('v6/src/bar-data/bar-data-runtime.js', 'utf8');
const chartDataRuntime = await readFile('v6/src/chart-data/chart-data-runtime.js', 'utf8');
const replayRuntime = await readFile('v6/src/replay/replay-runtime.js', 'utf8');
const targetRevealPolicy = await readFile('v6/src/replay/replay-coordination-materialization-owner-contract.js', 'utf8');
const readinessAudit = await readFile('v6/src/replay/display-timeframe-target-materialization-readiness-audit.js', 'utf8');

assert.match(appContracts, /APPLY: 'displayTimeframe\.apply'/);
assert.match(appContracts, /PLAN_TARGET_WINDOW: 'barData\.planTargetWindow'/);
assert.match(appContracts, /LOAD_TARGET_WINDOW: 'barData\.loadTargetWindow'/);
assert.match(appContracts, /REPLACE_BARS: 'chartData\.replaceBars'/);
assert.match(appContracts, /GET_SOURCE_BARS: 'chartData\.getSourceBars'/);
assert.match(appContracts, /GET_STATE: 'replay\.getState'/);

const surfaces = {
  barDataTargetLoadSurface: /registerCommand\(BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/.test(barDataRuntime),
  barDataTargetPlanSurface: /registerCommand\(BAR_DATA_COMMANDS\.PLAN_TARGET_WINDOW/.test(barDataRuntime),
  chartDataReplaceSurface: /registerCommand\(CHART_DATA_COMMANDS\.REPLACE_BARS/.test(chartDataRuntime),
  chartDataSourcePreservationSurface: /registerCommand\(CHART_DATA_COMMANDS\.GET_SOURCE_BARS/.test(chartDataRuntime)
    && /preserveSource: true/.test(displayRuntime),
  displayTimeframeApplySurface: /registerCommand\(DISPLAY_TIMEFRAME_COMMANDS\.APPLY/.test(displayRuntime),
  displayTimeframeTargetHistoryBranch: /targetHistory/.test(displayRuntime)
    && /LOAD_TARGET_WINDOW/.test(displayRuntime),
  replayCursorReadSurface: /registerCommand\(REPLAY_COMMANDS\.GET_STATE/.test(replayRuntime)
    && /cursorTime/.test(replayRuntime),
  targetBarRevealPolicySurface: /resolveReplayCoordinationTargetBarRevealState/.test(targetRevealPolicy),
};

const report = createDisplayTimeframeTargetMaterializationReadinessReport({
  plan: createReplayCoordinationMaterializationPureHandoffPlan(),
  surfaces,
});
assert.equal(report.status, 'ready');
assert.equal(report.nextSlice, 'display-timeframe-target-materialization-wiring-plan');
assert.deepEqual(report.audit.missingSurfaces, []);
assert.deepEqual(report.audit.missingGates, []);

assert.match(readinessAudit, /displayTimeframeApplySurface/);
assert.match(readinessAudit, /displayTimeframeTargetHistoryBranch/);
assert.match(readinessAudit, /barDataTargetPlanSurface/);
assert.match(readinessAudit, /barDataTargetLoadSurface/);
assert.match(readinessAudit, /chartDataReplaceSurface/);
assert.match(readinessAudit, /chartDataSourcePreservationSurface/);
assert.match(readinessAudit, /replayCursorReadSurface/);
assert.match(readinessAudit, /targetBarRevealPolicySurface/);

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
  assert.equal(readinessAudit.includes(forbiddenToken), false, `readiness audit must not expose ${forbiddenToken}`);
}

console.log('v6 display timeframe target materialization readiness boundary step333 static smoke passed');
