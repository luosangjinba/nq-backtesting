import assert from 'node:assert/strict';
import { createReplayStep, readReplayStep } from '../src/replay-contract/public.js';
import { createFoundationCapabilities, FOUNDATION_IDS } from '../src/replay-workspace-ui/foundation-capabilities.js';
import { createFoundationSourceTraversal } from '../src/replay-workspace-ui/foundation-source-traversal.js';

const MINUTE = 60_000;
const epoch = (value) => Date.parse(value);
const capabilities = createFoundationCapabilities();
const bars = [];
const requests = [];

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
  requestWindow({ instrumentId, windowEndEpochMs, windowStartEpochMs }) {
    return Object.freeze({ instrumentId, windowEndEpochMs, windowStartEpochMs });
  },
});
const traversal = createFoundationSourceTraversal({
  barData: Object.freeze({
    async acquire(request) {
      requests.push(request);
      return Object.freeze({
        bars: Object.freeze(bars.filter(({ startEpochMs }) => (
          startEpochMs >= request.windowStartEpochMs && startEpochMs < request.windowEndEpochMs
        ))),
      });
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

setBars(['2026-05-01T20:14:00.000Z']);
resolved = await traversal.nextEligible(context({
  cursor: '2026-05-01T18:01:00.000Z',
  durationMinutes: 720,
  end: '2026-05-02T02:00:00.000Z',
}));
assert.equal(resolved.targetEpochMs, epoch('2026-05-02T00:00:00.000Z'),
  'a partial 12h RTH bucket completes on its shared clock slot without inventing a source bar');

assert.ok(requests.length >= 5, 'target lookup remains delegated through Bar Data Runtime');
console.log('v7 Replay step source traversal harness passed', {
  scope: 'completion grid, missing minute, RTH weekend gap, Previous symmetry, 12h partial',
});
