import assert from 'node:assert/strict';

import {
  LAYOUT_COMMANDS,
} from '../src/contracts/layout-contracts.js';
import {
  REPLAY_COMMANDS,
} from '../src/contracts/replay-contracts.js';
import {
  createChartReplayPaneDisplayCoordinator,
  PANE_DISPLAY_STATES,
} from '../src/features/chart-replay/chart-replay-pane-display-coordinator.js';

function createCoordinatorHarness({
  replayLoaded = true,
  sessionId = 'session-test',
  failReplay = false,
} = {}) {
  const commands = [];
  const layoutStates = [];
  const statuses = [];
  const coordinator = createChartReplayPaneDisplayCoordinator({
    getReplayDisplayTimeframe: () => 5,
    getSessionTimeframe: () => 1,
    getDisplayTimeframeFallback: () => 1,
    getSessionId: () => sessionId,
    getReplayLoaded: () => replayLoaded,
    onLayoutState: (layoutState) => layoutStates.push(layoutState),
    setStatusText: (status) => statuses.push(status),
    dispatchCommand: async (command, payload) => {
      commands.push({ command, payload });
      if (command === LAYOUT_COMMANDS.SET_PANE_DISPLAY_TIMEFRAME) {
        return {
          panes: [
            { id: 'primary', displayTimeframe: 1 },
            { id: payload.paneId, displayTimeframe: payload.displayTimeframe },
          ],
        };
      }
      if (command === REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME && failReplay) {
        throw new Error('display failed');
      }
      return {
        paneId: payload.paneId,
        displayTimeframe: payload.displayTimeframe,
      };
    },
  });
  return {
    commands,
    coordinator,
    layoutStates,
    statuses,
  };
}

{
  const { commands, coordinator } = createCoordinatorHarness();
  const primaryResult = await coordinator.ensurePaneDisplay({ id: 'primary', displayTimeframe: 1 });
  assert.equal(primaryResult.state, PANE_DISPLAY_STATES.READY);
  assert.equal(primaryResult.displayTimeframe, 1);
  assert.equal(commands.length, 0, 'default pane bootstrap compatibility must not enqueue duplicate display setup');
}

{
  const { commands, coordinator, layoutStates } = createCoordinatorHarness();
  const result = await coordinator.ensurePaneDisplay({ id: 'secondary', displayTimeframe: null });
  assert.equal(result.state, PANE_DISPLAY_STATES.READY);
  assert.equal(result.displayTimeframe, 1);
  assert.deepEqual(
    commands.map((entry) => entry.command),
    [
      LAYOUT_COMMANDS.SET_PANE_DISPLAY_TIMEFRAME,
      REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME,
    ]
  );
  assert.equal(layoutStates.length, 1, 'layout update should be applied once when pane TF was null');

  await coordinator.ensurePaneDisplay({ id: 'secondary', displayTimeframe: 1 });
  assert.equal(commands.length, 2, 'loaded pane/timeframe should dedupe future initialization');
}

{
  const { coordinator } = createCoordinatorHarness();
  assert.equal(
    coordinator.paneInitialDisplayTimeframe({ id: 'primary', displayTimeframe: null }),
    1,
    'default pane display fallback should use the session timeframe when no pane timeframe is set'
  );
  assert.equal(
    coordinator.paneInitialDisplayTimeframe({ id: 'secondary', displayTimeframe: null }),
    1,
    'pane display fallback should default to the session timeframe when no pane timeframe is set'
  );
}

{
  const { commands, coordinator } = createCoordinatorHarness();
  await Promise.all([
    coordinator.ensurePaneDisplay({ id: 'secondary', displayTimeframe: 15 }),
    coordinator.ensurePaneDisplay({ id: 'secondary', displayTimeframe: 15 }),
  ]);
  assert.equal(
    commands.filter((entry) => entry.command === REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME).length,
    1,
    'concurrent initialization should share one replay display command'
  );
}

{
  const { coordinator, statuses } = createCoordinatorHarness({ failReplay: true });
  const result = await coordinator.ensurePaneDisplay({ id: 'secondary', displayTimeframe: 30 });
  assert.equal(result.state, PANE_DISPLAY_STATES.ERROR);
  assert.equal(coordinator.getPaneDisplayState('secondary').state, PANE_DISPLAY_STATES.ERROR);
  assert.deepEqual(statuses, ['display failed']);
}

console.log('chart replay pane display coordinator smoke passed');
