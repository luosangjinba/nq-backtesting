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
const exactBeforeReversible = webStorage.getItem('test.sessions:record:A');
const reversible = repository.compareAndSwapReversible(
  sessionA,
  2,
  { revision: 3, name: 'Alpha reversible' },
);
assert.equal(repository.read(sessionA).value.name, 'Alpha reversible');
reversible.rollback();
assert.equal(webStorage.getItem('test.sessions:record:A'), exactBeforeReversible,
  'reversible CAS rollback must restore the byte-identical prior envelope');
assert.equal(repository.read(sessionA).value.name, 'Alpha 2');
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

for (const failurePoint of ['before-write', 'after-write']) {
  const raw = createMemoryWebStorage();
  let armed = false;
  const storage = {
    getItem: (key) => raw.getItem(key),
    removeItem: (key) => raw.removeItem(key),
    setItem(key, value) {
      if (armed && String(key).includes(':record:')) {
        armed = false;
        if (failurePoint === 'after-write') raw.setItem(key, value);
        throw new Error(`injected ${failurePoint}`);
      }
      raw.setItem(key, value);
    },
  };
  const faultRepository = createSessionRepository({
    storage: createStorageAdapter(storage),
    namespace: `fault.${failurePoint}`,
  });
  const faultSession = createSessionId(`fault-${failurePoint}`);
  faultRepository.insert(faultSession, { revision: 1, name: 'Before' });
  const key = `fault.${failurePoint}:record:fault-${failurePoint}`;
  const exactBefore = raw.getItem(key);
  armed = true;
  assert.throws(
    () => faultRepository.compareAndSwap(faultSession, 1, { revision: 2, name: 'After' }),
    (error) => error instanceof SessionPersistenceError && error.code === 'STORAGE_OPERATION_FAILED',
  );
  assert.equal(raw.getItem(key), exactBefore,
    `${failurePoint} CAS failure must restore the byte-identical prior envelope`);
}

const rollbackRaw = createMemoryWebStorage();
let failRollbackWrite = false;
const rollbackStorage = {
  getItem: (key) => rollbackRaw.getItem(key),
  removeItem: (key) => rollbackRaw.removeItem(key),
  setItem(key, value) {
    if (failRollbackWrite && String(key).includes(':record:')) {
      throw new Error('injected rollback write failure');
    }
    rollbackRaw.setItem(key, value);
  },
};
const rollbackRepository = createSessionRepository({
  storage: createStorageAdapter(rollbackStorage),
  namespace: 'fault.rollback',
});
const rollbackSession = createSessionId('fault-rollback');
rollbackRepository.insert(rollbackSession, { revision: 1, name: 'Before' });
const rollbackReceipt = rollbackRepository.compareAndSwapReversible(
  rollbackSession,
  1,
  { revision: 2, name: 'Candidate' },
);
failRollbackWrite = true;
assert.throws(
  () => rollbackReceipt.rollback(),
  (error) => error instanceof SessionPersistenceError
    && error.code === 'SESSION_REVERSIBLE_WRITE_ROLLBACK_FAILED',
  'an unprovable exact rollback must remain a hard persistence failure for runtime poisoning',
);
assert.equal(rollbackRepository.read(rollbackSession).value.name, 'Candidate',
  'failed rollback must not falsely report the accepted envelope as restored');

const reconstructed = createSessionRepository({
  storage: createStorageAdapter(webStorage),
  namespace: 'test.sessions',
});
assert.equal(reconstructed.read(sessionA).value.name, 'Alpha 2');
assert.equal(reconstructed.read(sessionB).value.name, 'Beta');
assert.throws(
  () => reconstructed.remove(sessionB, 2),
  (error) => error instanceof SessionPersistenceError && error.code === 'SESSION_REVISION_CONFLICT',
  'remove must reject a stale expected revision',
);
const removedB = reconstructed.remove(sessionB, 1);
assert.equal(removedB.value.name, 'Beta');
assert.equal(reconstructed.read(sessionB), null);
assert.equal(reconstructed.listSessionIds().some((id) => sessionIdsEqual(id, sessionB)), false);
assert.equal(reconstructed.read(sessionA).value.name, 'Alpha 2', 'removing B must not touch A');
assert.equal(webStorage.keys().includes('test.sessions:record:B'), false,
  'remove must delete the explicit Session record key');
const afterRemove = createSessionRepository({
  storage: createStorageAdapter(webStorage),
  namespace: 'test.sessions',
});
assert.deepEqual(afterRemove.listSessionIds().map((id) => id.token()), ['A']);

console.log('v7 Session persistence harness passed (A/B, CAS, remove, reconstruction, no active key)');
