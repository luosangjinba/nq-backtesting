import assert from 'node:assert/strict';
import { createProjectedHistoryBatch } from '../src/projected-history-contract/public.js';
import { createDisplayHistoryLedger } from '../src/replay-workspace-ui/display-history-ledger.js';

const selection = Object.freeze({
  aggregationPolicy: Object.freeze({ revision: 'fixed-60m-eth-r1' }),
  calendar: Object.freeze({ revision: 'calendar-r1' }),
  displayTimeframe: Object.freeze({
    alignment: Object.freeze({ durationMs: 3_600_000, kind: 'fixed-duration' }),
    id: 'timeframe.display-1-hour',
  }),
  instrument: Object.freeze({ id: 'instrument.cme.nq' }),
  sessionHoursMode: 'eth',
});
const request = Object.freeze({
  aggregationPolicyRevision: selection.aggregationPolicy.revision,
  alignmentKind: 'fixed-duration',
  alignmentPolicyId: null,
  calendarRevision: selection.calendar.revision,
  datasetRevision: 'dataset-r1',
  displayTimeframeId: selection.displayTimeframe.id,
  durationMs: 3_600_000,
  instrumentId: selection.instrument.id,
  providerId: 'provider.test.projected-history',
  schemaVersion: 1,
  sessionHoursMode: 'eth',
  windowEndEpochMs: 7_200_000,
  windowStartEpochMs: 0,
});
const projected = createProjectedHistoryBatch({
  bars: [0, 3_600_000].map((startEpochMs, index) => ({
    close: 101 + index,
    displayEpochMs: startEpochMs + 3_540_000,
    high: 102 + index,
    low: 99 + index,
    open: 100 + index,
    startEpochMs,
    volume: 10,
  })),
  request,
  schemaVersion: 1,
});
const snapshot = Object.freeze({
  bars: Object.freeze([{
    close: 103, displayEpochMs: 10_740_000, high: 104, low: 101,
    open: 102, startEpochMs: 7_200_000, volume: 11,
  }]),
  paneId: 'pane-main',
  provenance: Object.freeze({ cursorProposal: Object.freeze({ targetEpochMs: 20_000_000 }) }),
  schemaVersion: 1,
});

const ledger = createDisplayHistoryLedger();
ledger.stageExtension(projected, selection);
const merged = ledger.merge(snapshot);
assert.deepEqual(merged.bars.map(({ startEpochMs }) => startEpochMs), [0, 3_600_000, 7_200_000]);
assert.deepEqual(merged.provenance.projectedHistory.requestKeys, [projected.requestKey]);
ledger.accept();
assert.equal(ledger.oldestEpochMs(), 0);

ledger.stageSelection(selection);
assert.equal(ledger.merge(snapshot).bars.length, 3,
  'same-selection navigation must retain projected historical context');
ledger.accept();

ledger.stageSelection(Object.freeze({
  ...selection,
  sessionHoursMode: 'rth',
}));
assert.equal(ledger.merge(snapshot), snapshot,
  'a different Pane selection must not inherit projected historical context');
ledger.accept();
assert.equal(ledger.oldestEpochMs(), null);

console.log('v7 display history ledger harness passed');
