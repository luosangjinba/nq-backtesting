import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';
import {
  createChartSurfaceContract,
  getChartSurfaceOwner,
} from '../src/chart-engine/chart-surface-contract.js';

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

const auditDoc = await readFile('v6/docs/V6_WORKSTATION_REPLAY_CHART_REENTRY_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const dashboardSource = await readFile('v6/src/shell/session-dashboard.js', 'utf8');
const chartDataBridge = await readFile('v6/src/chart-engine/chart-data-surface-bridge.js', 'utf8');
const chartViewportBridge = await readFile('v6/src/chart-engine/chart-viewport-surface-bridge.js', 'utf8');
const chartSurface = await readFile('v6/src/chart-engine/workstation-chart-surface.js', 'utf8');
const chartSurfaceContractSource = await readFile('v6/src/chart-engine/chart-surface-contract.js', 'utf8');

assert.equal(indexDoc.includes('V6_WORKSTATION_REPLAY_CHART_REENTRY_AUDIT.md'), true);
assert.match(auditDoc, /Step 100 should be Workstation Chart Surface Owner Contract/);
assert.match(auditDoc, /Lightweight Charts 5\.2 `ISeriesApi`/);
assert.match(auditDoc, /TradingView `awesome-tradingview`/);
assert.match(auditDoc, /dashboard row action visibility remains unchanged/i);

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
assert.deepEqual(await filesContaining('subscribeVisibleLogicalRangeChange'), [
  'v6/src/chart-engine/chart-host-manager.js',
  'v6/src/chart-engine/lightweight-chart-adapter.js',
  'v6/src/chart-engine/workstation-chart-surface.js',
]);

assert.equal(chartDataBridge.includes('CHART_DATA_EVENTS.BARS_CHANGED'), true);
assert.equal(chartDataBridge.includes('applyChartDataRecord'), true);
assert.equal(chartDataBridge.includes('dispatchCommand'), false);
assert.equal(chartDataBridge.includes('LOAD_WINDOW'), false);
assert.equal(chartDataBridge.includes('REPLAY_COMMANDS'), false);

assert.equal(chartViewportBridge.includes('CHART_VIEWPORT_EVENTS.PROJECTED'), true);
assert.equal(chartViewportBridge.includes('applyViewportProjection'), true);
assert.equal(chartViewportBridge.includes('dispatchCommand'), false);
assert.equal(chartViewportBridge.includes('SET_MANUAL_INTENT'), false);
assert.equal(chartViewportBridge.includes('REPLAY_COMMANDS'), false);

for (const forbiddenToken of [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'REPLAY_COMMANDS',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
  'viewportIntent',
]) {
  assert.equal(
    dashboardSource.includes(forbiddenToken),
    false,
    `dashboard must not regain workstation chart/replay ownership via ${forbiddenToken}`,
  );
}

assert.equal(chartSurface.includes('applyChartDataRecord'), true);
assert.equal(chartSurface.includes('applyViewportProjection'), true);
assert.equal(chartSurface.includes('subscribeVisibleRangeChange'), true);
assert.equal(getChartSurfaceOwner(), 'workstation-chart-surface');
assert.equal(createChartSurfaceContract().canWriteSeriesData, true);
assert.equal(createChartSurfaceContract().canApplyVisibleLogicalRange, true);
assert.equal(createChartSurfaceContract().canFetchBars, false);
assert.equal(createChartSurfaceContract().canAdvanceReplay, false);
assert.equal(createChartSurfaceContract().canLoadSession, false);
assert.equal(createChartSurfaceContract().canOwnDashboardRowActions, false);
assert.equal(chartSurfaceContractSource.includes('chart-data-surface-bridge'), true);
assert.equal(chartSurfaceContractSource.includes('chart-viewport-surface-bridge'), true);
assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 workstation replay chart reentry audit smoke passed');
