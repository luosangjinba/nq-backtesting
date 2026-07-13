import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_BROWSER_VISIBLE_APPLY_LAG_OPTIMIZATION_PLAN_STEP319.md', 'utf8');
const planner = await readFile('v6/tests/governance/helpers/chart-history/high-timeframe-target-history-apply-lag-optimization-plan.js', 'utf8');
const plannerSmoke = await readFile('v6/tests/high-timeframe-target-history-apply-lag-optimization-plan-step319-smoke.js', 'utf8');
const app = await readFile('v6/src/app.js', 'utf8');
const events = await readFile('v6/src/runtime/events.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_BROWSER_VISIBLE_APPLY_LAG_OPTIMIZATION_PLAN_STEP319\.md/);
assert.match(todo, /Latest completed target-TF apply-lag plan step: Step 319/);
assert.match(todo, /### Step 320 - High-Timeframe Target-History Browser-Visible Apply-Lag Boundary Browser Assertion/);

assert.match(doc, /chart-surface-readout-observation/);
assert.match(doc, /shell\.pane-status-readout/);
assert.match(doc, /target-history-browser-visible-apply-lag-boundary-browser-assertion/);
assert.match(doc, /chart-data applied/);
assert.match(doc, /viewport projected/);
assert.match(doc, /LEFT_EXTENSION_LOADED/);
assert.match(doc, /diagnostics readout visible/);
assert.match(doc, /Replay remains source `1m` driven/);

assert.match(planner, /createHighTimeframeTargetHistoryApplyLagOptimizationPlan/);
assert.match(planner, /chart-surface-readout-observation/);
assert.match(planner, /shell\.pane-status-readout/);
assert.match(planner, /target-history-browser-visible-apply-lag-boundary-browser-assertion/);
assert.match(planner, /defer-runtime-change-until-browser-boundary-assertion/);

assert.match(plannerSmoke, /587\.1/);
assert.match(plannerSmoke, /45\.1/);
assert.match(plannerSmoke, /28\.4/);
assert.match(plannerSmoke, /chart-surface-readout-observation/);

assert.match(app, /connectChartDataSurfaceBridge[\s\S]*connectChartViewportSurfaceBridge[\s\S]*mountPaneStatusReadout/);
assert.match(events, /\[\.\.\.eventListeners\]\.forEach/);

console.log('v6 high timeframe target history apply lag optimization plan closeout step319 static smoke passed');
