import assert from 'node:assert/strict';
import { createChartRangeInputController } from '../src/chart-engine/chart-range-input-controller.js';

function target(paneId = null) {
  const listeners = new Map();
  return {
    dataset: paneId ? { v6PaneId: paneId } : {},
    addEventListener(name, handler) { listeners.set(name, handler); },
    removeEventListener(name) { listeners.delete(name); },
    fire(name, payload = {}) { listeners.get(name)?.(payload); },
    listenerCount() { return listeners.size; },
  };
}

const documentTarget = target();
const host = target('main');
host.ownerDocument = documentTarget;
const activations = [];
const controller = createChartRangeInputController({
  activatePane: (paneId, origin) => activations.push({ origin, paneId }),
  hosts: [host],
  resolvePaneId: (item) => item.dataset.v6PaneId,
  root: { ownerDocument: documentTarget },
});

host.fire('mousedown');
assert.equal(controller.isUserRangeInputActive(), true);
assert.deepEqual(activations.at(-1), { origin: 'mousedown', paneId: 'main' });
host.fire('wheel');
assert.equal(controller.isRecentWheelInput('main'), true);

controller.destroy();
assert.equal(host.listenerCount(), 0);
assert.equal(documentTarget.listenerCount(), 0);

console.log('v6 chart range input controller smoke passed');
