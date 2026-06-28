import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isInstrumentScopedWorkspaceDomain,
  WORKSPACE_DOMAINS,
  WORKSPACE_SCOPES,
} from '../src/storage/workspace-domain-registry.js';

const expectedDomains = {
  CHART_NOTES: ['chart-notes', WORKSPACE_SCOPES.INSTRUMENT],
  DAILY_TIME_REVIEWS: ['daily-time-reviews', WORKSPACE_SCOPES.INSTRUMENT],
  DATE_RANGE_HISTORY: ['date-range-history', WORKSPACE_SCOPES.GLOBAL],
  DISPLAY_PREFERENCES: ['display-preferences', WORKSPACE_SCOPES.GLOBAL],
  ECONOMIC_EVENT_NOTES: ['economic-event-notes', WORKSPACE_SCOPES.INSTRUMENT],
  ENTRY_CONTEXT_CATALOG: ['entry-context-catalog', WORKSPACE_SCOPES.GLOBAL],
  IMPORT_BATCHES: ['import-batches', WORKSPACE_SCOPES.GLOBAL],
  LIVE_RECORDS: ['live-records', WORKSPACE_SCOPES.INSTRUMENT],
  MARKET_SEGMENTS: ['market-segments', WORKSPACE_SCOPES.INSTRUMENT],
  ORDER_REVIEWS: ['order-reviews', WORKSPACE_SCOPES.INSTRUMENT],
  PDA_ANNOTATIONS: ['pda-annotations', WORKSPACE_SCOPES.INSTRUMENT],
  TIME_OVERLAYS: ['time-overlays', WORKSPACE_SCOPES.INSTRUMENT],
};

for (const [key, [name, scope]] of Object.entries(expectedDomains)) {
  assert.equal(WORKSPACE_DOMAINS[key].name, name);
  assert.equal(WORKSPACE_DOMAINS[key].scope, scope);
  assert.equal(Number.isInteger(WORKSPACE_DOMAINS[key].version), true);
  assert.equal(isInstrumentScopedWorkspaceDomain(WORKSPACE_DOMAINS[key]), scope === WORKSPACE_SCOPES.INSTRUMENT);
}

for (const path of [
  'v4/src/pda/pda-persistence.js',
  'v4/src/segment/segment-persistence.js',
  'v4/src/order/order-review-persistence.js',
  'v4/src/live-record/live-record-persistence.js',
  'v4/src/chart-notes/chart-note-persistence.js',
  'v4/src/time-reaction/daily-time-review-persistence.js',
  'v4/src/time-overlays/time-overlay-persistence.js',
  'v4/src/economic-calendar/economic-event-note-persistence.js',
  'v4/src/display/display-preferences.js',
  'v4/src/import/import-batch-audit.js',
  'v4/src/entry-context/entry-context-catalog-store.js',
  'v4/src/ui/calendar/calendar-date-range-history.js',
]) {
  const source = readFileSync(path, 'utf8');
  assert.match(source, /workspace-domain-registry\.js/);
  assert.equal(/const \w*WORKSPACE_DOMAIN = '[^']+'/.test(source), false, `${path} should use workspace registry`);
  assert.equal(/const \w*STORAGE_VERSION = [0-9]+;/.test(source), false, `${path} should use registry version`);
}

console.log('workspace domain registry smoke passed');
