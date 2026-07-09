import { PANE_COMMANDS, PANE_EVENTS } from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';

function normalizePaneId(record = {}) {
  return String(record.id || record.paneId || '').trim();
}

function normalizeSymbol(record = {}) {
  return String(record.instrument || record.symbol || '').trim().toUpperCase();
}

function applySymbol(element, symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (!normalized) return null;
  element.textContent = normalized;
  element.dataset.v6TopSymbol = normalized;
  return normalized;
}

export function connectTopSymbolActivePaneBridge({
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
  symbolElement,
} = {}) {
  if (!symbolElement) {
    throw new Error('Top symbol active pane bridge requires a symbol element.');
  }
  if (typeof dispatchCommand !== 'function') {
    throw new Error('Top symbol active pane bridge requires dispatchCommand.');
  }
  if (typeof subscribeEvent !== 'function') {
    throw new Error('Top symbol active pane bridge requires subscribeEvent.');
  }

  let active = true;
  let activePaneId = null;

  function applyPane(record = {}) {
    if (!active) return null;
    const paneId = normalizePaneId(record);
    if (paneId) {
      activePaneId = paneId;
    }
    return applySymbol(symbolElement, normalizeSymbol(record));
  }

  function applySymbolIntent(record = {}) {
    if (!active) return null;
    const paneId = normalizePaneId(record);
    if (!paneId || paneId !== activePaneId) {
      return null;
    }
    return applySymbol(symbolElement, normalizeSymbol(record));
  }

  const unsubscriptions = [
    subscribeEvent(PANE_EVENTS.ACTIVE_CHANGED, applyPane),
    subscribeEvent(PANE_EVENTS.SYMBOL_INTENT_CHANGED, applySymbolIntent),
  ];
  const ready = Promise.resolve(dispatchCommand(PANE_COMMANDS.GET_ACTIVE))
    .then((pane) => applyPane(pane))
    .catch(() => null);

  return Object.freeze({
    destroy() {
      active = false;
      while (unsubscriptions.length) {
        unsubscriptions.pop()();
      }
    },
    ready,
  });
}
