import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [transport, controller] = await Promise.all([
  readFile('v6/src/shell/replay-transport.js', 'utf8'),
  readFile('v6/src/shell/replay-transport-period-menu-controller.js', 'utf8'),
]);

assert.match(transport, /mountReplayTransportPeriodMenuController/);
assert.match(transport, /onSelect: dispatchPeriodChange/);
assert.doesNotMatch(transport, /getFocusablePeriodOptions|focusPeriodOption|targetIsInPeriodMenu/);
assert.match(controller, /data-v6-transport-period-option/);
assert.match(controller, /resolveReplayTransportPeriodNavigation/);
assert.doesNotMatch(controller, /PLAYBACK_PERIOD_COMMANDS|dispatchCommand|subscribeEvent/);

console.log('v6 replay transport period menu controller boundary smoke passed');
