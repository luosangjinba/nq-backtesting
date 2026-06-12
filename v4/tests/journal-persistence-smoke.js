import assert from 'node:assert/strict';

import {
  clearSavedJournalDays,
  getJournalStorageKey,
  resetJournalPersistenceCache,
  restoreJournalDays,
  saveJournalDays,
} from '../src/journal/journal-persistence.js';
import {
  clearJournalDays,
  getJournalDay,
  getJournalDays,
  upsertJournalDay,
} from '../src/journal/journal-store.js';

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

globalThis.localStorage = createMemoryStorage();
resetJournalPersistenceCache();
clearJournalDays({ emit: false });

assert.equal(getJournalStorageKey(), 'v4:journal:default');
assert.equal(getJournalStorageKey('funded'), 'v4:journal:funded');

upsertJournalDay({
  date: '2026-06-12',
  accountId: 'default',
  dayMode: 'simulation',
  preMarketPlan: 'practice only',
});
upsertJournalDay({
  date: '2026-06-12',
  accountId: 'funded',
  dayMode: 'real_money',
  preMarketPlan: 'one A+ setup only',
});

assert.equal(saveJournalDays('default'), true);
assert.equal(saveJournalDays('funded'), true);

clearJournalDays({ emit: false });
assert.equal(getJournalDays().length, 0);

assert.equal(restoreJournalDays('default'), 1);
assert.equal(getJournalDays().length, 1);
assert.equal(getJournalDay('default', '2026-06-12').preMarketPlan, 'practice only');
assert.equal(getJournalDay('funded', '2026-06-12'), null);

clearJournalDays({ emit: false });
assert.equal(restoreJournalDays('funded'), 1);
assert.equal(getJournalDay('funded', '2026-06-12').dayMode, 'real_money');

assert.equal(clearSavedJournalDays('funded'), true);
clearJournalDays({ emit: false });
assert.equal(restoreJournalDays('funded'), 0);

delete globalThis.localStorage;

console.log('journal persistence smoke passed');
