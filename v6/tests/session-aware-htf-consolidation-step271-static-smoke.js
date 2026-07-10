import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_SESSION_AWARE_HTF_PROJECTION_CONSOLIDATION_STEP271.md', 'utf8');
const todo = await readFile('v6/TODO.md', 'utf8');
const index = await readFile('v6/docs/INDEX.md', 'utf8');
const chartProjection = await readFile('v6/src/chart-data-projection/chart-data-projection-domain.js', 'utf8');
const shellControl = await readFile('v6/src/shell/display-timeframe-control.js', 'utf8');
const paneModel = await readFile('v6/src/panes/pane-model.js', 'utf8');
const reloadPlan = await readFile('v6/src/pane-intent-reload/pane-intent-reload-window-plan.js', 'utf8');

assert.match(doc, /consolidates the now-enabled session-aware display timeframe family/);
assert.match(doc, /`1D`, `1W`, and `1M`/);
assert.match(doc, /Do not add seconds support/);
assert.match(todo, /Step 271 - Session-Aware HTF Projection Consolidation/);
assert.match(index, /V6_SESSION_AWARE_HTF_PROJECTION_CONSOLIDATION_STEP271/);
assert.match(chartProjection, /resolveTradingDayBucket/);
assert.match(chartProjection, /resolveTradingWeekBucket/);
assert.match(chartProjection, /resolveTradingMonthBucket/);
assert.match(shellControl, /1D.*1W.*1M/s);
assert.match(paneModel, /1D.*1W.*1M/s);
assert.match(reloadPlan, /targetTimeframe === '1D'/);
assert.match(reloadPlan, /targetTimeframe === '1W'/);
assert.match(reloadPlan, /targetTimeframe === '1M'/);

console.log('v6 session-aware HTF consolidation step271 static smoke passed');
