import assert from 'node:assert/strict';

import {
  CHART_COMMANDS,
} from '../src/contracts/chart-contracts.js';
import {
  REPLAY_COMMANDS,
  REPLAY_EVENTS,
} from '../src/contracts/replay-contracts.js';
import {
  createReplayPaneProjection,
} from '../src/features/chart-replay/chart-replay-pane-projection.js';

function createProjectionHarness({
  replayLoaded = true,
  sessionId = 'session-test',
} = {}) {
  const commands = [];
  const ensuredPanes = [];
  const statuses = [];
  const projection = createReplayPaneProjection({
    getReplayLoaded: () => replayLoaded,
    getSessionId: () => sessionId,
    getSessionTimeframe: () => 1,
    getDisplayTimeframeFallback: () => 1,
    paneInitialDisplayTimeframe: (pane) => Number(pane.displayTimeframe || 1),
    ensurePaneDisplay: async (pane) => ensuredPanes.push(pane.id),
    setStatusText: (status) => statuses.push(status),
    dispatchCommand: async (command, payload) => {
      commands.push({ command, payload });
      if (command === CHART_COMMANDS.GET_VIEWPORT_METRICS) {
        return { estimatedVisibleBars: 120 };
      }
      return { ok: true };
    },
  });
  return {
    commands,
    ensuredPanes,
    projection,
    statuses,
  };
}

const replayPayload = {
  advanced: true,
  replayTimeframe: 1,
  cursorTimestamp: '2026-06-01T09:31:00Z',
  revealedBars: [
    { time: '2026-06-01T09:31:00Z', open: 1, high: 2, low: 1, close: 2 },
  ],
};

{
  const { commands, ensuredPanes, projection } = createProjectionHarness();
  const results = await Promise.all(projection.projectReplayEvent(
    REPLAY_EVENTS.NEXT,
    replayPayload,
    {
      panes: [
        { id: 'primary', displayTimeframe: 1 },
        { id: 'secondary', displayTimeframe: 1 },
      ],
    }
  ));
  assert.deepEqual(ensuredPanes, ['secondary']);
  assert.deepEqual(results, [{ paneId: 'secondary', action: 'append-bars', displayTimeframe: 1 }]);
  assert.deepEqual(
    commands.map((entry) => entry.command),
    [
      CHART_COMMANDS.GET_VIEWPORT_METRICS,
      CHART_COMMANDS.APPEND_BARS,
    ]
  );
  assert.equal(commands[1].payload.viewportFollow.estimatedVisibleBars, 120);
}

{
  const { commands, projection } = createProjectionHarness();
  const results = await Promise.all(projection.projectReplayEvent(
    REPLAY_EVENTS.NEXT,
    replayPayload,
    {
      panes: [
        { id: 'primary', displayTimeframe: 1 },
        { id: 'secondary', displayTimeframe: 5 },
      ],
    }
  ));
  assert.deepEqual(results, [{ paneId: 'secondary', action: 'load-display-window', displayTimeframe: 5 }]);
  assert.deepEqual(commands.map((entry) => entry.command), [REPLAY_COMMANDS.LOAD_DISPLAY_WINDOW]);
  assert.equal(commands[0].payload.anchor, replayPayload.cursorTimestamp);
  assert.equal(commands[0].payload.direction, 'backward');
}

{
  const { commands, ensuredPanes, projection } = createProjectionHarness();
  const results = projection.projectReplayEvent(REPLAY_EVENTS.NEXT, { ...replayPayload, advanced: false }, {
    panes: [{ id: 'secondary', displayTimeframe: 1 }],
  });
  assert.deepEqual(results, []);
  assert.deepEqual(commands, []);
  assert.deepEqual(ensuredPanes, []);
}

{
  const { commands, projection } = createProjectionHarness({ replayLoaded: false });
  const results = projection.projectReplayEvent(REPLAY_EVENTS.NEXT, replayPayload, {
    panes: [{ id: 'secondary', displayTimeframe: 1 }],
  });
  assert.deepEqual(results, []);
  assert.deepEqual(commands, []);
}

console.log('chart replay pane projection smoke passed');
