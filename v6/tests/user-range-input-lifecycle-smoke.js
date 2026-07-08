import assert from 'node:assert/strict';
import { mountWorkstationChartSurface } from '../src/chart-engine/workstation-chart-surface.js';

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(eventName, handler) {
      const handlers = listeners.get(eventName) || new Set();
      handlers.add(handler);
      listeners.set(eventName, handlers);
    },
    dispatch(eventName, payload = {}) {
      for (const handler of listeners.get(eventName) || []) {
        handler(payload);
      }
    },
    listenerCount(eventName) {
      return listeners.get(eventName)?.size || 0;
    },
    removeEventListener(eventName, handler) {
      listeners.get(eventName)?.delete(handler);
    },
  };
}

const documentTarget = createEventTarget();
const windowTarget = createEventTarget();
documentTarget.defaultView = windowTarget;
const hostTarget = createEventTarget();
const host = {
  ...hostTarget,
  clientHeight: 360,
  clientWidth: 640,
  dataset: { v6PaneId: 'main' },
  getBoundingClientRect() {
    return { height: 360, width: 640 };
  },
  isConnected: true,
  ownerDocument: documentTarget,
};
const root = {
  ownerDocument: documentTarget,
  querySelector(selector) {
    return selector === '[data-v6-chart-engine-host]' ? host : null;
  },
};

let visibleRangeHandler = null;
const surface = mountWorkstationChartSurface(root, {
  managerFactory() {
    return {
      destroyAll() {},
      mountPane() {},
      resizePane() {
        return null;
      },
      setData() {
        return null;
      },
      setVisibleLogicalRange() {
        return null;
      },
      snapshot() {
        return {
          panes: [{
            paneId: 'main',
            snapshot: {
              dataLength: 0,
              mounted: true,
              visibleLogicalRange: null,
            },
          }],
        };
      },
      subscribeCrosshairMove() {
        return () => {};
      },
      subscribeVisibleLogicalRangeChange(paneId, handler) {
        visibleRangeHandler = handler;
        return () => {};
      },
    };
  },
});

const emitted = [];
surface.subscribeVisibleRangeChange((record) => emitted.push(record));

visibleRangeHandler({ paneId: 'main', range: { from: -20, to: 10 } });
assert.deepEqual(emitted, []);

host.dispatch('mousedown');
visibleRangeHandler({ paneId: 'main', range: { from: -26, to: 4 } });
assert.equal(emitted.length, 1);
assert.deepEqual(emitted[0], { from: -26, paneId: 'main', to: 4 });

documentTarget.dispatch('mouseup');
await new Promise((resolve) => setTimeout(resolve, 120));
visibleRangeHandler({ paneId: 'main', range: { from: -28, to: 2 } });
assert.equal(emitted.length, 1);

host.dispatch('mousedown');
visibleRangeHandler({ paneId: 'main', range: { from: -30, to: 0 } });
assert.equal(emitted.length, 2);
documentTarget.dispatch('mousemove', { buttons: 0, target: host });
await new Promise((resolve) => setTimeout(resolve, 120));
visibleRangeHandler({ paneId: 'main', range: { from: -32, to: -2 } });
assert.equal(emitted.length, 2);

assert.equal(host.listenerCount('mousedown'), 1);
assert.equal(host.listenerCount('wheel'), 1);
assert.equal(documentTarget.listenerCount('mouseup'), 1);
assert.equal(documentTarget.listenerCount('mousemove'), 1);
assert.equal(documentTarget.listenerCount('pointermove'), 1);
surface.destroy();
assert.equal(host.listenerCount('mousedown'), 0);
assert.equal(host.listenerCount('wheel'), 0);
assert.equal(documentTarget.listenerCount('mouseup'), 0);
assert.equal(documentTarget.listenerCount('mousemove'), 0);
assert.equal(documentTarget.listenerCount('pointermove'), 0);

console.log('v6 user range input lifecycle smoke passed');
