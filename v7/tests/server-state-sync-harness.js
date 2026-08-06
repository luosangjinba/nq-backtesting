import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createServerStateSync } from '../src/server-state-sync/public.js';

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(String(key)); },
    setItem(key, value) { values.set(String(key), String(value)); },
  };
}

function createStateServer(userId = 'reviewer') {
  let snapshot = {
    entries: [], revision: 0, schema: 'v7.user-state-snapshot', userId, version: 1,
  };
  let offline = false;
  const requests = [];
  return {
    fetch: async (url, options = {}) => {
      if (offline) throw new Error('fixture offline');
      const method = options.method ?? 'GET';
      requests.push(method);
      if (method === 'GET') return Response.json(snapshot);
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
    setOffline(value) { offline = value; },
    snapshot: () => structuredClone(snapshot),
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

await Promise.all([
  first.dispose(), second.dispose(), third.dispose(), offline.dispose(), localOnly.dispose(), hanging.dispose(),
]);
console.log('v7 server state sync harness passed (import, hydration, timeout/offline retry, ordered write, conflict x2)');
