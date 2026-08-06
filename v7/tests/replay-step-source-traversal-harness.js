import assert from 'node:assert/strict';
import { createReplayStep, readReplayStep } from '../src/replay-contract/public.js';
import {
  createFoundationCapabilities,
  createFoundationSourceTraversal,
  FOUNDATION_IDS,
} from '../src/replay-workspace-composition/public.js';

const MINUTE = 60_000;
const FORWARD_BUFFER_MINUTES = 500;
const epoch = (value) => Date.parse(value);
const RANGE_START_EPOCH_MS = epoch('2026-05-01T12:00:00.000Z');
const capabilities = createFoundationCapabilities();
const bars = [];
const requests = [];
let datasetRevisionCalls = 0;

function bar(value) {
  return Object.freeze({
    close: 101,
    high: 102,
    low: 99,
    open: 100,
    startEpochMs: epoch(value),
    volume: 10,
  });
}

function setBars(values) {
  bars.splice(0, bars.length, ...values.map(bar));
}

const market = Object.freeze({
  catalog: capabilities.catalog,
  defaultTarget: capabilities.defaultTarget,
  async resolveDatasetRevision(instrumentId, { signal }) {
    assert.equal(instrumentId, FOUNDATION_IDS.instrument);
    assert.equal(signal.aborted, false);
    datasetRevisionCalls += 1;
    return 'fixture-dataset-revision';
  },
  requestThrough(exclusiveEndEpochMs, selection) {
    const requiredMinutes = Math.max(
      1,
      Math.ceil((exclusiveEndEpochMs - RANGE_START_EPOCH_MS) / MINUTE),
    );
    const bufferedMinutes = Math.ceil(
      requiredMinutes / FORWARD_BUFFER_MINUTES,
    ) * FORWARD_BUFFER_MINUTES;
    return Object.freeze({
      instrumentId: selection.instrument.id,
      windowEndEpochMs: RANGE_START_EPOCH_MS + (bufferedMinutes * MINUTE),
      windowStartEpochMs: RANGE_START_EPOCH_MS,
    });
  },
  requestWindow({ instrumentId, windowEndEpochMs, windowStartEpochMs }) {
    return Object.freeze({ instrumentId, windowEndEpochMs, windowStartEpochMs });
  },
});
const traversal = createFoundationSourceTraversal({
  barData: Object.freeze({
    async withAcquiredCoverage({ request, visit }) {
      requests.push(request);
      return visit(Object.freeze({
        bars: Object.freeze(bars.filter(({ startEpochMs }) => (
          startEpochMs >= request.windowStartEpochMs && startEpochMs < request.windowEndEpochMs
        ))),
        request,
      }));
    },
  }),
  market,
});

function step(durationMinutes) {
  return readReplayStep(createReplayStep({
    durationMs: durationMinutes * MINUTE,
    id: `replay-step.${durationMinutes}m`,
    offsetMs: 0,
    sourceDurationMs: MINUTE,
  }));
}

function context({ cursor, durationMinutes, end = '2026-05-05T02:00:00.000Z', mode = 'rth' }) {
  return Object.freeze({
    cursorEpochMs: epoch(cursor),
    instrumentId: FOUNDATION_IDS.instrument,
    range: Object.freeze({
      endEpochMs: epoch(end),
      startEpochMs: epoch('2026-05-01T12:00:00.000Z'),
    }),
    replayStep: step(durationMinutes),
    sessionHours: Object.freeze({ mode }),
    signal: new AbortController().signal,
  });
}

setBars([
  '2026-05-01T13:30:00.000Z',
  '2026-05-01T13:31:00.000Z',
  '2026-05-01T13:32:00.000Z',
  '2026-05-01T13:34:00.000Z',
]);
let resolved = await traversal.nextEligible(context({
  cursor: '2026-05-01T13:31:00.000Z',
  durationMinutes: 5,
}));
assert.deepEqual(resolved, {
  sourceEpochMs: epoch('2026-05-01T13:34:00.000Z'),
  targetEpochMs: epoch('2026-05-01T13:35:00.000Z'),
}, '5m Next resolves the actual fixed-grid completion despite one missing source minute');

resolved = await traversal.nextEligible(context({
  cursor: '2026-05-01T13:31:00.000Z',
  durationMinutes: 60,
}));
assert.equal(resolved.targetEpochMs, epoch('2026-05-01T14:00:00.000Z'),
  '1h RTH Next resolves the :59 display completion to its 14:00 exclusive cutoff');

setBars([
  '2026-05-01T20:14:00.000Z',
  '2026-05-04T13:30:00.000Z',
  '2026-05-04T13:31:00.000Z',
  '2026-05-04T13:34:00.000Z',
]);
resolved = await traversal.nextEligible(context({
  cursor: '2026-05-01T20:15:00.000Z',
  durationMinutes: 5,
}));
assert.equal(resolved.targetEpochMs, epoch('2026-05-04T13:35:00.000Z'),
  'RTH Next skips every empty weekend bucket and completes the next actual Replay bar');

resolved = await traversal.previousEligible(context({
  cursor: '2026-05-04T13:35:00.000Z',
  durationMinutes: 5,
}));
assert.deepEqual(resolved, {
  sourceEpochMs: epoch('2026-05-01T20:14:00.000Z'),
  targetEpochMs: epoch('2026-05-01T20:15:00.000Z'),
}, 'Previous bar skips empty weekend buckets symmetrically');

resolved = await traversal.visibleBefore(Object.freeze({
  ...context({
    cursor: '2026-05-04T13:35:00.000Z',
    durationMinutes: 5,
  }),
  targetEpochMs: epoch('2026-05-04T13:32:00.000Z'),
}));
assert.deepEqual(resolved, {
  sourceEpochMs: epoch('2026-05-04T13:31:00.000Z'),
  targetEpochMs: epoch('2026-05-04T13:32:00.000Z'),
}, 'hidden clock authority evidence resolves the latest eligible source before an exact cutoff');

setBars(['2026-05-01T12:00:00.000Z']);
resolved = await traversal.visibleBefore(Object.freeze({
  ...context({
    cursor: '2026-05-01T12:01:00.000Z',
    durationMinutes: 1,
    mode: 'eth',
  }),
  targetEpochMs: epoch('2026-05-01T12:01:00.000Z'),
}));
assert.deepEqual(resolved, {
  sourceEpochMs: epoch('2026-05-01T12:00:00.000Z'),
  targetEpochMs: epoch('2026-05-01T12:01:00.000Z'),
});

setBars(['2026-05-01T20:14:00.000Z']);
resolved = await traversal.nextEligible(context({
  cursor: '2026-05-01T18:01:00.000Z',
  durationMinutes: 720,
  end: '2026-05-02T02:00:00.000Z',
}));
assert.equal(resolved.targetEpochMs, epoch('2026-05-02T00:00:00.000Z'),
  'a partial 12h RTH bucket completes on its shared clock slot without inventing a source bar');

assert.ok(requests.length >= 5, 'target lookup remains delegated through Bar Data Runtime');
assert.equal(datasetRevisionCalls, requests.length,
  'every source traversal resolves dataset identity before acquiring cached coverage');
console.log('v7 Replay step source traversal harness passed', {
  scope: 'completion grid, missing minute, RTH weekend gap, Previous symmetry, hidden authority evidence, 12h partial',
});
