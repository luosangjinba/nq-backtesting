import assert from 'node:assert/strict';
import {
  formatCandleTitle,
  formatChange,
  formatInspectionReadout,
  formatOhlc,
  formatPrice,
} from '../src/domain/chart-formatting.js';

const bar = {
  time: '2026-06-01T09:30:00.000Z',
  open: 300,
  high: 301.125,
  low: 299.5,
  close: 300.75,
};

assert.equal(formatPrice(300), '300.00');
assert.equal(formatPrice(300.125), '300.13');
assert.equal(formatPrice(0, { signed: true }), '0.00');
assert.equal(formatPrice(1.5, { signed: true }), '+1.50');
assert.equal(formatPrice(-1.5, { signed: true }), '-1.50');
assert.equal(formatPrice('not-a-number'), '--');

assert.equal(formatOhlc(bar), 'O 300.00 H 301.13 L 299.50 C 300.75');
assert.equal(formatChange(2), '+2.00');
assert.equal(formatChange(-0.25), '-0.25');
assert.equal(
  formatCandleTitle(bar, { timeText: '2026-06-01 09:30' }),
  '2026-06-01 09:30 O 300.00 H 301.13 L 299.50 C 300.75'
);
assert.equal(
  formatInspectionReadout({
    timeText: '2026-06-01 09:30',
    price: 300.25,
    bar,
  }),
  '2026-06-01 09:30  P 300.25  O 300.00 H 301.13 L 299.50 C 300.75'
);

console.log('v5 chart formatting smoke passed');
