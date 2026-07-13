import assert from 'node:assert/strict';
import {
  clampReplayTransportPosition,
  createReplayTransportPositionSnapshot,
} from '../src/shell/replay-transport-position.js';

assert.deepEqual(clampReplayTransportPosition({
  height: 40,
  left: 900,
  top: -10,
  viewportHeight: 600,
  viewportWidth: 800,
  width: 200,
}), { left: 600, top: 0 });

assert.deepEqual(createReplayTransportPositionSnapshot({
  height: '40',
  left: '12',
  top: 18,
  width: -20,
}), { height: 40, left: 12, top: 18, width: 0 });

console.log('v6 replay transport position smoke passed');
