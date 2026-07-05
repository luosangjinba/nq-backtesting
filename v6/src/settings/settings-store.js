import {
  createSettingsRecord,
  updateSettingsRecord,
} from './settings-model.js';

export function createSettingsStore({
  initialSettings = {},
} = {}) {
  let settings = createSettingsRecord(initialSettings);

  function snapshot() {
    return { ...settings };
  }

  function update(patch = {}) {
    settings = updateSettingsRecord(settings, patch);
    return snapshot();
  }

  function reset(nextSettings = {}) {
    settings = createSettingsRecord(nextSettings);
    return snapshot();
  }

  return {
    reset,
    snapshot,
    update,
  };
}
