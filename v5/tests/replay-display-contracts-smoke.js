import assert from 'node:assert/strict';
import { REPLAY_COMMANDS, REPLAY_EVENTS } from '../src/contracts/replay-contracts.js';

function assertUniqueValues(record, label) {
  const values = Object.values(record);
  assert.equal(
    new Set(values).size,
    values.length,
    `${label} values must be unique`
  );
}

assertUniqueValues(REPLAY_COMMANDS, 'replay command');
assertUniqueValues(REPLAY_EVENTS, 'replay event');

assert.equal(REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME, 'replay.setDisplayTimeframe');
assert.equal(REPLAY_COMMANDS.GET_DISPLAY_CONTEXT, 'replay.getDisplayContext');
assert.equal(REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW, 'replay.loadDisplayWindow');

assert.equal(REPLAY_EVENTS.DISPLAY_TIMEFRAME_CHANGED, 'replay:displayTimeframeChanged');
assert.equal(REPLAY_EVENTS.DISPLAY_WINDOW_LOADED, 'replay:displayWindowLoaded');
assert.equal(REPLAY_EVENTS.DISPLAY_RELOADED, 'replay:displayReloaded');

assert.equal(REPLAY_COMMANDS.NEXT, 'replay.next');
assert.equal(REPLAY_EVENTS.NEXT, 'replay:next');

console.log('v5 replay display contracts smoke passed');
