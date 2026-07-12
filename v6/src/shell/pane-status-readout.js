import {
  CHART_SURFACE_EVENTS,
  CHART_HISTORY_EVENTS,
  DEFAULT_WALL_EVENTS,
  PANE_EVENTS,
  REPLAY_EVENTS,
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS,
  TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { subscribeEvent as subscribeRuntimeEvent } from '../runtime/events.js';
import { createStatusReadoutState } from './status-readout-model.js';
import { createTargetHistoryDiagnosticsReadoutState } from './target-history-diagnostics-readout-model.js';
import { createTargetMaterializationReplayDiagnosticsReadoutViewModel } from './target-materialization-replay-diagnostics-readout-view-model.js';

function formatTimeframe(value) {
  const text = String(value || '').trim();
  if (!text) return '1m';
  if (/^\d+$/.test(text)) return `${text}m`;
  return text;
}

function normalizePaneRecord(record = {}) {
  const paneId = String(record.id || record.paneId || '').trim();
  if (!paneId) return null;
  return {
    active: Boolean(record.active),
    id: paneId,
    instrument: String(record.instrument || record.symbol || 'NQ').trim().toUpperCase() || 'NQ',
    timeframe: formatTimeframe(record.displayTimeframe || record.timeframe || '1m'),
  };
}

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function updateDataset(element, state) {
  if (!element) return;
  element.dataset.statusCandleDirection = state.candleDirection;
  element.dataset.statusOhlc = state.crosshairBar ? 'selected' : 'empty';
  element.dataset.v6PaneActive = state.active ? 'true' : 'false';
}

function renderHistoryDiagnostics(element, extension = null) {
  const readout = element.querySelector('[data-v6-target-history-diagnostics]');
  if (!readout) return null;
  const state = createTargetHistoryDiagnosticsReadoutState(extension);
  readout.dataset.v6TargetHistoryDiagnosticsPath = state.path;
  readout.dataset.v6TargetHistoryDiagnosticsFallbackReason = state.fallbackReason || 'none';
  readout.dataset.v6TargetHistoryDiagnosticsPrependedBars = String(state.prependedBarCount);
  readout.dataset.v6TargetHistoryDiagnosticsSourceRequests = String(state.sourceRequestCount);
  readout.dataset.v6TargetHistoryDiagnosticsTargetRequests = String(state.targetRequestCount);
  readout.textContent = state.text;
  readout.title = state.title;
  return state;
}

function createElementAfter(referenceElement, tagName) {
  const doc = referenceElement?.ownerDocument;
  if (!doc || typeof doc.createElement !== 'function') return null;
  const element = doc.createElement(tagName);
  if (typeof referenceElement.after === 'function') {
    referenceElement.after(element);
    return element;
  }
  if (referenceElement.parentNode && typeof referenceElement.parentNode.insertBefore === 'function') {
    referenceElement.parentNode.insertBefore(element, referenceElement.nextSibling);
    return element;
  }
  return element;
}

function ensureTargetMaterializationDiagnosticsReadout(element) {
  let readout = element.querySelector('[data-v6-target-materialization-diagnostics]');
  if (readout) return readout;
  const historyReadout = element.querySelector('[data-v6-target-history-diagnostics]');
  readout = createElementAfter(historyReadout, 'span');
  if (!readout) return null;
  readout.className = 'target-materialization-diagnostics-readout';
  readout.setAttribute('data-v6-target-materialization-diagnostics', '');
  readout.hidden = true;
  return readout;
}

function clearChildren(element) {
  if (!element) return;
  if (typeof element.replaceChildren === 'function') {
    element.replaceChildren();
    return;
  }
  element.textContent = '';
  if (Array.isArray(element.children)) {
    element.children.length = 0;
  }
}

function createRowElement(readout, row) {
  const doc = readout?.ownerDocument;
  const element = doc?.createElement ? doc.createElement('span') : { dataset: {}, textContent: '' };
  element.className = 'target-materialization-diagnostics-row';
  if (typeof element.setAttribute === 'function') {
    element.setAttribute('data-v6-target-materialization-diagnostics-row', '');
  } else {
    element.dataset.v6TargetMaterializationDiagnosticsRow = '';
  }
  element.dataset.v6TargetMaterializationDiagnosticsField = row.field;
  element.dataset.v6TargetMaterializationDiagnosticsValue = row.value;
  element.textContent = `${row.label} ${row.value}`;
  return element;
}

function appendRow(readout, row) {
  const rowElement = createRowElement(readout, row);
  if (typeof readout.appendChild === 'function') {
    readout.appendChild(rowElement);
    return rowElement;
  }
  if (Array.isArray(readout.children)) {
    readout.children.push(rowElement);
  }
  readout.textContent = [readout.textContent, rowElement.textContent].filter(Boolean).join(' ');
  return rowElement;
}

function renderTargetMaterializationDiagnostics(element, envelope = {}) {
  const readout = ensureTargetMaterializationDiagnosticsReadout(element);
  if (!readout) return null;
  const state = createTargetMaterializationReplayDiagnosticsReadoutViewModel(envelope);
  readout.dataset.v6TargetMaterializationDiagnosticsMode = state.mode;
  readout.dataset.v6TargetMaterializationDiagnosticsReason = state.reason || 'none';
  readout.dataset.v6TargetMaterializationDiagnosticsPaneId = state.paneId;
  readout.dataset.v6TargetMaterializationDiagnosticsSnapshotReady = state.snapshotReady ? 'true' : 'false';
  readout.hidden = !state.visible;
  readout.title = state.title;
  clearChildren(readout);
  if (state.visible) {
    state.rows.forEach((row) => appendRow(readout, row));
  }
  return state;
}

function createPaneState(record = {}) {
  const normalized = normalizePaneRecord(record) || { id: 'main', instrument: 'NQ', timeframe: '1m' };
  return {
    bar: null,
    historyExtension: record.historyExtension ? { ...record.historyExtension } : null,
    active: normalized.active,
    instrument: normalized.instrument,
    paneId: normalized.id,
    timeframe: normalized.timeframe,
  };
}

function renderPaneReadout(element, paneState) {
  const readoutState = createStatusReadoutState({
    crosshairBar: paneState.bar,
    replayState: {
      symbol: paneState.instrument,
      timeframe: paneState.timeframe,
    },
  });
  const state = {
    ...readoutState,
    active: Boolean(paneState.active),
  };
  element.dataset.v6PaneSymbol = state.symbol;
  element.dataset.v6PaneTimeframe = state.timeframe;
  updateDataset(element, state);
  setText(element, '[data-v6-status-symbol]', state.symbol);
  setText(element, '[data-v6-status-timeframe]', state.timeframe);
  setText(element, '[data-v6-status-open]', state.ohlc.open);
  setText(element, '[data-v6-status-high]', state.ohlc.high);
  setText(element, '[data-v6-status-low]', state.ohlc.low);
  setText(element, '[data-v6-status-close]', state.ohlc.close);
  return state;
}

export function mountPaneStatusReadout(root, {
  dispatchCommand = dispatchRuntimeCommand,
  subscribeEvent = subscribeRuntimeEvent,
} = {}) {
  if (!root) {
    throw new Error('Pane status readout root is required.');
  }
  const readouts = [...root.querySelectorAll('[data-v6-pane-status-readout]')];
  const readoutByPaneId = new Map();
  const paneStateByPaneId = new Map();
  const unsubscriptions = [];

  readouts.forEach((element) => {
    const paneId = String(element.dataset.v6PaneId || '').trim();
    if (!paneId) return;
    readoutByPaneId.set(paneId, element);
    paneStateByPaneId.set(paneId, createPaneState({
      id: paneId,
      instrument: element.dataset.v6PaneSymbol || 'NQ',
      timeframe: element.dataset.v6PaneTimeframe || '1m',
    }));
  });

  function renderPane(paneId) {
    const element = readoutByPaneId.get(paneId);
    const paneState = paneStateByPaneId.get(paneId);
    if (!element || !paneState) return null;
    const state = renderPaneReadout(element, paneState);
    renderHistoryDiagnostics(element, paneState.historyExtension);
    return state;
  }

  function renderTargetMaterializationEnvelope(envelope = {}) {
    const paneId = String(envelope?.snapshot?.paneId || 'main').trim() || 'main';
    const element = readoutByPaneId.get(paneId);
    if (!element) return null;
    return renderTargetMaterializationDiagnostics(element, envelope);
  }

  function updatePaneMetadata(record = {}) {
    const normalized = normalizePaneRecord(record);
    if (!normalized || !readoutByPaneId.has(normalized.id)) return null;
    const previous = paneStateByPaneId.get(normalized.id) || createPaneState(normalized);
    paneStateByPaneId.set(normalized.id, {
      ...previous,
      active: normalized.active,
      instrument: normalized.instrument,
      timeframe: normalized.timeframe,
    });
    return renderPane(normalized.id);
  }

  function updateActivePane(record = {}) {
    const normalized = normalizePaneRecord(record);
    if (!normalized || !readoutByPaneId.has(normalized.id)) return null;
    const rendered = [];
    paneStateByPaneId.forEach((paneState, paneId) => {
      paneStateByPaneId.set(paneId, {
        ...paneState,
        active: paneId === normalized.id,
      });
      rendered.push(renderPane(paneId));
    });
    return rendered;
  }

  function updatePaneCrosshair(payload = {}) {
    const paneId = String(payload.paneId || '').trim();
    if (!paneId || !readoutByPaneId.has(paneId)) return null;
    const previous = paneStateByPaneId.get(paneId) || createPaneState({ id: paneId });
    paneStateByPaneId.set(paneId, {
      ...previous,
      bar: payload.bar ? { ...payload.bar } : null,
    });
    return renderPane(paneId);
  }

  function updateHistoryDiagnostics(extension = {}) {
    const paneId = String(extension.paneId || '').trim();
    if (!paneId || !readoutByPaneId.has(paneId)) return null;
    const previous = paneStateByPaneId.get(paneId) || createPaneState({ id: paneId });
    paneStateByPaneId.set(paneId, {
      ...previous,
      historyExtension: extension ? { ...extension } : null,
    });
    return renderPane(paneId);
  }

  function updateFromReplay(payload = {}) {
    const paneId = payload.paneId ? String(payload.paneId) : 'main';
    if (!readoutByPaneId.has(paneId)) return null;
    return updatePaneMetadata({
      displayTimeframe: payload.timeframe || payload.displayTimeframe,
      id: paneId,
      instrument: payload.symbol || payload.instrument,
    });
  }

  unsubscriptions.push(
    subscribeEvent(PANE_EVENTS.SYMBOL_INTENT_CHANGED, updatePaneMetadata),
    subscribeEvent(PANE_EVENTS.INTERVAL_INTENT_CHANGED, updatePaneMetadata),
    subscribeEvent(PANE_EVENTS.DISPLAY_TIMEFRAME_CHANGED, updatePaneMetadata),
    subscribeEvent(PANE_EVENTS.ACTIVE_CHANGED, updateActivePane),
    subscribeEvent(CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED, updatePaneCrosshair),
    subscribeEvent(CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED, updateHistoryDiagnostics),
    subscribeEvent(REPLAY_EVENTS.LOADED, updateFromReplay),
    subscribeEvent(DEFAULT_WALL_EVENTS.LOADED, (payload = {}) => updateFromReplay(payload.replayState || payload)),
    subscribeEvent(
      TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_EVENTS.SNAPSHOT_READY,
      renderTargetMaterializationEnvelope,
    ),
  );

  readoutByPaneId.forEach((_, paneId) => renderPane(paneId));
  if (typeof dispatchCommand === 'function') {
    Promise.resolve(dispatchCommand(TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT))
      .then(renderTargetMaterializationEnvelope)
      .catch(() => {
        renderTargetMaterializationEnvelope({ snapshot: null, status: 'idle' });
      });
  }

  return Object.freeze({
    destroy() {
      while (unsubscriptions.length) {
        unsubscriptions.pop()();
      }
    },
    getState() {
      return {
        panes: [...paneStateByPaneId.values()].map((pane) => ({
          ...pane,
          bar: pane.bar ? { ...pane.bar } : null,
          historyExtension: pane.historyExtension ? { ...pane.historyExtension } : null,
        })),
      };
    },
    updatePaneCrosshair,
    updateActivePane,
    updateHistoryDiagnostics,
    updateTargetMaterializationDiagnostics: renderTargetMaterializationEnvelope,
    updatePaneMetadata,
  });
}
