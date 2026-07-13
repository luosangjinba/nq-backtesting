import {
  CHART_DATA_EVENTS,
  SETTINGS_COMMANDS,
  SETTINGS_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';
import { createDaySeparatorOverlayLines } from './day-separator-overlay-model.js';

export function connectSettingsDaySeparatorBridge({
  chartSurface,
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (typeof chartSurface?.applyDaySeparators !== 'function') {
    throw new Error('Settings day separator bridge requires applyDaySeparators.');
  }
  const barsByPaneId = new Map();
  let settings = { chartDaySeparators: 'off' };

  const applyPane = (paneId) => chartSurface.applyDaySeparators(
    paneId,
    createDaySeparatorOverlayLines(barsByPaneId.get(paneId) || [], settings),
    { mode: settings.chartDaySeparators },
  );
  const applySettings = (nextSettings = {}) => {
    settings = { ...nextSettings };
    return [...barsByPaneId.keys()].map(applyPane);
  };
  const unsubscriptions = [
    subscribeEvent(SETTINGS_EVENTS.UPDATED, applySettings),
    subscribeEvent(SETTINGS_EVENTS.RESET, applySettings),
    subscribeEvent(CHART_DATA_EVENTS.BARS_CHANGED, (payload = {}) => {
      const record = payload.record || {};
      const paneId = String(record.paneId || '').trim();
      if (!paneId) return;
      barsByPaneId.set(paneId, [...(record.bars || [])]);
      applyPane(paneId);
    }),
  ];
  const ready = dispatchCommand(SETTINGS_COMMANDS.GET_SNAPSHOT).then(applySettings);

  return Object.freeze({
    destroy() {
      while (unsubscriptions.length) unsubscriptions.pop()();
      barsByPaneId.clear();
    },
    ready,
  });
}
