import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServerStateSync } from '../src/server-state-sync/public.js';
import {
  applyReplicatedEntries,
  captureReplicatedEntries,
  STATE_SYNC_METADATA_KEY,
} from '../src/server-state-sync/snapshot.js';
import { createSessionId } from '../src/session-identity/public.js';
import { createStorageAdapter, createSessionRepository } from '../src/session-persistence/public.js';
import { createSessionStore } from '../src/session-store/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const NEGATIVE_FIXTURE_PATH = path.join(
  TEST_DIR,
  'fixtures/server-state-sync/negative/cases.json',
);
const negativeFixtureDocument = JSON.parse(fs.readFileSync(NEGATIVE_FIXTURE_PATH, 'utf8'));
assert.equal(negativeFixtureDocument.schemaVersion, 1);
assert.ok(NEGATIVE_FIXTURE_PATH.startsWith(path.join(TEST_DIR, 'fixtures') + path.sep),
  'H086 negative fixtures must remain outside src/ and app/ production roots');
assert.ok(Array.isArray(negativeFixtureDocument.cases) && negativeFixtureDocument.cases.length >= 3);
const negativeCases = negativeFixtureDocument.cases.map((fixture) => {
  assert.deepEqual(Object.keys(fixture).sort(), [
    'driver', 'expectedFailureCode', 'failureMode', 'id', 'mutationOrdinal',
  ]);
  assert.match(fixture.id, /^[a-z0-9-]+$/);
  assert.match(fixture.expectedFailureCode, /^[A-Z][A-Z0-9_]+$/);
  assert.ok(Number.isSafeInteger(fixture.mutationOrdinal) && fixture.mutationOrdinal > 0);
  return Object.freeze({ ...fixture });
});
assert.equal(new Set(negativeCases.map(({ id }) => id)).size, negativeCases.length);

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  let failAtMutation = null;
  let failFromMutation = null;
  let failAfterMutation = false;
  let mutationCount = 0;

  function mutate(operation, key, callback) {
    mutationCount += 1;
    const failsOnce = mutationCount === failAtMutation;
    const failsPersistently = failFromMutation !== null && mutationCount >= failFromMutation;
    if ((failsOnce || failsPersistently) && !failAfterMutation) {
      failAtMutation = null;
      const error = new Error(`injected ${operation} failure for ${key}`);
      error.code = 'STORAGE_MUTATION_FAILED';
      throw error;
    }
    callback();
    if (failsOnce || failsPersistently) {
      failAtMutation = null;
      const error = new Error(`injected post-${operation} failure for ${key}`);
      error.code = 'STORAGE_MUTATION_FAILED';
      throw error;
    }
  }

  return {
    get length() { return values.size; },
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) {
      const normalized = String(key);
      mutate('removeItem', normalized, () => values.delete(normalized));
    },
    setItem(key, value) {
      const normalized = String(key);
      mutate('setItem', normalized, () => values.set(normalized, String(value)));
    },
    failMutationAt(ordinal) {
      assert.ok(Number.isSafeInteger(ordinal) && ordinal > 0);
      mutationCount = 0;
      failAtMutation = ordinal;
      failFromMutation = null;
      failAfterMutation = false;
    },
    failMutationsFrom(ordinal, { after = false } = {}) {
      assert.ok(Number.isSafeInteger(ordinal) && ordinal > 0);
      mutationCount = 0;
      failAtMutation = null;
      failFromMutation = ordinal;
      failAfterMutation = after;
    },
  };
}

