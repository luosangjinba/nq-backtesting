import assert from 'node:assert/strict';
import { createReplaySession } from '../src/session/session-domain.js';
import { createSessionMetadataStorage } from '../src/session/session-metadata-storage.js';
import { createInMemorySessionRepository } from '../src/session/session-repository.js';

function createMemoryStorage(initial = {}) {
  const records = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return records.has(key) ? records.get(key) : null;
    },
    setItem(key, value) {
      records.set(key, String(value));
    },
    snapshot() {
      return Object.fromEntries(records.entries());
    },
  };
}

const storageKey = 'test.v6.sessions.metadata';
const storage = createMemoryStorage();
const metadataStore = createSessionMetadataStorage({ storage, storageKey });
const repository = createInMemorySessionRepository({ metadataStore });

assert.deepEqual(repository.list(), []);
assert.equal(repository.getActive(), null);

const first = repository.save(createReplaySession({
  createdAt: '2026-06-01T09:00:00.000Z',
  endTime: '2026-06-01T16:00:00.000Z',
  id: 'session-one',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
}));
const second = repository.save(createReplaySession({
  createdAt: '2026-06-02T09:00:00.000Z',
  endTime: '2026-06-02T16:00:00.000Z',
  id: 'session-two',
  startTime: '2026-06-02T09:30:00.000Z',
  symbol: 'ES',
  timeframe: '5m',
}));

assert.equal(repository.getActive().id, second.id);
assert.deepEqual(repository.list().map((session) => session.id), ['session-one', 'session-two']);

const restoredRepository = createInMemorySessionRepository({
  metadataStore: createSessionMetadataStorage({ storage, storageKey }),
});
assert.deepEqual(restoredRepository.list(), [first, second]);
assert.equal(restoredRepository.getActive().id, second.id);

restoredRepository.open(first.id);
assert.equal(restoredRepository.getActive().id, first.id);
const reopenedRepository = createInMemorySessionRepository({
  metadataStore: createSessionMetadataStorage({ storage, storageKey }),
});
assert.equal(reopenedRepository.getActive().id, first.id);

const deleteMissing = reopenedRepository.delete('missing-session');
assert.deepEqual(deleteMissing, {
  activeSessionId: first.id,
  deleted: false,
  id: 'missing-session',
});

const deleteInactive = reopenedRepository.delete(second.id);
assert.deepEqual(deleteInactive, {
  activeSessionId: first.id,
  deleted: true,
  id: second.id,
});
const restoredAfterInactiveDelete = createInMemorySessionRepository({
  metadataStore: createSessionMetadataStorage({ storage, storageKey }),
});
assert.deepEqual(restoredAfterInactiveDelete.list(), [first]);
assert.equal(restoredAfterInactiveDelete.getActive().id, first.id);

const deleteActive = restoredAfterInactiveDelete.delete(first.id);
assert.deepEqual(deleteActive, {
  activeSessionId: null,
  deleted: true,
  id: first.id,
});
const restoredAfterActiveDelete = createInMemorySessionRepository({
  metadataStore: createSessionMetadataStorage({ storage, storageKey }),
});
assert.deepEqual(restoredAfterActiveDelete.list(), []);
assert.equal(restoredAfterActiveDelete.getActive(), null);

restoredAfterActiveDelete.clear();
const clearedRepository = createInMemorySessionRepository({
  metadataStore: createSessionMetadataStorage({ storage, storageKey }),
});
assert.deepEqual(clearedRepository.list(), []);
assert.equal(clearedRepository.getActive(), null);

const corruptStorage = createMemoryStorage({
  [storageKey]: '{not-json',
});
const corruptRepository = createInMemorySessionRepository({
  metadataStore: createSessionMetadataStorage({ storage: corruptStorage, storageKey }),
});
assert.deepEqual(corruptRepository.list(), []);
assert.equal(corruptRepository.getActive(), null);

const wrongVersionStorage = createMemoryStorage({
  [storageKey]: JSON.stringify({
    activeSessionId: 'session-one',
    sessions: [first],
    version: 999,
  }),
});
const wrongVersionRepository = createInMemorySessionRepository({
  metadataStore: createSessionMetadataStorage({ storage: wrongVersionStorage, storageKey }),
});
assert.deepEqual(wrongVersionRepository.list(), []);
assert.equal(wrongVersionRepository.getActive(), null);

console.log('v6 session metadata storage smoke passed');
