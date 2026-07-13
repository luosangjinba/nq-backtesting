import assert from 'node:assert/strict';
import {
  createDefaultWallIntent,
  promoteMeasuredRangeToManualIntent,
  resetToDefaultWallIntent,
  updateIntentCursor,
} from '../src/viewport/viewport-intent.js';

const defaultIntent = createDefaultWallIntent({
  cursorTimestamp: 1780306200,
  latestOffsetBars: 8,
});
assert.deepEqual(defaultIntent, {
  cursorTimestamp: 1780306200,
  latestOffsetBars: 8,
  mode: 'replay-wall',
  origin: 'default',
  revision: 0,
  spanBars: null,
});

const cursorAdvanced = updateIntentCursor(defaultIntent, 1780306260);
assert.deepEqual(cursorAdvanced, {
  ...defaultIntent,
  cursorTimestamp: 1780306260,
});
assert.equal(cursorAdvanced.origin, 'default');
assert.equal(cursorAdvanced.latestOffsetBars, 8);
assert.equal(cursorAdvanced.spanBars, null);
assert.equal(cursorAdvanced.revision, 0);

const manualIntent = promoteMeasuredRangeToManualIntent(cursorAdvanced, {
  latestOffsetBars: 5.5,
  spanBars: 84.25,
});
assert.deepEqual(manualIntent, {
  cursorTimestamp: 1780306260,
  latestOffsetBars: 5.5,
  mode: 'replay-wall',
  origin: 'manual',
  revision: 1,
  spanBars: 84.25,
});

const manualAdvanced = updateIntentCursor(manualIntent, 1780306320);
assert.equal(manualAdvanced.origin, 'manual');
assert.equal(manualAdvanced.latestOffsetBars, 5.5);
assert.equal(manualAdvanced.spanBars, 84.25);
assert.equal(manualAdvanced.revision, 1);

const reset = resetToDefaultWallIntent(manualAdvanced, {
  latestOffsetBars: 9,
});
assert.deepEqual(reset, {
  cursorTimestamp: 1780306320,
  latestOffsetBars: 9,
  mode: 'replay-wall',
  origin: 'default',
  revision: 2,
  spanBars: null,
});

assert.throws(
  () => createDefaultWallIntent({ cursorTimestamp: Number.NaN }),
  /finite timestamp/
);
assert.throws(
  () => promoteMeasuredRangeToManualIntent(defaultIntent, { latestOffsetBars: 4 }),
  /spanBars/
);
const historicalManualIntent = promoteMeasuredRangeToManualIntent(defaultIntent, {
  latestOffsetBars: -40,
  spanBars: 20,
});
assert.equal(historicalManualIntent.latestOffsetBars, -40);
assert.equal(historicalManualIntent.origin, 'manual');
assert.throws(
  () => createDefaultWallIntent({ cursorTimestamp: 100, latestOffsetBars: -1 }),
  /latestOffsetBars/
);

console.log('v6 viewport intent domain smoke passed');
