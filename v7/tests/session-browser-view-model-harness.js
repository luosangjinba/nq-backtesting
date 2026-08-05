import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSessionId } from '../src/session-identity/public.js';
import { createSessionRecord } from '../src/session-store/public.js';
import {
  createOpenedSessionViewModel,
  createSessionListViewModel,
  SESSION_BROWSER_STATES,
} from '../src/session-browser-ui/public.js';
import {
  resolveSessionBoundaryWallMinute,
  sessionBoundaryMarketDates,
} from '../src/session-browser-ui/market-date-policy.js';

const record = createSessionRecord({
  sessionId: createSessionId('view-model-session'),
  name: 'New York open',
  historicalRange: { startEpochMs: 100, endEpochMs: 200 },
  instrumentIds: ['instrument.cme.nq'],
  nowEpochMs: 50,
});
const labels = { 'instrument.cme.nq': 'NQ' };
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/session-browser/negative/cases.json'),
  'utf8',
));

assert.deepEqual(SESSION_BROWSER_STATES, ['loading', 'empty', 'unavailable', 'stale', 'error', 'ready']);
for (const state of SESSION_BROWSER_STATES) {
  const records = state === 'ready' || state === 'stale' || state === 'error' ? [record] : [];
  const model = createSessionListViewModel({ state, records, instrumentLabels: labels });
  assert.equal(Object.isFrozen(model), true);
  assert.equal(model.screen, 'list');
}
assert.equal(createSessionListViewModel({ state: 'ready', records: [] }).state, 'empty');

const opened = createOpenedSessionViewModel({ state: 'ready', record, instrumentLabels: labels });
assert.equal(opened.session.name, 'New York open');
assert.equal(opened.session.instruments[0].label, 'NQ');
assert.equal('revision' in opened.session, false, 'customer view model must hide revision diagnostics');
assert.equal('activationGeneration' in opened.session, false, 'customer view model must hide generation diagnostics');
assert.equal('createdAtEpochMs' in opened.session, false,
  'customer Session summaries must not confuse creation metadata with the historical range');

const availability = Object.freeze({
  'instrument.cme.nq': Object.freeze({
    dates: Object.freeze(['2026-05-01', '2026-05-03', '2026-05-08']),
  }),
  'instrument.cme.es': Object.freeze({
    dates: Object.freeze(['2026-05-01', '2026-05-03', '2026-05-08']),
  }),
});
assert.deepEqual(sessionBoundaryMarketDates(
  availability, ['instrument.cme.nq', 'instrument.cme.es'], 'start',
), ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-08']);
assert.deepEqual(sessionBoundaryMarketDates(
  availability, ['instrument.cme.nq', 'instrument.cme.es'], 'end',
), ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-08', '2026-05-09']);
assert.equal(resolveSessionBoundaryWallMinute('2026-05-02T12:34', 'start'), '2026-05-03T18:00');
assert.equal(resolveSessionBoundaryWallMinute('2026-05-09T12:34', 'end'), '2026-05-08T16:59');
assert.equal(resolveSessionBoundaryWallMinute('2026-05-08T12:34', 'end'), '2026-05-08T12:34');
for (const fixture of negativeCases) {
  const operation = fixture.operation === 'list'
    ? () => createSessionListViewModel({ state: fixture.state, records: [] })
    : () => createOpenedSessionViewModel({ state: fixture.state, record: null });
  assert.throws(operation, new RegExp(fixture.expectedMessage));
}

console.log('v7 Session Browser view-model harness passed (6 visible states, 2 negative controls)');
