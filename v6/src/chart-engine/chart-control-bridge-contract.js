const CHART_CONTROL_BRIDGE_OWNER = 'chart-control-bridge';

const CHART_CONTROL_BRIDGES = Object.freeze([
  'manual-wall-input-bridge',
  'reset-view-control-bridge',
]);

const CHART_CONTROL_ALLOWED_COMMANDS = Object.freeze([
  'chartViewport.resetView',
  'chartViewport.setManualIntent',
]);

const CHART_CONTROL_ALLOWED_OPERATIONS = Object.freeze([
  'bind-reset-view-control',
  'dispatch-viewport-command',
  'measure-manual-wall',
  'read-chart-surface-snapshot',
  'subscribe-chart-surface-visible-range',
]);

const CHART_CONTROL_BLOCKED_INTEGRATIONS = Object.freeze([
  'bar-data-fetch',
  'calendar',
  'chart-series-write',
  'dashboard-row-actions',
  'journal',
  'orders',
  'replay-advance',
  'session-loading',
]);

export function getChartControlBridgeOwner() {
  return CHART_CONTROL_BRIDGE_OWNER;
}

export function getChartControlBridges() {
  return [...CHART_CONTROL_BRIDGES];
}

export function getChartControlAllowedCommands() {
  return [...CHART_CONTROL_ALLOWED_COMMANDS];
}

export function getChartControlAllowedOperations() {
  return [...CHART_CONTROL_ALLOWED_OPERATIONS];
}

export function getChartControlBlockedIntegrations() {
  return [...CHART_CONTROL_BLOCKED_INTEGRATIONS];
}

export function createChartControlBridgeContract() {
  return Object.freeze({
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
    owner: CHART_CONTROL_BRIDGE_OWNER,
  });
}
