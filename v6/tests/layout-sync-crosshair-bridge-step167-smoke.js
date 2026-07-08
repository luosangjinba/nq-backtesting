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
const appliedCrosshair = [];
let crosshairHandler = null;
let visibleRangeHandler = null;

const chartSurface = {
  applyCrosshairProjection(record) {
    appliedCrosshair.push(record);
    return record;
  },
  applyViewportProjection() {
    return null;
  },
  getState() {
    return {
      appliedViewport: [],
      layout: {
        visiblePaneIds: [...layoutSnapshot.visiblePaneIds],
      },
    };
  },
  subscribeCrosshairChange(handler) {
    crosshairHandler = handler;
    return () => {
      crosshairHandler = null;
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
assert.equal(bridge.getState().crosshairEnabled, false);

assert.deepEqual(crosshairHandler({
  bar: { close: 30542, high: 30545, low: 30539, open: 30540, timestamp: 100 },
  paneId: 'main',
  time: 100,
}), []);
assert.equal(appliedCrosshair.length, 0);

layoutSnapshot = {
  ...layoutSnapshot,
  sync: {
    ...layoutSnapshot.sync,
    crosshair: true,
  },
};
subscriptions.get(LAYOUT_EVENTS.SYNC_CHANGED)(layoutSnapshot);

const records = crosshairHandler({
  bar: { close: 30542, high: 30545, low: 30539, open: 30540, timestamp: 100 },
  paneId: 'main',
  point: { x: 10, y: 20 },
  time: 100,
});
assert.deepEqual(records.map((record) => record.paneId), ['secondary', 'tertiary']);
assert.deepEqual(records.map((record) => record.price), [30542, 30542]);
assert.deepEqual(records.map((record) => record.time), [100, 100]);
assert.deepEqual(records.map((record) => record.origin), ['layout-sync', 'layout-sync']);
assert.equal(bridge.getState().crosshairEnabled, true);
assert.equal(bridge.getState().appliedCrosshairRecords.length, 2);

assert.deepEqual(crosshairHandler({
  bar: { close: 30542, high: 30545, low: 30539, open: 30540, timestamp: 100 },
  paneId: 'secondary',
  time: 100,
}), []);

const clearRecords = crosshairHandler({
  bar: null,
  paneId: 'main',
  point: null,
  time: null,
});
assert.deepEqual(clearRecords.map((record) => [record.paneId, record.clear]), [
  ['secondary', true],
  ['tertiary', true],
]);

bridge.destroy();
assert.equal(crosshairHandler, null);
assert.equal(visibleRangeHandler, null);

const source = fs.readFileSync(new URL('../src/chart-engine/layout-sync-surface-bridge.js', import.meta.url), 'utf8');
assert.equal(source.includes('BAR_DATA_COMMANDS'), false);
assert.equal(source.includes('CHART_DATA_COMMANDS'), false);
assert.equal(source.includes('REPLAY_COMMANDS'), false);
assert.equal(source.includes('REQUEST_LEFT_EXTENSION'), false);

console.log('v6 layout sync crosshair bridge step 167 smoke passed');
