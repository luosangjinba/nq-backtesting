import assert from 'node:assert/strict';
import {
  VIEWPORT_TARGETS,
  createViewportRouter,
  formatLocateTargets,
} from '../src/chart/viewport-router.js';

const calls = [];
const router = createViewportRouter({
  [VIEWPORT_TARGETS.PRIMARY]: (range, options) => {
    calls.push({ target: VIEWPORT_TARGETS.PRIMARY, range, options });
    return true;
  },
  [VIEWPORT_TARGETS.COMPARISON]: (range, options) => {
    calls.push({ target: VIEWPORT_TARGETS.COMPARISON, range, options });
    return Boolean(options.comparisonReady);
  },
});

let result = router.locateChartRange(VIEWPORT_TARGETS.PRIMARY, { start: 100, end: 200 }, { flash: false });
assert.equal(result.located, true);
assert.deepEqual(result.range, { start: 100, end: 200 });
assert.deepEqual(result.targets.primary, { located: true, reason: '' });
assert.equal(calls.at(-1).options.flash, false);

result = router.locateChartRange(VIEWPORT_TARGETS.SECONDARY, { start: 100, end: 200 });
assert.equal(result.located, false);
assert.deepEqual(result.targets.secondary, { located: false, reason: 'unsupported-target' });

result = router.locateChartRange(VIEWPORT_TARGETS.COMPARISON, { start: 100, end: 200 }, { comparisonReady: true });
assert.equal(result.located, true);
assert.deepEqual(result.targets['comparison-window'], { located: true, reason: '' });

result = router.locateChartRange(VIEWPORT_TARGETS.BOTH, { start: 100, end: 200 }, { comparisonReady: true });
assert.equal(result.located, true);
assert.deepEqual(Object.keys(result.targets), ['primary', 'comparison-window']);
assert.deepEqual(result.targets.primary, { located: true, reason: '' });
assert.deepEqual(result.targets['comparison-window'], { located: true, reason: '' });

result = router.locateChartRange(VIEWPORT_TARGETS.COMPARISON, { start: 100, end: 200 });
assert.equal(result.located, false);
assert.deepEqual(result.targets['comparison-window'], { located: false, reason: 'not-located' });

result = router.locateChartRange(VIEWPORT_TARGETS.PRIMARY, { start: 'bad', end: 200 });
assert.equal(result.located, false);
assert.deepEqual(result.targets.primary, { located: false, reason: 'invalid-range' });

result = router.locateChartRangeMany([VIEWPORT_TARGETS.PRIMARY, VIEWPORT_TARGETS.COMPARISON], { start: 1, end: 2 });
assert.equal(result.located, true);
assert.equal(formatLocateTargets(result), 'primary:located, comparison-window:not-located');

console.log('viewport-router-smoke passed');
