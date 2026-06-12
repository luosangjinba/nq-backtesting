import assert from 'node:assert/strict';

import {
  clearJournalDays,
  getJournalDay,
  getJournalDayIdentity,
  getJournalDays,
  loadJournalDays,
  normalizeJournalDay,
  updateJournalDay,
  upsertJournalDay,
} from '../src/journal/journal-store.js';

clearJournalDays({ emit: false });

const normalized = normalizeJournalDay({
  date: '2026-06-12',
  accountId: ' default ',
  accountType: 'SIM',
  dayMode: 'mixed',
  preMarketPlan: ' Wait for confirmation ',
  liveTrades: [
    {
      instrument: 'es',
      tradeType: 'simulation',
      direction: 'short',
      positionSize: '2',
      netPnl: '-125.50',
      rMultipleManual: '-0.5',
      fills: [
        { type: 'entry', time: '2026-06-12 09:45', price: '5400.25', quantity: '2' },
        { type: 'partial_exit', time: '2026-06-12 10:05', price: '5395.25', quantity: '1' },
      ],
    },
  ],
  idealTrades: [
    {
      instrument: 'nq',
      idealType: 'hindsight_optimal',
      relationshipToActualTrade: 'missed_trade',
      noticedInRealTime: 'no',
    },
  ],
  disciplineReview: {
    plannedTradesOnly: 'partial',
    fomo: 'yes',
    failedToTradeWhenShould: 'unknown',
  },
});

assert.equal(normalized.accountId, 'default');
assert.equal(normalized.accountType, 'sim');
assert.equal(normalized.dayMode, 'mixed');
assert.equal(normalized.preMarketPlan, 'Wait for confirmation');
assert.equal(normalized.liveTrades[0].instrument, 'ES');
assert.equal(normalized.liveTrades[0].positionSize, 2);
assert.equal(normalized.liveTrades[0].netPnl, -125.5);
assert.equal(normalized.liveTrades[0].fills[1].type, 'partial_exit');
assert.equal(normalized.idealTrades[0].instrument, 'NQ');
assert.equal(normalized.idealTrades[0].noticedInRealTime, 'no');
assert.equal(normalized.disciplineReview.fomo, 'yes');
assert.equal(getJournalDayIdentity(normalized), 'default|2026-06-12');

loadJournalDays([
  normalized,
  { ...normalized, id: 'duplicate', postMarketSummary: 'Duplicate replaces by identity' },
  { date: 'bad-date', accountId: 'default' },
], { emit: false });

assert.equal(getJournalDays().length, 1);
assert.equal(getJournalDay('default', '2026-06-12').postMarketSummary, 'Duplicate replaces by identity');

upsertJournalDay({
  date: '2026-06-13',
  accountId: 'funded',
  dayMode: 'no_trade',
});

assert.equal(getJournalDays().length, 2);
assert.equal(getJournalDay('funded', '2026-06-13').dayMode, 'no_trade');

updateJournalDay('funded', '2026-06-13', {
  mentalStateBefore: 'calm',
});

assert.equal(getJournalDay('funded', '2026-06-13').mentalStateBefore, 'calm');

clearJournalDays({ emit: false });
assert.equal(getJournalDays().length, 0);

console.log('journal store smoke passed');
