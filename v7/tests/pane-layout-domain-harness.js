import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createPaneLayout,
  deserializePaneLayout,
  PaneLayoutDomainError,
  PANE_LAYOUT_METRICS,
  PANE_LAYOUT_OPTIONS,
  readPaneLayout,
  resizePaneLayout,
  serializePaneLayout,
} from '../src/pane-layout-domain/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/pane-layout-domain/negative/cases.json'), 'utf8',
));

assert.deepEqual(PANE_LAYOUT_OPTIONS.reduce((counts, option) => ({
  ...counts, [option.paneCount]: (counts[option.paneCount] ?? 0) + 1,
}), {}), { 1: 1, 2: 2, 3: 4, 4: 5 });

function leafSlots(node, result = []) {
  if (node.kind === 'leaf') result.push(node.slot);
  else {
    leafSlots(node.first, result);
    leafSlots(node.second, result);
  }
  return result;
}

const expectedSpatialSlots = new Map([
  ['layout.single', [0]],
  ['layout.two-columns', [1, 0]],
  ['layout.two-rows', [0, 1]],
  ['layout.three-columns', [2, 1, 0]],
  ['layout.three-rows', [0, 1, 2]],
  ['layout.three-left-stack', [1, 2, 0]],
  ['layout.three-right-stack', [2, 0, 1]],
  ['layout.four-grid', [2, 0, 3, 1]],
  ['layout.four-left-stack', [1, 2, 3, 0]],
  ['layout.four-right-stack', [3, 0, 1, 2]],
  ['layout.four-one-over-three', [0, 3, 2, 1]],
  ['layout.four-three-over-one', [3, 2, 0, 1]],
]);

for (const option of PANE_LAYOUT_OPTIONS) {
  const layout = createPaneLayout({ variantId: option.id });
  const value = readPaneLayout(layout);
  assert.equal(Object.isFrozen(layout), true);
  assert.equal(Object.isFrozen(value), true);
  assert.equal(value.paneCount, option.paneCount);
  const spatialSlots = leafSlots(value.tree);
  assert.deepEqual(spatialSlots, expectedSpatialSlots.get(option.id),
    `${option.id} must place Pane priority slots in reviewed geometry`);
  assert.deepEqual([...spatialSlots].sort(), Array.from({ length: option.paneCount }, (_, index) => index),
    `${option.id} must contain every Pane priority exactly once`);
  assert.deepEqual(readPaneLayout(deserializePaneLayout(serializePaneLayout(layout))).ratios, value.ratios);
}

const columns = createPaneLayout({ variantId: 'layout.three-columns' });
const constrained = readPaneLayout(resizePaneLayout({
  containerSizePx: 900,
  layout: columns,
  ratio: 0.01,
  splitId: 'root',
}));
assert.equal(constrained.ratios.root, PANE_LAYOUT_METRICS.minimumPaneWidthPx
  / (900 - PANE_LAYOUT_METRICS.dividerSizePx));
assert.equal(constrained.ratios['root.rest'], 0.5);

const actions = {
  create: (input) => createPaneLayout(input),
  deserialize: (input) => deserializePaneLayout(input),
  read: (input) => readPaneLayout(input),
  resizeMissing: () => resizePaneLayout({
    containerSizePx: 900, layout: columns, ratio: 0.5, splitId: 'missing',
  }),
  resizeSmall: () => resizePaneLayout({
    containerSizePx: 300, layout: columns, ratio: 0.5, splitId: 'root',
  }),
};
for (const fixture of negativeCases) {
  assert.throws(
    () => actions[fixture.operation](fixture.input),
    (error) => error instanceof PaneLayoutDomainError && error.code === fixture.expectedCode,
    `${fixture.name} must fail with ${fixture.expectedCode}`,
  );
}

console.log(`v7 Pane Layout Domain harness passed (12 variants, ${negativeCases.length} negative controls)`);
