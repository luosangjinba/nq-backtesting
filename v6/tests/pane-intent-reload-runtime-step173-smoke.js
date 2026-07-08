import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PANE_COMMANDS,
  PANE_EVENTS,
  PANE_INTENT_RELOAD_COMMANDS,
  PANE_INTENT_RELOAD_EVENTS,
  PANE_INTENT_SYNC_EVENTS,
} from '../src/contracts/app-contracts.js';
import { createPaneRecord } from '../src/panes/pane-model.js';
import { createPaneRuntime } from '../src/panes/pane-runtime.js';
import { createPaneStore } from '../src/panes/pane-store.js';
import { createPaneIntentReloadRuntime } from '../src/pane-intent-reload/pane-intent-reload-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  hasCommand,
} from '../src/runtime/commands.js';
import {
  clearEventsForTest,
  emitEvent,
  subscribeEvent,
} from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

const paneStore = createPaneStore({
  initialPanes: [
    createPaneRecord({ active: true, displayTimeframe: 1, id: 'main', instrument: 'NQ' }),
    createPaneRecord({ active: false, displayTimeframe: 5, id: 'secondary', instrument: 'ES' }),
  ],
});
const registry = createRuntimeRegistry();
registry.registerRuntime(createPaneRuntime({ store: paneStore }));
registry.registerRuntime(createPaneIntentReloadRuntime());

const intentEvents = [];
const unsubscribeIntent = subscribeEvent(PANE_INTENT_RELOAD_EVENTS.INTENT_CREATED, (records) => {
  intentEvents.push(records);
});

await registry.start({ emitEvent, subscribeEvent });
assert.equal(hasCommand(PANE_INTENT_RELOAD_COMMANDS.GET_STATE), true);

emitEvent(PANE_EVENTS.SYMBOL_INTENT_CHANGED, {
  displayTimeframe: 1,
  id: 'main',
  instrument: 'YM',
});
assert.deepEqual(intentEvents.at(-1), [{
  displayTimeframe: 1,
  instrument: 'YM',
  paneId: 'main',
  reason: 'symbol',
  source: 'pane-intent',
}]);

emitEvent(PANE_EVENTS.INTERVAL_INTENT_CHANGED, {
  displayTimeframe: 15,
  id: 'secondary',
  instrument: 'ES',
});
assert.deepEqual(intentEvents.at(-1), [{
  displayTimeframe: 15,
  instrument: 'ES',
  paneId: 'secondary',
  reason: 'interval',
  source: 'pane-intent',
}]);

emitEvent(PANE_INTENT_SYNC_EVENTS.APPLIED, {
  kind: 'symbol',
  sourcePaneId: 'main',
  targets: [{ paneId: 'secondary', value: 'YM' }],
});
await Promise.resolve();
assert.deepEqual(intentEvents.at(-1), [{
  displayTimeframe: 5,
  instrument: 'ES',
  paneId: 'secondary',
  reason: 'symbol',
  source: 'pane-intent-sync',
}]);

const state = await dispatchCommand(PANE_INTENT_RELOAD_COMMANDS.GET_STATE);
assert.equal(state.status, 'intent-created');
assert.equal(state.intentCount, 3);
assert.deepEqual(state.lastIntents, intentEvents.at(-1));

await registry.stop();
unsubscribeIntent();
assert.equal(hasCommand(PANE_INTENT_RELOAD_COMMANDS.GET_STATE), false);

const source = fs.readFileSync(
  new URL('../src/pane-intent-reload/pane-intent-reload-runtime.js', import.meta.url),
  'utf8',
);
const forbiddenTokens = [
  'BAR_DATA_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'REPLAY_COMMANDS',
  'LOAD_WINDOW',
  'REPLACE_BARS',
  'APPEND_BARS',
  'APPLY_CHART_DATA_REVISION',
  'createChart',
  'setData',
  'setVisibleLogicalRange',
  'fetch(',
  'XMLHttpRequest',
];
for (const token of forbiddenTokens) {
  assert.equal(source.includes(token), false, `pane intent reload runtime must not contain ${token}`);
}

console.log('v6 pane intent reload runtime step 173 smoke passed');
