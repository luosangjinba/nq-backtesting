import assert from 'node:assert/strict';
import { clearCommandsForTest, dispatchCommand, registerCommand } from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent } from '../src/runtime/events.js';
import { CHART_EVENTS } from '../src/contracts/chart-contracts.js';
import { REPLAY_COMMANDS } from '../src/contracts/replay-contracts.js';
import { createReplayViewportDemandBridge } from '../src/features/chart-replay/viewport-demand-wiring.js';

clearCommandsForTest();
clearEventsForTest();

const replayLoads = [];
let resolveReplayLoad = null;
const unsubscribeCommand = registerCommand(REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW, (payload = {}) => {
  replayLoads.push(payload);
  return new Promise((resolve) => {
    resolveReplayLoad = () => resolve({
      loaded: true,
      displayBars: [],
    });
  });
});

const bridge = createReplayViewportDemandBridge({
  getSessionId: () => 'viewport-demand-session',
});
bridge.start();

const viewportDemand = {
  instrument: 'NQ',
  displayTimeframe: 5,
  direction: 'backward',
  visibleFrom: Date.parse('2026-06-01T09:10:00.000Z') / 1000,
  visibleTo: Date.parse('2026-06-01T09:25:00.000Z') / 1000,
  loadedCoverage: {
    from: Date.parse('2026-06-01T09:25:00.000Z') / 1000,
    to: Date.parse('2026-06-01T09:30:00.000Z') / 1000,
  },
  missingWindow: {
    direction: 'backward',
    anchor: '2026-06-01T09:25:00.000Z',
    from: Date.parse('2026-06-01T09:10:00.000Z') / 1000,
    to: Date.parse('2026-06-01T09:25:00.000Z') / 1000,
    suggestedCount: 4,
  },
};

emitEvent(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand });
await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(replayLoads.length, 1);
assert.deepEqual(replayLoads[0], {
  sessionId: 'viewport-demand-session',
  viewportDemand,
});

emitEvent(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand });
await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(
  replayLoads.length,
  1,
  'duplicate viewport demand should not dispatch a second in-flight replay load'
);

resolveReplayLoad();
await new Promise((resolve) => setTimeout(resolve, 0));

bridge.stop();
emitEvent(CHART_EVENTS.VIEWPORT_DEMAND, { viewportDemand });
await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(replayLoads.length, 1);

unsubscribeCommand();

assert.equal(
  await dispatchCommand(REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW, {}).catch((error) => error.message),
  'Command "replay.loadDisplayWindow" is not registered.'
);

console.log('v5 replay display viewport demand wiring smoke passed');
