import {
  DEFAULT_PANE_ID,
  assertPaneRecordShape,
  createDefaultPaneRecord,
  createDefaultPaneRecords,
  createPaneRecord,
} from '../panes/pane-model.js';

export const LAYOUT_MODES = Object.freeze(['single', 'twice', 'triple']);
export const LAYOUT_SYNC_KEYS = Object.freeze(['symbol', 'interval', 'crosshair', 'time', 'dateRange']);
export const LAYOUT_VARIANTS_BY_MODE = Object.freeze({
  single: Object.freeze(['single']),
  triple: Object.freeze(['triple-columns', 'triple-rows', 'triple-right-stack', 'triple-left-stack']),
  twice: Object.freeze(['twice-vertical', 'twice-horizontal']),
});

const DEFAULT_VARIANT_BY_MODE = Object.freeze({
  single: 'single',
  triple: 'triple-columns',
  twice: 'twice-vertical',
});

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

function normalizeLayoutVariant(mode, variant) {
  const normalizedMode = normalizeLayoutMode(mode);
  const fallback = DEFAULT_VARIANT_BY_MODE[normalizedMode];
  const normalized = String(variant || fallback || '').trim();
  if (!LAYOUT_VARIANTS_BY_MODE[normalizedMode].includes(normalized)) {
    throw new Error(`Unsupported layout variant for ${normalizedMode}: ${variant}`);
  }
  return normalized;
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

function normalizePanes(panes = createDefaultPaneRecords(), activePaneId = DEFAULT_PANE_ID) {
  const records = panes.length ? panes.map((pane) => createPaneRecord(pane)) : createDefaultPaneRecords();
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
  panes = createDefaultPaneRecords(),
  sync = {},
  variant = null,
} = {}) {
  const normalizedMode = normalizeLayoutMode(mode);
  const normalized = normalizePanes(panes, activePaneId);
  return Object.freeze({
    activePaneId: normalized.activePaneId,
    mode: normalizedMode,
    panes: Object.freeze(normalized.panes.map((pane) => clonePane(pane, normalized.activePaneId))),
    sync: normalizeSyncFlags(sync),
    variant: normalizeLayoutVariant(normalizedMode, variant),
  });
}

export function setLayoutMode(layout, mode, variant = null) {
  return createLayoutRecord({
    ...layout,
    mode,
    variant,
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
