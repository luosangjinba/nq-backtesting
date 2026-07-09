import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_RESET_VIEW_HTF_PROJECTION_AUDIT_STEP200.md', 'utf8');
const resetBridge = await readFile('v6/src/chart-engine/reset-view-control-bridge.js', 'utf8');
const viewportRuntime = await readFile('v6/src/chart-viewport/chart-viewport-runtime.js', 'utf8');
const viewportStore = await readFile('v6/src/chart-viewport/chart-viewport-store.js', 'utf8');
const chartEngineBridge = await readFile('v6/src/chart-engine/chart-viewport-surface-bridge.js', 'utf8');

assert.match(doc, /Reset view is a viewport concern/);
assert.match(doc, /Do not route reset view through `CHART_DATA_PROJECTION_COMMANDS`/);
assert.match(doc, /display-timeframe bars/);

assert.equal(resetBridge.includes('findAppliedChartData'), true);
assert.equal(resetBridge.includes('findPaneSnapshot'), true);
assert.equal(resetBridge.includes('latestLogicalIndex'), true);
assert.equal(resetBridge.includes('CHART_DATA_PROJECTION_COMMANDS'), false);
assert.equal(resetBridge.includes('BAR_DATA_COMMANDS'), false);
assert.equal(resetBridge.includes('REPLAY_COMMANDS'), false);

assert.equal(viewportRuntime.includes('CHART_VIEWPORT_COMMANDS.RESET_VIEW'), true);
assert.equal(viewportRuntime.includes('applyChartDataRevision'), true);
assert.equal(viewportStore.includes('resetToDefaultWallIntent'), true);
assert.equal(chartEngineBridge.includes('CHART_VIEWPORT_EVENTS.PROJECTED'), true);

console.log('v6 reset view HTF projection audit step 200 smoke passed');
