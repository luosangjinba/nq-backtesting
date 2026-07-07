const CHART_SURFACE_OWNER = 'workstation-chart-surface';

const CHART_SURFACE_ALLOWED_OPERATIONS = Object.freeze([
  'apply-visible-logical-range',
  'expose-readonly-snapshot',
  'measure-user-visible-range',
  'mount-chart-host',
  'subscribe-user-visible-range',
  'write-series-data',
]);

const CHART_SURFACE_BLOCKED_INTEGRATIONS = Object.freeze([
  'bar-data-fetch',
  'calendar',
  'dashboard-row-actions',
  'journal',
  'orders',
  'replay-cursor',
  'session-loading',
]);

const CHART_SURFACE_EVENT_ONLY_BRIDGES = Object.freeze([
  'chart-data-surface-bridge',
  'chart-viewport-surface-bridge',
]);

export function getChartSurfaceOwner() {
  return CHART_SURFACE_OWNER;
}

export function getChartSurfaceAllowedOperations() {
  return [...CHART_SURFACE_ALLOWED_OPERATIONS];
}

export function getChartSurfaceBlockedIntegrations() {
  return [...CHART_SURFACE_BLOCKED_INTEGRATIONS];
}

export function getChartSurfaceEventOnlyBridges() {
  return [...CHART_SURFACE_EVENT_ONLY_BRIDGES];
}

export function createChartSurfaceContract() {
  return Object.freeze({
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
    owner: CHART_SURFACE_OWNER,
    panePolicy: 'host-dataset-pane-id',
    snapshotPolicy: 'read-only',
  });
}
