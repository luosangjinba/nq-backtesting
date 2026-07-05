import assert from 'node:assert/strict';
import {
  createDefaultWallIntent,
  promoteMeasuredRangeToManualIntent,
  updateIntentCursor,
} from '../src/viewport/viewport-intent.js';
import {
  measureManualWallFromLogicalRange,
  projectIntentToLogicalRange,
} from '../src/viewport/viewport-projection.js';

const defaultIntent = createDefaultWallIntent({
  cursorTimestamp: 1780306200,
  latestOffsetBars: 8,
});
const defaultInitial = projectIntentToLogicalRange(defaultIntent, {
  defaultSpanBars: 120,
  latestLogicalIndex: 100,
});

const defaultAdvancedIntent = updateIntentCursor(defaultIntent, 1780306260);
const defaultAdvanced = projectIntentToLogicalRange(defaultAdvancedIntent, {
  defaultSpanBars: 120,
  latestLogicalIndex: 101,
});
assert.equal(defaultAdvanced.to - defaultAdvanced.latestLogicalIndex, defaultInitial.latestOffsetBars);
assert.equal(defaultAdvanced.spanBars, defaultInitial.spanBars);
assert.equal(defaultAdvanced.origin, 'default');
assert.equal(defaultAdvanced.revision, defaultInitial.revision);
assert.equal(defaultAdvanced.to, defaultInitial.to + 1);
assert.equal(defaultAdvanced.from, defaultInitial.from + 1);

const measured = measureManualWallFromLogicalRange({
  latestLogicalIndex: 101,
  range: {
    from: 20.5,
    to: 115.5,
  },
});
const manualIntent = promoteMeasuredRangeToManualIntent(defaultAdvancedIntent, measured);
const manualInitial = projectIntentToLogicalRange(manualIntent, {
  defaultSpanBars: 120,
  latestLogicalIndex: 101,
});
assert.equal(manualInitial.latestOffsetBars, 14.5);
assert.equal(manualInitial.spanBars, 95);
assert.equal(manualInitial.origin, 'manual');

const manualAdvancedIntent = updateIntentCursor(manualIntent, 1780306320);
const manualAdvanced = projectIntentToLogicalRange(manualAdvancedIntent, {
  defaultSpanBars: 120,
  latestLogicalIndex: 102,
});
assert.equal(manualAdvanced.latestOffsetBars, manualInitial.latestOffsetBars);
assert.equal(manualAdvanced.spanBars, manualInitial.spanBars);
assert.equal(manualAdvanced.origin, 'manual');
assert.equal(manualAdvanced.revision, manualInitial.revision);
assert.equal(manualAdvanced.to, manualInitial.to + 1);
assert.equal(manualAdvanced.from, manualInitial.from + 1);

console.log('v6 viewport intent invariant smoke passed');
