import assert from 'node:assert/strict';
import { LAYOUT_COMMANDS, LAYOUT_EVENTS } from '../src/contracts/app-contracts.js';
import { mountLayoutMenuControl } from '../src/shell/layout-menu-control.js';

class FakeClassList {
  constructor(values = []) {
    this.values = new Set(values);
  }

  contains(value) {
    return this.values.has(value);
  }

  toggle(value, force) {
    if (force) {
      this.values.add(value);
    } else {
      this.values.delete(value);
    }
  }
}

class FakeElement {
  constructor({ checked = false, classNames = [], dataset = {}, disabled = false } = {}) {
    this.checked = checked;
    this.classList = new FakeClassList(classNames);
    this.dataset = { ...dataset };
    this.disabled = disabled;
    this.listeners = new Map();
    this.attributes = new Map();
  }

  addEventListener(name, listener) {
    const listeners = this.listeners.get(name) || [];
    listeners.push(listener);
    this.listeners.set(name, listeners);
  }

  click() {
    this.dispatchEvent({ type: 'click' });
  }

  dispatchEvent(event = {}) {
    (this.listeners.get(event.type) || []).forEach((listener) => listener(event));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

function createRoot() {
  const options = [
    new FakeElement({ classNames: ['layout-option', 'is-selected'], dataset: { v6LayoutMode: 'single', v6LayoutVariant: 'single' }, disabled: true }),
    new FakeElement({ classNames: ['layout-option'], dataset: { v6LayoutMode: 'twice', v6LayoutVariant: 'twice-vertical' }, disabled: true }),
    new FakeElement({ classNames: ['layout-option'], dataset: { v6LayoutMode: 'twice', v6LayoutVariant: 'twice-horizontal' }, disabled: true }),
    new FakeElement({ classNames: ['layout-option'], dataset: { v6LayoutMode: 'triple', v6LayoutVariant: 'triple-columns' }, disabled: true }),
  ];
  const syncInputs = [
    new FakeElement({ checked: true, dataset: { v6LayoutSync: 'symbol' }, disabled: true }),
    new FakeElement({ checked: true, dataset: { v6LayoutSync: 'interval' }, disabled: true }),
    new FakeElement({ checked: false, dataset: { v6LayoutSync: 'crosshair' }, disabled: true }),
    new FakeElement({ checked: true, dataset: { v6LayoutSync: 'time' }, disabled: true }),
    new FakeElement({ checked: false, dataset: { v6LayoutSync: 'dateRange' }, disabled: true }),
  ];
  const all = [...options, ...syncInputs];
  const root = {
    dataset: {},
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-v6-layout-mode]') return options;
      if (selector === '[data-v6-layout-sync]') return syncInputs;
      const modeMatch = selector.match(/^\[data-v6-layout-mode="([^"]+)"\]$/);
      if (modeMatch) return options.filter((option) => option.dataset.v6LayoutMode === modeMatch[1]);
      const syncMatch = selector.match(/^\[data-v6-layout-sync="([^"]+)"\]$/);
      if (syncMatch) return syncInputs.filter((input) => input.dataset.v6LayoutSync === syncMatch[1]);
      return all;
    },
  };
  return root;
}

const root = createRoot();
let snapshot = {
  activePaneId: 'main',
  mode: 'single',
  panes: [{ active: true, id: 'main', instrument: 'NQ', timeframe: '1m' }],
  sync: {
    crosshair: false,
    dateRange: false,
    interval: true,
    symbol: true,
    time: true,
  },
  variant: 'single',
};
const dispatches = [];
const listeners = new Map();
const control = mountLayoutMenuControl(root, {
  async dispatchCommand(command, payload) {
    dispatches.push({ command, payload });
    if (command === LAYOUT_COMMANDS.GET_SNAPSHOT) return snapshot;
    if (command === LAYOUT_COMMANDS.SET_MODE) {
      snapshot = { ...snapshot, mode: payload.mode, variant: payload.variant };
      listeners.get(LAYOUT_EVENTS.MODE_CHANGED)?.(snapshot);
      return snapshot;
    }
    if (command === LAYOUT_COMMANDS.SET_SYNC) {
      snapshot = {
        ...snapshot,
        sync: {
          ...snapshot.sync,
          [payload.key]: Boolean(payload.value),
        },
      };
      listeners.get(LAYOUT_EVENTS.SYNC_CHANGED)?.(snapshot);
      return snapshot;
    }
    throw new Error(`Unexpected command: ${command}`);
  },
  subscribeEvent(name, listener) {
    listeners.set(name, listener);
    return () => listeners.delete(name);
  },
});

await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(dispatches.map((entry) => entry.command), [LAYOUT_COMMANDS.GET_SNAPSHOT]);
assert.deepEqual([...root.querySelectorAll('[data-v6-layout-mode]')].map((button) => button.disabled), [false, false, false, false]);
assert.deepEqual([...root.querySelectorAll('[data-v6-layout-sync]')].map((input) => input.disabled), [false, false, false, false, false]);
assert.equal(root.dataset.layoutMode, 'single');
assert.equal(root.dataset.layoutVariant, 'single');

root.querySelectorAll('[data-v6-layout-mode="twice"]')[1].click();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(dispatches.at(-1).command, LAYOUT_COMMANDS.SET_MODE);
assert.deepEqual(dispatches.at(-1).payload, { mode: 'twice', variant: 'twice-horizontal' });
assert.equal(root.dataset.layoutMode, 'twice');
assert.equal(root.dataset.layoutVariant, 'twice-horizontal');
assert.equal(root.querySelectorAll('[data-v6-layout-mode="twice"]')[0].classList.contains('is-selected'), false);
assert.equal(root.querySelectorAll('[data-v6-layout-mode="twice"]')[1].classList.contains('is-selected'), true);
assert.equal(root.querySelectorAll('[data-v6-layout-mode="twice"]')[1].getAttribute('aria-checked'), 'true');

const crosshair = root.querySelector('[data-v6-layout-sync="crosshair"]');
crosshair.checked = true;
crosshair.dispatchEvent({ type: 'change' });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(dispatches.at(-1).command, LAYOUT_COMMANDS.SET_SYNC);
assert.deepEqual(dispatches.at(-1).payload, { key: 'crosshair', value: true });
assert.equal(root.dataset.layoutSyncCrosshair, 'true');
assert.equal(control.getState().sync.crosshair, true);

control.destroy();
assert.equal(listeners.size, 0);

console.log('v6 layout menu control smoke passed');
