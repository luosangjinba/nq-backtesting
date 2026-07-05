import assert from 'node:assert/strict';
import { mountWorkstationChartSurface } from '../src/chart-engine/workstation-chart-surface.js';

const calls = [];
const host = {
  clientHeight: 360,
  clientWidth: 640,
  dataset: { v6PaneId: 'default' },
  getBoundingClientRect() {
    return { height: 360, width: 640 };
  },
  isConnected: true,
};
const root = {
  querySelector(selector) {
    calls.push({ method: 'querySelector', selector });
    return host;
  },
};

function managerFactory(options) {
  calls.push({ method: 'managerFactory', options });
  let mounted = false;
  return {
    destroyAll() {
      calls.push({ method: 'destroyAll' });
      mounted = false;
    },
    mountPane(record) {
      calls.push({ method: 'mountPane', record });
      mounted = true;
    },
    resizePane(paneId, size) {
      calls.push({ method: 'resizePane', paneId, size });
      return {
        paneId,
        snapshot: {
          dataLength: 0,
          mounted,
          visibleLogicalRange: null,
        },
      };
    },
    snapshot() {
      return {
        panes: mounted
          ? [{
              paneId: 'default',
              snapshot: {
                dataLength: 0,
                mounted: true,
                visibleLogicalRange: null,
              },
            }]
          : [],
      };
    },
  };
}

const surface = mountWorkstationChartSurface(root, { managerFactory });
const state = surface.getState();

assert.equal(calls[0].method, 'querySelector');
assert.equal(calls[0].selector, '[data-v6-chart-engine-host]');
assert.equal(calls[1].method, 'managerFactory');
assert.equal(calls[1].options.chartOptions.height, 360);
assert.equal(calls[1].options.chartOptions.width, 640);
assert.equal(calls[2].method, 'mountPane');
assert.equal(calls[2].record.host, host);
assert.equal(calls[2].record.paneId, 'default');
assert.deepEqual(state, {
  hostConnected: true,
  hostSelector: '[data-v6-chart-engine-host]',
  panes: [{
    paneId: 'default',
    snapshot: {
      dataLength: 0,
      mounted: true,
      visibleLogicalRange: null,
    },
  }],
});

surface.resize();
assert.deepEqual(calls.find((call) => call.method === 'resizePane'), {
  method: 'resizePane',
  paneId: 'default',
  size: { height: 360, width: 640 },
});

surface.destroy();
assert.equal(calls.at(-1).method, 'destroyAll');

assert.throws(
  () => mountWorkstationChartSurface(null),
  /root is required/,
);
assert.throws(
  () => mountWorkstationChartSurface({ querySelector: () => null }),
  /host .* is missing/,
);

console.log('v6 workstation chart surface smoke passed');
