import assert from 'node:assert/strict';
import { mountWorkstationChartSurface } from '../src/chart-engine/workstation-chart-surface.js';

function createHost(paneId, size) {
  const attributes = new Map();
  return {
    dataset: { v6PaneId: paneId },
    hidden: false,
    isConnected: true,
    style: {},
    size,
    getBoundingClientRect() {
      return { height: this.size.height, width: this.size.width };
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
  };
}

const calls = [];
const frameCallbacks = [];
const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
globalThis.requestAnimationFrame = (callback) => {
  frameCallbacks.push(callback);
  return frameCallbacks.length;
};
globalThis.cancelAnimationFrame = (id) => {
  const index = Number(id) - 1;
  if (frameCallbacks[index]) {
    frameCallbacks[index] = null;
  }
};

try {
  const hosts = [
    createHost('main', { height: 600, width: 900 }),
    createHost('secondary', { height: 600, width: 900 }),
    createHost('tertiary', { height: 600, width: 900 }),
  ];
  const root = {
    querySelector(selector) {
      return selector === '[data-v6-chart-surface]' ? { dataset: {} } : null;
    },
    querySelectorAll(selector) {
      return selector === '[data-v6-chart-engine-host]' ? hosts : [];
    },
  };
  const surface = mountWorkstationChartSurface(root, {
    managerFactory() {
      const records = new Map();
      return {
        destroyAll() {
          records.clear();
        },
        mountPane({ paneId }) {
          records.set(paneId, { mounted: true });
        },
        resizePane(paneId, size) {
          calls.push({ method: 'resizePane', paneId, size });
          return { paneId, snapshot: { ...records.get(paneId) } };
        },
        snapshot() {
          return {
            panes: [...records.entries()].map(([paneId, snapshot]) => ({ paneId, snapshot })),
          };
        },
        subscribeCrosshairMove() {
          return () => {};
        },
        subscribeVisibleLogicalRangeChange() {
          return () => {};
        },
      };
    },
  });

  calls.length = 0;
  surface.applyLayoutSnapshot({ mode: 'twice', variant: 'twice-horizontal' });
  assert.deepEqual(
    calls.filter((call) => call.method === 'resizePane').map((call) => [call.paneId, call.size.height]),
    [
      ['main', 600],
      ['secondary', 600],
    ],
  );

  hosts[0].size = { height: 300, width: 900 };
  hosts[1].size = { height: 299, width: 900 };
  const firstFrame = frameCallbacks.shift();
  firstFrame();
  assert.equal(calls.length, 2);
  const secondFrame = frameCallbacks.shift();
  secondFrame();
  assert.deepEqual(
    calls.filter((call) => call.method === 'resizePane').slice(-2).map((call) => [call.paneId, call.size.height]),
    [
      ['main', 300],
      ['secondary', 299],
    ],
  );

  surface.destroy();
} finally {
  if (previousRequestAnimationFrame) {
    globalThis.requestAnimationFrame = previousRequestAnimationFrame;
  } else {
    delete globalThis.requestAnimationFrame;
  }
  if (previousCancelAnimationFrame) {
    globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
  } else {
    delete globalThis.cancelAnimationFrame;
  }
}

console.log('v6 layout deferred resize step 164 smoke passed');
