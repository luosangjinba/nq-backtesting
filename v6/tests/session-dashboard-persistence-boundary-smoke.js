import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_COMMANDS,
  CHART_ENTRY_EVENTS,
  CHART_ENTRY_INITIALIZATION_COMMANDS,
  REPLAY_COMMANDS,
  SESSION_COMMANDS,
  SESSION_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartEntryInitializationRuntime } from '../src/chart-entry/chart-entry-initialization-runtime.js';
import { createChartEntryRuntime } from '../src/chart-entry/chart-entry-runtime.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createReplaySession } from '../src/session/session-domain.js';
import { createInMemorySessionRepository } from '../src/session/session-repository.js';
import { createSessionRuntime } from '../src/session/session-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const repository = createInMemorySessionRepository();
const storedSession = repository.save(createReplaySession({
  createdAt: '2026-06-01T09:00:00.000Z',
  endTime: '2026-06-05T16:00:00.000Z',
  id: 'stored-session-metadata-only',
  startTime: '2026-06-01T09:30:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
}));

const fetchedWindows = [];
const sessionEvents = [];
const chartEntryEvents = [];

subscribeEvent(SESSION_EVENTS.CREATED, (payload) => sessionEvents.push({ event: SESSION_EVENTS.CREATED, payload }));
subscribeEvent(SESSION_EVENTS.OPENED, (payload) => sessionEvents.push({ event: SESSION_EVENTS.OPENED, payload }));
subscribeEvent(CHART_ENTRY_EVENTS.ACTIVATED, (payload) => chartEntryEvents.push(payload));

const registry = createRuntimeRegistry();
registry.registerRuntime(createSessionRuntime({ repository }));
registry.registerRuntime(createBarDataRuntime({
  fetchBars: async (window) => {
    fetchedWindows.push(window);
    return { bars: [] };
  },
}));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createReplayRuntime({ enableInternalTimer: false }));
registry.registerRuntime(createChartEntryRuntime());
registry.registerRuntime(createChartEntryInitializationRuntime());

await registry.start({ emitEvent, subscribeEvent });

const listed = await dispatchCommand(SESSION_COMMANDS.LIST);
const chartEntryAfterList = await dispatchCommand(CHART_ENTRY_COMMANDS.GET_STATE);
const initializationAfterList = await dispatchCommand(CHART_ENTRY_INITIALIZATION_COMMANDS.GET_STATE);
const barCacheAfterList = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
const chartDataAfterList = await dispatchCommand(CHART_DATA_COMMANDS.GET_SUMMARY);
const replayAfterList = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);

assert.deepEqual(listed, [storedSession]);
assert.deepEqual(sessionEvents, []);
assert.deepEqual(chartEntryEvents, []);
assert.equal(chartEntryAfterList.status, 'idle');
assert.equal(chartEntryAfterList.activeSessionId, null);
assert.equal(initializationAfterList.status, 'idle');
assert.deepEqual(barCacheAfterList, {
  barCount: 0,
  keys: [],
  windowCount: 0,
});
assert.deepEqual(chartDataAfterList, {
  paneCount: 0,
  panes: [],
});
assert.equal(replayAfterList, null);
assert.deepEqual(fetchedWindows, []);

const opened = await dispatchCommand(SESSION_COMMANDS.OPEN, storedSession.id);
await new Promise((resolve) => setTimeout(resolve, 0));
const chartEntryAfterOpen = await dispatchCommand(CHART_ENTRY_COMMANDS.GET_STATE);
const initializationAfterOpen = await dispatchCommand(CHART_ENTRY_INITIALIZATION_COMMANDS.GET_STATE);
const barCacheAfterOpen = await dispatchCommand(BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
const replayAfterOpen = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);

assert.equal(opened.id, storedSession.id);
assert.deepEqual(sessionEvents.map((entry) => entry.event), [SESSION_EVENTS.OPENED]);
assert.equal(chartEntryEvents.length, 1);
assert.equal(chartEntryAfterOpen.activeSessionId, storedSession.id);
assert.equal(chartEntryAfterOpen.status, 'planned');
assert.equal(initializationAfterOpen.status, 'planned');
assert.deepEqual(barCacheAfterOpen, {
  barCount: 0,
  keys: [],
  windowCount: 0,
});
assert.equal(replayAfterOpen, null);
assert.deepEqual(fetchedWindows, []);

await registry.stop();

console.log('v6 session dashboard persistence boundary smoke passed');
