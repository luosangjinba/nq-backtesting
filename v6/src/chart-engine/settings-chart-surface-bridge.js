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
  if (typeof chartSurface?.applyTimePresentationSettings !== 'function') {
    throw new Error('Settings chart surface bridge requires time presentation settings.');
  }

  const applyTimePresentation = (settings = {}) => chartSurface.applyTimePresentationSettings(settings);
  const apply = (settings = {}) => ({
    canvas: chartSurface.applySettings(settings),
    timePresentation: applyTimePresentation(settings),
  });
  const unsubscriptions = [
    subscribeEvent(SETTINGS_EVENTS.UPDATED, apply),
    subscribeEvent(SETTINGS_EVENTS.RESET, apply),
    subscribeEvent(SETTINGS_EVENTS.DRAFT_PREVIEWED, applyTimePresentation),
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
