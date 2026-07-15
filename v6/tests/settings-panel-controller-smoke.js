import assert from 'node:assert/strict';
import { SETTINGS_COMMANDS } from '../src/contracts/app-contracts.js';
import { mountSettingsPanel } from '../src/shell/settings-panel.js';
import {
  clearCommandsForTest,
  registerCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';

clearCommandsForTest();
clearEventsForTest();

const calls = [];
let settings = {
  chartGrid: true,
  displayTimezone: 'exchange',
  showWatermark: true,
  theme: 'dark',
};
const unregisterDefaults = registerCommand(SETTINGS_COMMANDS.GET_DEFAULTS, () => ({
  chartGrid: true,
  displayTimezone: 'exchange',
  showWatermark: true,
  theme: 'dark',
}));
const unregisterSnapshot = registerCommand(SETTINGS_COMMANDS.GET_SNAPSHOT, () => {
  calls.push({ command: SETTINGS_COMMANDS.GET_SNAPSHOT });
  return { ...settings };
});
const unregisterUpdate = registerCommand(SETTINGS_COMMANDS.UPDATE, (patch = {}) => {
  calls.push({ command: SETTINGS_COMMANDS.UPDATE, patch });
  settings = { ...settings, ...patch };
  return { ...settings };
});

function createClassList() {
  const classes = new Set();
  return {
    add: (name) => classes.add(name),
    contains: (name) => classes.has(name),
    remove: (name) => classes.delete(name),
    toggle(name, force) {
      if (force) classes.add(name);
      else classes.delete(name);
    },
  };
}

function createElement({
  checked = false,
  dataset = {},
  type = 'button',
  value = '',
} = {}) {
  const listeners = new Map();
  return {
    checked,
    classList: createClassList(),
    dataset,
    hidden: false,
    type,
    value,
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    dispatch(name, event = {}) {
      return listeners.get(name)?.({ target: this, ...event });
    },
    removeEventListener(name, listener) {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
    setAttribute(name, nextValue) {
      this[name] = String(nextValue);
    },
  };
}

const toggle = createElement();
const panel = createElement();
panel.hidden = true;
const close = createElement();
const cancel = createElement();
const ok = createElement();
const reset = createElement();
const canvasTab = createElement({ dataset: { v6SettingsTab: 'canvas' } });
const canvasPanel = createElement({ dataset: { v6SettingsTabPanel: 'canvas' } });
const grid = createElement({
  checked: true,
  dataset: { v6SettingsField: 'chartGrid' },
  type: 'checkbox',
});
panel.querySelectorAll = (selector) => (selector === '[data-v6-settings-field]' ? [grid] : []);
canvasPanel.querySelectorAll = (selector) => (selector === '[data-v6-settings-field]' ? [grid] : []);
const root = createElement();
root.querySelectorAll = (selector) => ({
  '[data-v6-settings-tab]': [canvasTab],
  '[data-v6-settings-tab-panel]': [canvasPanel],
}[selector] || []);
root.querySelector = (selector) => ({
  '[data-v6-settings-toggle]': toggle,
  '[data-v6-settings-panel]': panel,
  '[data-v6-settings-close]': close,
  '[data-v6-settings-close-secondary]': cancel,
  '[data-v6-settings-ok]': ok,
  '[data-v6-settings-reset-draft]': reset,
}[selector] || null);

const controller = mountSettingsPanel(root);
await Promise.resolve();
assert.equal(calls[0].command, SETTINGS_COMMANDS.GET_SNAPSHOT);

toggle.dispatch('click');
await Promise.resolve();
assert.equal(panel.hidden, false);
assert.equal(toggle['aria-expanded'], 'true');

grid.checked = false;
grid.dispatch('change');
assert.equal(calls.some((call) => call.command === SETTINGS_COMMANDS.UPDATE), false);
assert.equal(controller.getState().settings.chartGrid, false);
assert.equal(controller.getState().committedSettings.chartGrid, true);

cancel.dispatch('click');
assert.equal(panel.hidden, true);
assert.equal(grid.checked, true);

toggle.dispatch('click');
await Promise.resolve();
grid.checked = false;
grid.dispatch('change');
await ok.dispatch('click');
await Promise.resolve();
assert.deepEqual(calls.at(-1), {
  command: SETTINGS_COMMANDS.UPDATE,
  patch: {
    chartGrid: false,
    displayTimezone: 'exchange',
    showWatermark: true,
    theme: 'dark',
  },
});
assert.equal(panel.hidden, true);

toggle.dispatch('click');
await Promise.resolve();
reset.dispatch('click');
await Promise.resolve();
assert.equal(controller.getState().settings.chartGrid, true);
assert.equal(controller.getState().committedSettings.chartGrid, false);
root.dispatch('keydown', { key: 'Escape' });
assert.equal(panel.hidden, true);
assert.equal(grid.checked, false);

controller.unmount();
unregisterDefaults();
unregisterSnapshot();
unregisterUpdate();
clearCommandsForTest();
clearEventsForTest();

console.log('v6 settings panel controller smoke passed');
