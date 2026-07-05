import assert from 'node:assert/strict';
import { createDefaultWallIntent, promoteMeasuredRangeToManualIntent } from '../src/viewport/viewport-intent.js';
import {
  measureManualWallFromLogicalRange,
  projectIntentToLogicalRange,
} from '../src/viewport/viewport-projection.js';

const defaultIntent = createDefaultWallIntent({
  cursorTimestamp: 1780306200,
  latestOffsetBars: 8,
});

assert.deepEqual(projectIntentToLogicalRange(defaultIntent, {
  defaultSpanBars: 90,
  latestLogicalIndex: 42,
}), {
  from: -40,
  latestLogicalIndex: 42,
  latestOffsetBars: 8,
  origin: 'default',
  revision: 0,
  spanBars: 90,
  to: 50,
});

const measurement = measureManualWallFromLogicalRange({
  latestLogicalIndex: 42,
  range: {
    from: 10.25,
    to: 55.75,
  },
});
assert.deepEqual(measurement, {
  latestOffsetBars: 13.75,
  spanBars: 45.5,
});

const manualIntent = promoteMeasuredRangeToManualIntent(defaultIntent, measurement);
assert.deepEqual(projectIntentToLogicalRange(manualIntent, {
  defaultSpanBars: 90,
  latestLogicalIndex: 43,
}), {
  from: 11.25,
  latestLogicalIndex: 43,
  latestOffsetBars: 13.75,
  origin: 'manual',
  revision: 1,
  spanBars: 45.5,
  to: 56.75,
});

assert.throws(
  () => projectIntentToLogicalRange(defaultIntent, { latestLogicalIndex: 42, defaultSpanBars: 0 }),
  /defaultSpanBars/
);
assert.throws(
  () => measureManualWallFromLogicalRange({ latestLogicalIndex: 42, range: { from: 10, to: 10 } }),
  /greater/
);

console.log('v6 viewport projection smoke passed');
