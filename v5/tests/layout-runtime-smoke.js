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
assert.equal(hasCommand(LAYOUT_COMMANDS.SET_MODE), true);
assert.equal(hasCommand(LAYOUT_COMMANDS.SET_SYNC), true);
assert.equal(hasCommand(LAYOUT_COMMANDS.SET_PANE_DISPLAY_TIMEFRAME), true);
assert.equal(hasCommand(LAYOUT_COMMANDS.SET_PANE_TIME), true);
assert.equal(hasCommand(LAYOUT_COMMANDS.SET_PANE_DATE_RANGE), true);

const defaults = await dispatchCommand(LAYOUT_COMMANDS.GET_STATE);
assert.deepEqual(defaults, {
  mode: 'single',
  activePaneId: 'primary',
  sync: {
    symbol: false,
    interval: false,
    crosshair: false,
    time: false,
    dateRange: false,
  },
  panes: [
    {
      id: 'primary',
      role: 'primary',
      instrument: null,
      displayTimeframe: null,
      time: null,
      dateRange: null,
      presentationSettingsId: null,
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

const twice = await dispatchCommand(LAYOUT_COMMANDS.SET_MODE, { mode: 'twice' });
assert.equal(twice.mode, 'twice');
assert.equal(twice.activePaneId, 'primary');
assert.deepEqual(twice.panes.map((pane) => pane.id), ['primary', 'secondary']);
assert.equal(changedEvent.mode, 'twice');

changedEvent = null;
const secondaryFiveMinute = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_DISPLAY_TIMEFRAME, {
  paneId: 'secondary',
  displayTimeframe: 5,
});
assert.equal(secondaryFiveMinute.panes.find((pane) => pane.id === 'primary').displayTimeframe, null);
assert.equal(secondaryFiveMinute.panes.find((pane) => pane.id === 'secondary').displayTimeframe, 5);
assert.equal(changedEvent.panes.find((pane) => pane.id === 'secondary').displayTimeframe, 5);

changedEvent = null;
const synced = await dispatchCommand(LAYOUT_COMMANDS.SET_SYNC, {
  key: 'interval',
  value: true,
});
assert.equal(synced.sync.interval, true);
assert.equal(changedEvent.sync.interval, true);

const syncedTenMinute = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_DISPLAY_TIMEFRAME, {
  paneId: 'secondary',
  displayTimeframe: 10,
});
assert.deepEqual(syncedTenMinute.panes.map((pane) => pane.displayTimeframe), [10, 10]);

const secondaryTime = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_TIME, {
  paneId: 'secondary',
  time: '2026-06-01T09:34:00.000Z',
});
assert.equal(secondaryTime.panes.find((pane) => pane.id === 'primary').time, null);
assert.equal(
  secondaryTime.panes.find((pane) => pane.id === 'secondary').time,
  '2026-06-01T09:34:00.000Z'
);

await dispatchCommand(LAYOUT_COMMANDS.SET_SYNC, { key: 'time', value: true });
const syncedTime = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_TIME, {
  paneId: 'secondary',
  time: '2026-06-01T09:35:00.000Z',
});
assert.deepEqual(syncedTime.panes.map((pane) => pane.time), [
  '2026-06-01T09:35:00.000Z',
  '2026-06-01T09:35:00.000Z',
]);

const secondaryDateRange = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_DATE_RANGE, {
  paneId: 'secondary',
  dateRange: {
    from: '2026-06-01T09:30:00.000Z',
    to: '2026-06-01T09:35:00.000Z',
  },
});
assert.equal(secondaryDateRange.panes.find((pane) => pane.id === 'primary').dateRange, null);
assert.deepEqual(secondaryDateRange.panes.find((pane) => pane.id === 'secondary').dateRange, {
  from: '2026-06-01T09:30:00.000Z',
  to: '2026-06-01T09:35:00.000Z',
});

await dispatchCommand(LAYOUT_COMMANDS.SET_SYNC, { key: 'dateRange', value: true });
const syncedDateRange = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_DATE_RANGE, {
  paneId: 'secondary',
  dateRange: {
    from: '2026-06-01T09:31:00.000Z',
    to: '2026-06-01T09:36:00.000Z',
  },
});
assert.deepEqual(syncedDateRange.panes.map((pane) => pane.dateRange), [
  {
    from: '2026-06-01T09:31:00.000Z',
    to: '2026-06-01T09:36:00.000Z',
  },
  {
    from: '2026-06-01T09:31:00.000Z',
    to: '2026-06-01T09:36:00.000Z',
  },
]);

const symbolSynced = await dispatchCommand(LAYOUT_COMMANDS.SET_SYNC, {
  key: 'symbol',
  value: true,
});
assert.equal(symbolSynced.sync.symbol, true);

await assert.rejects(
  () => dispatchCommand(LAYOUT_COMMANDS.SET_MODE, { mode: 'grid-4' }),
  /Unsupported layout mode/
);
await assert.rejects(
  () => dispatchCommand(LAYOUT_COMMANDS.SET_SYNC, { key: 'viewport', value: true }),
  /Unsupported layout sync key/
);
await assert.rejects(
  () => dispatchCommand(LAYOUT_COMMANDS.SET_PANE_DISPLAY_TIMEFRAME, {
    paneId: 'secondary',
    displayTimeframe: 0,
  }),
  /positive number/
);
await assert.rejects(
  () => dispatchCommand(LAYOUT_COMMANDS.SET_PANE_TIME, {
    paneId: 'secondary',
    time: 'not a timestamp',
  }),
  /valid timestamp/
);
await assert.rejects(
  () => dispatchCommand(LAYOUT_COMMANDS.SET_PANE_DATE_RANGE, {
    paneId: 'secondary',
    dateRange: {
      from: '2026-06-01T09:36:00.000Z',
      to: '2026-06-01T09:31:00.000Z',
    },
  }),
  /greater than or equal/
);

assert.throws(
  () => createLayoutRuntime({
    initialState: {
      mode: 'twice',
      activePaneId: 'primary',
      panes: [{ id: 'primary' }],
    },
  }),
  /exactly 2 pane/
);

const twoPaneRuntime = createLayoutRuntime({
  initialState: {
    mode: 'twice',
    activePaneId: 'primary',
    sync: {
      interval: true,
      time: true,
    },
    panes: [
      { id: 'primary', role: 'primary' },
      { id: 'secondary', role: 'secondary' },
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
assert.equal(secondary.sync.interval, true);
assert.equal(secondary.sync.time, true);
assert.equal(secondary.sync.symbol, false);
assert.equal(changedEvent.activePaneId, 'secondary');

twoPaneRuntime.stop();

const triplePaneRuntime = createLayoutRuntime({
  initialState: {
    mode: 'triple',
    activePaneId: 'primary',
    panes: [
      { id: 'primary', role: 'primary' },
      { id: 'secondary', role: 'secondary' },
      { id: 'tertiary', role: 'tertiary' },
    ],
  },
});
clearCommandsForTest();
triplePaneRuntime.start();
const triple = await dispatchCommand(LAYOUT_COMMANDS.GET_STATE);
assert.equal(triple.mode, 'triple');
assert.equal(triple.panes.length, 3);
triplePaneRuntime.stop();

console.log('v5 layout runtime smoke passed');
