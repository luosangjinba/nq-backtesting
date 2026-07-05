import { SETTINGS_COMMANDS, SETTINGS_EVENTS } from '../contracts/app-contracts.js';
import { registerCommand } from '../runtime/commands.js';
import { createSettingsStore } from './settings-store.js';

export function createSettingsRuntime({
  store = createSettingsStore(),
} = {}) {
  const unregisterCallbacks = [];

  function start({ emitEvent } = {}) {
    const emit = emitEvent || (() => {});
    unregisterCallbacks.push(
      registerCommand(SETTINGS_COMMANDS.GET_SNAPSHOT, () => store.snapshot()),
      registerCommand(SETTINGS_COMMANDS.UPDATE, (patch = {}) => {
        const settings = store.update(patch);
        emit(SETTINGS_EVENTS.UPDATED, settings);
        return settings;
      }),
      registerCommand(SETTINGS_COMMANDS.RESET, (nextSettings = {}) => {
        const settings = store.reset(nextSettings);
        emit(SETTINGS_EVENTS.RESET, settings);
        return settings;
      }),
    );
  }

  function stop() {
    while (unregisterCallbacks.length) {
      unregisterCallbacks.pop()();
    }
  }

  return {
    id: 'runtime.settings',
    start,
    stop,
  };
}
