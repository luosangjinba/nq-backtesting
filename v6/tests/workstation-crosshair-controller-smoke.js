import assert from 'node:assert/strict';
import { createWorkstationCrosshairController } from '../src/chart-engine/workstation-crosshair-controller.js';
import { CHART_SURFACE_EVENTS } from '../src/contracts/app-contracts.js';

let callback = null;
let unsubscribed = 0;
const emitted = [];
const manager = {
  subscribeCrosshairMove(_paneId, handler) {
    callback = handler;
    return () => { unsubscribed += 1; };
  },
};
const controller = createWorkstationCrosshairController({
  emitEvent: (...args) => emitted.push(args),
  getPaneBars: () => [
    { close: 10, timestamp: 100 },
    { close: 20, timestamp: 200 },
  ],
  manager,
  paneIds: ['main'],
});
const received = [];
const unsubscribe = controller.subscribe((record) => received.push(record));

callback({ bar: { close: 20, timestamp: 200 }, paneId: 'main', time: 200 });
assert.equal(received[0].previousClose, 10);
assert.equal(received[0].displayReadout, true);
assert.equal(emitted[0][0], CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED);
assert.deepEqual(controller.snapshot(), received);

callback({ bar: null, paneId: 'main', time: 300 });
assert.equal(received[1].displayReadout, true);
unsubscribe();
controller.destroy();
assert.equal(unsubscribed, 1);

console.log('v6 workstation crosshair controller smoke passed');
