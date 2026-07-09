import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

const doc = await read('v6/docs/V6_NEXT_FOUNDATION_SLICE_SELECTION_STEP213.md');
const productDirection = await read('v6/docs/V6_PRODUCT_DIRECTION.md');
const chartProjection = await read('v6/src/chart-data-projection/chart-data-projection-domain.js');
const displayProjection = await read('v6/src/display-timeframe/display-timeframe-projection.js');
const leftwardPlanner = await read('v6/src/chart-history/leftward-extension-planner.js');

[
  'TF / Projection / Time Domain Unification Readiness Audit',
  'SMC/ICT-focused backtesting/journal',
  'especially prop firm traders',
  'chart foundation',
  'same class of problem as the leftward-history bug',
  'Do not rewrite projection implementation in Step 214',
  'Do not add new supported timeframes',
  'Do not add indicators',
  'Do not add SMC/ICT overlays',
  'Do not implement trading',
].forEach((text) => assert.equal(doc.includes(text), true));

assert.match(productDirection, /Foundation scope:[\s\S]*switch supported timeframes/);
assert.match(productDirection, /Deferred or undecided:[\s\S]*indicators/);
assert.match(productDirection, /plugin-friendly/);

assert.match(chartProjection, /projectSourceBarsToChartData/);
assert.match(chartProjection, /resolveBucketStart/);
assert.match(displayProjection, /projectBarsToDisplayTimeframe/);
assert.match(displayProjection, /bucketStart/);
assert.match(leftwardPlanner, /planLeftwardSourceWindow/);

assert.match(doc, /display-timeframe\/display-timeframe-projection\.js/);
assert.match(doc, /chart-data-projection\/chart-data-projection-domain\.js/);
assert.match(doc, /bar-data` remains the owner/);
assert.match(doc, /chart-data-projection` should remain the candidate owner/);
assert.match(doc, /Shell\/UI must not own timeframe math/);

console.log('v6 next foundation slice selection step 213 smoke passed');
