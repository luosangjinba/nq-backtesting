import assert from 'node:assert/strict';

import {
  getJournalSetupLinkCandidates,
  summarizeJournalSetupLinkCandidate,
} from '../src/journal/journal-setup-link-candidates.js';

const sameDateSameInstrument = {
  id: 'setup-a',
  instrument: 'ES',
  direction: 'short',
  primaryTimestamp: Date.parse('2026-06-12T09:35:00Z') / 1000,
  orderElements: {
    entry: { direction: 'short', timestamp: Date.parse('2026-06-12T09:40:00Z') / 1000, price: 5400.25 },
    stopLoss: { price: 5410.25 },
    targets: [{ role: 'target1', price: 5388.25 }],
    result: { status: 'target1' },
  },
  sourceOrderReview: {
    summary: 'Same date ES short.',
  },
};

const sameDateDifferentInstrument = {
  id: 'setup-b',
  instrument: 'NQ',
  direction: 'long',
  primaryTimestamp: Date.parse('2026-06-12T10:00:00Z') / 1000,
  orderElements: {
    entry: { direction: 'long', timestamp: Date.parse('2026-06-12T10:02:00Z') / 1000, price: 19850.25 },
    stopLoss: { price: 19830.25 },
    targets: [{ role: 'target1', price: 19890.25 }],
    result: { status: 'unknown' },
  },
};

const differentDateSameInstrument = {
  id: 'setup-c',
  instrument: 'ES',
  direction: 'long',
  primaryTimestamp: Date.parse('2026-06-11T09:35:00Z') / 1000,
  orderElements: {
    entry: { direction: 'long', price: 5390.25 },
    stopLoss: { price: 5380.25 },
    targets: [],
    result: { status: 'stop-loss' },
  },
};

const context = { date: '2026-06-12', instrument: 'ES' };
const candidate = summarizeJournalSetupLinkCandidate(sameDateSameInstrument, context);

assert.equal(candidate.orderReviewId, 'setup-a');
assert.equal(candidate.date, '2026-06-12');
assert.equal(candidate.instrument, 'ES');
assert.equal(candidate.direction, 'short');
assert.equal(candidate.summary, 'Same date ES short.');
assert.equal(candidate.entryPrice, 5400.25);
assert.equal(candidate.stopPrice, 5410.25);
assert.equal(candidate.targetPrice, 5388.25);
assert.equal(candidate.result, 'target1');
assert.equal(candidate.matchDate, true);
assert.equal(candidate.matchInstrument, true);
assert.equal(candidate.score, 100);

const candidates = getJournalSetupLinkCandidates(context, {
  getSetupSets: () => [
    differentDateSameInstrument,
    sameDateDifferentInstrument,
    sameDateSameInstrument,
    { instrument: 'ES' },
  ],
});

assert.deepEqual(candidates.map((item) => item.orderReviewId), ['setup-a', 'setup-b', 'setup-c']);
assert.deepEqual(candidates.map((item) => item.score), [100, 80, 40]);
assert.equal(candidates[1].matchDate, true);
assert.equal(candidates[1].matchInstrument, false);
assert.equal(candidates[2].matchDate, false);
assert.equal(candidates[2].matchInstrument, true);
assert.deepEqual(getJournalSetupLinkCandidates({}, { getSetupSets: () => null }), []);

console.log('journal setup link candidates smoke passed');
