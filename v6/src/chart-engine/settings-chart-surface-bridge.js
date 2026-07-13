import { SETTINGS_COMMANDS, SETTINGS_EVENTS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

export function connectSettingsChartSurfaceBridge({
  chartSurface,
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (typeof chartSurface?.applySettings !== 'function') {
    throw new Error('Settings chart surface bridge requires applySettings.');
  }

  const apply = (settings = {}) => chartSurface.applySettings({
    chartGrid: settings.chartGrid,
  });
  const unsubscriptions = [
    subscribeEvent(SETTINGS_EVENTS.UPDATED, apply),
    subscribeEvent(SETTINGS_EVENTS.RESET, apply),
  ];
  const ready = dispatchCommand(SETTINGS_COMMANDS.GET_SNAPSHOT).then(apply);

  return Object.freeze({
    destroy() {
      while (unsubscriptions.length) {
        unsubscriptions.pop()();
      }
    },
    ready,
  });
}
