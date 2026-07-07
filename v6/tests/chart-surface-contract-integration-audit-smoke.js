import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  createChartSurfaceContract,
  getChartSurfaceEventOnlyBridges,
  getChartSurfaceOwner,
} from '../src/chart-engine/chart-surface-contract.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';

const SOURCE_ROOT = path.join('v6', 'src');

async function walkFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

async function filesContaining(token) {
  const files = await walkFiles(SOURCE_ROOT);
  const matches = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (source.includes(token)) {
      matches.push(file);
    }
  }
  return matches;
}

const contract = createChartSurfaceContract();
const auditDoc = await readFile('v6/docs/V6_CHART_SURFACE_CONTRACT_INTEGRATION_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const adapter = await readFile('v6/src/chart-engine/lightweight-chart-adapter.js', 'utf8');
const hostManager = await readFile('v6/src/chart-engine/chart-host-manager.js', 'utf8');
const chartSurface = await readFile('v6/src/chart-engine/workstation-chart-surface.js', 'utf8');
const chartDataBridge = await readFile('v6/src/chart-engine/chart-data-surface-bridge.js', 'utf8');
const chartViewportBridge = await readFile('v6/src/chart-engine/chart-viewport-surface-bridge.js', 'utf8');
const manualWallBridge = await readFile('v6/src/chart-engine/manual-wall-input-bridge.js', 'utf8');
const resetViewBridge = await readFile('v6/src/chart-engine/reset-view-control-bridge.js', 'utf8');

assert.equal(indexDoc.includes('V6_CHART_SURFACE_CONTRACT_INTEGRATION_AUDIT.md'), true);
assert.match(auditDoc, /Step 102 should be Chart Surface Boundary Smoke Expansion/);
assert.match(auditDoc, /manual-wall-input-bridge/);
assert.match(auditDoc, /reset-view-control-bridge/);

assert.equal(getChartSurfaceOwner(), 'workstation-chart-surface');
assert.deepEqual(getChartSurfaceEventOnlyBridges(), [
  'chart-data-surface-bridge',
  'chart-viewport-surface-bridge',
]);
assert.equal(contract.canWriteSeriesData, true);
assert.equal(contract.canApplyVisibleLogicalRange, true);
assert.equal(contract.canMeasureUserVisibleRange, true);
assert.equal(contract.canFetchBars, false);
assert.equal(contract.canAdvanceReplay, false);
assert.equal(contract.canLoadSession, false);
assert.equal(contract.canOwnDashboardRowActions, false);

assert.deepEqual(await filesContaining('createChart(host'), [
  'v6/src/chart-engine/lightweight-chart-adapter.js',
]);
assert.deepEqual(await filesContaining('series.setData'), [
  'v6/src/chart-engine/lightweight-chart-adapter.js',
]);
assert.deepEqual(await filesContaining('series.update'), [
  'v6/src/chart-engine/lightweight-chart-adapter.js',
]);
assert.deepEqual(await filesContaining('setVisibleLogicalRange'), [
  'v6/src/chart-engine/chart-host-manager.js',
  'v6/src/chart-engine/lightweight-chart-adapter.js',
  'v6/src/chart-engine/workstation-chart-surface.js',
]);

assert.equal(adapter.includes('chart.timeScale().setVisibleLogicalRange'), true);
assert.equal(hostManager.includes('record.adapter.setData'), true);
assert.equal(hostManager.includes('record.adapter.setVisibleLogicalRange'), true);
assert.equal(chartSurface.includes('manager.mountPane'), true);
assert.equal(chartSurface.includes('applyChartDataRecord'), true);
assert.equal(chartSurface.includes('manager.setData'), true);
assert.equal(chartSurface.includes('applyViewportProjection'), true);
assert.equal(chartSurface.includes('manager.setVisibleLogicalRange'), true);
assert.equal(chartSurface.includes('subscribeVisibleRangeChange'), true);
assert.equal(chartSurface.includes('measuredVisibleRange'), true);
assert.equal(chartSurface.includes('getState()'), true);

for (const source of [chartSurface, chartDataBridge, chartViewportBridge]) {
  for (const forbiddenToken of [
    'BAR_DATA_COMMANDS',
    'REPLAY_COMMANDS',
    'SESSION_COMMANDS',
    'fetch(',
    'XMLHttpRequest',
  ]) {
    assert.equal(source.includes(forbiddenToken), false);
  }
}

assert.equal(chartDataBridge.includes('CHART_DATA_EVENTS.BARS_CHANGED'), true);
assert.equal(chartDataBridge.includes('dispatchCommand'), false);
assert.equal(chartDataBridge.includes('subscribeEvent'), true);
assert.equal(chartViewportBridge.includes('CHART_VIEWPORT_EVENTS.PROJECTED'), true);
assert.equal(chartViewportBridge.includes('dispatchCommand'), false);
assert.equal(chartViewportBridge.includes('subscribeEvent'), true);

assert.equal(manualWallBridge.includes('CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT'), true);
assert.equal(manualWallBridge.includes('CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION'), true);
assert.equal(resetViewBridge.includes('CHART_VIEWPORT_COMMANDS.RESET_VIEW'), true);
for (const source of [manualWallBridge, resetViewBridge]) {
  assert.equal(source.includes('setData'), false);
  assert.equal(source.includes('REPLAY_COMMANDS'), false);
  assert.equal(source.includes('SESSION_COMMANDS'), false);
  assert.equal(source.includes('fetch('), false);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 chart surface contract integration audit smoke passed');
