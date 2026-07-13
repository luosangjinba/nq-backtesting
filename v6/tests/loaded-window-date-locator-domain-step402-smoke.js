import assert from 'node:assert/strict';
import { planLoadedWindowDateLocation } from '../src/date-locator/loaded-window-date-locator-domain.js';

const bars = [100, 200, 400, 500].map((timestamp) => ({ timestamp }));

assert.deepEqual(planLoadedWindowDateLocation({
  bars,
  requestedTimestamp: 400,
  spanBars: 4,
}), {
  distanceSeconds: 0,
  latestLogicalIndex: 3,
  loadedEndTimestamp: 500,
  loadedStartTimestamp: 100,
  measurement: {
    latestOffsetBars: 1,
    spanBars: 4,
  },
  range: { from: 0, to: 4 },
  requestedTimestamp: 400,
  resolvedIndex: 2,
  resolvedTimestamp: 400,
  status: 'located',
});

const gap = planLoadedWindowDateLocation({
  bars,
  requestedTimestamp: 300,
  spanBars: 2,
});
assert.equal(gap.resolvedTimestamp, 200, 'equal-distance gaps choose the earlier real bar');

const historical = planLoadedWindowDateLocation({
  bars: Array.from({ length: 200 }, (_, index) => ({ timestamp: 100 + index })),
  requestedTimestamp: 120,
  spanBars: 40,
});
assert.equal(historical.measurement.latestOffsetBars, -159);
assert.equal(historical.resolvedIndex, 20);

assert.deepEqual(planLoadedWindowDateLocation({
  bars,
  requestedTimestamp: 50,
}), {
  loadedEndTimestamp: 500,
  loadedStartTimestamp: 100,
  reason: 'outside-loaded-window',
  requestedTimestamp: 50,
  status: 'rejected',
});

assert.deepEqual(planLoadedWindowDateLocation({
  bars: [],
  requestedTimestamp: 100,
}), {
  reason: 'no-loaded-bars',
  requestedTimestamp: 100,
  status: 'rejected',
});

assert.throws(
  () => planLoadedWindowDateLocation({
    bars: [{ timestamp: 200 }, { timestamp: 100 }],
    requestedTimestamp: 150,
  }),
  /strictly ordered/,
);

console.log('v6 loaded-window date locator domain step402 smoke passed');
