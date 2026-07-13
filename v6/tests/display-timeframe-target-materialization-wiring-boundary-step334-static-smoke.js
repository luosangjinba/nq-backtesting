import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createReplayCoordinationMaterializationPureHandoffPlan,
} from '../src/replay/replay-coordination-materialization-pure-handoff-plan.js';
import {
  createDisplayTimeframeTargetMaterializationReadinessReport,
} from '../src/replay/display-timeframe-target-materialization-readiness-audit.js';
import {
  createDisplayTimeframeTargetMaterializationWiringPlan,
  validateDisplayTimeframeTargetMaterializationWiringPlan,
} from './governance/helpers/replay/display-timeframe-target-materialization-wiring-plan.js';

const contracts = await readFile('v6/src/contracts/app-contracts.js', 'utf8');
const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const barDataRuntime = await readFile('v6/src/bar-data/bar-data-runtime.js', 'utf8');
const chartDataRuntime = await readFile('v6/src/chart-data/chart-data-runtime.js', 'utf8');
const replayRuntime = await readFile('v6/src/replay/replay-runtime.js', 'utf8');
const chartViewportRuntime = await readFile('v6/src/chart-viewport/chart-viewport-runtime.js', 'utf8');
const ownerContract = await readFile('v6/src/replay/replay-coordination-materialization-owner-contract.js', 'utf8');
const wiringPlanSource = await readFile('v6/tests/governance/helpers/replay/display-timeframe-target-materialization-wiring-plan.js', 'utf8');

for (const contractSurface of [
  "APPLY: 'displayTimeframe.apply'",
  "GET_STATE: 'replay.getState'",
  "GET_SOURCE_BARS: 'chartData.getSourceBars'",
  "PLAN_TARGET_WINDOW: 'barData.planTargetWindow'",
  "LOAD_TARGET_WINDOW: 'barData.loadTargetWindow'",
  "REPLACE_BARS: 'chartData.replaceBars'",
]) {
  assert.ok(contracts.includes(contractSurface), `contracts must expose ${contractSurface}`);
}

assert.match(displayRuntime, /registerCommand\(DISPLAY_TIMEFRAME_COMMANDS\.APPLY/);
assert.match(displayRuntime, /CHART_DATA_COMMANDS\.GET_SOURCE_BARS/);
assert.match(displayRuntime, /CHART_DATA_COMMANDS\.REPLACE_BARS/);
assert.match(displayRuntime, /preserveSource:\s*true/);
assert.match(displayRuntime, /targetHistory/);
assert.match(barDataRuntime, /registerCommand\(BAR_DATA_COMMANDS\.PLAN_TARGET_WINDOW/);
assert.match(barDataRuntime, /registerCommand\(BAR_DATA_COMMANDS\.LOAD_TARGET_WINDOW/);
assert.match(chartDataRuntime, /registerCommand\(CHART_DATA_COMMANDS\.GET_SOURCE_BARS/);
assert.match(chartDataRuntime, /registerCommand\(CHART_DATA_COMMANDS\.REPLACE_BARS/);
assert.match(replayRuntime, /registerCommand\(REPLAY_COMMANDS\.GET_STATE/);
assert.match(ownerContract, /resolveReplayCoordinationTargetBarRevealState/);
assert.match(chartViewportRuntime, /CHART_DATA_EVENTS\.BARS_CHANGED/);

const pureHandoffPlan = createReplayCoordinationMaterializationPureHandoffPlan({
  displayTimeframe: '8h',
  instrument: 'NQ',
  paneId: 'main',
  replayCursorTimestamp: 1780300800,
});
const readinessReport = createDisplayTimeframeTargetMaterializationReadinessReport({
  plan: pureHandoffPlan,
  surfaces: {
    barDataTargetLoadSurface: true,
    barDataTargetPlanSurface: true,
    chartDataReplaceSurface: true,
    chartDataSourcePreservationSurface: true,
    displayTimeframeApplySurface: true,
    displayTimeframeTargetHistoryBranch: true,
    replayCursorReadSurface: true,
    targetBarRevealPolicySurface: true,
  },
});
const wiringPlan = createDisplayTimeframeTargetMaterializationWiringPlan({ readinessReport });
assert.deepEqual(validateDisplayTimeframeTargetMaterializationWiringPlan(wiringPlan), {
  errors: [],
  valid: true,
});

assert.equal(wiringPlan.owner, 'display-timeframe-runtime');
assert.equal(wiringPlan.runtimeBehaviorChanges, false);
assert.equal(wiringPlan.runtimeWiringReady, false);
assert.equal(wiringPlan.preservesSourceReplayCursorAuthority, true);
assert.equal(wiringPlan.targetBarsDisplayMaterializationInputOnly, true);
assert.equal(wiringPlan.targetHistoryRequestSizingUnchanged, true);
assert.equal(wiringPlan.chartHistoryFastPathUnchanged, true);

for (const forbiddenRuntimeSurface of [
  /\bregisterCommand\b/,
  /\bsubscribeEvent\b/,
  /\bemitEvent\b/,
  /\bdispatchCommand\b/,
  /\bfetch\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bXMLHttpRequest\b/,
  /\.setData\(/,
  /\.update\(/,
  /\.setVisibleLogicalRange\(/,
  /CHART_VIEWPORT_COMMANDS\.RESET_VIEW/,
  /REPLAY_COMMANDS\.NEXT/,
  /REPLAY_COMMANDS\.SET_CURSOR_TIME/,
]) {
  assert.doesNotMatch(
    wiringPlanSource,
    forbiddenRuntimeSurface,
    `wiring plan source must remain read-only and avoid ${forbiddenRuntimeSurface}`,
  );
}

for (const requiredPlanTerm of [
  'replay.getState',
  'chartData.getSourceBars',
  'barData.planTargetWindow',
  'barData.loadTargetWindow',
  'chartData.replaceBars',
  'runtimeBehaviorChanges: false',
  'runtimeWiringReady: false',
  'targetHistoryRequestSizingUnchanged: true',
  'chartHistoryFastPathUnchanged: true',
]) {
  assert.ok(wiringPlanSource.includes(requiredPlanTerm), `wiring plan must document ${requiredPlanTerm}`);
}

console.log('v6 display timeframe target materialization wiring boundary step334 static smoke passed');
