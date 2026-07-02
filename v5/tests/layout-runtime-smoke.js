import assert from 'node:assert/strict';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import {
  createLayoutRuntime,
  LAYOUT_COMMANDS,
  LAYOUT_EVENTS,
} from '../src/runtime/layout-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const runtime = createLayoutRuntime();
let changedEvent = null;

runtime.start({
  emitEvent: (name, payload) => {
    if (name === LAYOUT_EVENTS.CHANGED) {
      changedEvent = payload;
    }
  },
});

assert.equal(hasCommand(LAYOUT_COMMANDS.GET_STATE), true);
assert.equal(hasCommand(LAYOUT_COMMANDS.SET_ACTIVE_PANE), true);

const defaults = await dispatchCommand(LAYOUT_COMMANDS.GET_STATE);
assert.deepEqual(defaults, {
  mode: 'single',
  activePaneId: 'primary',
  panes: [
    {
      id: 'primary',
      role: 'primary',
      instrument: null,
      displayTimeframe: null,
      presentationSettingsId: null,
      sync: {
        timeframe: false,
        viewport: false,
        crosshair: false,
      },
    },
  ],
});

const samePane = await dispatchCommand(LAYOUT_COMMANDS.SET_ACTIVE_PANE, {
  paneId: 'primary',
});
assert.deepEqual(samePane, defaults);
assert.equal(changedEvent, null);

await assert.rejects(
  () => dispatchCommand(LAYOUT_COMMANDS.SET_ACTIVE_PANE, { paneId: 'secondary' }),
  /does not exist/
);

assert.throws(
  () => createLayoutRuntime({
    initialState: {
      mode: 'two-pane',
      activePaneId: 'primary',
      panes: [{ id: 'primary' }],
    },
  }),
  /exactly two panes/
);

const twoPaneRuntime = createLayoutRuntime({
  initialState: {
    mode: 'two-pane',
    activePaneId: 'primary',
    panes: [
      { id: 'primary', role: 'primary' },
      { id: 'secondary', role: 'secondary', sync: { timeframe: true } },
    ],
  },
});
runtime.stop();
clearCommandsForTest();
twoPaneRuntime.start({
  emitEvent: (name, payload) => {
    if (name === LAYOUT_EVENTS.CHANGED) {
      changedEvent = payload;
    }
  },
});
changedEvent = null;

const secondary = await dispatchCommand(LAYOUT_COMMANDS.SET_ACTIVE_PANE, {
  paneId: 'secondary',
});
assert.equal(secondary.activePaneId, 'secondary');
assert.equal(secondary.panes.length, 2);
assert.equal(secondary.panes[1].sync.timeframe, true);
assert.equal(changedEvent.activePaneId, 'secondary');

twoPaneRuntime.stop();

console.log('v5 layout runtime smoke passed');
