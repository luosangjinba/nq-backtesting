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
assert.equal(ensured.defaultLatestOffsetBars, 8);
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

const manualBeforeDefaultUpdate = structuredClone(manualProjected.intent);
const updatedManualDefault = store.updateDefaultRightOffset(20)[0];
assert.equal(updatedManualDefault.defaultLatestOffsetBars, 20);
assert.deepEqual(updatedManualDefault.intent, manualBeforeDefaultUpdate);
assert.deepEqual(updatedManualDefault.projection, manualProjected.projection);
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

const reset = store.resetView('pane-default');
assert.equal(reset.intent.cursorTimestamp, 1780306260);
assert.equal(reset.intent.origin, 'default');
assert.equal(reset.intent.revision, 2);
assert.equal(reset.intent.latestOffsetBars, 20);
assert.equal(reset.intent.spanBars, null);
assert.equal(reset.projection, null);

const resetProjected = store.applyChartDataRevision('pane-default', {
  chartBarsRevision: 3,
  latestLogicalIndex: 22,
});
assert.deepEqual(resetProjected.projection, {
  from: -58,
  latestLogicalIndex: 22,
  latestOffsetBars: 20,
  origin: 'default',
  revision: 2,
  spanBars: 100,
  to: 42,
});

assert.throws(
  () => store.setManualIntent('missing-pane', { latestOffsetBars: 1, spanBars: 10 }),
  /no viewport intent/
);
assert.throws(
  () => store.resetView('missing-pane'),
  /no viewport intent/
);

store.ensureIntent('pane-custom-default', {
  cursorTimestamp: 1780306200,
  latestOffsetBars: 12,
});
store.setManualIntent('pane-custom-default', {
  latestOffsetBars: 3,
  spanBars: 30,
});
const customReset = store.resetView('pane-custom-default');
assert.equal(customReset.defaultLatestOffsetBars, 12);
assert.equal(customReset.intent.origin, 'default');
assert.equal(customReset.intent.latestOffsetBars, 12);

const defaultStore = createChartViewportStore({ defaultSpanBars: 100 });
defaultStore.ensureIntent('pane-live-default', { cursorTimestamp: 1780306200 });
defaultStore.applyChartDataRevision('pane-live-default', {
  chartBarsRevision: 1,
  latestLogicalIndex: 20,
});
const [updatedDefault] = defaultStore.updateDefaultRightOffset(16);
assert.equal(updatedDefault.defaultLatestOffsetBars, 16);
assert.equal(updatedDefault.intent.latestOffsetBars, 16);
assert.equal(updatedDefault.projection.to, 36);
assert.equal(updatedDefault.projection.from, -64);

assert.throws(() => defaultStore.updateDefaultRightOffset(-1), /integer from 0 to 100/);

console.log('v6 chart viewport store smoke passed');
