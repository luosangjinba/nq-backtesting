import assert from 'node:assert/strict';
import {
  APP_COMMANDS,
  APP_EVENTS,
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  LAYOUT_COMMANDS,
  PANE_INTENT_RELOAD_COMMANDS,
  PANE_INTENT_RELOAD_PLAN_COMMANDS,
  PANE_INTENT_SYNC_COMMANDS,
  PANE_COMMANDS,
  REPLAY_COMMANDS,
  SESSION_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from '../src/chart-data/chart-data-runtime.js';
import { createChartViewportRuntime } from '../src/chart-viewport/chart-viewport-runtime.js';
import { createLayoutRuntime } from '../src/layout/layout-runtime.js';
import { createPaneIntentReloadRuntime } from '../src/pane-intent-reload/pane-intent-reload-runtime.js';
import { createPaneIntentReloadWindowRuntime } from '../src/pane-intent-reload/pane-intent-reload-window-runtime.js';
import { createPaneIntentSyncRuntime } from '../src/pane-intent-sync/pane-intent-sync-runtime.js';
import { createPaneRuntime } from '../src/panes/pane-runtime.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';
import { createAppRuntime } from '../src/runtime/app-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
  listCommands,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  listenerCount,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
import { createSessionRuntime } from '../src/session/session-runtime.js';

clearCommandsForTest();
clearEventsForTest();

const registry = createRuntimeRegistry();
const bootEvents = [];
const unsubscribeBoot = subscribeEvent(APP_EVENTS.BOOTED, (payload) => {
  bootEvents.push(payload);
});

registry.registerRuntime(createAppRuntime());
registry.registerRuntime(createSessionRuntime());
registry.registerRuntime(createPaneRuntime());
registry.registerRuntime(createLayoutRuntime());
registry.registerRuntime(createPaneIntentSyncRuntime());
registry.registerRuntime(createPaneIntentReloadRuntime());
registry.registerRuntime(createBarDataRuntime({
  fetchBars: async () => ({ bars: [] }),
}));
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createReplayRuntime());
registry.registerRuntime(createPaneIntentReloadWindowRuntime());
assert.deepEqual(registry.snapshot(), {
  running: false,
  runtimes: ['runtime.app', 'runtime.session', 'runtime.pane', 'runtime.layout', 'runtime.paneIntentSync', 'runtime.paneIntentReload', 'runtime.bar-data', 'runtime.chart-data', 'runtime.chart-viewport', 'runtime.replay', 'runtime.paneIntentReloadWindow'],
  started: [],
});

await registry.start({ emitEvent, subscribeEvent });

assert.equal(listenerCount(APP_EVENTS.BOOTED), 1);
assert.equal(bootEvents.length, 1);
assert.equal(bootEvents[0].booted, true);
assert.equal(hasCommand(APP_COMMANDS.GET_STATUS), true);
assert.deepEqual(listCommands(), [
  APP_COMMANDS.GET_STATUS,
  BAR_DATA_COMMANDS.GET_CACHE_SUMMARY,
  BAR_DATA_COMMANDS.GET_WINDOW,
  BAR_DATA_COMMANDS.LOAD_WINDOW,
  BAR_DATA_COMMANDS.PLAN_WINDOW,
  BAR_DATA_COMMANDS.RELEASE_WINDOW,
  CHART_DATA_COMMANDS.APPEND_BARS,
  CHART_DATA_COMMANDS.CLEAR_PANE,
  CHART_DATA_COMMANDS.GET_BARS,
  CHART_DATA_COMMANDS.GET_SUMMARY,
  CHART_DATA_COMMANDS.PREPEND_BARS,
  CHART_DATA_COMMANDS.REPLACE_BARS,
  CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION,
  CHART_VIEWPORT_COMMANDS.ENSURE_INTENT,
  CHART_VIEWPORT_COMMANDS.GET_PANE,
  CHART_VIEWPORT_COMMANDS.GET_SNAPSHOT,
  CHART_VIEWPORT_COMMANDS.RESET_VIEW,
  CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT,
  LAYOUT_COMMANDS.GET_SNAPSHOT,
  LAYOUT_COMMANDS.SET_ACTIVE_PANE,
  LAYOUT_COMMANDS.SET_MODE,
  LAYOUT_COMMANDS.SET_SYNC,
  PANE_COMMANDS.GET_ACTIVE,
  PANE_COMMANDS.GET_BY_ID,
  PANE_COMMANDS.GET_SNAPSHOT,
  PANE_COMMANDS.LIST,
  PANE_COMMANDS.SET_ACTIVE,
  PANE_COMMANDS.SET_DISPLAY_TIMEFRAME,
  PANE_COMMANDS.SET_INTERVAL_INTENT,
  PANE_COMMANDS.SET_SYMBOL_INTENT,
  PANE_INTENT_RELOAD_COMMANDS.GET_STATE,
  PANE_INTENT_RELOAD_PLAN_COMMANDS.GET_STATE,
  PANE_INTENT_SYNC_COMMANDS.GET_STATE,
  REPLAY_COMMANDS.GET_STATE,
  REPLAY_COMMANDS.LOAD_SESSION,
  REPLAY_COMMANDS.NEXT,
  REPLAY_COMMANDS.PAUSE,
  REPLAY_COMMANDS.PLAY,
  REPLAY_COMMANDS.RESET,
  SESSION_COMMANDS.COPY,
  SESSION_COMMANDS.CREATE,
  SESSION_COMMANDS.DELETE,
  SESSION_COMMANDS.GET_ACTIVE,
  SESSION_COMMANDS.GET_BY_ID,
  SESSION_COMMANDS.LIST,
  SESSION_COMMANDS.OPEN,
]);

const status = await dispatchCommand(APP_COMMANDS.GET_STATUS);
assert.deepEqual(status, {
  booted: true,
  version: 'v6',
});

await registry.stop();
assert.equal(hasCommand(APP_COMMANDS.GET_STATUS), false);
unsubscribeBoot();
assert.equal(listenerCount(APP_EVENTS.BOOTED), 0);

console.log('v6 runtime core smoke passed');
