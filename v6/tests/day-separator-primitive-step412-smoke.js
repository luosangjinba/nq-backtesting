import assert from 'node:assert/strict';
import { createDaySeparatorPrimitive } from '../src/chart-engine/day-separator-primitive.js';

let updates = 0;
const primitive = createDaySeparatorPrimitive();
primitive.attached({
  chart: { timeScale: () => ({ logicalToCoordinate: (logical) => logical * 10 }) },
  requestUpdate: () => { updates += 1; },
});
primitive.setLines([{ color: '#ffffff', dash: [2, 4], logical: 3 }]);
assert.equal(updates, 1);
primitive.updateAllViews();

const calls = [];
const context = {
  beginPath: () => calls.push('begin'),
  lineTo: (...args) => calls.push(['lineTo', ...args]),
  moveTo: (...args) => calls.push(['moveTo', ...args]),
  restore: () => calls.push('restore'),
  save: () => calls.push('save'),
  setLineDash: (dash) => calls.push(['dash', ...dash]),
  stroke: () => calls.push('stroke'),
};
primitive.paneViews()[0].renderer().draw({
  useBitmapCoordinateSpace: (draw) => draw({
    bitmapSize: { height: 200, width: 300 },
    context,
    horizontalPixelRatio: 2,
  }),
});
assert.deepEqual(calls.find((call) => Array.isArray(call) && call[0] === 'moveTo'), ['moveTo', 60, 0]);
assert.deepEqual(calls.find((call) => Array.isArray(call) && call[0] === 'dash'), ['dash', 4, 8]);
primitive.detached();

console.log('V6 day separator primitive Step 412 smoke passed.');
