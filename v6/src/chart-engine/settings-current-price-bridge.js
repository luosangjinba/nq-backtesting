import { PANE_EVENTS, REPLAY_EVENTS, SETTINGS_COMMANDS, SETTINGS_EVENTS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

export function connectSettingsCurrentPriceBridge({
  chartSurface,
  root,
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (typeof chartSurface?.applyPaneCurrentPriceSettings !== 'function') {
    throw new Error('Settings Current Price bridge requires pane series settings.');
  }
  const symbols = new Map([...root.querySelectorAll('[data-v6-chart-engine-host]')].map((host) => [
    String(host.dataset.v6PaneId || ''),
    String(host.querySelector?.('[data-v6-pane-status-readout]')?.dataset.v6PaneSymbol || 'NQ'),
  ]));
  let settings = {};
  const applyPane = (paneId) => chartSurface.applyPaneCurrentPriceSettings(
    paneId,
    settings,
    symbols.get(paneId) || 'NQ',
  );
  const applySettings = (nextSettings = {}) => {
    settings = {
      currentPriceLineVisible: nextSettings.currentPriceLineVisible,
      currentPriceNameVisible: nextSettings.currentPriceNameVisible,
      currentPriceValueVisible: nextSettings.currentPriceValueVisible,
    };
    return [...symbols.keys()].map(applyPane);
  };
  const applySymbol = (record = {}) => {
    const paneId = String(record.id || record.paneId || 'main');
    symbols.set(paneId, String(record.instrument || record.symbol || 'NQ').toUpperCase());
    return applyPane(paneId);
  };
  const unsubscriptions = [
    subscribeEvent(SETTINGS_EVENTS.UPDATED, applySettings),
    subscribeEvent(SETTINGS_EVENTS.RESET, applySettings),
    subscribeEvent(PANE_EVENTS.SYMBOL_INTENT_CHANGED, applySymbol),
    subscribeEvent(REPLAY_EVENTS.LOADED, applySymbol),
  ];
  const ready = dispatchCommand(SETTINGS_COMMANDS.GET_SNAPSHOT).then(applySettings);
  return Object.freeze({
    destroy() { while (unsubscriptions.length) unsubscriptions.pop()(); },
    ready,
  });
}
