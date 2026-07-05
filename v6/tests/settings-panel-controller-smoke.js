import assert from 'node:assert/strict';
import { SETTINGS_COMMANDS } from '../src/contracts/app-contracts.js';
import { mountSettingsPanel } from '../src/shell/settings-panel.js';
import {
  clearCommandsForTest,
  registerCommand,
} from '../src/runtime/commands.js';

clearCommandsForTest();

const calls = [];
let settings = {
  chartGrid: true,
  displayTimezone: 'exchange',
  showWatermark: true,
  theme: 'dark',
};
const unregisterSnapshot = registerCommand(SETTINGS_COMMANDS.GET_SNAPSHOT, () => {
  calls.push({ command: SETTINGS_COMMANDS.GET_SNAPSHOT });
  return { ...settings };
});
const unregisterUpdate = registerCommand(SETTINGS_COMMANDS.UPDATE, (patch = {}) => {
  calls.push({ command: SETTINGS_COMMANDS.UPDATE, patch });
  settings = {
    ...settings,
    ...patch,
  };
  return { ...settings };
});

function createClassList() {
  const classes = new Set();
  return {
    add(name) {
      classes.add(name);
    },
    contains(name) {
      return classes.has(name);
    },
    remove(name) {
      classes.delete(name);
    },
  };
}

function createElement({
  checked = false,
  dataset = {},
  type = 'select-one',
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
    dispatch(name) {
      return listeners.get(name)?.();
    },
    removeEventListener(name, listener) {
      if (listeners.get(name) === listener) {
        listeners.delete(name);
      }
    },
    setAttribute(name, nextValue) {
      this[name] = String(nextValue);
    },
  };
}

const toggle = createElement();
const panel = createElement();
panel.hidden = true;
const theme = createElement({
  dataset: { v6SettingsField: 'theme' },
  value: 'dark',
});
const timezone = createElement({
  dataset: { v6SettingsField: 'displayTimezone' },
  value: 'exchange',
});
const grid = createElement({
  checked: true,
  dataset: { v6SettingsField: 'chartGrid' },
  type: 'checkbox',
});
const watermark = createElement({
  checked: true,
  dataset: { v6SettingsField: 'showWatermark' },
  type: 'checkbox',
});
const fields = [theme, timezone, grid, watermark];
panel.querySelectorAll = (selector) => (selector === '[data-v6-settings-field]' ? fields : []);
const root = {
  querySelector(selector) {
    if (selector === '[data-v6-settings-toggle]') return toggle;
    if (selector === '[data-v6-settings-panel]') return panel;
    return null;
  },
};

const controller = mountSettingsPanel(root);
await Promise.resolve();
assert.equal(calls[0].command, SETTINGS_COMMANDS.GET_SNAPSHOT);

toggle.dispatch('click');
assert.equal(panel.hidden, false);
assert.equal(toggle['aria-expanded'], 'true');

theme.value = 'light';
await theme.dispatch('change');
assert.deepEqual(calls.at(-1), {
  command: SETTINGS_COMMANDS.UPDATE,
  patch: { theme: 'light' },
});
assert.equal(controller.getState().settings.theme, 'light');

grid.checked = false;
await grid.dispatch('change');
assert.deepEqual(calls.at(-1), {
  command: SETTINGS_COMMANDS.UPDATE,
  patch: { chartGrid: false },
});
assert.equal(controller.getState().settings.chartGrid, false);

controller.unmount();
unregisterSnapshot();
unregisterUpdate();
clearCommandsForTest();

console.log('v6 settings panel controller smoke passed');
