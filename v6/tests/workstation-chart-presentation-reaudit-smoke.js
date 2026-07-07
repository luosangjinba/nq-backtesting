import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const auditDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_PRESENTATION_REAUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const priorAuditDoc = await readFile('v6/docs/V6_CHART_PRESENTATION_SURFACE_AUDIT.md', 'utf8');
const appSource = await readFile('v6/src/app.js', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const chartSurfaceSource = await readFile('v6/src/chart-engine/workstation-chart-surface.js', 'utf8');
const chartDataBridgeSource = await readFile('v6/src/chart-engine/chart-data-surface-bridge.js', 'utf8');
const chartViewportBridgeSource = await readFile('v6/src/chart-engine/chart-viewport-surface-bridge.js', 'utf8');
const sessionDashboardSource = await readFile('v6/src/shell/session-dashboard.js', 'utf8');
const hostBrowserSmoke = await readFile('v6/tests/workstation-chart-host-browser-smoke.js', 'utf8');
const adapterBrowserSmoke = await readFile('v6/tests/workstation-chart-adapter-browser-smoke.js', 'utf8');
const dataBridgeBrowserSmoke = await readFile('v6/tests/workstation-chart-data-bridge-browser-smoke.js', 'utf8');
const viewportBridgeBrowserSmoke = await readFile(
  'v6/tests/workstation-chart-viewport-bridge-browser-smoke.js',
  'utf8',
);

assert.equal(indexDoc.includes('V6_WORKSTATION_CHART_PRESENTATION_REAUDIT.md'), true);
assert.match(auditDoc, /workstation chart presentation boundary still holds/);
assert.match(auditDoc, /No dashboard row-action visibility changed/);
assert.match(auditDoc, /Step 119 should choose the next bounded workstation\/chart implementation slice/);
assert.match(priorAuditDoc, /The real chart engine path is functional/);

assert.equal(shellSource.includes('data-v6-chart-engine-host data-v6-pane-id="main"'), true);
assert.equal(shellSource.includes('data-v6-chart-fallback'), true);
assert.equal(shellSource.includes('static-chart-visual'), true);
assert.equal(appSource.includes('mountWorkstationChartSurface(root)'), true);
assert.equal(appSource.includes('connectChartDataSurfaceBridge'), true);
assert.equal(appSource.includes('connectChartViewportSurfaceBridge'), true);
assert.equal(appSource.includes('__v6ChartDataSurfaceBridge'), true);
assert.equal(appSource.includes('__v6ChartViewportSurfaceBridge'), true);

assert.equal(chartSurfaceSource.includes("hostSelector = '[data-v6-chart-engine-host]'"), true);
assert.equal(chartSurfaceSource.includes('applyChartDataRecord'), true);
assert.equal(chartSurfaceSource.includes('applyViewportProjection'), true);
assert.equal(chartDataBridgeSource.includes('CHART_DATA_EVENTS.BARS_CHANGED'), true);
assert.equal(chartDataBridgeSource.includes('applyChartDataRecord'), true);
assert.equal(chartViewportBridgeSource.includes('CHART_VIEWPORT_EVENTS.PROJECTED'), true);
assert.equal(chartViewportBridgeSource.includes('applyViewportProjection'), true);

for (const source of [sessionDashboardSource]) {
  for (const forbiddenToken of [
    'createChart',
    'series.setData',
    'series.update',
    'setVisibleLogicalRange',
    'CHART_DATA_COMMANDS.REPLACE_BARS',
    'CHART_VIEWPORT_COMMANDS.ENSURE_INTENT',
    'BAR_DATA_COMMANDS.LOAD_WINDOW',
    'REPLAY_COMMANDS.NEXT',
  ]) {
    assert.equal(source.includes(forbiddenToken), false, `session dashboard must not own ${forbiddenToken}`);
  }
}

assert.equal(hostBrowserSmoke.includes('[data-v6-chart-engine-host]'), true);
assert.equal(hostBrowserSmoke.includes('fallbackHiddenFromAccessibility'), true);
assert.equal(hostBrowserSmoke.includes('fallbackOpacity <= 0.25'), true);
assert.equal(adapterBrowserSmoke.includes('__v6WorkstationChartSurface.getState()'), true);
assert.equal(adapterBrowserSmoke.includes('canvasCount > 0'), true);
assert.equal(dataBridgeBrowserSmoke.includes('CHART_DATA_COMMANDS.REPLACE_BARS'), true);
assert.equal(dataBridgeBrowserSmoke.includes('other-pane'), true);
assert.equal(viewportBridgeBrowserSmoke.includes('CHART_VIEWPORT_COMMANDS.ENSURE_INTENT'), true);
assert.equal(viewportBridgeBrowserSmoke.includes('visibleLogicalRange'), true);

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 workstation chart presentation re-audit smoke passed');
