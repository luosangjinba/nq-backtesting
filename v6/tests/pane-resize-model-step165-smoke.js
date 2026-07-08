import assert from 'node:assert/strict';
import {
  calculatePaneResizeCoordinatePercent,
  createGridTemplatesFromRatios,
  getDefaultPaneResizeRatios,
  getPaneResizeHandles,
  resizePaneRatiosByHandle,
} from '../src/chart-engine/pane-resize-model.js';

assert.deepEqual(getDefaultPaneResizeRatios('twice-horizontal'), {
  columns: [100],
  rows: [50, 50],
});
assert.deepEqual(getPaneResizeHandles('twice-horizontal').map((handle) => [handle.id, handle.axis, handle.offset]), [
  ['rows:0', 'rows', 50],
]);
assert.deepEqual(getPaneResizeHandles('triple-columns').map((handle) => [handle.id, handle.axis, Math.round(handle.offset)]), [
  ['columns:0', 'columns', 33],
  ['columns:1', 'columns', 67],
]);
assert.deepEqual(getPaneResizeHandles('triple-right-stack').map((handle) => [handle.id, handle.axis, handle.region]), [
  ['columns:0', 'columns', 'full'],
  ['rows:0', 'rows', 'right'],
]);
assert.deepEqual(getPaneResizeHandles('triple-left-stack').map((handle) => [handle.id, handle.axis, handle.region]), [
  ['columns:0', 'columns', 'full'],
  ['rows:0', 'rows', 'left'],
]);

assert.deepEqual(
  resizePaneRatiosByHandle('twice-horizontal', null, 'rows:0', 70).rows.map(Math.round),
  [70, 30],
);
assert.deepEqual(
  resizePaneRatiosByHandle('triple-rows', { rows: [33, 34, 33] }, 'rows:0', 8).rows.map(Math.round),
  [12, 55, 33],
);
assert.deepEqual(
  resizePaneRatiosByHandle('triple-rows', { rows: [33, 34, 33] }, 'rows:1', 91).rows.map(Math.round),
  [33, 55, 12],
);
assert.deepEqual(
  resizePaneRatiosByHandle('triple-columns', { columns: [20, 40, 40] }, 'columns:0', 45).columns.map(Math.round),
  [45, 15, 40],
);
assert.deepEqual(
  resizePaneRatiosByHandle('triple-columns', { columns: [20, 40, 40] }, 'columns:1', 90).columns.map(Math.round),
  [20, 68, 12],
);

assert.equal(
  createGridTemplatesFromRatios({ columns: [70, 30], rows: [100] }).columns,
  'minmax(0, 70fr) minmax(0, 30fr)',
);
assert.equal(
  calculatePaneResizeCoordinatePercent({ axis: 'rows' }, { clientY: 250 }, { height: 400, top: 50 }),
  50,
);
assert.equal(
  calculatePaneResizeCoordinatePercent({ axis: 'columns' }, { clientX: 250 }, { left: 50, width: 400 }),
  50,
);

console.log('v6 pane resize model step 165 smoke passed');
