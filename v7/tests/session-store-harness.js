import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeActivationGeneration } from '../src/activation-generation/public.js';
import { createSessionId, serializeSessionId, sessionIdsEqual } from '../src/session-identity/public.js';
import { createPaneLayout, deserializePaneLayout, readPaneLayout } from '../src/pane-layout-domain/public.js';
import {
  createReplayNavigationSettings,
  deserializeReplayNavigationSettings,
  readReplayNavigationSettings,
} from '../src/replay-navigation-settings/public.js';
import {
  createSessionRepository,
  createStorageAdapter,
  SessionPersistenceError,
} from '../src/session-persistence/public.js';
import {
  createSessionRecord,
  createSessionStore,
  deserializeSessionRecord,
  serializeSessionRecord,
  SessionStoreError,
} from '../src/session-store/public.js';
import { createMemoryWebStorage } from './support/memory-web-storage.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/session-store/negative/cases.json'),
  'utf8',
));
const webStorage = createMemoryWebStorage();
const makeRepository = () => createSessionRepository({
  storage: createStorageAdapter(webStorage),
  namespace: 'acceptance.sessions',
});
const sessionA = createSessionId('session-A');
const sessionB = createSessionId('session-B');
const base = Object.freeze({
  name: 'Alpha',
  historicalRange: { startEpochMs: 100, endEpochMs: 200 },
  instrumentIds: ['instrument.nq'],
  nowEpochMs: 10,
});

let store = createSessionStore({ repository: makeRepository() });
const createdA = store.createSession({ ...base, sessionId: sessionA });
const createdB = store.createSession({
  ...base,
  sessionId: sessionB,
  name: 'Beta',
  historicalRange: { startEpochMs: 300, endEpochMs: 400 },
  instrumentIds: ['instrument.es'],
  nowEpochMs: 20,
});
assert.equal(createdA.activationGeneration, null);
assert.equal(createdB.activationGeneration, null);
assert.equal(store.listSessions().length, 2);
assert.equal(store.getSession(sessionA).metadata.name, 'Alpha');
assert.equal(store.getSession(sessionB).metadata.name, 'Beta');

const firstA = store.activateSession(sessionA, { nowEpochMs: 30 });
const firstB = store.activateSession(sessionB, { nowEpochMs: 40 });
const secondA = store.activateSession(sessionA, { nowEpochMs: 50 });
assert.deepEqual(serializeActivationGeneration(firstA.activationGeneration).value, 1);
assert.deepEqual(serializeActivationGeneration(firstB.activationGeneration).value, 1);
assert.deepEqual(serializeActivationGeneration(secondA.activationGeneration).value, 2);
assert.equal(store.getSession(sessionA).metadata.name, 'Alpha');
assert.equal(store.getSession(sessionB).metadata.name, 'Beta');
assert.equal(store.getSession(sessionB).configuration.instrumentIds[0], 'instrument.es');

const fourPaneLayout = createPaneLayout({
  ratios: { root: 0.6, 'root.first': 0.45, 'root.second': 0.55 },
  variantId: 'layout.four-grid',
});
const layoutRevision = secondA.revision;
const savedLayoutA = store.savePaneLayout(sessionA, { layout: fourPaneLayout, nowEpochMs: 55 });
assert.equal(savedLayoutA.revision, layoutRevision + 1);
assert.equal(serializeActivationGeneration(savedLayoutA.activationGeneration).value,
  serializeActivationGeneration(secondA.activationGeneration).value,
  'layout persistence must not create a new Session activation');
assert.equal(savedLayoutA.workspace.state, 'configured');
assert.equal(savedLayoutA.workspace.schemaVersion, 3);
assert.equal(readPaneLayout(deserializePaneLayout(savedLayoutA.workspace.paneLayout)).variantId,
  'layout.four-grid');
assert.equal(store.getSession(sessionB).workspace.state, 'uninitialized',
  'layout persistence must remain isolated to its explicit Session');

const customNavigationSettings = createReplayNavigationSettings({
  asianSession: '20:00',
  dayOpen: '17:45',
  londonSession: '03:00',
  newYorkSession: '10:15',
  silverBulletLondon: '04:00',
  silverBulletNewYorkAm: '11:00',
  silverBulletNewYorkPm: '15:00',
});
const settingsRevision = savedLayoutA.revision;
const savedSettingsA = store.saveReplayNavigationSettings(sessionA, {
  nowEpochMs: 56,
  settings: customNavigationSettings,
});
assert.equal(savedSettingsA.revision, settingsRevision + 1);
assert.equal(readPaneLayout(deserializePaneLayout(savedSettingsA.workspace.paneLayout)).variantId,
  'layout.four-grid', 'saving GoTo settings preserves the accepted Pane layout');
assert.deepEqual(readReplayNavigationSettings(deserializeReplayNavigationSettings(
  savedSettingsA.workspace.replayNavigationSettings,
)), readReplayNavigationSettings(customNavigationSettings));
assert.equal(store.getSession(sessionB).workspace.state, 'uninitialized',
  'GoTo settings persistence remains isolated to its explicit Session');
