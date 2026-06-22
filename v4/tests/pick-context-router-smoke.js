import assert from 'node:assert/strict';
import {
  PICK_CONTEXT_TARGETS,
  createPickContextRouter,
  findBarByChartTime,
} from '../src/chart/pick-context-router.js';

const calls = [];
const bars = [
  { timestamp: 100, tradingDay: '2024-01-02' },
  { timestamp: 160, tradingDay: '2024-01-03' },
];
const router = createPickContextRouter({
  [PICK_CONTEXT_TARGETS.PRIMARY]: {
    label: 'primary',
    chartEl: () => ({ id: 'chart' }),
    timeframe: () => 60,
    getDisplayBars: () => bars,
    coordinateToTime: (x) => x + 100,
    showPreviewCursor: (time) => calls.push(['primary-show', time]),
    hidePreviewCursor: () => calls.push(['primary-hide']),
    isEnabled: () => true,
  },
  [PICK_CONTEXT_TARGETS.COMPARISON]: {
    label: 'comparison',
    chartEl: () => ({ id: 'comparison-chart-canvas' }),
    timeframe: () => 60,
    getDisplayBars: () => bars,
    coordinateToTime: (x) => x + 300,
    showPreviewCursor: (time) => calls.push(['comparison-show', time]),
    hidePreviewCursor: () => calls.push(['comparison-hide']),
    isEnabled: () => true,
  },
});

let context = router.getPickContext({ currentTarget: { id: 'comparison-chart-canvas' } });
assert.equal(context.chartId, PICK_CONTEXT_TARGETS.COMPARISON);
assert.equal(context.coordinateToTime(5), 305);
assert.deepEqual(findBarByChartTime(context, 160), bars[1]);
context.showPreviewCursor(160);
assert.deepEqual(calls.at(-1), ['comparison-show', 160]);

context = router.getPickContext('primary');
assert.equal(context.chartId, PICK_CONTEXT_TARGETS.PRIMARY);
assert.equal(context.getBarChartTime(bars[0]), 100);

router.clearOtherPickPreviewCursors(PICK_CONTEXT_TARGETS.PRIMARY);
assert.deepEqual(calls.slice(-1), [['comparison-hide']]);

router.clearAllPickPreviewCursors();
assert.deepEqual(calls.slice(-2), [['primary-hide'], ['comparison-hide']]);

context = router.getPickContext({ currentTarget: { id: 'secondary-chart' } });
assert.equal(context.chartId, PICK_CONTEXT_TARGETS.PRIMARY);

console.log('pick-context-router-smoke passed');
