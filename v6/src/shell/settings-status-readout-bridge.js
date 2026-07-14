import { SETTINGS_COMMANDS, SETTINGS_EVENTS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

export function connectSettingsStatusReadoutBridge({
  statusReadout,
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (typeof statusReadout?.applySettings !== 'function') {
    throw new Error('Settings Status Readout bridge requires applySettings.');
  }
  const apply = (settings = {}) => statusReadout.applySettings({
    statusBackgroundColor: settings.statusBackgroundColor,
    statusBackgroundOpacityPercent: settings.statusBackgroundOpacityPercent,
    statusBarChangeVisible: settings.statusBarChangeVisible,
    statusOhlcVisible: settings.statusOhlcVisible,
    statusTitleMode: settings.statusTitleMode,
  });
  const unsubscriptions = [
    subscribeEvent(SETTINGS_EVENTS.UPDATED, apply),
    subscribeEvent(SETTINGS_EVENTS.RESET, apply),
  ];
  const ready = dispatchCommand(SETTINGS_COMMANDS.GET_SNAPSHOT).then(apply);

  return Object.freeze({
    destroy() {
      while (unsubscriptions.length) unsubscriptions.pop()();
    },
    ready,
  });
}
