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
assert.equal(hasCommand(LAYOUT_COMMANDS.SET_PANE_CROSSHAIR), true);
assert.equal(hasCommand(LAYOUT_COMMANDS.SET_SPLIT_RATIO), true);

const defaults = await dispatchCommand(LAYOUT_COMMANDS.GET_STATE);
assert.deepEqual(defaults, {
  mode: 'single',
  variant: 'single.default',
  activePaneId: 'primary',
  sync: {
    symbol: false,
    interval: false,
    crosshair: false,
    time: false,
    dateRange: false,
  },
  split: {
    ratios: {
      primary: 1,
    },
  },
  panes: [
    {
      id: 'primary',
      role: 'primary',
      instrument: null,
      displayTimeframe: null,
      time: null,
      dateRange: null,
      crosshair: null,
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
assert.equal(twice.variant, 'twice.vertical');
assert.equal(twice.activePaneId, 'primary');
assert.deepEqual(twice.panes.map((pane) => pane.id), ['primary', 'secondary']);
assert.deepEqual(twice.split.ratios, { primary: 1, secondary: 1 });
assert.equal(changedEvent.mode, 'twice');
assert.equal(changedEvent.variant, 'twice.vertical');

const twiceHorizontal = await dispatchCommand(LAYOUT_COMMANDS.SET_MODE, {
  variant: 'twice.horizontal',
});
assert.equal(twiceHorizontal.mode, 'twice');
assert.equal(twiceHorizontal.variant, 'twice.horizontal');
assert.deepEqual(twiceHorizontal.panes.map((pane) => pane.id), ['primary', 'secondary']);

const resizedTwice = await dispatchCommand(LAYOUT_COMMANDS.SET_SPLIT_RATIO, {
  firstPaneId: 'primary',
  secondPaneId: 'secondary',
  ratio: 80,
});
assert.equal(resizedTwice.split.ratios.primary, 1.6);
assert.equal(resizedTwice.split.ratios.secondary, 0.3999999999999999);
const clampedTwice = await dispatchCommand(LAYOUT_COMMANDS.SET_SPLIT_RATIO, {
  firstPaneId: 'primary',
  secondPaneId: 'secondary',
  ratio: 5,
});
assert.ok(clampedTwice.split.ratios.primary >= 0.29);
assert.ok(clampedTwice.split.ratios.secondary <= 1.71);

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

const secondaryCrosshair = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_CROSSHAIR, {
  paneId: 'secondary',
  crosshair: {
    active: true,
    time: '2026-06-01T09:32:00.000Z',
    price: 101.25,
    point: { x: 40, y: 50 },
  },
});
assert.equal(secondaryCrosshair.panes.find((pane) => pane.id === 'primary').crosshair, null);
assert.deepEqual(secondaryCrosshair.panes.find((pane) => pane.id === 'secondary').crosshair, {
  active: true,
  time: '2026-06-01T09:32:00.000Z',
  price: 101.25,
  point: { x: 40, y: 50 },
});

await dispatchCommand(LAYOUT_COMMANDS.SET_SYNC, { key: 'crosshair', value: true });
const syncedCrosshair = await dispatchCommand(LAYOUT_COMMANDS.SET_PANE_CROSSHAIR, {
  paneId: 'secondary',
  crosshair: {
    active: true,
    time: '2026-06-01T09:33:00.000Z',
    price: 102.5,
  },
});
assert.deepEqual(syncedCrosshair.panes.map((pane) => pane.crosshair), [
  {
    active: true,
    time: '2026-06-01T09:33:00.000Z',
    price: 102.5,
    point: null,
  },
  {
    active: true,
    time: '2026-06-01T09:33:00.000Z',
    price: 102.5,
    point: null,
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
  () => dispatchCommand(LAYOUT_COMMANDS.SET_MODE, { variant: 'twice.grid' }),
  /Unsupported layout variant/
);
await assert.rejects(
  () => dispatchCommand(LAYOUT_COMMANDS.SET_MODE, { mode: 'twice', variant: 'triple.left' }),
  /not valid for twice mode/
);
await assert.rejects(
  () => dispatchCommand(LAYOUT_COMMANDS.SET_SYNC, { key: 'viewport', value: true }),
  /Unsupported layout sync key/
);
await assert.rejects(
  () => dispatchCommand(LAYOUT_COMMANDS.SET_SPLIT_RATIO, {
    firstPaneId: 'primary',
    secondPaneId: 'missing',
    ratio: 50,
  }),
  /does not exist/
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
assert.equal(secondary.variant, 'twice.vertical');
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
assert.equal(triple.variant, 'triple.vertical');
assert.equal(triple.panes.length, 3);
assert.deepEqual(triple.split.ratios, { primary: 1, secondary: 1, tertiary: 1 });
const resizedTriple = await dispatchCommand(LAYOUT_COMMANDS.SET_SPLIT_RATIO, {
  firstPaneId: 'secondary',
  secondPaneId: 'tertiary',
  ratio: 75,
});
assert.equal(resizedTriple.split.ratios.primary, 1);
assert.equal(resizedTriple.split.ratios.secondary, 1.5);
assert.equal(resizedTriple.split.ratios.tertiary, 0.5);
triplePaneRuntime.stop();

console.log('v5 layout runtime smoke passed');
