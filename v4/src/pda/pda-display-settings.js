// Shared display toggles for PDA rendering.

import * as bus from '../event-bus.js';

const STORAGE_KEY = 'v4:pda-display-settings';

const defaults = {
  showCurrentLabel: true,
};

let settings = loadSettings();

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch (_err) {
    return { ...defaults };
  }
}

function saveSettings() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (_err) {
    // Display settings are non-critical; ignore storage failures.
  }
}

export function getPdaDisplaySettings() {
  return { ...settings };
}

export function setPdaDisplaySettings(patch = {}) {
  settings = {
    ...settings,
    ...patch,
  };
  saveSettings();
  bus.emit('pda:display-settings-changed', getPdaDisplaySettings());
}
