import assert from 'node:assert/strict';
import { createChartHostManager } from '../src/chart-engine/chart-host-manager.js';

function createFakeAdapterFactory(calls) {
  return () => {
    let mounted = false;
    let dataLength = 0;
    let visibleLogicalRange = null;
    return {
      destroy() {
        calls.push({ method: 'destroy' });
        mounted = false;
      },
      measureVisibleLogicalRange() {
        calls.push({ method: 'measureVisibleLogicalRange' });
        return visibleLogicalRange ? { ...visibleLogicalRange } : null;
      },
      mount(host) {
        calls.push({ host, method: 'mount' });
        mounted = true;
      },
      resize(size) {
        calls.push({ method: 'resize', size: { ...size } });
      },
      setData(bars = []) {
        calls.push({ length: bars.length, method: 'setData' });
        dataLength = bars.length;
      },
      setVisibleLogicalRange(range) {
        calls.push({ method: 'setVisibleLogicalRange', range: { ...range } });
        visibleLogicalRange = { ...range };
      },
      snapshot() {
        return {
          dataLength,
          mounted,
          visibleLogicalRange,
        };
      },
      subscribeVisibleLogicalRangeChange(handler) {
        calls.push({ method: 'subscribeVisibleLogicalRangeChange' });
        handler({ from: -4, to: 3 });
        return () => calls.push({ method: 'unsubscribeVisibleLogicalRangeChange' });
      },
      update() {
        calls.push({ method: 'update' });
        dataLength += 1;
      },
    };
  };
}

const calls = [];
const manager = createChartHostManager({
  adapterFactory: createFakeAdapterFactory(calls),
});
const leftHost = { id: 'left-host' };
const rightHost = { id: 'right-host' };

assert.deepEqual(manager.snapshot(), { panes: [] });
assert.equal(manager.mountPane({ host: leftHost, paneId: 'pane-left' }).paneId, 'pane-left');
assert.equal(manager.mountPane({ host: rightHost, paneId: 'pane-right' }).paneId, 'pane-right');
assert.deepEqual(manager.snapshot().panes.map((pane) => pane.paneId), ['pane-left', 'pane-right']);
assert.equal(calls.filter((call) => call.method === 'mount').length, 2);

manager.setData('pane-left', [
  { close: 1, high: 1, low: 1, open: 1, timestamp: 1 },
  { close: 2, high: 2, low: 2, open: 2, timestamp: 2 },
]);
manager.update('pane-right', { close: 3, high: 3, low: 3, open: 3, timestamp: 3 });
manager.setVisibleLogicalRange('pane-left', { from: -3, to: 2 });
const visibleRangeEvents = [];
const unsubscribeVisibleRange = manager.subscribeVisibleLogicalRangeChange('pane-left', (event) => {
  visibleRangeEvents.push(event);
});
manager.resizePane('pane-right', { height: 240, width: 320 });

assert.equal(manager.snapshot().panes.find((pane) => pane.paneId === 'pane-left').snapshot.dataLength, 2);
assert.equal(manager.snapshot().panes.find((pane) => pane.paneId === 'pane-right').snapshot.dataLength, 1);
assert.deepEqual(manager.measureVisibleLogicalRange('pane-left'), { from: -3, to: 2 });
assert.deepEqual(visibleRangeEvents, [{
  paneId: 'pane-left',
  range: { from: -4, to: 3 },
}]);
unsubscribeVisibleRange();
assert.equal(calls.some((call) => call.method === 'unsubscribeVisibleLogicalRangeChange'), true);
assert.deepEqual(calls.find((call) => call.method === 'resize'), {
  method: 'resize',
  size: { height: 240, width: 320 },
});

assert.throws(
  () => manager.mountPane({ host: leftHost, paneId: 'pane-left' }),
  /already mounted/,
);
assert.throws(
  () => manager.setData('missing-pane', []),
  /not mounted/,
);

manager.destroyPane('pane-left');
assert.deepEqual(manager.snapshot().panes.map((pane) => pane.paneId), ['pane-right']);
manager.destroyAll();
assert.deepEqual(manager.snapshot(), { panes: [] });
assert.equal(calls.filter((call) => call.method === 'destroy').length, 2);

console.log('v6 chart host manager smoke passed');
