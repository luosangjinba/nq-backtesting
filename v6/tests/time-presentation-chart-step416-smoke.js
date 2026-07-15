import assert from 'node:assert/strict';
import { createTimePresentationChartOptions } from '../src/chart-engine/time-presentation-options.js';

const summerChart = Date.UTC(2026, 6, 13, 0, 0) / 1000;
const exchange = createTimePresentationChartOptions({
  displayTimezone: 'exchange',
  timeFormat: '12h',
});
assert.deepEqual(exchange.state, {
  dateFormat: 'yyyy/mm/dd',
  displayTimezone: 'exchange',
  showDayOfWeek: true,
  timeFormat: '12h',
});
assert.equal(exchange.options.localization.timeFormatter(summerChart), 'Mon 2026/07/13 12:00 AM');
assert.equal(exchange.options.timeScale.tickMarkFormatter(summerChart), '12:00 AM');

const utc = createTimePresentationChartOptions({
  dateFormat: 'dd/mm/yyyy',
  displayTimezone: 'utc',
  showDayOfWeek: false,
  timeFormat: '24h',
});
assert.equal(utc.options.localization.timeFormatter(summerChart), '13/07/2026 04:00');
assert.equal(utc.options.timeScale.tickMarkFormatter(summerChart), '04:00');
console.log('V6 Time Presentation chart Step 416 smoke passed.');