function createStateServer(userId = 'reviewer') {
  let snapshot = {
    entries: [], revision: 0, schema: 'v7.user-state-snapshot', userId, version: 1,
  };
  let offline = false;
  let rejectedPutStatus = null;
  const requests = [];
  return {
    fetch: async (url, options = {}) => {
      if (offline) throw new Error('fixture offline');
      const method = options.method ?? 'GET';
      requests.push(method);
      if (method === 'GET') return Response.json(snapshot);
      if (rejectedPutStatus !== null) {
        return Response.json({ error: { code: 'FIXTURE_REJECTED', message: 'fixture rejection' } }, {
          status: rejectedPutStatus,
        });
      }
      const body = JSON.parse(options.body);
      if (body.expectedRevision !== snapshot.revision) {
        return Response.json({
          current: snapshot,
          error: { code: 'STATE_REVISION_CONFLICT', message: 'fixture conflict' },
        }, { status: 409 });
      }
      snapshot = {
        entries: body.entries,
        revision: snapshot.revision + 1,
        schema: 'v7.user-state-snapshot',
        userId,
        version: 1,
      };
      return Response.json(snapshot);
    },
    requests,
    rejectPutsWith(status) {
      assert.ok(Number.isSafeInteger(status) && status >= 400 && status <= 599);
      rejectedPutStatus = status;
    },
    replaceForTest(entries) {
      snapshot = {
        entries: structuredClone(entries),
        revision: snapshot.revision + 1,
        schema: 'v7.user-state-snapshot',
        userId,
        version: 1,
      };
    },
    setOffline(value) { offline = value; },
    snapshot: () => structuredClone(snapshot),
  };
}

function createStalledPutPort(server) {
  let armed = false;
  let releasePut = null;
  let startedPut = null;
  let completedPut = null;
  let putGate = Promise.resolve();
  let resolveCompleted = null;
  let resolveRelease = null;
  let resolveStarted = null;
  const requests = [];
  return {
    armNextPut() {
      armed = true;
      startedPut = new Promise((resolve) => { resolveStarted = resolve; });
      completedPut = new Promise((resolve) => { resolveCompleted = resolve; });
      putGate = new Promise((resolve) => { resolveRelease = resolve; });
      releasePut = () => resolveRelease();
      return Object.freeze({
        completed: completedPut,
        release: () => releasePut(),
        started: startedPut,
      });
    },
    async fetch(url, options = {}) {
      const method = options.method ?? 'GET';
      requests.push(method);
      if (!armed || method !== 'PUT') return server.fetch(url, options);
      armed = false;
      resolveStarted();
      try {
        await putGate;
        return await server.fetch(url, options);
      } finally {
        resolveCompleted();
      }
    },
    requests,
  };
}

function createClient(storage, server, reloads) {
  let now = 100;
  return createServerStateSync({
    crypto: webcrypto,
    fetch: server.fetch,
    now: () => ++now,
    reload: () => { reloads.count += 1; },
    storage,
  });
}

const server = createStateServer();
const firstStorage = createMemoryStorage({
  'unrelated.key': 'retained',
  'v7.session-browser:index': '{"sessions":["alpha"]}',
  'v7.session-browser:record:alpha': '{"name":"Alpha"}',
});
const firstReloads = { count: 0 };
const first = createClient(firstStorage, server, firstReloads);
assert.equal((await first.initialize()).status, 'synced');
assert.equal(server.snapshot().revision, 1, 'first device must import existing local V7 state');
assert.equal(server.snapshot().entries.length, 2);

const secondStorage = createMemoryStorage({ 'unrelated.key': 'second-retained' });
const secondReloads = { count: 0 };
const second = createClient(secondStorage, server, secondReloads);
assert.equal((await second.initialize()).status, 'synced');
assert.equal(second.storage.getItem('v7.session-browser:record:alpha'), '{"name":"Alpha"}',
  'empty second device must hydrate the server snapshot');
assert.equal(second.storage.getItem('unrelated.key'), 'second-retained');

first.storage.setItem('v7.workstation-settings:global', '{"theme":"dark"}');
first.storage.setItem('v7.color-history:global', '["#000000"]');
await first.flush();
assert.equal(server.snapshot().revision, 2);
assert.equal(server.snapshot().entries.length, 4,
  'ordered local mutations must converge as one complete server snapshot');

second.storage.setItem('v7.replay-navigation-preferences', '{"speed":"fast"}');
await second.flush();
assert.equal(second.snapshot().status, 'conflict',
  'stale second device must stop at explicit conflict instead of overwriting');
