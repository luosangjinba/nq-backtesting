import assert from 'node:assert/strict';
import { createSessionId, sessionIdsEqual } from '../src/session-identity/public.js';
import {
  createSessionRepository,
  createStorageAdapter,
  SessionPersistenceError,
} from '../src/session-persistence/public.js';
import { createMemoryWebStorage } from './support/memory-web-storage.js';

const webStorage = createMemoryWebStorage();
const repository = createSessionRepository({
  storage: createStorageAdapter(webStorage),
  namespace: 'test.sessions',
});
const sessionA = createSessionId('A');
const sessionB = createSessionId('B');

repository.insert(sessionA, { revision: 1, name: 'Alpha' });
repository.insert(sessionB, { revision: 1, name: 'Beta' });
assert.deepEqual(repository.read(sessionA), { revision: 1, value: { revision: 1, name: 'Alpha' } });
assert.deepEqual(repository.read(sessionB), { revision: 1, value: { revision: 1, name: 'Beta' } });
assert.equal(repository.listSessionIds().some((id) => sessionIdsEqual(id, sessionA)), true);
assert.equal(repository.listSessionIds().some((id) => sessionIdsEqual(id, sessionB)), true);

repository.compareAndSwap(sessionA, 1, { revision: 2, name: 'Alpha 2' });
assert.equal(repository.read(sessionA).value.name, 'Alpha 2');
assert.equal(repository.read(sessionB).value.name, 'Beta', 'A write must not touch B');
assert.throws(
  () => repository.compareAndSwap(sessionA, 1, { revision: 2, name: 'stale' }),
  (error) => error instanceof SessionPersistenceError && error.code === 'SESSION_REVISION_CONFLICT',
);
assert.throws(
  () => repository.insert(sessionA, { revision: 1, name: 'duplicate' }),
  (error) => error instanceof SessionPersistenceError && error.code === 'SESSION_ALREADY_EXISTS',
);

const keys = webStorage.keys();
assert.equal(keys.includes('test.sessions:index'), true);
assert.equal(keys.includes('test.sessions:record:A'), true);
assert.equal(keys.includes('test.sessions:record:B'), true);
assert.equal(keys.some((key) => /active|current|last-opened/i.test(key)), false,
  'persistence must not create an implicit active Session key');

const reconstructed = createSessionRepository({
  storage: createStorageAdapter(webStorage),
  namespace: 'test.sessions',
});
assert.equal(reconstructed.read(sessionA).value.name, 'Alpha 2');
assert.equal(reconstructed.read(sessionB).value.name, 'Beta');

console.log('v7 Session persistence harness passed (A/B, CAS, reconstruction, no active key)');