const settingsOnlyB = store.saveReplayNavigationSettings(sessionB, {
  nowEpochMs: 57,
  settings: createReplayNavigationSettings(),
});
assert.equal(settingsOnlyB.workspace.schemaVersion, 3);
assert.equal(readPaneLayout(deserializePaneLayout(settingsOnlyB.workspace.paneLayout)).variantId,
  'layout.single', 'settings-first persistence must retain the default Pane layout');
assert.deepEqual(readReplayNavigationSettings(deserializeReplayNavigationSettings(
  settingsOnlyB.workspace.replayNavigationSettings,
)), readReplayNavigationSettings(createReplayNavigationSettings()));

store = createSessionStore({ repository: makeRepository() });
const restoredA = store.getSession(sessionA);
const restoredB = store.getSession(sessionB);
assert.equal(sessionIdsEqual(restoredA.sessionId, sessionA), true);
assert.equal(restoredA.metadata.name, 'Alpha');
assert.equal(restoredB.metadata.name, 'Beta');
assert.equal(restoredB.workspace.schemaVersion, 3);
assert.equal(serializeActivationGeneration(restoredA.activationGeneration).value, 2);
assert.equal(restoredA.workspace.paneLayout.variantId, 'layout.four-grid');
assert.equal(restoredA.workspace.paneLayout.ratios.root, 0.6);
assert.equal(readReplayNavigationSettings(deserializeReplayNavigationSettings(
  restoredA.workspace.replayNavigationSettings,
)).silverBulletNewYorkPm, '15:00');
assert.equal(store.activateSession(sessionA, { nowEpochMs: 60 }).activationGeneration.value(), 3,
  'runtime reconstruction must allocate a strictly later activation');
const removableId = createSessionId('session-removable');
store.createSession({ ...base, name: 'Removable', sessionId: removableId });
const deleted = store.deleteSession(removableId);
assert.equal(deleted.metadata.name, 'Removable');
assert.equal(store.listSessions().some((record) => sessionIdsEqual(record.sessionId, removableId)), false);
assert.throws(
  () => store.getSession(removableId),
  (error) => error instanceof SessionStoreError && error.code === 'SESSION_NOT_FOUND',
  'deleted Sessions must no longer be addressable',
);
store = createSessionStore({ repository: makeRepository() });
assert.equal(store.listSessions().some((record) => sessionIdsEqual(record.sessionId, removableId)), false,
  'Session deletion must survive Store reconstruction');

const v1Wire = serializeSessionRecord(createSessionRecord({ ...base, sessionId: createSessionId('migration') }));
const v0Wire = { ...v1Wire, version: 0, legacyName: v1Wire.metadata.name };
delete v0Wire.metadata;
const migrated = deserializeSessionRecord(v0Wire, {
  migrations: {
    0(old) {
      const { legacyName, ...rest } = old;
      return { ...rest, version: 1, metadata: { ...v1Wire.metadata, name: legacyName } };
    },
  },
});
assert.equal(migrated.metadata.name, 'Alpha', 'explicit record migration must restore current schema');

const validWire = serializeSessionRecord(createSessionRecord({
  ...base,
  sessionId: createSessionId('fixture'),
}));
for (const fixture of negativeCases) {
  let operation;
  if (fixture.operation === 'create') {
    operation = () => createSessionRecord({
      ...base,
      ...fixture.patch,
      sessionId: createSessionId(`negative-${fixture.expectedCode}`),
    });
  } else if (fixture.operation === 'deserialize') {
    operation = () => deserializeSessionRecord({ ...validWire, ...fixture.patch });
  } else if (fixture.operation === 'mismatchedStoredIdentity') {
    operation = () => {
      const mismatchStorage = createMemoryWebStorage();
      const mismatchRepository = createSessionRepository({
        storage: createStorageAdapter(mismatchStorage),
        namespace: 'mismatch.sessions',
      });
      const keyA = createSessionId('mismatch-A');
      const valueB = createSessionRecord({ ...base, sessionId: createSessionId('mismatch-B') });
      mismatchRepository.insert(keyA, serializeSessionRecord(valueB));
      createSessionStore({ repository: mismatchRepository }).getSession(keyA);
    };
  } else if (fixture.operation === 'deleteUnknown') {
    operation = () => store.deleteSession(createSessionId('unknown-delete'));
  } else if (fixture.operation === 'staleRepositoryRemove') {
    operation = () => {
      const staleRepository = createSessionRepository({
        storage: createStorageAdapter(createMemoryWebStorage()),
        namespace: 'stale-remove.sessions',
      });
      const sessionId = createSessionId('stale-remove');
      staleRepository.insert(sessionId, { name: 'Stale remove' });
      staleRepository.compareAndSwap(sessionId, 1, { name: 'Changed' });
      staleRepository.remove(sessionId, 1);
    };
  } else {
    operation = () => store.getSession(createSessionId('unknown'));
  }
  assert.throws(operation, (error) => (error instanceof SessionStoreError
    || error instanceof SessionPersistenceError) && error.code === fixture.expectedCode,
    `${fixture.name} must fail with ${fixture.expectedCode}`);
}

console.log(`v7 Session Store harness passed (${negativeCases.length} negative controls)`);
