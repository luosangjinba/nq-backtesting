import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_VIEWPORT_COMMANDS,
  LAYOUT_COMMANDS,
  LAYOUT_EVENTS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { connectLayoutSurfaceBridge } from '../src/chart-engine/layout-surface-bridge.js';

const calls = [];
const eventHandlers = new Map();
const chartSurface = {
  applyLayoutSnapshot(snapshot) {
    calls.push({ method: 'applyLayoutSnapshot', snapshot });
    return {
      mode: snapshot.mode,
      visiblePaneIds: snapshot.mode === 'twice' ? ['main', 'secondary'] : ['main'],
    };
  },
};

const bridge = connectLayoutSurfaceBridge({
  chartSurface,
  dispatchCommand(commandName) {
    calls.push({ commandName, method: 'dispatchCommand' });
    assert.equal(commandName, LAYOUT_COMMANDS.GET_SNAPSHOT);
    return { mode: 'single' };
  },
  subscribeEvent(eventName, handler) {
    calls.push({ eventName, method: 'subscribeEvent' });
    eventHandlers.set(eventName, handler);
    return () => calls.push({ eventName, method: 'unsubscribeEvent' });
  },
});

assert.equal(eventHandlers.has(LAYOUT_EVENTS.MODE_CHANGED), true);
assert.deepEqual(bridge.getState(), {
  destroyed: false,
  listensTo: [LAYOUT_EVENTS.MODE_CHANGED],
  snapshotCommand: LAYOUT_COMMANDS.GET_SNAPSHOT,
});
assert.deepEqual(await bridge.ready, {
  mode: 'single',
  visiblePaneIds: ['main'],
});
assert.deepEqual(calls.slice(0, 3), [
  { eventName: LAYOUT_EVENTS.MODE_CHANGED, method: 'subscribeEvent' },
  { commandName: LAYOUT_COMMANDS.GET_SNAPSHOT, method: 'dispatchCommand' },
  { method: 'applyLayoutSnapshot', snapshot: { mode: 'single' } },
]);

eventHandlers.get(LAYOUT_EVENTS.MODE_CHANGED)({ mode: 'twice' });
assert.deepEqual(calls.at(-1), {
  method: 'applyLayoutSnapshot',
  snapshot: { mode: 'twice' },
});

bridge.destroy();
eventHandlers.get(LAYOUT_EVENTS.MODE_CHANGED)({ mode: 'triple' });
assert.equal(bridge.getState().destroyed, true);
assert.deepEqual(calls.at(-1), {
  method: 'unsubscribeEvent',
  eventName: LAYOUT_EVENTS.MODE_CHANGED,
});
assert.equal(calls.filter((call) => call.method === 'applyLayoutSnapshot').at(-1).snapshot.mode, 'twice');

assert.throws(
  () => connectLayoutSurfaceBridge({ chartSurface: {} }),
  /requires a chart surface/,
);

const source = await readFile('v6/src/chart-engine/layout-surface-bridge.js', 'utf8');
for (const forbidden of [
  BAR_DATA_COMMANDS.LOAD_WINDOW,
  CHART_DATA_COMMANDS.REPLACE_BARS,
  CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT,
  REPLAY_COMMANDS.NEXT,
]) {
  assert.equal(source.includes(forbidden), false, `layout surface bridge must not dispatch ${forbidden}`);
}

console.log('v6 layout surface bridge smoke passed');
