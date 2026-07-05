import assert from 'node:assert/strict';
import { summarizeJournalEntries } from '../src/journal/journal-analytics.js';
import { createJournalStore } from '../src/journal/journal-store.js';

const clockValues = [
  '2026-07-05T00:00:00.000Z',
  '2026-07-05T00:01:00.000Z',
  '2026-07-05T00:02:00.000Z',
  '2026-07-05T00:03:00.000Z',
];
const now = () => clockValues.shift() || '2026-07-05T00:04:00.000Z';

const store = createJournalStore({ now });

const firstEntry = store.addEntry({
  id: 'trade-2',
  symbol: 'nq',
  side: 'buy',
  quantity: 2,
  entryPrice: 100,
  exitPrice: 103,
  openedAt: '2026-07-05T09:31:00.000Z',
  closedAt: '2026-07-05T09:35:00.000Z',
  tags: ['breakout', 'breakout', 'morning'],
});
assert.equal(firstEntry.symbol, 'NQ');
assert.deepEqual(firstEntry.tags, ['breakout', 'morning']);

store.addEntry({
  id: 'trade-1',
  symbol: 'es',
  side: 'sell',
  quantity: 1,
  entryPrice: 4100,
  exitPrice: 4105,
  openedAt: '2026-07-05T09:30:00.000Z',
  closedAt: '2026-07-05T09:34:00.000Z',
});

store.addEntry({
  id: 'trade-3',
  symbol: 'NQ',
  side: 'buy',
  quantity: 1,
  entryPrice: 120,
  openedAt: '2026-07-05T09:36:00.000Z',
});

assert.deepEqual(store.listEntries().map((entry) => entry.id), ['trade-1', 'trade-2', 'trade-3']);

const updated = store.updateEntry('trade-3', {
  exitPrice: 121,
  closedAt: '2026-07-05T09:38:00.000Z',
});
assert.equal(updated.exitPrice, 121);
assert.equal(updated.createdAt, '2026-07-05T00:02:00.000Z');
assert.equal(updated.updatedAt, '2026-07-05T00:03:00.000Z');

const snapshot = store.listEntries();
snapshot[0].symbol = 'BROKEN';
assert.equal(store.getEntry('trade-1').symbol, 'ES');

const summary = summarizeJournalEntries(store.listEntries());
assert.deepEqual(summary, {
  entryCount: 3,
  closedCount: 3,
  openCount: 0,
  winningCount: 2,
  losingCount: 1,
  scratchCount: 0,
  grossProfit: 7,
  grossLoss: -5,
  netPnl: 2,
  winRate: 0.66666667,
  averageClosedPnl: 0.66666667,
  bySymbol: {
    ES: {
      entryCount: 1,
      closedCount: 1,
      netPnl: -5,
    },
    NQ: {
      entryCount: 2,
      closedCount: 2,
      netPnl: 7,
    },
  },
});

assert.equal(store.removeEntry('trade-1'), true);
assert.equal(store.removeEntry('missing'), false);
assert.deepEqual(store.listEntries().map((entry) => entry.id), ['trade-2', 'trade-3']);

console.log('v6 journal domain smoke passed');
