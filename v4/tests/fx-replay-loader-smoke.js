import assert from 'node:assert/strict';
import {
  FX_REPLAY_REQUEST_TYPES,
  assertFxReplayInitialRequestPlan,
  buildFxReplayPrefixRequest,
  buildFxReplayStartResolveRequest,
  formatFxReplayDateTime,
  parseFxReplayDateTime,
  planFxReplayInitialRequests,
} from '../src/features/fx-replay/fx-replay-loader.js';

assert.equal(parseFxReplayDateTime('2025-06-01 18:00'), Date.UTC(2025, 5, 1, 18, 0));
assert.equal(formatFxReplayDateTime(Date.UTC(2025, 5, 1, 18, 0)), '2025-06-01 18:00');

const startResolve = buildFxReplayStartResolveRequest({
  sessionStart: '2025-06-01 18:00',
  timeframe: 1,
  instrument: 'nq',
});
assert.deepEqual(startResolve, {
  type: FX_REPLAY_REQUEST_TYPES.START_RESOLVE,
  reason: 'resolve-start-bar',
  instrument: 'NQ',
  timeframe: 1,
  start: '2025-06-01 18:00',
  end: '2025-06-01 18:01',
});

const prefix = buildFxReplayPrefixRequest({
  startBarTimestamp: Date.UTC(2025, 5, 1, 18, 0) / 1000,
  prefixBars: 3,
  timeframe: 1,
  instrument: 'NQ',
});
assert.deepEqual(prefix, {
  type: FX_REPLAY_REQUEST_TYPES.PREFIX,
  reason: 'initial-visible-prefix',
  instrument: 'NQ',
  timeframe: 1,
  start: '2025-06-01 17:57',
  end: '2025-06-01 17:59',
  requestedBars: 3,
  hardEndTimestamp: Date.UTC(2025, 5, 1, 18, 0) / 1000,
});

const initialWithoutResolvedStart = planFxReplayInitialRequests({
  instrument: 'NQ',
  timeframe: 60,
  sessionStart: '2025-06-01 18:00',
  sessionEnd: '2025-06-30 16:00',
});
assert.equal(initialWithoutResolvedStart.length, 1);
assert.equal(initialWithoutResolvedStart[0].type, FX_REPLAY_REQUEST_TYPES.START_RESOLVE);
assert.equal(initialWithoutResolvedStart[0].end, '2025-06-01 19:00');

const initialWithResolvedStart = planFxReplayInitialRequests({
  instrument: 'NQ',
  timeframe: 60,
  sessionStart: '2025-06-01 18:00',
  sessionEnd: '2025-06-30 16:00',
  startBarTimestamp: Date.UTC(2025, 5, 1, 18, 0) / 1000,
  prefixBars: 2,
});
assert.deepEqual(initialWithResolvedStart.map((request) => request.type), [
  FX_REPLAY_REQUEST_TYPES.START_RESOLVE,
  FX_REPLAY_REQUEST_TYPES.PREFIX,
]);
assert.equal(initialWithResolvedStart[1].start, '2025-06-01 16:00');
assert.equal(initialWithResolvedStart[1].end, '2025-06-01 17:00');
assert.equal(assertFxReplayInitialRequestPlan(initialWithResolvedStart, {
  sessionStart: '2025-06-01 18:00',
  sessionEnd: '2025-06-30 16:00',
  startBarTimestamp: Date.UTC(2025, 5, 1, 18, 0) / 1000,
}), true);

assert.throws(
  () => assertFxReplayInitialRequestPlan([
    {
      type: FX_REPLAY_REQUEST_TYPES.START_RESOLVE,
      start: '2025-06-01 18:00',
      end: '2025-06-30 16:00',
    },
  ], {
    sessionStart: '2025-06-01 18:00',
    sessionEnd: '2025-06-30 16:00',
  }),
  /must not load the full date range/
);

assert.throws(
  () => assertFxReplayInitialRequestPlan([
    {
      type: FX_REPLAY_REQUEST_TYPES.PREFIX,
      start: '2025-06-01 18:00',
      end: '2025-06-01 18:00',
      hardEndTimestamp: Date.UTC(2025, 5, 1, 18, 0) / 1000,
    },
  ]),
  /must end before the start bar/
);

console.log('fx replay loader smoke passed');
