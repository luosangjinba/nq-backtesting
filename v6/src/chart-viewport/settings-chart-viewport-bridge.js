import {
  CHART_VIEWPORT_COMMANDS,
  SETTINGS_COMMANDS,
  SETTINGS_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

export function connectSettingsChartViewportBridge({
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  const apply = (settings = {}) => dispatchCommand(
    CHART_VIEWPORT_COMMANDS.UPDATE_DEFAULT_RIGHT_OFFSET,
    { latestOffsetBars: settings.chartRightMarginBars }
  );
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
