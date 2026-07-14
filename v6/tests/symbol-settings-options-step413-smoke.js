import assert from 'node:assert/strict';
import { createSymbolSettingsSeriesOptions } from '../src/chart-engine/symbol-settings-options.js';

const mapped = createSymbolSettingsSeriesOptions({
  symbolBordersVisible: true,
  symbolDownBodyColor: '#111111',
  symbolDownBorderColor: '#222222',
  symbolDownWickColor: '#333333',
  symbolPricePrecision: '4',
  symbolUpBodyColor: '#aaaaaa',
  symbolUpBorderColor: '#bbbbbb',
  symbolUpWickColor: '#cccccc',
});
assert.deepEqual(mapped.options, {
  borderDownColor: '#222222',
  borderUpColor: '#bbbbbb',
  borderVisible: true,
  downColor: '#111111',
  priceFormat: { minMove: 0.0001, precision: 4, type: 'price' },
  upColor: '#aaaaaa',
  wickDownColor: '#333333',
  wickUpColor: '#cccccc',
  wickVisible: true,
});
assert.equal(mapped.state.symbolBordersVisible, true);
assert.equal(mapped.options.wickVisible, true);
assert.equal(mapped.state.symbolPricePrecision, '4');

const automatic = createSymbolSettingsSeriesOptions({ symbolPricePrecision: 'auto' }, {
  priceFormat: { minMove: 0.25, precision: 2, type: 'price' },
});
assert.deepEqual(automatic.options.priceFormat, {
  minMove: 0.25,
  precision: 2,
  type: 'price',
});

const integer = createSymbolSettingsSeriesOptions({ symbolPricePrecision: '0' });
assert.deepEqual(integer.options.priceFormat, { minMove: 1, precision: 0, type: 'price' });

console.log('V6 Symbol Settings options Step 413 smoke passed.');
