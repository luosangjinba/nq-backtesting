import assert from 'node:assert/strict';
import { resolveReplayTransportPeriodNavigation } from '../src/shell/replay-transport-period-navigation.js';

assert.deepEqual(resolveReplayTransportPeriodNavigation({ key: 'ArrowDown', optionCount: 3 }), {
  focusIndex: 0, focusTrigger: false, handled: true, open: true,
});
assert.equal(resolveReplayTransportPeriodNavigation({ activeIndex: 2, key: 'ArrowDown', optionCount: 3 }).focusIndex, 0);
assert.equal(resolveReplayTransportPeriodNavigation({ activeIndex: 0, key: 'ArrowUp', optionCount: 3 }).focusIndex, 2);
assert.equal(resolveReplayTransportPeriodNavigation({ key: 'Home', optionCount: 3 }).focusIndex, 0);
assert.equal(resolveReplayTransportPeriodNavigation({ key: 'End', optionCount: 3 }).focusIndex, 2);
assert.deepEqual(resolveReplayTransportPeriodNavigation({ key: 'Escape', open: true, optionCount: 3 }), {
  focusIndex: null, focusTrigger: true, handled: true, open: false,
});
assert.equal(resolveReplayTransportPeriodNavigation({ key: 'Escape', open: false }).handled, false);
assert.equal(resolveReplayTransportPeriodNavigation({ key: 'ArrowDown', optionCount: 0 }).handled, false);

console.log('v6 replay transport period navigation smoke passed');
