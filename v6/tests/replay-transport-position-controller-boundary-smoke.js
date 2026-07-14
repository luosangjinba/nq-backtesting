import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [transport, controller] = await Promise.all([
  readFile('v6/src/shell/replay-transport.js', 'utf8'),
  readFile('v6/src/shell/replay-transport-position-controller.js', 'utf8'),
]);

assert.match(transport, /mountReplayTransportPositionController/);
assert.doesNotMatch(transport, /pointermove|data-v6-transport-drag-handle|positionPreference\.load/);
assert.match(controller, /data-v6-transport-drag-handle/);
assert.match(controller, /data-v6-status-bar/);
assert.match(controller, /STATUS_BAR_CLEARANCE/);
assert.match(controller, /pointermove/);
assert.match(controller, /positionPreference/);
assert.doesNotMatch(controller, /REPLAY_COMMANDS|CHART_ENTRY_|dispatchCommand|subscribeEvent/);

console.log('v6 replay transport position controller boundary smoke passed');
