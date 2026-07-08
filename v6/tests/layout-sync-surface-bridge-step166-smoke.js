import assert from 'node:assert/strict';
import fs from 'node:fs';
import { connectLayoutSyncSurfaceBridge } from '../src/chart-engine/layout-sync-surface-bridge.js';
import { LAYOUT_COMMANDS, LAYOUT_EVENTS } from '../src/contracts/app-contracts.js';

let layoutSnapshot = {
  mode: 'triple',
  sync: {
    crosshair: false,
    dateRange: false,
    interval: false,
    symbol: false,
    time: false,
  },
  visiblePaneIds: ['main', 'secondary', 'tertiary'],
};
const subscriptions = new Map();
const appliedProjections = [];
let visibleRangeHandler = null;

const chartSurface = {
  applyViewportProjection(record) {
    appliedProjections.push(record);
    return record;
  },
  getState() {
    return {
      appliedViewport: appliedProjections.map((record) => ({
        from: record.projection.from,
        paneId: record.paneId,
        to: record.projection.to,
      })),
      layout: {
        visiblePaneIds: [...layoutSnapshot.visiblePaneIds],
      },
    };
  },
  subscribeVisibleRangeChange(handler) {
    visibleRangeHandler = handler;
    return () => {
      visibleRangeHandler = null;
    };
  },
};

const bridge = connectLayoutSyncSurfaceBridge({
  chartSurface,
  dispatchCommand(command) {
    assert.equal(command, LAYOUT_COMMANDS.GET_SNAPSHOT);
    return layoutSnapshot;
  },
  subscribeEvent(event, handler) {
    subscriptions.set(event, handler);
    return () => subscriptions.delete(event);
  },
});

await bridge.ready;
assert.equal(bridge.getState().enabled, false);

assert.deepEqual(visibleRangeHandler({ paneId: 'main', from: 10, to: 30 }), []);
assert.equal(appliedProjections.length, 0);

layoutSnapshot = {
  ...layoutSnapshot,
  sync: {
    ...layoutSnapshot.sync,
    dateRange: true,
  },
};
subscriptions.get(LAYOUT_EVENTS.SYNC_CHANGED)(layoutSnapshot);

const records = visibleRangeHandler({ paneId: 'main', from: 10, to: 30 });
assert.deepEqual(records.map((record) => record.paneId), ['secondary', 'tertiary']);
assert.deepEqual(records.map((record) => record.projection.origin), ['layout-sync', 'layout-sync']);
assert.deepEqual(records.map((record) => record.projection.from), [10, 10]);
assert.deepEqual(records.map((record) => record.projection.to), [30, 30]);
assert.equal(bridge.getState().enabled, true);
assert.equal(bridge.getState().appliedRecords.length, 2);

assert.deepEqual(visibleRangeHandler({ paneId: 'main', from: 10.25, to: 29.75 }), []);

bridge.destroy();
assert.equal(visibleRangeHandler, null);
assert.equal(subscriptions.has(LAYOUT_EVENTS.MODE_CHANGED), false);
assert.equal(subscriptions.has(LAYOUT_EVENTS.SYNC_CHANGED), false);

const source = fs.readFileSync(new URL('../src/chart-engine/layout-sync-surface-bridge.js', import.meta.url), 'utf8');
assert.equal(source.includes('BAR_DATA_COMMANDS'), false);
assert.equal(source.includes('CHART_DATA_COMMANDS'), false);
assert.equal(source.includes('REPLAY_COMMANDS'), false);
assert.equal(source.includes('REQUEST_LEFT_EXTENSION'), false);

console.log('v6 layout sync surface bridge step 166 smoke passed');
