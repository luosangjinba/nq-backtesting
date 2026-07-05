import assert from 'node:assert/strict';
import { createChartViewportStore } from '../src/chart-viewport/chart-viewport-store.js';

const store = createChartViewportStore({
  defaultRightOffsetBars: 8,
  defaultSpanBars: 100,
});

const ensured = store.ensureIntent('pane-default', {
  cursorTimestamp: 1780306200,
});
assert.equal(ensured.intent.origin, 'default');
assert.equal(ensured.intent.revision, 0);
assert.equal(ensured.intent.latestOffsetBars, 8);
assert.equal(ensured.projection, null);

const projected = store.applyChartDataRevision('pane-default', {
  chartBarsRevision: 1,
  latestLogicalIndex: 20,
});
assert.deepEqual(projected.projection, {
  from: -72,
  latestLogicalIndex: 20,
  latestOffsetBars: 8,
  origin: 'default',
  revision: 0,
  spanBars: 100,
  to: 28,
});
assert.equal(projected.intent.origin, 'default');
assert.equal(projected.intent.revision, 0);

const manual = store.setManualIntent('pane-default', {
  latestOffsetBars: 4,
  spanBars: 48,
});
assert.equal(manual.intent.origin, 'manual');
assert.equal(manual.intent.revision, 1);
assert.equal(manual.projection, null);

const manualProjected = store.applyChartDataRevision('pane-default', {
  chartBarsRevision: 2,
  latestLogicalIndex: 21,
});
assert.equal(manualProjected.intent.origin, 'manual');
assert.equal(manualProjected.intent.revision, 1);
assert.deepEqual(manualProjected.projection, {
  from: -23,
  latestLogicalIndex: 21,
  latestOffsetBars: 4,
  origin: 'manual',
  revision: 1,
  spanBars: 48,
  to: 25,
});

const cursorUpdated = store.updateCursor(1780306260)[0];
assert.equal(cursorUpdated.intent.cursorTimestamp, 1780306260);
assert.equal(cursorUpdated.intent.origin, 'manual');
assert.equal(cursorUpdated.intent.revision, 1);
assert.equal(cursorUpdated.intent.latestOffsetBars, 4);
assert.equal(cursorUpdated.intent.spanBars, 48);

assert.throws(
  () => store.setManualIntent('missing-pane', { latestOffsetBars: 1, spanBars: 10 }),
  /no viewport intent/
);

console.log('v6 chart viewport store smoke passed');
