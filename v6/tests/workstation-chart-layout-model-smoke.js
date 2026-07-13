import assert from 'node:assert/strict';
import {
  createWorkstationLayoutSnapshot,
  LAYOUT_GRID_AREAS_BY_VARIANT,
} from '../src/chart-engine/workstation-chart-layout-model.js';

const panes = ['main', 'secondary', 'tertiary'];
assert.deepEqual(createWorkstationLayoutSnapshot({ mode: 'single' }, panes).visiblePaneIds, ['main']);
assert.deepEqual(
  createWorkstationLayoutSnapshot({ mode: 'twice', variant: 'twice-horizontal' }, panes),
  { mode: 'twice', paneCount: 2, variant: 'twice-horizontal', visiblePaneIds: ['main', 'secondary'] },
);
assert.equal(LAYOUT_GRID_AREAS_BY_VARIANT['triple-right-stack'].length, 3);
assert.throws(
  () => createWorkstationLayoutSnapshot({ mode: 'twice', variant: 'triple-columns' }, panes),
  /Unsupported chart surface layout variant/,
);

console.log('v6 workstation chart layout model smoke passed');
