import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  createChartControlBridgeContract,
  getChartControlAllowedCommands,
  getChartControlBridgeOwner,
  getChartControlBridges,
} from '../src/chart-engine/chart-control-bridge-contract.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';

const SOURCE_ROOT = path.join('v6', 'src');
const BRIDGE_FILES = new Map([
  ['manual-wall-input-bridge', 'v6/src/chart-engine/manual-wall-input-bridge.js'],
  ['reset-view-control-bridge', 'v6/src/chart-engine/reset-view-control-bridge.js'],
]);
const COMMAND_TOKENS = new Map([
  ['chartViewport.applyChartDataRevision', 'CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION'],
  ['chartViewport.resetView', 'CHART_VIEWPORT_COMMANDS.RESET_VIEW'],
  ['chartViewport.setManualIntent', 'CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT'],
]);

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

const contract = createChartControlBridgeContract();
const auditDoc = await readFile('v6/docs/V6_CHART_CONTROL_BRIDGE_INTEGRATION_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const appSource = await readFile('v6/src/app.js', 'utf8');
const manualWallBridge = await readFile(BRIDGE_FILES.get('manual-wall-input-bridge'), 'utf8');
const resetViewBridge = await readFile(BRIDGE_FILES.get('reset-view-control-bridge'), 'utf8');

assert.equal(indexDoc.includes('V6_CHART_CONTROL_BRIDGE_INTEGRATION_AUDIT.md'), true);
assert.match(auditDoc, /Step 105 should audit workstation browser behavior/);
assert.match(auditDoc, /manual-wall-input-bridge/);
assert.match(auditDoc, /reset-view-control-bridge/);
assert.match(auditDoc, /viewport-command-only/);

assert.equal(getChartControlBridgeOwner(), 'chart-control-bridge');
assert.deepEqual(getChartControlBridges(), [
  'manual-wall-input-bridge',
  'reset-view-control-bridge',
]);
assert.deepEqual(getChartControlAllowedCommands(), [
  'chartViewport.applyChartDataRevision',
  'chartViewport.resetView',
  'chartViewport.setManualIntent',
]);
assert.equal(contract.bridgePolicy, 'control-bridge');
assert.equal(contract.commandPolicy, 'viewport-commands-only');
assert.equal(contract.canDispatchViewportCommands, true);
assert.equal(contract.canReadChartSurfaceSnapshot, true);
assert.equal(contract.canSubscribeVisibleRange, true);
assert.equal(contract.canMeasureManualWall, true);
assert.equal(contract.canWriteSeriesData, false);
assert.equal(contract.canFetchBars, false);
assert.equal(contract.canAdvanceReplay, false);
assert.equal(contract.canLoadSession, false);
assert.equal(contract.canOwnDashboardRowActions, false);
assert.equal(contract.canMutateOrders, false);
assert.equal(contract.canMutateJournal, false);
assert.equal(contract.canMutateCalendar, false);

assert.deepEqual([...BRIDGE_FILES.keys()].sort(), getChartControlBridges().sort());
assert.deepEqual(await filesContaining("from './chart-engine/manual-wall-input-bridge.js'"), [
  'v6/src/app.js',
]);
assert.deepEqual(await filesContaining("from './chart-engine/reset-view-control-bridge.js'"), [
  'v6/src/app.js',
]);
assert.equal(appSource.includes('const workstationChartSurface = mountWorkstationChartSurface(root);'), true);
assert.equal(appSource.includes('connectManualWallInputBridge({\n  chartSurface: workstationChartSurface,'), true);
assert.equal(appSource.includes('connectResetViewControl({\n  button: root.querySelector'), true);
assert.equal(appSource.includes('chartSurface: workstationChartSurface,'), true);

assert.equal(manualWallBridge.includes('subscribeVisibleRangeChange'), true);
assert.equal(manualWallBridge.includes('getState'), true);
assert.equal(manualWallBridge.includes('measureManualWallFromLogicalRange'), true);
assert.equal(manualWallBridge.includes(COMMAND_TOKENS.get('chartViewport.setManualIntent')), true);
assert.equal(manualWallBridge.includes(COMMAND_TOKENS.get('chartViewport.applyChartDataRevision')), true);
assert.equal(resetViewBridge.includes('addEventListener'), true);
assert.equal(resetViewBridge.includes('getState'), true);
assert.equal(resetViewBridge.includes(COMMAND_TOKENS.get('chartViewport.resetView')), true);

for (const [bridgeId, source] of [
  ['manual-wall-input-bridge', manualWallBridge],
  ['reset-view-control-bridge', resetViewBridge],
]) {
  assert.equal(source.includes('CHART_VIEWPORT_COMMANDS'), true, `${bridgeId} must dispatch viewport commands`);
  for (const command of getChartControlAllowedCommands()) {
    const token = COMMAND_TOKENS.get(command);
    assert.equal(Boolean(token), true, `${command} must have a static token mapping`);
  }
  for (const forbiddenToken of [
    'BAR_DATA_COMMANDS',
    'CHART_DATA_COMMANDS',
    'REPLAY_COMMANDS',
    'SESSION_COMMANDS',
    'ORDER_COMMANDS',
    'JOURNAL_COMMANDS',
    'CALENDAR_COMMANDS',
    'createChart',
    'series.setData',
    'series.update',
    'setVisibleLogicalRange',
    'fetch(',
    'XMLHttpRequest',
    'localStorage',
  ]) {
    assert.equal(source.includes(forbiddenToken), false, `${bridgeId} must not own ${forbiddenToken}`);
  }
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 chart control bridge integration audit smoke passed');
