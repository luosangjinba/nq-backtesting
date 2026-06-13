import assert from 'node:assert/strict';

import { getJournalExecutions } from '../src/journal/journal-execution-adapter.js';
import {
  getJournalExecutionDisplayModel,
  getJournalExecutionDisplayModels,
  getJournalExecutionSetupSummary,
} from '../src/journal/journal-execution-setup-summary.js';
import { normalizeJournalDay } from '../src/journal/journal-store.js';
import { clearOrderReviews, loadOrderReviews } from '../src/order/order-review-store.js';

clearOrderReviews();

loadOrderReviews([
  {
    id: 'setup-linked-direct',
    instrument: 'ES',
    setupThesis: {
      primaryEventTimestamp: 1781269800,
      primaryEventPrice: 5405,
      reasons: [
        {
          id: 'reason_1',
          category: 'macros',
          note: 'Opening thesis aligned with higher timeframe.',
        },
      ],
    },
    entryPlan: {
      direction: 'short',
      entryTimestamp: 1781270100,
      entryPrice: 5400.25,
      stopLoss: 5410.25,
      targetInternal: 5388.25,
      targetExternal: 5375.25,
      entryModel: 'manual',
      note: 'Use failed reclaim as entry trigger.',
    },
    resultReview: {
      result: 'target1',
      exitTimestamp: 1781271300,
    },
    summary: 'ES short after failed reclaim.',
  },
], { now: 1781270000 });

const day = normalizeJournalDay({
  date: '2026-06-12',
  accountId: 'cash',
  liveTrades: [
    {
      id: 'trade-linked-direct',
      orderReviewId: 'setup-linked-direct',
      tradeType: 'real_money',
      instrument: 'NQ',
      direction: 'long',
      entryReason: 'This should not win while linked.',
      netPnl: '300',
    },
    {
      id: 'trade-linked-legacy',
      linkedOrderSetupIds: ['setup-linked-direct'],
      tradeType: 'simulation',
      instrument: 'NQ',
      direction: 'long',
    },
    {
      id: 'trade-missing-link',
      orderReviewId: 'setup-missing',
      instrument: 'NQ',
      direction: 'long',
      stopLoss: '19836.25',
      target: '19880.25',
      entryReason: 'Linked setup was not found locally.',
    },
    {
      id: 'trade-unlinked',
      instrument: 'NQ',
      direction: 'short',
      result: 'stopped',
      stopLoss: '20020',
      target: '19960',
      entryReason: 'Impulse short without setup.',
    },
  ],
});

const executions = getJournalExecutions(day);
const [direct, legacy, missing, unlinked] = executions;

const directSummary = getJournalExecutionSetupSummary(direct);
assert.equal(directSummary.linkStatus, 'linked');
assert.equal(directSummary.orderReviewId, 'setup-linked-direct');
assert.equal(directSummary.setup.source, 'order-setup');
assert.equal(directSummary.setup.date, '2026-06-12');
assert.equal(directSummary.setup.instrument, 'ES');
assert.equal(directSummary.setup.direction, 'short');
assert.equal(directSummary.setup.entry.price, 5400.25);
assert.equal(directSummary.setup.stopLoss.price, 5410.25);
assert.equal(directSummary.setup.targets.length, 2);
assert.equal(directSummary.setup.result.price, 5388.25);
assert.equal(directSummary.setup.summary, 'ES short after failed reclaim.');
assert.equal(directSummary.setup.explanationElements.notes.length, 2);

directSummary.setup.targets[0].price = 0;
const directSummaryAgain = getJournalExecutionSetupSummary(direct);
assert.equal(directSummaryAgain.setup.targets[0].price, 5388.25);

const legacySummary = getJournalExecutionSetupSummary(legacy);
assert.equal(legacySummary.linkStatus, 'linked');
assert.equal(legacySummary.orderReviewId, 'setup-linked-direct');
assert.equal(legacySummary.setup.instrument, 'ES');

const missingSummary = getJournalExecutionSetupSummary(missing);
assert.equal(missingSummary.linkStatus, 'missing-linked-setup');
assert.equal(missingSummary.orderReviewId, 'setup-missing');
assert.equal(missingSummary.setup.source, 'unlinked-snapshot');
assert.equal(missingSummary.setup.instrument, 'NQ');
assert.equal(missingSummary.setup.direction, 'long');
assert.equal(missingSummary.setup.stopLoss.price, 19836.25);
assert.equal(missingSummary.setup.targets[0].price, 19880.25);

const unlinkedSummary = getJournalExecutionSetupSummary(unlinked);
assert.equal(unlinkedSummary.linkStatus, 'unlinked');
assert.equal(unlinkedSummary.orderReviewId, '');
assert.equal(unlinkedSummary.setup.source, 'unlinked-snapshot');
assert.equal(unlinkedSummary.setup.direction, 'short');
assert.equal(unlinkedSummary.setup.result.status, 'stopped');

const displayModel = getJournalExecutionDisplayModel(direct);
assert.equal(displayModel.id, 'trade-linked-direct');
assert.equal(displayModel.linkStatus, 'linked');
assert.equal(displayModel.setupSummary.instrument, 'ES');
assert.equal(displayModel.netPnl, 300);

const displayModels = getJournalExecutionDisplayModels(executions);
assert.deepEqual(displayModels.map((model) => model.linkStatus), [
  'linked',
  'linked',
  'missing-linked-setup',
  'unlinked',
]);
assert.deepEqual(getJournalExecutionDisplayModels(null), []);

clearOrderReviews();

console.log('journal execution setup summary smoke passed');
