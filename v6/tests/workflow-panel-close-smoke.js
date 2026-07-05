import assert from 'node:assert/strict';
import { bindWorkflowPanelClose } from '../src/shell/workflow-panel-close.js';

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    dispatch(name, event = {}) {
      return listeners.get(name)?.(event);
    },
    removeEventListener(name, listener) {
      if (listeners.get(name) === listener) {
        listeners.delete(name);
      }
    },
  };
}

const root = createEventTarget();
const closeButton = createEventTarget();
const unsubscriptions = [];
let closeCount = 0;

bindWorkflowPanelClose({
  close: () => {
    closeCount += 1;
  },
  closeButton,
  root,
  unsubscriptions,
});

closeButton.dispatch('click');
assert.equal(closeCount, 1);

root.dispatch('keydown', { key: 'Enter' });
assert.equal(closeCount, 1);

root.dispatch('keydown', { key: 'Escape' });
assert.equal(closeCount, 2);
assert.equal(unsubscriptions.length, 2);

while (unsubscriptions.length) {
  unsubscriptions.pop()();
}

closeButton.dispatch('click');
root.dispatch('keydown', { key: 'Escape' });
assert.equal(closeCount, 2);

assert.throws(
  () => bindWorkflowPanelClose({ close: null }),
  /Workflow panel close handler is required/,
);

console.log('v6 workflow panel close smoke passed');
