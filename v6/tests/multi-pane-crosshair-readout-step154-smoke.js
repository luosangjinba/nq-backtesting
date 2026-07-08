import assert from 'node:assert/strict';
import { mountWorkstationChartSurface } from '../src/chart-engine/workstation-chart-surface.js';
import {
  createStatusReadoutState,
  statusReadoutStateFromCrosshairPayload,
} from '../src/shell/status-readout-model.js';

function createHost(paneId) {
  return {
    clientHeight: 240,
    clientWidth: 640,
    dataset: { v6PaneId: paneId },
    getBoundingClientRect() {
      return { height: 240, width: 640 };
    },
    isConnected: true,
    addEventListener() {},
    removeEventListener() {},
  };
}

const calls = [];
const handlers = new Map();
const root = {
  querySelectorAll() {
    return [createHost('pane-a'), createHost('pane-b')];
  },
};

function managerFactory() {
  const panes = new Map();
  return {
    destroyAll() {
      panes.clear();
    },
    mountPane({ paneId }) {
      panes.set(paneId, {
        dataLength: 0,
        mounted: true,
        visibleLogicalRange: null,
      });
    },
    snapshot() {
      return {
        panes: [...panes.entries()].map(([paneId, snapshot]) => ({
          paneId,
          snapshot,
        })),
      };
    },
    subscribeCrosshairMove(paneId, handler) {
      handlers.set(paneId, handler);
      return () => handlers.delete(paneId);
    },
    subscribeVisibleLogicalRangeChange() {
      return () => {};
    },
  };
}

const surface = mountWorkstationChartSurface(root, {
  emitEvent(eventName, payload) {
    calls.push({ eventName, payload });
  },
  managerFactory,
});

let readoutState = createStatusReadoutState();
surface.subscribeCrosshairChange((payload) => {
  readoutState = statusReadoutStateFromCrosshairPayload(payload, readoutState);
});

handlers.get('pane-a')({
  bar: { close: 11, high: 12, low: 9, open: 10, timestamp: 100 },
  paneId: 'pane-a',
  point: { x: 10, y: 20 },
  time: 100,
});
assert.equal(readoutState.ohlc.close, 'C 11.00');
assert.equal(readoutState.candleDirection, 'up');

handlers.get('pane-b')({
  bar: { close: 19, high: 22, low: 18, open: 20, timestamp: 200 },
  paneId: 'pane-b',
  point: { x: 30, y: 40 },
  time: 200,
});
assert.equal(readoutState.ohlc.close, 'C 19.00');
assert.equal(readoutState.candleDirection, 'down');

handlers.get('pane-a')({
  bar: null,
  paneId: 'pane-a',
  point: null,
  time: null,
});
assert.equal(readoutState.ohlc.close, 'C 19.00');
assert.equal(readoutState.candleDirection, 'down');

handlers.get('pane-b')({
  bar: null,
  paneId: 'pane-b',
  point: null,
  time: null,
});
assert.equal(readoutState.ohlc.close, 'C --');
assert.equal(readoutState.candleDirection, 'empty');

assert.deepEqual(surface.getState().crosshair, [
  {
    bar: null,
    displayReadout: false,
    paneId: 'pane-a',
    point: null,
    time: null,
  },
  {
    bar: null,
    displayReadout: true,
    paneId: 'pane-b',
    point: null,
    time: null,
  },
]);
assert.deepEqual(calls.map((call) => [call.eventName, call.payload.paneId, call.payload.displayReadout]), [
  ['chartSurface:crosshairChanged', 'pane-a', true],
  ['chartSurface:crosshairChanged', 'pane-b', true],
  ['chartSurface:crosshairChanged', 'pane-a', false],
  ['chartSurface:crosshairChanged', 'pane-b', true],
]);

surface.destroy();
assert.equal(handlers.size, 0);

console.log('v6 multi-pane crosshair readout step 154 smoke passed');