assert.equal(server.snapshot().entries.some(({ key }) => key === 'v7.replay-navigation-preferences'), false);
assert.equal(await second.resolveConflict('server'), true);
assert.equal(secondReloads.count, 1);
assert.equal(second.storage.getItem('v7.workstation-settings:global'), '{"theme":"dark"}');
assert.ok([...Array(secondStorage.length).keys()].map((index) => secondStorage.key(index))
  .some((key) => key.startsWith('v7.state-sync:backup:') && key.endsWith(':device')));

const thirdStorage = createMemoryStorage();
const thirdReloads = { count: 0 };
const third = createClient(thirdStorage, server, thirdReloads);
await third.initialize();
first.storage.setItem('v7.workstation-settings:global', '{"theme":"light"}');
await first.flush();
third.storage.setItem('v7.workstation-settings:global', '{"theme":"blue"}');
await third.flush();
assert.equal(third.snapshot().status, 'conflict');
assert.equal(await third.resolveConflict('device'), true);
assert.equal(thirdReloads.count, 1);
assert.equal(server.snapshot().entries.find(
  ({ key }) => key === 'v7.workstation-settings:global',
)?.value, '{"theme":"blue"}');

const offlineServer = createStateServer();
offlineServer.setOffline(true);
const offlineStorage = createMemoryStorage({
  'v7.session-browser:index': '{"sessions":["offline"]}',
});
const offline = createClient(offlineStorage, offlineServer, { count: 0 });
assert.equal((await offline.initialize()).status, 'offline');
offline.storage.setItem('v7.session-browser:record:offline', '{"name":"Offline"}');
await offline.flush();
assert.equal(offline.storage.getItem('v7.session-browser:record:offline'), '{"name":"Offline"}',
  'offline state must remain durable on the current device');
offlineServer.setOffline(false);
assert.equal((await offline.retry()).status, 'synced');
assert.equal(offlineServer.snapshot().entries.length, 2,
  'explicit retry must upload the complete locally retained snapshot');

const rejectedInitialServer = createStateServer();
rejectedInitialServer.rejectPutsWith(400);
const rejectedInitialStorage = createMemoryStorage({
  'v7.session-browser:index': '{"sessions":[]}',
});
const rejectedInitialClient = createClient(
  rejectedInitialStorage, rejectedInitialServer, { count: 0 },
);
assert.equal((await rejectedInitialClient.initialize()).status, 'offline',
  'a rejected first-device import must also release local-first application boot');
assert.equal(rejectedInitialStorage.getItem('v7.session-browser:index'), '{"sessions":[]}',
  'a rejected first-device import must retain local state');

const startupStorage = createMemoryStorage();
const startupRepository = createSessionRepository({
  namespace: 'v7.session-browser',
  storage: createStorageAdapter(startupStorage),
});
const startupStore = createSessionStore({ repository: startupRepository });
const sessionInput = {
  historicalRange: { endEpochMs: 120_000, presentationEndEpochMs: 120_000, startEpochMs: 60_000 },
  instrumentIds: ['instrument.cme.nq'],
};
startupStore.createSession({
  ...sessionInput,
  name: 'Retained before rejected sync',
  nowEpochMs: 60_000,
  sessionId: createSessionId('session-retained-before-rejected-sync'),
});
const rejectingServer = createStateServer();
const initialStartupClient = createClient(startupStorage, rejectingServer, { count: 0 });
assert.equal((await initialStartupClient.initialize()).status, 'synced');
rejectingServer.rejectPutsWith(400);
initialStartupClient.storage.setItem(
  'v7.calculated-series:document:session-retained-before-rejected-sync',
  '{"schema":"v7.calculated-series-document","version":1}',
);
await initialStartupClient.flush();
assert.equal(initialStartupClient.snapshot().status, 'offline');

const restartedStartupClient = createClient(startupStorage, rejectingServer, { count: 0 });
assert.equal((await restartedStartupClient.initialize()).status, 'offline',
  'a rejected startup upload must release local-first Session boot');
assert.match(restartedStartupClient.snapshot().message, /HTTP 400/u);
const restartedStore = createSessionStore({
  repository: createSessionRepository({
    namespace: 'v7.session-browser',
    storage: createStorageAdapter(restartedStartupClient.storage),
  }),
});
assert.equal(restartedStore.listSessions().length, 1,
  'a rejected calculated-series upload must not hide an existing local Session');
