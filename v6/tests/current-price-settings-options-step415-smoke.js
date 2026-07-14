import assert from 'node:assert/strict';
import { createCurrentPriceSeriesOptions } from '../src/chart-engine/current-price-settings-options.js';

const visible = createCurrentPriceSeriesOptions({}, 'nq');
assert.deepEqual(visible.options, { lastValueVisible: true, priceLineVisible: true, title: 'NQ' });
const hidden = createCurrentPriceSeriesOptions({
  currentPriceLineVisible: false,
  currentPriceNameVisible: false,
  currentPriceValueVisible: false,
}, 'ES');
assert.deepEqual(hidden.options, { lastValueVisible: false, priceLineVisible: false, title: '' });
console.log('V6 Current Price Settings options Step 415 smoke passed.');
