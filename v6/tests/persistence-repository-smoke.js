import assert from 'node:assert/strict';
import {
  createMemoryPersistenceAdapter,
  createPersistenceRepository,
  createWebStoragePersistenceAdapter,
} from '../src/persistence/persistence-repository.js';

let now = 1000;
const repository = createPersistenceRepository({
  adapter: createMemoryPersistenceAdapter(),
  now: () => now,
});

const saved = repository.save({
  collection: 'workspaceDrafts',
  key: 'draft-a',
  value: {
    route: 'replay',
    title: 'Draft A',
  },
});
assert.deepEqual(saved, {
  collection: 'workspaceDrafts',
  createdAt: 1000,
  key: 'draft-a',
  updatedAt: 1000,
  value: {
    route: 'replay',
    title: 'Draft A',
  },
});
assert.deepEqual(repository.get('workspaceDrafts', 'draft-a'), saved);

now = 2000;
const updated = repository.save({
  collection: 'workspaceDrafts',
  key: 'draft-a',
  value: {
    route: 'replay',
    title: 'Draft A updated',
  },
});
assert.equal(updated.createdAt, 1000);
assert.equal(updated.updatedAt, 2000);
assert.deepEqual(updated.value, {
  route: 'replay',
  title: 'Draft A updated',
});

repository.save({
  collection: 'recentSessions',
  key: 'session-a',
  value: {
    sessionId: 'session-a',
  },
});
repository.save({
  collection: 'journalSnapshots',
  key: 'journal-a',
  value: {
    entries: [],
  },
});
assert.deepEqual(repository.list('workspaceDrafts').map((record) => record.key), ['draft-a']);
assert.deepEqual(repository.list().map((record) => `${record.collection}:${record.key}`), [
  'journalSnapshots:journal-a',
  'recentSessions:session-a',
  'workspaceDrafts:draft-a',
]);
assert.equal(repository.remove('workspaceDrafts', 'missing'), false);
assert.equal(repository.remove('workspaceDrafts', 'draft-a'), true);
assert.equal(repository.get('workspaceDrafts', 'draft-a'), null);

assert.throws(
  () => repository.save({ collection: 'chartData', key: 'bad', value: {} }),
  /Unsupported persistence collection/,
);
assert.throws(
  () => repository.save({ collection: 'userNotes', key: '', value: {} }),
  /key/,
);

const storageState = new Map();
const storage = {
  getItem(key) {
    return storageState.get(key) || null;
  },
  setItem(key, value) {
    storageState.set(key, value);
  },
};
const storageRepository = createPersistenceRepository({
  adapter: createWebStoragePersistenceAdapter({
    key: 'test.persistence',
    storage,
  }),
  now: () => 3000,
});
storageRepository.save({
  collection: 'userNotes',
  key: 'note-a',
  value: {
    body: 'note body',
  },
});
const reloadedRepository = createPersistenceRepository({
  adapter: createWebStoragePersistenceAdapter({
    key: 'test.persistence',
    storage,
  }),
});
assert.deepEqual(reloadedRepository.get('userNotes', 'note-a').value, {
  body: 'note body',
});

console.log('v6 persistence repository smoke passed');
