import assert from 'node:assert/strict';

import { getManualRangePrices } from '../src/pda/manual-pda-actions.js';

const startBar = { high: 110, low: 100 };
const middleBar = { high: 140, low: 70 };
const lastBar = { high: 120, low: 90 };

assert.deepEqual(
  getManualRangePrices('ob', 'bullish', startBar, lastBar),
  { topPrice: 110, bottomPrice: 90 },
  'bullish OB uses first high and last low'
);
assert.deepEqual(
  getManualRangePrices('ob', 'bearish', startBar, lastBar),
  { topPrice: 120, bottomPrice: 100 },
  'bearish OB uses first low and last high'
);
assert.deepEqual(
  getManualRangePrices('breaker', 'bullish', startBar, lastBar),
  { topPrice: 110, bottomPrice: 90 },
  'bullish breaker uses first high and last low'
);
assert.deepEqual(
  getManualRangePrices('breaker', 'bearish', startBar, lastBar),
  { topPrice: 120, bottomPrice: 100 },
  'bearish breaker uses first low and last high'
);

assert.notEqual(middleBar.high, getManualRangePrices('ob', 'bullish', startBar, lastBar).topPrice);
assert.notEqual(middleBar.low, getManualRangePrices('ob', 'bullish', startBar, lastBar).bottomPrice);

console.log('manual range prices smoke passed');
