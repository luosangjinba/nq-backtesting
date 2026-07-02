import assert from 'node:assert/strict';
import { DEFAULT_CHART_PRESENTATION_SETTINGS } from '../src/contracts/chart-presentation-contracts.js';
import {
  DEFAULT_DISPLAY_TIMEZONE,
  DEFAULT_EXCHANGE_TIMEZONE,
} from '../src/contracts/timezone-contracts.js';
import { buildChartDisplayContext } from '../src/runtime/chart-runtime-display-context.js';

const defaults = buildChartDisplayContext();

assert.equal(defaults.instrument, null);
assert.equal(defaults.displayTimeframe, null);
assert.equal(defaults.loadedCoverage, null);
assert.equal(defaults.displayTimezone, DEFAULT_DISPLAY_TIMEZONE);
assert.equal(defaults.exchangeTimezone, DEFAULT_EXCHANGE_TIMEZONE);
assert.equal(defaults.timeFormat, DEFAULT_CHART_PRESENTATION_SETTINGS.timeFormat);
assert.equal(defaults.showCrosshairReadout, true);

const first = buildChartDisplayContext({
  instrument: 'NQ',
  displayTimeframe: '5',
  loadedCoverage: {
    from: '2026-06-01T09:30:00.000Z',
    to: '2026-06-01T10:00:00.000Z',
  },
  displayTimezone: 'UTC',
  timeFormat: '12h',
  margins: {
    topPercent: 12,
    bottomPercent: 6,
  },
  rightOffsetBars: 14,
  candleStyle: {
    body: { up: '#00ff00', down: '#ff0000' },
    border: { up: '#00aa00', down: '#aa0000' },
    wick: { up: '#009900', down: '#990000' },
  },
});

assert.equal(first.instrument, 'NQ');
assert.equal(first.displayTimeframe, 5);
assert.deepEqual(first.loadedCoverage, {
  from: Date.parse('2026-06-01T09:30:00.000Z') / 1000,
  to: Date.parse('2026-06-01T10:00:00.000Z') / 1000,
});
assert.equal(first.displayTimezone, 'UTC');
assert.equal(first.timeFormat, '12h');
assert.equal(first.margins.topPercent, 12);
assert.equal(first.rightOffsetBars, 14);
assert.equal(first.candleStyle.body.up, '#00ff00');

const partial = buildChartDisplayContext({
  showCrosshairReadout: false,
}, first);

assert.equal(partial.instrument, 'NQ');
assert.equal(partial.displayTimeframe, 5);
assert.equal(partial.displayTimezone, 'UTC');
assert.equal(partial.timeFormat, '12h');
assert.equal(partial.showCrosshairReadout, false);
assert.notEqual(partial.candleStyle, first.candleStyle);
assert.notEqual(partial.candleStyle.body, first.candleStyle.body);

console.log('v5 chart runtime display context smoke passed');