restartedStore.createSession({
  ...sessionInput,
  name: 'Created while sync is offline',
  nowEpochMs: 60_001,
  sessionId: createSessionId('session-created-while-sync-offline'),
});
assert.equal(restartedStore.listSessions().length, 2,
  'New Session must remain available while server sync is offline');

const localOnly = createServerStateSync({
  crypto: webcrypto,
  fetch: async () => new Response('Not found', { status: 404 }),
  now: () => 1,
  reload: () => {},
  storage: createMemoryStorage(),
});
assert.equal((await localOnly.initialize()).status, 'local',
  'a deployment without the optional state route must retain original local-only behavior');

const hanging = createServerStateSync({
  crypto: webcrypto,
  fetch: async (_url, options) => new Promise((_resolve, reject) => {
    const guard = setTimeout(() => reject(new Error('timeout signal was not delivered')), 1_000);
    options.signal.addEventListener('abort', () => {
      clearTimeout(guard);
      reject(options.signal.reason);
    }, { once: true });
  }),
  now: () => 1,
  reload: () => {},
  requestTimeoutMs: 10,
  storage: createMemoryStorage({ 'v7.session-browser:index': '{"sessions":[]}' }),
});
assert.equal((await hanging.initialize()).status, 'offline',
  'a hanging state route must time out and release local-first application boot');

const baselineEntries = [
  { key: 'v7.session-browser:index', value: '{"sessions":["atomic"]}' },
  { key: 'v7.session-browser:record:atomic', value: '{"name":"Atomic"}' },
];
const updatedEntries = [
  ...baselineEntries,
  { key: 'v7.workstation-settings:global', value: '{"theme":"remote"}' },
];

const emptyHydrationServer = createStateServer();
emptyHydrationServer.replaceForTest(baselineEntries);
for (let failureStage = 1; failureStage <= baselineEntries.length + 1; failureStage += 1) {
  const storage = createMemoryStorage({ 'unrelated.key': 'empty-device-retained' });
  const reloads = { count: 0 };
  const client = createClient(storage, emptyHydrationServer, reloads);
  storage.failMutationAt(failureStage);
  assert.equal((await client.initialize()).status, 'offline',
    `empty-device hydration stage ${failureStage} must fail closed`);
  assert.deepEqual(captureReplicatedEntries(storage), [],
    `empty-device hydration stage ${failureStage} must restore the empty snapshot`);
  assert.equal(storage.getItem(STATE_SYNC_METADATA_KEY), null);
  assert.equal(storage.getItem('unrelated.key'), 'empty-device-retained');
  assert.equal(reloads.count, 0);
  await client.dispose();
}

const automaticHydrationServer = createStateServer();
automaticHydrationServer.replaceForTest(baselineEntries);
const automaticStorage = createMemoryStorage(Object.fromEntries(
  baselineEntries.map(({ key, value }) => [key, value]),
));
automaticStorage.setItem('unrelated.key', 'automatic-retained');
const automaticReloads = { count: 0 };
const automaticClient = createClient(automaticStorage, automaticHydrationServer, automaticReloads);
assert.equal((await automaticClient.initialize()).status, 'synced');
const automaticOriginal = captureReplicatedEntries(automaticStorage);
const automaticMetadata = automaticStorage.getItem(STATE_SYNC_METADATA_KEY);
automaticHydrationServer.replaceForTest(updatedEntries);
const automaticMutationStages = automaticOriginal.length + updatedEntries.length + 1;
for (let failureStage = 1; failureStage <= automaticMutationStages; failureStage += 1) {
  automaticStorage.failMutationAt(failureStage);
  assert.equal((await automaticClient.retry()).status, 'offline',
    `automatic hydration stage ${failureStage} must fail closed`);
  assert.deepEqual(captureReplicatedEntries(automaticStorage), automaticOriginal,
    `automatic hydration stage ${failureStage} must restore the original snapshot`);
  assert.equal(automaticStorage.getItem(STATE_SYNC_METADATA_KEY), automaticMetadata,
    `automatic hydration stage ${failureStage} must restore sync metadata`);
  assert.equal(automaticStorage.getItem('unrelated.key'), 'automatic-retained');
  assert.equal(automaticReloads.count, 0);
}
assert.equal((await automaticClient.retry()).status, 'synced');
assert.deepEqual(captureReplicatedEntries(automaticStorage), updatedEntries);

