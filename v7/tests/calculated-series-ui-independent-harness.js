import assert from 'node:assert/strict';
import { createCalculatedSeriesUi } from '../src/calculated-series-ui/public.js';

assert.throws(
  () => createCalculatedSeriesUi(),
  /runtime requires execute\(\)/u,
  'the public entry must reject a missing command/state owner before touching DOM',
);

const runtime = Object.freeze({
  execute() {},
  readLegend() {},
  snapshot() {},
  subscribe() {},
});
assert.throws(
  () => createCalculatedSeriesUi({ paneAddonPort: null, runtime }),
  /requires a Pane add-on port/u,
  'the public entry must reject implicit Pane DOM ownership',
);

console.log('v7 calculated-series UI independent harness passed (public entry and owner ports)');
