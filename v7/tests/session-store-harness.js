import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeActivationGeneration } from '../src/activation-generation/public.js';
import { createSessionId, serializeSessionId, sessionIdsEqual } from '../src/session-identity/public.js';
import {
  createPaneLayout,
  deserializePaneLayout,
  readPaneLayout,
  serializePaneLayout,
} from '../src/pane-layout-domain/public.js';
import {
  createLayoutSync,
  deserializeLayoutSync,
  readLayoutSync,
  setLayoutSync,
} from '../src/layout-sync-domain/public.js';
import {
  createReplayNavigationSettings,
  deserializeReplayNavigationSettings,
  readReplayNavigationSettings,
  serializeReplayNavigationSettings,
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
import {
  createWorkspaceCheckpoint,
  deserializeWorkspaceCheckpoint,
  readWorkspaceCheckpoint,
} from '../src/workspace-checkpoint-domain/public.js';
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

let repository = makeRepository();
let store = createSessionStore({ repository });
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
assert.equal(createdA.configuration.historicalRange.presentationEndEpochMs, 200,
  'legacy/exclusive Session input must default its presented End to the stored End');
const presentedEndRecord = createSessionRecord({
  ...base,
  historicalRange: { startEpochMs: 100, endEpochMs: 201, presentationEndEpochMs: 200 },
  sessionId: createSessionId('session-presented-end'),
});
assert.deepEqual(presentedEndRecord.configuration.historicalRange, {
  startEpochMs: 100, endEpochMs: 201, presentationEndEpochMs: 200,
});
assert.throws(
  () => createSessionRecord({
    ...base,
    historicalRange: { startEpochMs: 100, endEpochMs: 200, presentationEndEpochMs: 201 },
    sessionId: createSessionId('session-invalid-presented-end'),
  }),
  (error) => error instanceof SessionStoreError && error.code === 'INVALID_SESSION_RANGE_PRESENTATION',
);
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
assert.equal(savedLayoutA.workspace.schemaVersion, 5);
assert.equal(readPaneLayout(deserializePaneLayout(savedLayoutA.workspace.paneLayout)).variantId,
  'layout.four-grid');
assert.deepEqual(readLayoutSync(deserializeLayoutSync(savedLayoutA.workspace.layoutSync)),
  readLayoutSync(createLayoutSync()),
  'a legacy/uninitialized workspace gains the reviewed Layout Sync defaults');
assert.equal(store.getSession(sessionB).workspace.state, 'uninitialized',
  'layout persistence must remain isolated to its explicit Session');

const syncedLayoutA = store.saveLayoutSync(sessionA, {
  layoutSync: setLayoutSync(createLayoutSync(), 'crosshair', true),
  nowEpochMs: 56,
});
assert.equal(syncedLayoutA.revision, savedLayoutA.revision + 1);
assert.equal(serializeActivationGeneration(syncedLayoutA.activationGeneration).value,
  serializeActivationGeneration(secondA.activationGeneration).value,
  'Layout Sync persistence must not create a new Session activation');
assert.equal(readLayoutSync(deserializeLayoutSync(syncedLayoutA.workspace.layoutSync)).crosshair, true);
assert.equal(store.getSession(sessionB).workspace.state, 'uninitialized',
  'Layout Sync persistence must remain isolated to its explicit Session');

const checkpointA = createWorkspaceCheckpoint({
  activePaneId: 'pane-secondary',
  cursorEpochMs: 150,
  panes: ['pane-main', 'pane-secondary', 'pane-tertiary', 'pane-quaternary'].map(
    (paneId, index) => ({
      instrumentId: 'instrument.nq',
      paneId,
      timeframeId: index === 1 ? 'timeframe.display-4-hour' : 'timeframe.display-1-minute',
      viewport: index === 1
        ? { latestOffsetBars: -2, origin: 'manual', spanBars: 64 }
        : { latestOffsetBars: 12, origin: 'default', spanBars: null },
    }),
  ),
  sessionHoursMode: 'rth',
}, base);
const checkpointedA = store.saveWorkspaceCheckpoint(sessionA, {
  checkpoint: checkpointA,
  layout: fourPaneLayout,
  layoutSync: setLayoutSync(createLayoutSync(), 'crosshair', true),
  nowEpochMs: 57,
});
assert.equal(checkpointedA.workspace.schemaVersion, 6);
assert.equal(checkpointedA.revision, syncedLayoutA.revision + 1);
assert.deepEqual(readWorkspaceCheckpoint(deserializeWorkspaceCheckpoint(
  checkpointedA.workspace.checkpoint,
  checkpointedA.configuration,
)), readWorkspaceCheckpoint(checkpointA));
assert.equal(readPaneLayout(deserializePaneLayout(checkpointedA.workspace.paneLayout)).paneCount, 4);
const sessionARecordKey = `acceptance.sessions:record:${serializeSessionId(sessionA).value}`;
const exactCheckpointRecord = webStorage.getItem(sessionARecordKey);
const reversibleCheckpoint = store.saveWorkspaceCheckpointReversible(sessionA, {
  checkpoint: checkpointA,
  layout: fourPaneLayout,
  layoutSync: setLayoutSync(createLayoutSync(), 'crosshair', true),
  nowEpochMs: 58,
});
assert.equal(reversibleCheckpoint.record.revision, checkpointedA.revision + 1);
reversibleCheckpoint.rollback();
assert.equal(webStorage.getItem(sessionARecordKey), exactCheckpointRecord,
  'Workspace checkpoint rollback must restore the byte-identical Session envelope');
assert.equal(store.getSession(sessionA).revision, checkpointedA.revision);
assert.throws(
  () => store.savePaneLayout(sessionA, { layout: createPaneLayout(), nowEpochMs: 58 }),
  (error) => error instanceof SessionStoreError && error.code === 'INVALID_SESSION_WORKSPACE',
  'legacy partial writes must not split a schema-6 layout from its complete checkpoint',
);
const preservedCheckpointA = store.saveLayoutSync(sessionA, {
  layoutSync: createLayoutSync(),
  nowEpochMs: 59,
});
assert.equal(preservedCheckpointA.workspace.schemaVersion, 6);
assert.deepEqual(preservedCheckpointA.workspace.checkpoint, checkpointedA.workspace.checkpoint,
  'compatible legacy Layout Sync writes must retain the complete checkpoint');

const legacyNavigationSettings = createReplayNavigationSettings({
  asianSession: '20:00',
  dayOpen: '17:45',
  londonSession: '03:00',
  newYorkSession: '10:15',
  silverBulletLondon: '04:00',
  silverBulletNewYorkAm: '11:00',
  silverBulletNewYorkPm: '15:00',
});
assert.equal(Object.hasOwn(savedLayoutA.workspace, 'replayNavigationSettings'), false,
  'current Session workspace must not own workstation-wide GoTo preferences');

const legacyId = createSessionId('session-legacy-goto');
const legacyRecord = createSessionRecord({ ...base, name: 'Legacy GoTo', sessionId: legacyId });
repository.insert(legacyId, serializeSessionRecord({
  ...legacyRecord,
  workspace: {
    paneLayout: serializePaneLayout(createPaneLayout()),
    replayNavigationSettings: serializeReplayNavigationSettings(legacyNavigationSettings),
    schemaVersion: 3,
    state: 'configured',
  },
}));
const restoredLegacy = store.getSession(legacyId);
assert.deepEqual(readReplayNavigationSettings(deserializeReplayNavigationSettings(
  restoredLegacy.workspace.replayNavigationSettings,
)), readReplayNavigationSettings(legacyNavigationSettings),
'legacy schema-3 Session settings must remain readable for one-time global migration');
assert.equal(store.savePaneLayout(legacyId, {
  layout: createPaneLayout(),
  nowEpochMs: 58,
}).workspace.schemaVersion, 5,
'the next Session workspace save must remove the retired Session-scoped preference field');

repository = makeRepository();
store = createSessionStore({ repository });
const restoredA = store.getSession(sessionA);
const restoredB = store.getSession(sessionB);
assert.equal(sessionIdsEqual(restoredA.sessionId, sessionA), true);
assert.equal(restoredA.metadata.name, 'Alpha');
assert.equal(restoredB.metadata.name, 'Beta');
assert.equal(restoredB.workspace.state, 'uninitialized');
assert.equal(serializeActivationGeneration(restoredA.activationGeneration).value, 2);
assert.equal(restoredA.workspace.paneLayout.variantId, 'layout.four-grid');
assert.equal(restoredA.workspace.paneLayout.ratios.root, 0.6);
assert.equal(restoredA.workspace.schemaVersion, 6);
assert.equal(readLayoutSync(deserializeLayoutSync(restoredA.workspace.layoutSync)).crosshair, false);
assert.equal(readWorkspaceCheckpoint(deserializeWorkspaceCheckpoint(
  restoredA.workspace.checkpoint,
  restoredA.configuration,
)).activePaneId, 'pane-secondary');
assert.equal(Object.hasOwn(restoredA.workspace, 'replayNavigationSettings'), false);
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