const conflictHydrationServer = createStateServer();
conflictHydrationServer.replaceForTest(baselineEntries);
const conflictStorage = createMemoryStorage(Object.fromEntries(
  baselineEntries.map(({ key, value }) => [key, value]),
));
conflictStorage.setItem('unrelated.key', 'conflict-retained');
const conflictReloads = { count: 0 };
const conflictClient = createClient(conflictStorage, conflictHydrationServer, conflictReloads);
assert.equal((await conflictClient.initialize()).status, 'synced');
conflictHydrationServer.replaceForTest(updatedEntries);
conflictClient.storage.setItem('v7.replay-navigation-preferences', '{"speed":"local"}');
await conflictClient.flush();
assert.equal(conflictClient.snapshot().status, 'conflict');
const conflictOriginal = captureReplicatedEntries(conflictStorage);
const conflictMetadata = conflictStorage.getItem(STATE_SYNC_METADATA_KEY);
const conflictMutationStages = 1 + conflictOriginal.length + updatedEntries.length + 1;
for (let failureStage = 1; failureStage <= conflictMutationStages; failureStage += 1) {
  conflictStorage.failMutationAt(failureStage);
  assert.equal(await conflictClient.resolveConflict('server'), false,
    `server conflict hydration stage ${failureStage} must fail closed`);
  assert.equal(conflictClient.snapshot().status, 'conflict');
  assert.deepEqual(captureReplicatedEntries(conflictStorage), conflictOriginal,
    `server conflict hydration stage ${failureStage} must restore the device snapshot`);
  assert.equal(conflictStorage.getItem(STATE_SYNC_METADATA_KEY), conflictMetadata,
    `server conflict hydration stage ${failureStage} must restore sync metadata`);
  assert.equal(conflictStorage.getItem('unrelated.key'), 'conflict-retained');
  assert.equal(conflictReloads.count, 0);
}
assert.equal(await conflictClient.resolveConflict('server'), true);
assert.equal(conflictReloads.count, 1);
assert.deepEqual(captureReplicatedEntries(conflictStorage), updatedEntries);

async function driveSnapshotExactRollback(fixture) {
  assert.equal(fixture.failureMode, 'once-before-mutation');
  const storage = createMemoryStorage({
    ...Object.fromEntries(baselineEntries.map(({ key, value }) => [key, value])),
    [STATE_SYNC_METADATA_KEY]: '{"exact":"metadata"}',
    'unrelated.key': 'ordinary-retained',
  });
  const exactBefore = captureReplicatedEntries(storage);
  const metadataBefore = storage.getItem(STATE_SYNC_METADATA_KEY);
  storage.failMutationAt(fixture.mutationOrdinal);
  let observedError = null;
  try {
    applyReplicatedEntries(storage, updatedEntries);
  } catch (error) {
    observedError = error;
  }
  assert.equal(observedError?.code, fixture.expectedFailureCode,
    `${fixture.id} must surface the original ordinary storage failure`);
  assert.deepEqual(captureReplicatedEntries(storage), exactBefore,
    `${fixture.id} must restore the byte-identical allowlisted snapshot`);
  assert.equal(storage.getItem(STATE_SYNC_METADATA_KEY), metadataBefore);
  assert.equal(storage.getItem('unrelated.key'), 'ordinary-retained');
  return observedError.code;
}

