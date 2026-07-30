import assert from 'node:assert/strict';
import { createProjectedHistoryBatch } from '../src/projected-history-contract/public.js';
import {
  extendPaneProjectedHistory,
  preservePaneProjectedHistory,
  projectedHistoryOldestEpochMs,
} from '../src/projection-domain/public.js';

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

function request(start, end) {
  return Object.freeze({
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
    windowEndEpochMs: end,
    windowStartEpochMs: start,
  });
}

function projected(start, end) {
  return createProjectedHistoryBatch({
    bars: [start, start + 3_600_000].filter((epochMs) => epochMs < end).map(
      (startEpochMs, index) => ({
        close: 101 + index,
        displayEpochMs: startEpochMs + 3_540_000,
        high: 102 + index,
        low: 99 + index,
        open: 100 + index,
        startEpochMs,
        volume: 10,
      }),
    ),
    request: request(start, end),
    schemaVersion: 1,
  });
}

const cursorProposal = Object.freeze({ targetEpochMs: 20_000_000 });
const rawSnapshot = Object.freeze({
  bars: Object.freeze([{
    close: 103, displayEpochMs: 10_740_000, high: 104, low: 101,
    open: 102, startEpochMs: 7_200_000, volume: 11,
  }]),
  paneId: 'pane-main',
  provenance: Object.freeze({ cursorProposal }),
  schemaVersion: 1,
});
const first = projected(0, 7_200_000);
const merged = extendPaneProjectedHistory({
  acceptedSnapshot: null,
  cursorProposal,
  projectedBatch: first,
  selection,
  snapshot: rawSnapshot,
});
assert.deepEqual(merged.bars.map(({ startEpochMs }) => startEpochMs), [0, 3_600_000, 7_200_000]);
assert.deepEqual(merged.provenance.projectedHistory.requestKeys, [first.requestKey]);
assert.equal(projectedHistoryOldestEpochMs(merged), 0);

const navigated = preservePaneProjectedHistory({
  acceptedSnapshot: merged,
  cursorProposal,
  selection,
  snapshot: rawSnapshot,
});
assert.deepEqual(navigated.bars, merged.bars,
  'same-selection navigation preserves projected history from the accepted snapshot');

const changedSelection = Object.freeze({ ...selection, sessionHoursMode: 'rth' });
assert.equal(preservePaneProjectedHistory({
  acceptedSnapshot: merged,
  cursorProposal,
  selection: changedSelection,
  snapshot: rawSnapshot,
}), rawSnapshot, 'another selection cannot inherit projected history');

console.log('v7 projected history composition harness passed');
