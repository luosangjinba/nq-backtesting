import assert from 'node:assert/strict';

import { getJournalExecutions, toJournalExecution } from '../src/journal/journal-execution-adapter.js';
import { normalizeJournalDay } from '../src/journal/journal-store.js';

const unlinkedDay = normalizeJournalDay({
  date: '2026-06-12',
  accountId: 'cash',
  liveTrades: [
    {
      id: 'trade-unlinked',
      tradeType: 'real_money',
      instrument: 'NQ',
      direction: 'long',
      result: 'stopped',
      stopLoss: '19836.25',
      target: '19880.25',
      entryReason: 'Impulse long after open.',
      netPnl: '-420',
      rMultipleManual: '-1.4',
      followedPlan: 'no',
      fills: [
        { id: 'fill-entry', type: 'entry', time: '2026-06-12 09:38', price: '19850.25', quantity: '1' },
      ],
    },
  ],
});

const directLinkedDay = normalizeJournalDay({
  date: '2026-06-13',
  accountId: 'sim',
  liveTrades: [
    {
      id: 'trade-direct-linked',
      orderReviewId: 'order-review-direct',
      linkedOrderSetupIds: ['legacy-should-not-win'],
      tradeType: 'simulation',
      instrument: 'ES',
      direction: 'short',
      netPnl: '250',
    },
  ],
});

const legacyLinkedDay = normalizeJournalDay({
  date: '2026-06-14',
  accountId: 'funded',
  liveTrades: [
    {
      id: 'trade-legacy-linked',
      linkedOrderSetupIds: ['order-review-legacy'],
      tradeType: 'real_money',
      instrument: 'NQ',
      direction: 'short',
      fills: [
        { id: 'fill-entry', type: 'entry', time: '2026-06-14 09:52', price: '20010', quantity: '2' },
        { id: 'fill-exit', type: 'partial_exit', time: '2026-06-14 10:12', price: '19980', quantity: '1' },
      ],
    },
  ],
});

const [unlinkedExecution] = getJournalExecutions(unlinkedDay);
assert.equal(unlinkedExecution.id, 'trade-unlinked');
assert.equal(unlinkedExecution.orderReviewId, '');
assert.equal(unlinkedExecution.isLinkedToOrderSetup, false);
assert.equal(unlinkedExecution.executionStatus, 'taken');
assert.equal(unlinkedExecution.unlinkedSnapshot.instrument, 'NQ');
assert.equal(unlinkedExecution.unlinkedSnapshot.direction, 'long');
assert.equal(unlinkedExecution.unlinkedSnapshot.stopLoss, 19836.25);
assert.equal(unlinkedExecution.netPnl, -420);
assert.equal(unlinkedExecution.fills.length, 1);

unlinkedExecution.fills[0].price = 0;
assert.equal(unlinkedDay.liveTrades[0].fills[0].price, 19850.25);

const [directLinkedExecution] = getJournalExecutions(directLinkedDay);
assert.equal(directLinkedExecution.orderReviewId, 'order-review-direct');
assert.equal(directLinkedExecution.isLinkedToOrderSetup, true);
assert.deepEqual(directLinkedExecution.legacyLinkedOrderSetupIds, ['legacy-should-not-win']);

const [legacyLinkedExecution] = getJournalExecutions(legacyLinkedDay);
assert.equal(legacyLinkedExecution.orderReviewId, 'order-review-legacy');
assert.equal(legacyLinkedExecution.isLinkedToOrderSetup, true);
assert.equal(legacyLinkedExecution.fills.length, 2);

const emptyExecution = toJournalExecution(null);
assert.equal(emptyExecution.orderReviewId, '');
assert.equal(emptyExecution.executionStatus, 'taken');
assert.deepEqual(getJournalExecutions({ liveTrades: null }), []);

console.log('journal execution adapter smoke passed');