async function driveInitialHydrationPoison(fixture) {
  assert.equal(fixture.failureMode, 'persistent-after-mutation');
  const serverUnderTest = createStateServer();
  serverUnderTest.replaceForTest(updatedEntries);
  const storage = createMemoryStorage({ 'unrelated.key': 'poison-retained' });
  storage.failMutationsFrom(fixture.mutationOrdinal, { after: true });
  const client = createClient(storage, serverUnderTest, { count: 0 });
  let observedError = null;
  try {
    await client.initialize();
  } catch (error) {
    observedError = error;
  }
  assert.equal(observedError?.code, fixture.expectedFailureCode,
    `${fixture.id} must reject initialization with reload-required`);
  assert.equal(client.snapshot().status, 'poisoned');
  assert.match(client.snapshot().message, /Reload this page/);
  const poisonedSnapshot = client.snapshot();
  const requestCount = serverUnderTest.requests.length;
  assert.equal((await client.retry()).status, 'poisoned');
  assert.deepEqual(client.snapshot(), poisonedSnapshot);
  assert.equal(await client.resolveConflict('server'), false);
  assert.throws(
    () => client.storage.setItem('v7.workstation-settings:global', '{"theme":"blocked"}'),
    (error) => error?.code === fixture.expectedFailureCode,
  );
  assert.throws(
    () => client.storage.removeItem('v7.session-browser:index'),
    (error) => error?.code === fixture.expectedFailureCode,
  );
  await client.flush();
  await client.dispose();
  assert.equal(serverUnderTest.requests.length, requestCount,
    `${fixture.id} retry, flush, and dispose must remain inert`);
  return observedError.code;
}

async function driveLatePutPoisonSeal(fixture) {
  assert.equal(fixture.failureMode, 'persistent-after-mutation');
  const serverUnderTest = createStateServer();
  serverUnderTest.replaceForTest(baselineEntries);
  const port = createStalledPutPort(serverUnderTest);
  const storage = createMemoryStorage(Object.fromEntries(
    baselineEntries.map(({ key, value }) => [key, value]),
  ));
  const client = createServerStateSync({
    crypto: webcrypto,
    fetch: port.fetch,
    now: () => 200,
    reload: () => {},
    storage,
  });
  assert.equal((await client.initialize()).status, 'synced');
  const stalledPut = port.armNextPut();
  client.storage.setItem('v7.replay-navigation-preferences', '{"speed":"local"}');
  await stalledPut.started;
  serverUnderTest.replaceForTest(updatedEntries);
  assert.equal((await client.retry()).status, 'conflict');
  storage.failMutationsFrom(fixture.mutationOrdinal, { after: true });
  assert.equal(await client.resolveConflict('server'), false);
  assert.equal(client.snapshot().status, 'poisoned');
  const poisonedSnapshot = client.snapshot();
  let blockedError = null;
  try {
    client.storage.setItem('v7.workstation-settings:global', '{"theme":"blocked"}');
  } catch (error) {
    blockedError = error;
  }
  assert.equal(blockedError?.code, fixture.expectedFailureCode);
  stalledPut.release();
  await stalledPut.completed;
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(client.snapshot(), poisonedSnapshot,
    `${fixture.id} must reject the stale PUT result after poison`);
  await client.flush();
  await client.dispose();
  return blockedError.code;
}

const negativeDrivers = Object.freeze({
  'initial-hydration-poison': driveInitialHydrationPoison,
  'late-put-poison-seal': driveLatePutPoisonSeal,
  'snapshot-exact-rollback': driveSnapshotExactRollback,
});
const negativeResults = [];
for (const fixture of negativeCases) {
  const driver = negativeDrivers[fixture.driver];
  assert.equal(typeof driver, 'function', `${fixture.id} must name an executable negative driver`);
  const observedFailureCode = await driver(fixture);
  assert.equal(observedFailureCode, fixture.expectedFailureCode);
  negativeResults.push(Object.freeze({ id: fixture.id, observedFailureCode }));
}
assert.equal(negativeResults.length, negativeCases.length,
  'every H086 negative fixture must be executed');

await Promise.all([
  first.dispose(), second.dispose(), third.dispose(), offline.dispose(), localOnly.dispose(), hanging.dispose(),
  automaticClient.dispose(), conflictClient.dispose(), initialStartupClient.dispose(),
  rejectedInitialClient.dispose(), restartedStartupClient.dispose(),
]);
console.log('v7 server state sync harness passed', {
  negativeFixtures: negativeResults.length,
  scope: 'import, exact/poisoned hydration, rejected-upload local boot, late-PUT seal, timeout/offline retry, ordered write, conflict x2',
});
