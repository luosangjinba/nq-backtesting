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
for (const fixture of negativeCases) {
  const operation = fixture.operation === 'list'
    ? () => createSessionListViewModel({ state: fixture.state, records: [] })
    : () => createOpenedSessionViewModel({ state: fixture.state, record: null });
  assert.throws(operation, new RegExp(fixture.expectedMessage));
}

console.log('v7 Session Browser view-model harness passed (6 visible states, 2 negative controls)');
