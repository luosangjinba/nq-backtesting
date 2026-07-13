import assert from 'node:assert/strict';

import { resolveViewportTargetHistoryBarCount } from '../src/chart-history/target-history-request-sizing.js';
import { planViewportTargetHistoryWindow } from '../src/chart-history/target-history-window-plan.js';

const visibleRange = { from: -72.4, to: 9.2 };
assert.equal(resolveViewportTargetHistoryBarCount({
  displayTimeframe: 240,
  sourceTimeframe: 1,
  visibleRange,
}), 164);
assert.equal(resolveViewportTargetHistoryBarCount({
  displayTimeframe: '1D',
  sourceTimeframe: 1,
  visibleRange,
}), 164);

const sourceWindow = {
  end: '2026-05-01 09:29',
  instrument: 'NQ',
  start: '2026-04-17 12:10',
  timeframe: 1,
};
const daily = planViewportTargetHistoryWindow({
  displayTimeframe: '1D',
  plannedSourceWindow: sourceWindow,
  targetDisplayBars: 164,
});
assert.equal(daily.end, sourceWindow.end);
assert.notEqual(daily.start, sourceWindow.start);
assert.equal(new Date(`${daily.start.replace(' ', 'T')}Z`) < new Date('2025-07-01T00:00:00Z'), true);

const fourHour = planViewportTargetHistoryWindow({
  displayTimeframe: 240,
  plannedSourceWindow: sourceWindow,
  targetDisplayBars: 164,
});
assert.equal(fourHour.start, '2026-04-04 01:29');

console.log('v6 target history viewport window step399 smoke passed');
