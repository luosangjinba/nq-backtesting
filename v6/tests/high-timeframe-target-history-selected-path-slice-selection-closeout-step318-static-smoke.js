import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const doc = await readFile('v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_SELECTED_PATH_SLICE_SELECTION_STEP318.md', 'utf8');
const planner = await readFile('v6/src/chart-history/high-timeframe-target-history-selected-path-slice-selection.js', 'utf8');
const plannerSmoke = await readFile('v6/tests/high-timeframe-target-history-selected-path-slice-selection-step318-smoke.js', 'utf8');

assert.match(index, /V6_HIGH_TIMEFRAME_TARGET_HISTORY_SELECTED_PATH_SLICE_SELECTION_STEP318\.md/);
assert.match(todo, /Latest completed target-TF selected path step: Step 318/);
assert.match(todo, /### Step 319 - High-Timeframe Target-History Browser-Visible Apply-Lag Optimization Plan/);

assert.match(doc, /target-history-browser-visible-apply-lag-optimization/);
assert.match(doc, /target-history-browser-visible-apply-lag-optimization-plan/);
assert.match(doc, /selected phase: `browser-visible-apply-lag`/);
assert.match(doc, /default `80ms`\s+phase budget/);
assert.match(doc, /Replay remains source `1m` driven/);
assert.match(doc, /Step 319/);

assert.match(planner, /selectHighTimeframeTargetHistorySelectedPathSlice/);
assert.match(planner, /target-history-browser-visible-apply-lag-optimization-plan/);
assert.match(planner, /target-history-fetch-optimization-plan/);
assert.match(planner, /target-history-chart-data-replacement-optimization-plan/);
assert.match(planner, /target-history-viewport-reapply-optimization-plan/);
assert.match(planner, /replay-coordination-materialization-transition-plan/);
assert.match(planner, /high-timeframe-target-history-responsiveness-measurement-completion/);

assert.match(plannerSmoke, /ratio: 7\.33/);
assert.match(plannerSmoke, /value: 587\.1/);
assert.match(plannerSmoke, /browser-visible-apply-lag/);
assert.match(plannerSmoke, /severity, 'high'/);

console.log('v6 high timeframe target history selected path slice selection closeout step318 static smoke passed');
