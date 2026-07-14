import assert from 'node:assert/strict';
import { createSymbolSettingsSeriesOptions } from '../src/chart-engine/symbol-settings-options.js';

const mapped = createSymbolSettingsSeriesOptions({
  symbolBordersVisible: true,
  symbolDownBodyColor: '#111111',
  symbolDownBorderColor: '#222222',
  symbolDownWickColor: '#333333',
  symbolUpBodyColor: '#aaaaaa',
  symbolUpBorderColor: '#bbbbbb',
  symbolUpWickColor: '#cccccc',
  symbolWicksVisible: false,
});
assert.deepEqual(mapped.options, {
  borderDownColor: '#222222',
  borderUpColor: '#bbbbbb',
  borderVisible: true,
  downColor: '#111111',
  upColor: '#aaaaaa',
  wickDownColor: '#333333',
  wickUpColor: '#cccccc',
  wickVisible: false,
});
assert.equal(mapped.state.symbolBordersVisible, true);
assert.equal(mapped.state.symbolWicksVisible, false);

console.log('V6 Symbol Settings options Step 413 smoke passed.');
