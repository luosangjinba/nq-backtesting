import assert from 'node:assert/strict';
import { createDaySeparatorOverlayLines } from '../src/session-calendar/day-separator-overlay-model.js';

const start = Date.parse('2026-03-08T00:00:00Z') / 1000;
const bars = Array.from({ length: 48 }, (_, index) => ({ timestamp: start + (index * 3600) }));
const settings = {
  chartDaySeparators: 'both',
  chartIctDaySeparatorColor: '#a855f7',
  chartIctDaySeparatorStyle: 'dotted',
  chartTradingDaySeparatorColor: '#3b82f6',
  chartTradingDaySeparatorStyle: 'dashed',
};
const lines = createDaySeparatorOverlayLines(bars, settings);
assert.deepEqual(lines.map(({ logical, style, type }) => ({ logical, style, type })), [
  { logical: 0, style: 'dotted', type: 'ict' },
  { logical: 18, style: 'dashed', type: 'trading' },
  { logical: 24, style: 'dotted', type: 'ict' },
  { logical: 42, style: 'dashed', type: 'trading' },
]);

const fourHourBars = Array.from({ length: 12 }, (_, index) => ({ timestamp: start + (index * 14_400) }));
const fourHourLines = createDaySeparatorOverlayLines(fourHourBars, settings);
assert.equal(fourHourLines[0].logical, 0);
assert.equal(fourHourLines[1].logical, 4.5);

const weekendGapBars = [
  { timestamp: Date.parse('2026-03-06T20:00:00Z') / 1000 },
  { timestamp: Date.parse('2026-03-06T21:00:00Z') / 1000 },
  { timestamp: Date.parse('2026-03-09T04:00:00Z') / 1000 },
  { timestamp: Date.parse('2026-03-09T05:00:00Z') / 1000 },
];
assert.equal(createDaySeparatorOverlayLines(weekendGapBars, settings).length, 0);
assert.deepEqual(createDaySeparatorOverlayLines(bars, {
  ...settings,
  chartDaySeparators: 'off',
}), []);
assert.deepEqual(createDaySeparatorOverlayLines([
  { timestamp: start },
  { timestamp: start + 86_400 },
], settings), []);

console.log('V6 day separator overlay model Step 412 smoke passed.');
