import assert from 'node:assert/strict';
import { connectMaximizeRestoreControl } from '../src/chart-engine/maximize-restore-control-bridge.js';

function createButton() {
  const listeners = new Map();
  const label = { textContent: '' };
  const attributes = new Map();
  return {
    dataset: {},
    addEventListener(name, handler, options = {}) {
      listeners.set(name, handler);
      options.signal?.addEventListener?.('abort', () => listeners.delete(name), { once: true });
    },
    click() {
      listeners.get('click')?.();
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    querySelector(selector) {
      return selector === '[data-v6-chart-maximize-label]' ? label : null;
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    listenerCount() {
      return listeners.size;
    },
    label,
  };
}

let maximizedPaneId = null;
const calls = [];
const button = createButton();
const chartSurface = {
  getState() {
    return {
      maximize: { maximizedPaneId },
      panes: [{ paneId: 'main' }, { paneId: 'secondary' }],
    };
  },
  maximizePane(paneId) {
    calls.push(['maximizePane', paneId]);
    maximizedPaneId = paneId;
    return { visiblePaneIds: [paneId] };
  },
  restorePane() {
    calls.push(['restorePane']);
    maximizedPaneId = null;
    return { visiblePaneIds: ['main', 'secondary'] };
  },
};

const control = connectMaximizeRestoreControl({
  button,
  chartSurface,
  paneId: 'secondary',
});

assert.equal(control.paneId, 'secondary');
assert.equal(button.dataset.v6ChartMaximizeState, 'maximize');
assert.equal(button.getAttribute('aria-label'), 'Maximize chart');
assert.equal(button.getAttribute('title'), 'Maximize chart');
assert.equal(button.label.textContent, 'Maximize chart');

button.click();
assert.deepEqual(calls.at(-1), ['maximizePane', 'secondary']);
assert.equal(button.dataset.v6ChartMaximizeState, 'restore');
assert.equal(button.getAttribute('aria-label'), 'Restore chart');
assert.equal(button.getAttribute('title'), 'Restore chart');
assert.equal(button.label.textContent, 'Restore chart');

button.click();
assert.deepEqual(calls.at(-1), ['restorePane']);
assert.equal(button.dataset.v6ChartMaximizeState, 'maximize');
assert.equal(button.getAttribute('aria-label'), 'Maximize chart');
assert.equal(button.getAttribute('title'), 'Maximize chart');
assert.equal(button.label.textContent, 'Maximize chart');

maximizedPaneId = 'main';
assert.deepEqual(control.syncButtonState(), {
  label: 'Maximize chart',
  state: 'maximize',
});

control.destroy();
assert.equal(button.listenerCount(), 0);

console.log('v6 maximize restore control bridge step 186 smoke passed');
