import assert from 'node:assert/strict';

import { FibPrimitive } from '../src/chart/primitives/fib-primitive.js';
import { LiquidityPrimitive } from '../src/chart/primitives/liquidity-primitive.js';
import { PointSetPrimitive } from '../src/chart/primitives/point-set-primitive.js';
import { FvgPrimitive, RangePrimitive } from '../src/chart/primitives/range-primitive.js';
import { SegmentPrimitive } from '../src/chart/primitives/segment-primitive.js';
import { VerticalLinePrimitive } from '../src/chart/primitives/vertical-line-primitive.js';

const chart = {
  timeScale() {
    return {
      timeToCoordinate(time) {
        return Number(time) || 0;
      },
      options() {
        return { barSpacing: 6 };
      },
    };
  },
};

const series = {
  priceToCoordinate(price) {
    return Number(price) || 0;
  },
};

function attachForCounting(primitive) {
  let count = 0;
  primitive.attached?.({
    requestUpdate: () => {
      count += 1;
    },
  });
  return () => count;
}

const liquidity = new LiquidityPrimitive(chart, series, 1, 100, '#111111', '#eeeeee', 'A', 'above');
const liquidityUpdates = attachForCounting(liquidity);
assert.equal(liquidityUpdates(), 1);
liquidity.update({
  anchorTime: 2,
  price: 101,
  lineColor: '#222222',
  textColor: '#dddddd',
  label: 'B',
  position: 'below',
  options: { lineWidth: 3 },
});
assert.equal(liquidity._anchorTime, 2);
assert.equal(liquidity._price, 101);
assert.equal(liquidity._lineColor, '#222222');
assert.equal(liquidity._textColor, '#dddddd');
assert.equal(liquidity._label, 'B');
assert.equal(liquidity._position, 'below');
assert.equal(liquidity._options.lineWidth, 3);
assert.equal(liquidityUpdates(), 2);

const range = new RangePrimitive(chart, series, 1, 2, 105, 95, 'R');
const rangeUpdates = attachForCounting(range);
range.update({
  startTime: 3,
  endTime: 4,
  topPrice: 110,
  bottomPrice: 90,
  label: 'R2',
  options: { borderColor: '#ff0000' },
});
assert.equal(range._startTime, 3);
assert.equal(range._endTime, 4);
assert.equal(range._topPrice, 110);
assert.equal(range._bottomPrice, 90);
assert.equal(range._label, 'R2');
assert.equal(range._options.borderColor, '#ff0000');
assert.equal(rangeUpdates(), 2);

const fvg = new FvgPrimitive(chart, series, 1, 2, 105, 95, '#12345633');
const fvgUpdates = attachForCounting(fvg);
fvg.update({ startTime: 5, endTime: 6, topPrice: 106, bottomPrice: 96, color: '#65432133' });
assert.equal(fvg._startTime, 5);
assert.equal(fvg._endTime, 6);
assert.equal(fvg._topPrice, 106);
assert.equal(fvg._bottomPrice, 96);
assert.equal(fvg._fillColor, '#65432133');
assert.equal(fvgUpdates(), 2);

const pointSet = new PointSetPrimitive(chart, series, [{ time: 1, price: 100 }], 100, 'P');
const pointSetUpdates = attachForCounting(pointSet);
pointSet.update({
  points: [{ time: 2, price: 101 }],
  referencePrice: 101,
  label: 'P2',
  options: { markerSize: 7 },
});
assert.deepEqual(pointSet._points, [{ time: 2, price: 101 }]);
assert.equal(pointSet._referencePrice, 101);
assert.equal(pointSet._label, 'P2');
assert.equal(pointSet._options.markerSize, 7);
assert.equal(pointSetUpdates(), 2);

const fib = new FibPrimitive(chart, series, 1, 100, 2, 90, [{ value: 0.5, price: 95 }]);
const fibUpdates = attachForCounting(fib);
fib.update({
  startTime: 3,
  startPrice: 110,
  endTime: 4,
  endPrice: 100,
  levels: [{ value: 0.705, price: 102.95 }],
  options: { lineColor: '#abcdef', textColor: '#fedcba', lineWidth: 2 },
});
assert.equal(fib._startTime, 3);
assert.equal(fib._startPrice, 110);
assert.equal(fib._endTime, 4);
assert.equal(fib._endPrice, 100);
assert.deepEqual(fib._levels, [{ value: 0.705, price: 102.95 }]);
assert.equal(fib._lineColor, '#abcdef');
assert.equal(fib._textColor, '#fedcba');
assert.equal(fib._options.lineWidth, 2);
assert.equal(fibUpdates(), 2);

const segment = new SegmentPrimitive(chart, series, 1, 100, 2, 110, 'S');
const segmentUpdates = attachForCounting(segment);
segment.update({
  startTime: 5,
  startPrice: 120,
  endTime: 6,
  endPrice: 130,
  label: 'S2',
  options: { lineWidth: 4 },
});
assert.equal(segment._startTime, 5);
assert.equal(segment._startPrice, 120);
assert.equal(segment._endTime, 6);
assert.equal(segment._endPrice, 130);
assert.equal(segment._label, 'S2');
assert.equal(segment._options.lineWidth, 4);
assert.equal(segmentUpdates(), 2);

const vertical = new VerticalLinePrimitive(chart, 1);
const verticalUpdates = attachForCounting(vertical);
vertical.update({ time: 9, options: { color: '#00ff00', label: 'V' } });
assert.equal(vertical._time, 9);
assert.equal(vertical._options.color, '#00ff00');
assert.equal(vertical._options.label, 'V');
assert.equal(verticalUpdates(), 1);
vertical.setOptions({ lineWidth: 3 });
assert.equal(vertical._options.lineWidth, 3);
assert.equal(verticalUpdates(), 2);

console.log('primitive mutation smoke ok');
