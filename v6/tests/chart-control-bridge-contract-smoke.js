import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createChartControlBridgeContract,
  getChartControlAllowedCommands,
  getChartControlAllowedOperations,
  getChartControlBlockedIntegrations,
  getChartControlBridgeOwner,
  getChartControlBridges,
} from '../src/chart-engine/chart-control-bridge-contract.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';

const contract = createChartControlBridgeContract();
const manualWallBridge = await readFile('v6/src/chart-engine/manual-wall-input-bridge.js', 'utf8');
const resetViewBridge = await readFile('v6/src/chart-engine/reset-view-control-bridge.js', 'utf8');

assert.equal(getChartControlBridgeOwner(), 'chart-control-bridge');
assert.deepEqual(getChartControlBridges(), [
  'manual-wall-input-bridge',
  'reset-view-control-bridge',
]);
assert.deepEqual(getChartControlAllowedCommands(), [
  'chartViewport.resetView',
  'chartViewport.setManualIntent',
]);
assert.deepEqual(getChartControlAllowedOperations(), [
  'bind-reset-view-control',
  'dispatch-viewport-command',
  'measure-manual-wall',
  'read-chart-surface-snapshot',
  'subscribe-chart-surface-visible-range',
]);
assert.deepEqual(getChartControlBlockedIntegrations(), [
  'bar-data-fetch',
  'calendar',
  'chart-series-write',
  'dashboard-row-actions',
  'journal',
  'orders',
  'replay-advance',
  'session-loading',
]);

assert.deepEqual(contract, {
  allowedCommands: getChartControlAllowedCommands(),
  allowedOperations: getChartControlAllowedOperations(),
  blockedIntegrations: getChartControlBlockedIntegrations(),
  bridgePolicy: 'control-bridge',
  canAdvanceReplay: false,
  canDispatchViewportCommands: true,
  canFetchBars: false,
  canLoadSession: false,
  canMeasureManualWall: true,
  canMutateCalendar: false,
  canMutateJournal: false,
  canMutateOrders: false,
  canOwnDashboardRowActions: false,
  canReadChartSurfaceSnapshot: true,
  canSubscribeVisibleRange: true,
  canWriteSeriesData: false,
  commandPolicy: 'viewport-commands-only',
  controlBridges: getChartControlBridges(),
  owner: 'chart-control-bridge',
});
assert.equal(Object.isFrozen(contract), true);

assert.equal(manualWallBridge.includes('subscribeVisibleRangeChange'), true);
assert.equal(manualWallBridge.includes('measureManualWallFromLogicalRange'), true);
assert.equal(manualWallBridge.includes('CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT'), true);
assert.equal(manualWallBridge.includes('CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION'), false);
assert.equal(resetViewBridge.includes('addEventListener'), true);
assert.equal(resetViewBridge.includes('CHART_VIEWPORT_COMMANDS.RESET_VIEW'), true);

for (const [name, source] of [
  ['manual wall input bridge', manualWallBridge],
  ['reset view control bridge', resetViewBridge],
]) {
  assert.equal(source.includes('CHART_VIEWPORT_COMMANDS'), true, `${name} must dispatch viewport commands`);
  for (const forbiddenToken of [
    'BAR_DATA_COMMANDS',
    'CHART_DATA_COMMANDS',
    'REPLAY_COMMANDS',
    'SESSION_COMMANDS',
    'ORDER_COMMANDS',
    'JOURNAL_COMMANDS',
    'CALENDAR_COMMANDS',
    'setData',
    'series.update',
    'fetch(',
    'XMLHttpRequest',
  ]) {
    assert.equal(source.includes(forbiddenToken), false, `${name} must not own ${forbiddenToken}`);
  }
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

console.log('v6 chart control bridge contract smoke passed');
