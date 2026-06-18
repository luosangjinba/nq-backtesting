import assert from 'node:assert/strict';

import { addAnnotation, clearAnnotations } from '../src/pda/pda-store.js';
import { hitTestPdaAnnotations } from '../src/pda/pda-hit-test.js';

clearAnnotations();

addAnnotation({
  id: 'fib-hit-smoke',
  type: 'fib',
  startTime: 'start',
  endTime: 'end',
  start: { time: 'start', timestamp: 1, price: 100 },
  end: { time: 'end', timestamp: 2, price: 120 },
  levels: [
    { value: 0, visible: true },
    { value: 0.5, visible: true },
    { value: 1, visible: true },
  ],
  display: { showTrendLine: false },
});

const context = {
  timeframe: 1,
  getDisplayBars: () => [],
  getChart: () => ({
    timeScale: () => ({
      timeToCoordinate: (time) => {
        if (time === 'start') return 100;
        if (time === 'end') return 200;
        return null;
      },
      coordinateToLogical: (x) => x / 10,
      logicalToCoordinate: (logical) => logical * 10,
      options: () => ({ barSpacing: 10 }),
    }),
  }),
  priceToCoordinate: (price) => 300 - Number(price),
};

const trendHit = hitTestPdaAnnotations({ x: 150, y: 190, context });
assert.equal(trendHit?.id, 'fib-hit-smoke', 'fib trendline hit selects the fib PDA');
assert.equal(trendHit?.reason, 'fib-trend', 'fib trendline hit reason is reported');

const endpointHit = hitTestPdaAnnotations({ x: 200, y: 180, context });
assert.equal(endpointHit?.id, 'fib-hit-smoke', 'fib endpoint hit selects the fib PDA');
assert.equal(endpointHit?.reason, 'fib-endpoint', 'fib endpoint hit reason is reported');

const levelHit = hitTestPdaAnnotations({ x: 150, y: 200, context });
assert.equal(levelHit?.id, 'fib-hit-smoke', 'fib level area remains selectable');
assert.equal(levelHit?.reason, 'fib-level', 'fib level hit reason is preserved');

console.log('pda hit-test smoke ok');
