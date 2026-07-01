import assert from 'node:assert/strict';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest, subscribeEvent } from '../src/runtime/events.js';
import {
  CHART_PRESENTATION_COMMANDS,
  CHART_PRESENTATION_EVENTS,
  createChartPresentationRuntime,
  normalizeChartPresentationSettings,
} from '../src/runtime/chart-presentation-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const runtime = createChartPresentationRuntime();
let changedEvent = null;
const unsubscribe = subscribeEvent(CHART_PRESENTATION_EVENTS.CHANGED, (payload) => {
  changedEvent = payload;
});

runtime.start({
  emitEvent: (name, payload) => {
    if (name === CHART_PRESENTATION_EVENTS.CHANGED) {
      changedEvent = payload;
    }
  },
});

assert.equal(hasCommand(CHART_PRESENTATION_COMMANDS.GET), true);
assert.equal(hasCommand(CHART_PRESENTATION_COMMANDS.SET), true);
assert.equal(hasCommand(CHART_PRESENTATION_COMMANDS.RESET), true);

const defaults = await dispatchCommand(CHART_PRESENTATION_COMMANDS.GET);
assert.deepEqual(defaults, {
  timeFormat: '24h',
  dateFormat: 'YYYY-MM-DD',
  showStatusOhlc: true,
  showStatusChange: true,
  showCrosshairReadout: true,
  margins: {
    topPercent: 10,
    bottomPercent: 8,
  },
  rightOffsetBars: 10,
  candleStyle: {
    body: {
      up: '#26a69a',
      down: '#ef5350',
    },
    border: {
      up: '#26a69a',
      down: '#ef5350',
    },
    wick: {
      up: '#26a69a',
      down: '#ef5350',
    },
  },
});

const updated = await dispatchCommand(CHART_PRESENTATION_COMMANDS.SET, {
  timeFormat: '12h',
  showStatusOhlc: false,
  margins: {
    topPercent: 12,
  },
  rightOffsetBars: 16,
  candleStyle: {
    body: {
      up: '#22c55e',
    },
  },
});
assert.deepEqual(updated, {
  ...defaults,
  timeFormat: '12h',
  showStatusOhlc: false,
  margins: {
    topPercent: 12,
    bottomPercent: 8,
  },
  rightOffsetBars: 16,
  candleStyle: {
    body: {
      up: '#22c55e',
      down: '#ef5350',
    },
    border: {
      up: '#26a69a',
      down: '#ef5350',
    },
    wick: {
      up: '#26a69a',
      down: '#ef5350',
    },
  },
});
assert.deepEqual(changedEvent, updated);

changedEvent = null;
const unchanged = await dispatchCommand(CHART_PRESENTATION_COMMANDS.SET, {
  timeFormat: '12h',
});
assert.equal(unchanged.timeFormat, '12h');
assert.equal(changedEvent, null);

await assert.rejects(
  () => dispatchCommand(CHART_PRESENTATION_COMMANDS.SET, { timeFormat: 'local' }),
  /Unsupported chart time format/
);
await assert.rejects(
  () => dispatchCommand(CHART_PRESENTATION_COMMANDS.SET, { margins: { topPercent: 60 } }),
  /topPercent must be between 0 and 40/
);
await assert.rejects(
  () => dispatchCommand(CHART_PRESENTATION_COMMANDS.SET, { candleStyle: { body: { up: 'green' } } }),
  /candleStyle.body.up must be a #rrggbb color/
);
assert.equal(normalizeChartPresentationSettings({ showCrosshairReadout: 0 }).showCrosshairReadout, false);

const reset = await dispatchCommand(CHART_PRESENTATION_COMMANDS.RESET);
assert.deepEqual(reset, defaults);

runtime.stop();
unsubscribe();
assert.equal(hasCommand(CHART_PRESENTATION_COMMANDS.GET), false);

console.log('v5 chart presentation runtime smoke passed');
