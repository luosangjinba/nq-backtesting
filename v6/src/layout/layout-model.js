import {
  DEFAULT_PANE_ID,
  assertPaneRecordShape,
  createDefaultPaneRecord,
  createPaneRecord,
} from '../panes/pane-model.js';

export const LAYOUT_MODES = Object.freeze(['single', 'twice', 'triple']);
export const LAYOUT_SYNC_KEYS = Object.freeze(['symbol', 'interval', 'crosshair', 'time', 'dateRange']);

function normalizeLayoutMode(mode = 'single') {
  const normalized = String(mode || '').trim();
  if (!LAYOUT_MODES.includes(normalized)) {
    throw new Error(`Unsupported layout mode: ${mode}`);
  }
  return normalized;
}

function normalizePaneId(paneId) {
  const id = String(paneId || '').trim();
  if (!id) {
    throw new Error('Layout pane id must be a non-empty string.');
  }
  return id;
}

function normalizeSyncFlags(sync = {}) {
  return Object.freeze(Object.fromEntries(
    LAYOUT_SYNC_KEYS.map((key) => [key, Boolean(sync[key])]),
  ));
}

function clonePane(pane, activePaneId) {
  return Object.freeze({
    ...pane,
    active: pane.id === activePaneId,
  });
}

function normalizePanes(panes = [createDefaultPaneRecord()], activePaneId = DEFAULT_PANE_ID) {
  const records = panes.length ? panes.map((pane) => createPaneRecord(pane)) : [createDefaultPaneRecord()];
  records.forEach(assertPaneRecordShape);
  const ids = new Set();
  records.forEach((pane) => {
    if (ids.has(pane.id)) {
      throw new Error(`Duplicate layout pane id: ${pane.id}`);
    }
    ids.add(pane.id);
  });
  const activeId = ids.has(activePaneId) ? activePaneId : records[0].id;
  return {
    activePaneId: activeId,
    panes: records,
  };
}

export function createLayoutRecord({
  activePaneId = DEFAULT_PANE_ID,
  mode = 'single',
  panes = [createDefaultPaneRecord()],
  sync = {},
} = {}) {
  const normalized = normalizePanes(panes, activePaneId);
  return Object.freeze({
    activePaneId: normalized.activePaneId,
    mode: normalizeLayoutMode(mode),
    panes: Object.freeze(normalized.panes.map((pane) => clonePane(pane, normalized.activePaneId))),
    sync: normalizeSyncFlags(sync),
  });
}

export function setLayoutMode(layout, mode) {
  return createLayoutRecord({
    ...layout,
    mode,
  });
}

export function setLayoutActivePane(layout, paneId) {
  const id = normalizePaneId(paneId);
  if (!layout.panes.some((pane) => pane.id === id)) {
    throw new Error(`Layout pane "${id}" does not exist.`);
  }
  return createLayoutRecord({
    ...layout,
    activePaneId: id,
  });
}

export function setLayoutSync(layout, key, value) {
  if (!LAYOUT_SYNC_KEYS.includes(key)) {
    throw new Error(`Unsupported layout sync key: ${key}`);
  }
  return createLayoutRecord({
    ...layout,
    sync: {
      ...layout.sync,
      [key]: Boolean(value),
    },
  });
}
