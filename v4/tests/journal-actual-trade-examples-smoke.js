import assert from 'node:assert/strict';

import { normalizeJournalDay } from '../src/journal/journal-store.js';

const realViolationDay = normalizeJournalDay({
  date: '2026-06-12',
  accountId: 'cash',
  dayMode: 'real_money',
  preMarketPlan: 'Only short failed rallies near premium.',
  liveTrades: [
    {
      tradeType: 'real_money',
      instrument: 'NQ',
      direction: 'long',
      result: 'stopped',
      netPnl: '-420',
      rMultipleManual: '-1.4',
      followedPlan: 'no',
      timingAssessment: 'unnecessary',
      ruleBreaks: 'Longed into premium against plan.',
      reflection: 'This was an impulse trade, not a planned setup.',
      fills: [
        { type: 'entry', time: '2026-06-12 09:38', price: '19850.25', quantity: '1' },
        { type: 'stop_exit', time: '2026-06-12 09:44', price: '19836.25', quantity: '1' },
      ],
    },
  ],
});

const plannedSimulationDay = normalizeJournalDay({
  date: '2026-06-13',
  accountId: 'sim',
  dayMode: 'simulation',
  preMarketPlan: 'Wait for sell-side sweep and reclaim.',
  liveTrades: [
    {
      tradeType: 'simulation',
      instrument: 'ES',
      direction: 'long',
      result: 'target',
      netPnl: '312.5',
      rMultipleManual: '2.5',
      followedPlan: 'yes',
      timingAssessment: 'good',
      reflection: 'Entry waited for reclaim and respected planned invalidation.',
      fills: [
        { type: 'entry', time: '2026-06-13 10:02', price: '5400.25', quantity: '1' },
        { type: 'final_exit', time: '2026-06-13 10:31', price: '5412.75', quantity: '1' },
      ],
    },
  ],
});

const partialExitDay = normalizeJournalDay({
  date: '2026-06-14',
  accountId: 'funded',
  dayMode: 'mixed',
  liveTrades: [
    {
      tradeType: 'real_money',
      instrument: 'NQ',
      direction: 'short',
      result: 'scaled target',
      netPnl: '680',
      rMultipleManual: '2',
      followedPlan: 'partial',
      managementNotes: 'Scaled one contract at first target and held one for final target.',
      fills: [
        { type: 'entry', time: '2026-06-14 09:52', price: '20010.00', quantity: '2' },
        { type: 'partial_exit', time: '2026-06-14 10:12', price: '19980.00', quantity: '1' },
        { type: 'final_exit', time: '2026-06-14 10:48', price: '19942.00', quantity: '1' },
      ],
    },
  ],
});

assert.equal(realViolationDay.liveTrades[0].tradeType, 'real_money');
assert.equal(realViolationDay.liveTrades[0].netPnl, -420);
assert.equal(realViolationDay.liveTrades[0].rMultipleManual, -1.4);
assert.equal(realViolationDay.liveTrades[0].followedPlan, 'no');
assert.equal(realViolationDay.liveTrades[0].fills[1].type, 'stop_exit');

assert.equal(plannedSimulationDay.liveTrades[0].tradeType, 'simulation');
assert.equal(plannedSimulationDay.liveTrades[0].instrument, 'ES');
assert.equal(plannedSimulationDay.liveTrades[0].followedPlan, 'yes');
assert.equal(plannedSimulationDay.liveTrades[0].timingAssessment, 'good');
assert.equal(plannedSimulationDay.liveTrades[0].fills.length, 2);

assert.equal(partialExitDay.liveTrades[0].fills.length, 3);
assert.equal(partialExitDay.liveTrades[0].fills[0].quantity, 2);
assert.equal(partialExitDay.liveTrades[0].fills[1].type, 'partial_exit');
assert.equal(partialExitDay.liveTrades[0].fills[1].quantity, 1);
assert.equal(partialExitDay.liveTrades[0].fills[2].type, 'final_exit');
assert.equal(partialExitDay.liveTrades[0].fills[2].quantity, 1);

console.log('journal actual trade examples smoke passed');
