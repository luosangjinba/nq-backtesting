export const WORKSPACE_SCOPES = Object.freeze({
  GLOBAL: 'global',
  INSTRUMENT: 'instrument',
});

export const WORKSPACE_DOMAINS = Object.freeze({
  CHART_NOTES: Object.freeze({ name: 'chart-notes', scope: WORKSPACE_SCOPES.INSTRUMENT, version: 1 }),
  DAILY_TIME_REVIEWS: Object.freeze({ name: 'daily-time-reviews', scope: WORKSPACE_SCOPES.INSTRUMENT, version: 1 }),
  DATE_RANGE_HISTORY: Object.freeze({ name: 'date-range-history', scope: WORKSPACE_SCOPES.GLOBAL, version: 1 }),
  DISPLAY_PREFERENCES: Object.freeze({ name: 'display-preferences', scope: WORKSPACE_SCOPES.GLOBAL, version: 1 }),
  ECONOMIC_EVENT_NOTES: Object.freeze({ name: 'economic-event-notes', scope: WORKSPACE_SCOPES.INSTRUMENT, version: 1 }),
  ENTRY_CONTEXT_CATALOG: Object.freeze({ name: 'entry-context-catalog', scope: WORKSPACE_SCOPES.GLOBAL, version: 1 }),
  IMPORT_BATCHES: Object.freeze({ name: 'import-batches', scope: WORKSPACE_SCOPES.GLOBAL, version: 1 }),
  LIVE_RECORDS: Object.freeze({ name: 'live-records', scope: WORKSPACE_SCOPES.INSTRUMENT, version: 1 }),
  MARKET_SEGMENTS: Object.freeze({ name: 'market-segments', scope: WORKSPACE_SCOPES.INSTRUMENT, version: 2 }),
  ORDER_REVIEWS: Object.freeze({ name: 'order-reviews', scope: WORKSPACE_SCOPES.INSTRUMENT, version: 1 }),
  PDA_ANNOTATIONS: Object.freeze({ name: 'pda-annotations', scope: WORKSPACE_SCOPES.INSTRUMENT, version: 1 }),
  TIME_OVERLAYS: Object.freeze({ name: 'time-overlays', scope: WORKSPACE_SCOPES.INSTRUMENT, version: 1 }),
});

export function getWorkspaceDomainName(domain) {
  if (typeof domain === 'string') return domain;
  return domain?.name || '';
}

export function isInstrumentScopedWorkspaceDomain(domain) {
  return domain?.scope === WORKSPACE_SCOPES.INSTRUMENT;
}
