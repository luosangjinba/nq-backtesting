import assert from 'node:assert/strict';
import {
  canProjectPdaToComparison,
  canProjectPriceObjectToComparison,
  formatComparisonOverlaySummary,
  getComparisonOverlaySummary,
} from '../src/comparison/comparison-overlay-policy.js';
import {
  clearComparisonBars,
  getComparisonDisplayBars,
  setComparisonBars,
  setComparisonInstrument,
  setComparisonTimeframe,
  setComparisonWindowEnabled,
} from '../src/comparison/comparison-window-store.js';

const descriptor = { instrument: 'ES', timeframe: 60 };

assert.deepEqual(
  canProjectPriceObjectToComparison({ sourceInstrument: 'ES', sourceTimeframeLabel: '1H' }, descriptor),
  { ok: true, reason: 'match', sourceInstrument: 'ES', targetInstrument: 'ES' }
);

assert.equal(
  canProjectPriceObjectToComparison({ sourceInstrument: 'NQ', sourceTimeframe: 60 }, descriptor).reason,
  'instrument-mismatch'
);

assert.equal(
  canProjectPriceObjectToComparison({ sourceInstrument: 'ES', sourceTimeframeLabel: '4H' }, descriptor).reason,
  'timeframe-mismatch'
);

assert.equal(
  canProjectPdaToComparison({ sourceInstrument: 'NQ', sourceTimeframe: 60 }, descriptor).reason,
  'instrument-mismatch'
);

setComparisonWindowEnabled(true);
setComparisonInstrument('ES');
setComparisonTimeframe(60);
setComparisonBars([
  { timestamp: 100, open: 1, high: 2, low: 1, close: 2 },
  { timestamp: 200, open: 2, high: 3, low: 2, close: 3 },
  { timestamp: 300, open: 3, high: 4, low: 3, close: 4 },
], { startTs: 150, endTs: 250 });

assert.deepEqual(getComparisonDisplayBars().map((bar) => bar.timestamp), [200]);

const summary = getComparisonOverlaySummary();
assert.equal(summary.timeOverlayReady, true);
assert.match(formatComparisonOverlaySummary(summary), /Time overlays ready/);

clearComparisonBars();
setComparisonWindowEnabled(false);

console.log('comparison-overlay-policy-smoke passed');
