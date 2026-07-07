import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createChartSurfaceContract,
  getChartSurfaceAllowedOperations,
  getChartSurfaceBlockedIntegrations,
  getChartSurfaceEventOnlyBridges,
  getChartSurfaceOwner,
} from '../src/chart-engine/chart-surface-contract.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';

const contract = createChartSurfaceContract();
const chartSurface = await readFile('v6/src/chart-engine/workstation-chart-surface.js', 'utf8');
const chartDataBridge = await readFile('v6/src/chart-engine/chart-data-surface-bridge.js', 'utf8');
const chartViewportBridge = await readFile('v6/src/chart-engine/chart-viewport-surface-bridge.js', 'utf8');

assert.equal(getChartSurfaceOwner(), 'workstation-chart-surface');
assert.deepEqual(getChartSurfaceAllowedOperations(), [
  'apply-visible-logical-range',
  'expose-readonly-snapshot',
  'measure-user-visible-range',
  'mount-chart-host',
  'subscribe-user-visible-range',
  'write-series-data',
]);
assert.deepEqual(getChartSurfaceBlockedIntegrations(), [
  'bar-data-fetch',
  'calendar',
  'dashboard-row-actions',
  'journal',
  'orders',
  'replay-cursor',
  'session-loading',
]);
assert.deepEqual(getChartSurfaceEventOnlyBridges(), [
  'chart-data-surface-bridge',
  'chart-viewport-surface-bridge',
]);

assert.deepEqual(contract, {
  allowedOperations: getChartSurfaceAllowedOperations(),
  blockedIntegrations: getChartSurfaceBlockedIntegrations(),
  canAdvanceReplay: false,
  canApplyVisibleLogicalRange: true,
  canComputeReplayCursor: false,
  canFetchBars: false,
  canLoadSession: false,
  canMeasureUserVisibleRange: true,
  canMutateCalendar: false,
  canMutateJournal: false,
  canMutateOrders: false,
  canOwnDashboardRowActions: false,
  canWriteSeriesData: true,
  eventOnlyBridges: getChartSurfaceEventOnlyBridges(),
  owner: 'workstation-chart-surface',
  panePolicy: 'host-dataset-pane-id',
  snapshotPolicy: 'read-only',
});
assert.equal(Object.isFrozen(contract), true);

assert.equal(chartSurface.includes('applyChartDataRecord'), true);
assert.equal(chartSurface.includes('applyViewportProjection'), true);
assert.equal(chartSurface.includes('subscribeVisibleRangeChange'), true);
for (const forbiddenToken of [
  'BAR_DATA_COMMANDS',
  'REPLAY_COMMANDS',
  'SESSION_COMMANDS',
  'fetch(',
  'XMLHttpRequest',
]) {
  assert.equal(
    chartSurface.includes(forbiddenToken),
    false,
    `chart surface must not own ${forbiddenToken}`,
  );
}

assert.equal(chartDataBridge.includes('CHART_DATA_EVENTS.BARS_CHANGED'), true);
assert.equal(chartDataBridge.includes('dispatchCommand'), false);
assert.equal(chartViewportBridge.includes('CHART_VIEWPORT_EVENTS.PROJECTED'), true);
assert.equal(chartViewportBridge.includes('dispatchCommand'), false);
assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy'],
);

console.log('v6 chart surface contract smoke passed');
