import assert from 'node:assert/strict';

import * as bus from '../src/event-bus.js';
import { addSmtRecord, clearSmtRecords, SMT_DIRECTIONS, SMT_TYPES } from '../src/smt/smt-store.js';
import { getSmtDisabledReason } from '../src/smt/manual-smt.js';
import { hitTestSmtRecords } from '../src/smt/smt-hit-test.js';
import { clearSmtSelection, getSelectedSmt, selectSmt } from '../src/smt/smt-selection.js';
import { setBars, clearBars } from '../src/data/bar-store.js';
import {
  clearComparisonBars,
  setComparisonBars,
  setComparisonInstrument,
  setComparisonTimeframe,
  setComparisonWindowEnabled,
} from '../src/comparison/comparison-window-store.js';

function createContext({ chartId = 'primary', instrument = 'NQ', timeframe = 1 } = {}) {
  return {
    chartId,
    enabled: true,
    instrument,
    timeframe,
    getDisplayBars: () => [],
    timeToCoordinate: (time) => Number(time),
    priceToCoordinate: (price) => Number(price),
  };
}

clearSmtRecords();

let selectedEvent = null;
let clearedCount = 0;
bus.on('smt:selected', (payload) => {
  selectedEvent = payload;
});
bus.on('smt:selection-cleared', () => {
  clearedCount += 1;
});

const liquidity = addSmtRecord({
  id: 'smt-liquidity-hit',
  type: SMT_TYPES.LIQUIDITY,
  direction: SMT_DIRECTIONS.BEARISH,
  timeframe: '1M',
  leftTimestamp: 1000,
  rightTimestamp: 1100,
  primaryLeftPrice: 100,
  primaryRightPrice: 120,
  compareLeftPrice: 95,
  compareRightPrice: 140,
}, { preserveId: true });

const primaryHit = hitTestSmtRecords({
  x: 1050,
  y: 110,
  chartId: 'primary',
  context: createContext(),
});
assert.equal(primaryHit?.id, liquidity.id, 'primary liquidity SMT line can be hit-tested');
assert.equal(primaryHit.reason, 'smt-liquidity-line');

const secondaryHit = hitTestSmtRecords({
  x: 1050,
  y: 129,
  chartId: 'secondary',
  context: createContext({ chartId: 'secondary', instrument: 'ES' }),
});
assert.equal(secondaryHit?.id, liquidity.id, 'secondary liquidity SMT line can be hit-tested');

const comparisonHit = hitTestSmtRecords({
  x: 1050,
  y: 129,
  chartId: 'comparison-window',
  context: createContext({ chartId: 'comparison-window', instrument: 'ES' }),
});
assert.equal(comparisonHit?.id, liquidity.id, 'comparison liquidity SMT line can be hit-tested');

assert.equal(selectSmt(liquidity.id)?.id, liquidity.id, 'SMT can be selected');
assert.equal(getSelectedSmt()?.id, liquidity.id, 'selected SMT state is stored');
assert.equal(selectedEvent?.record.id, liquidity.id, 'selection event includes SMT record');

clearSmtSelection();
assert.equal(getSelectedSmt(), null, 'SMT selection can be cleared');
assert.equal(clearedCount, 1, 'selection clear event fires once');

const fvg = addSmtRecord({
  id: 'smt-fvg-hit',
  type: SMT_TYPES.FVG,
  direction: SMT_DIRECTIONS.BULLISH,
  timeframe: '1M',
  timestamp: 2000,
  fvgStartTimestamp: 2010,
  fvgEndTimestamp: 2040,
  fvgTop: 130,
  fvgBottom: 110,
}, { preserveId: true });

const primaryFvgHit = hitTestSmtRecords({
  x: 1982,
  y: 300,
  chartId: 'primary',
  context: createContext(),
});
assert.equal(primaryFvgHit?.id, fvg.id, 'primary FVG SMT vertical marker can be hit-tested');

const secondaryFvgHit = hitTestSmtRecords({
  x: 2025,
  y: 120,
  chartId: 'secondary',
  context: createContext({ chartId: 'secondary', instrument: 'ES' }),
});
assert.equal(secondaryFvgHit?.id, fvg.id, 'secondary FVG SMT range can be hit-tested');

const comparisonFvgHit = hitTestSmtRecords({
  x: 2025,
  y: 120,
  chartId: 'comparison-window',
  context: createContext({ chartId: 'comparison-window', instrument: 'ES' }),
});
assert.equal(comparisonFvgHit?.id, fvg.id, 'comparison FVG SMT range can be hit-tested');
assert.equal(comparisonFvgHit.reason, 'smt-comparison-fvg-range');

setComparisonWindowEnabled(true);
setComparisonInstrument('ES');
setComparisonTimeframe(60);
setBars([
  { timestamp: 1000, time: '2026-06-12 10:00', open: 1, high: 2, low: 1, close: 2 },
], '2026-06-12 10:00', '2026-06-12 10:00', 60, { startTs: 1000, endTs: 1000 });
setComparisonBars([
  { timestamp: 1000, time: '2026-06-12 10:00', open: 1, high: 2, low: 1, close: 2 },
], { startTs: 1000, endTs: 1000 });
assert.equal(getSmtDisabledReason({ requireLoadedBars: true }), '', 'comparison ES same TF satisfies SMT guard');

clearComparisonBars();
setComparisonWindowEnabled(false);
clearBars();

console.log('smt selection smoke ok');
