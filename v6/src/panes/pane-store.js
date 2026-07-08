import {
  DEFAULT_PANE_ID,
  assertPaneRecordShape,
  createDefaultPaneRecord,
  createPaneRecord,
  normalizePaneDisplayTimeframe,
  normalizePaneInstrument,
} from './pane-model.js';

function clonePane(pane) {
  return { ...pane };
}

function normalizePaneId(paneId) {
  const normalized = String(paneId || '').trim();
  if (!normalized) {
    throw new Error('Pane id must be a non-empty string.');
  }
  return normalized;
}

export function createPaneStore({
  initialPanes = [createDefaultPaneRecord()],
} = {}) {
  const panesById = new Map();
  let activePaneId = DEFAULT_PANE_ID;

  function replaceAll(panes) {
    panesById.clear();
    panes.forEach((pane) => {
      const record = createPaneRecord(pane);
      assertPaneRecordShape(record);
      panesById.set(record.id, record);
      if (record.active) {
        activePaneId = record.id;
      }
    });
    if (!panesById.size) {
      const defaultPane = createDefaultPaneRecord();
      panesById.set(defaultPane.id, defaultPane);
      activePaneId = defaultPane.id;
    }
    if (!panesById.has(activePaneId)) {
      activePaneId = panesById.keys().next().value;
    }
  }

  function listPanes() {
    return [...panesById.values()].map((pane) => ({
      ...clonePane(pane),
      active: pane.id === activePaneId,
    }));
  }

  function getPane(paneId = activePaneId) {
    const id = normalizePaneId(paneId);
    const pane = panesById.get(id);
    return pane ? {
      ...clonePane(pane),
      active: id === activePaneId,
    } : null;
  }

  function getActivePane() {
    return getPane(activePaneId);
  }

  function setActivePane(paneId) {
    const id = normalizePaneId(paneId);
    if (!panesById.has(id)) {
      throw new Error(`Pane "${id}" does not exist.`);
    }
    activePaneId = id;
    return getActivePane();
  }

  function setSymbolIntent(paneId = activePaneId, instrument) {
    const id = normalizePaneId(paneId);
    const existing = panesById.get(id);
    if (!existing) {
      throw new Error(`Pane "${id}" does not exist.`);
    }
    const record = createPaneRecord({
      ...existing,
      instrument: normalizePaneInstrument(instrument),
    });
    panesById.set(id, record);
    return getPane(id);
  }

  function setIntervalIntent(paneId = activePaneId, displayTimeframe) {
    const id = normalizePaneId(paneId);
    const existing = panesById.get(id);
    if (!existing) {
      throw new Error(`Pane "${id}" does not exist.`);
    }
    const record = createPaneRecord({
      ...existing,
      displayTimeframe: normalizePaneDisplayTimeframe(displayTimeframe),
    });
    panesById.set(id, record);
    return getPane(id);
  }

  function setDisplayTimeframe(paneId = activePaneId, displayTimeframe) {
    return setIntervalIntent(paneId, displayTimeframe);
  }

  function snapshot() {
    return {
      activePaneId,
      defaultPaneId: DEFAULT_PANE_ID,
      panes: listPanes(),
    };
  }

  replaceAll(initialPanes);

  return {
    getActivePane,
    getPane,
    listPanes,
    setActivePane,
    setDisplayTimeframe,
    setIntervalIntent,
    setSymbolIntent,
    snapshot,
  };
}
