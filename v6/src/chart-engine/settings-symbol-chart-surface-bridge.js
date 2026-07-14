import { SETTINGS_COMMANDS, SETTINGS_EVENTS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

export function connectSettingsSymbolChartSurfaceBridge({
  chartSurface,
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (typeof chartSurface?.applySymbolSettings !== 'function') {
    throw new Error('Settings Symbol chart surface bridge requires applySymbolSettings.');
  }
  const apply = (settings = {}) => chartSurface.applySymbolSettings({
    symbolBordersVisible: settings.symbolBordersVisible,
    symbolDownBodyColor: settings.symbolDownBodyColor,
    symbolDownBorderColor: settings.symbolDownBorderColor,
    symbolDownWickColor: settings.symbolDownWickColor,
    symbolUpBodyColor: settings.symbolUpBodyColor,
    symbolUpBorderColor: settings.symbolUpBorderColor,
    symbolUpWickColor: settings.symbolUpWickColor,
    symbolWicksVisible: settings.symbolWicksVisible,
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
