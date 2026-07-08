import assert from 'node:assert/strict';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { BAR_DATA_COMMANDS } from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent } from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

function ts(value) {
  return Math.floor(Date.parse(`${value.replace(' ', 'T')}Z`) / 1000);
}

clearCommandsForTest();
clearEventsForTest();

const responses = new Map([
  ['NQ|1|2026-05-31 17:57|2026-05-31 17:59', {
    bars: [],
    history: { exhaustedBefore: true },
  }],
  ['NQ|1|2026-05-31 18:00|2026-05-31 18:02', {
    bars: [
      { close: 100.5, high: 101, low: 100, open: 100, timestamp: ts('2026-05-31 18:00') },
      { close: 101.5, high: 102, low: 101, open: 101, timestamp: ts('2026-05-31 18:01') },
      { close: 102.5, high: 103, low: 102, open: 102, timestamp: ts('2026-05-31 18:02') },
    ],
    history: { exhaustedBefore: false },
  }],
  ['ES|1|2026-05-31 18:00|2026-05-31 18:01', {
    bars: [
      { close: 5000.5, high: 5001, low: 5000, open: 5000, timestamp: ts('2026-05-31 18:00') },
      { close: 5001.5, high: 5002, low: 5001, open: 5001, timestamp: ts('2026-05-31 18:01') },
    ],
    history: { exhaustedBefore: false },
  }],
]);

const runtime = createBarDataRuntime({
  fetchBars: async (window) => {
    const key = `${window.instrument}|${window.timeframe}|${window.start}|${window.end}`;
    const response = responses.get(key);
    return {
      bars: response?.bars?.map((bar) => ({ ...bar })) || [],
      history: response?.history ? { ...response.history } : { exhaustedBefore: true },
    };
  },
  maxBarsPerWindow: 10,
});

const registry = createRuntimeRegistry();
registry.registerRuntime(runtime);
await registry.start({ emitEvent });

await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
  end: '2026-05-31 17:59',
  instrument: 'NQ',
  start: '2026-05-31 17:57',
  timeframe: 1,
});
await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
  end: '2026-05-31 18:02',
  instrument: 'NQ',
  start: '2026-05-31 18:00',
  timeframe: 1,
});
await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
  end: '2026-05-31 18:01',
  instrument: 'ES',
  start: '2026-05-31 18:00',
  timeframe: 1,
});

const nq = await dispatchCommand(BAR_DATA_COMMANDS.GET_BOUNDARY_METADATA, {
  instrument: 'nq',
  timeframe: 1,
});

assert.deepEqual(nq, {
  scope: { instrument: 'NQ', timeframe: 1 },
  scopes: [{
    earliestLoadedTime: '2026-05-31 18:00',
    earliestLoadedTimestamp: ts('2026-05-31 18:00'),
    emptyWindowCount: 1,
    exhaustedBefore: true,
    instrument: 'NQ',
    knownExhaustedBeforeTime: '2026-05-31 17:59',
    knownExhaustedBeforeTimestamp: ts('2026-05-31 17:59'),
    latestLoadedTime: '2026-05-31 18:02',
    latestLoadedTimestamp: ts('2026-05-31 18:02'),
    loadedBarCount: 3,
    loadedWindowCount: 1,
    timeframe: 1,
    windowCount: 2,
  }],
  windowCount: 2,
});

const all = await dispatchCommand(BAR_DATA_COMMANDS.GET_BOUNDARY_METADATA);
assert.deepEqual(all.scopes.map((scope) => [
  scope.instrument,
  scope.earliestLoadedTime,
  scope.latestLoadedTime,
]), [
  ['ES', '2026-05-31 18:00', '2026-05-31 18:01'],
  ['NQ', '2026-05-31 18:00', '2026-05-31 18:02'],
]);
assert.equal(all.windowCount, 3);

await registry.stop();

console.log('v6 bar data boundary metadata step 190 smoke passed');
