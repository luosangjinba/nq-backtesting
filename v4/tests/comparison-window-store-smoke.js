import assert from 'node:assert/strict';
import {
  getComparisonViewDescriptor,
  getComparisonWindowState,
  isComparisonWindowEnabled,
  resetComparisonVisibleWindow,
  setComparisonInstrument,
  setComparisonTimeframe,
  setComparisonWindowEnabled,
  updateComparisonVisibleWindow,
} from '../src/comparison/comparison-window-store.js';

assert.equal(isComparisonWindowEnabled(), false);

let state = setComparisonWindowEnabled(true);
assert.equal(state.enabled, true);
assert.equal(state.descriptor.viewId, 'comparison-window-1');
assert.equal(state.descriptor.writable, false);
assert.equal(state.descriptor.layoutMode, 'floating');
assert.equal(state.descriptor.syncMode, 'primary-time');

setComparisonInstrument('NQ');
setComparisonTimeframe('240');
state = getComparisonWindowState();
assert.equal(state.descriptor.instrument, 'NQ');
assert.equal(state.descriptor.timeframe, 240);

const moved = updateComparisonVisibleWindow({ x: 999, y: -50, width: 50, height: 40 });
assert.deepEqual(moved, { x: 50, y: 0, width: 50, height: 40 });

const reset = resetComparisonVisibleWindow();
assert.deepEqual(reset, { x: 18, y: 10, width: 48, height: 46 });

const descriptor = getComparisonViewDescriptor();
descriptor.visibleWindow.x = 1;
assert.equal(getComparisonWindowState().descriptor.visibleWindow.x, 18);

setComparisonWindowEnabled(false);
assert.equal(isComparisonWindowEnabled(), false);

console.log('comparison-window-store-smoke passed');
