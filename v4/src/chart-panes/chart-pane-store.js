import * as bus from '../event-bus.js';
import { DEFAULT_TIMEFRAME } from '../config.js';

export const CHART_PANE_IDS = Object.freeze({
  PRIMARY: 'pane-1',
  COMPARISON: 'pane-2',
});

export const CHART_PANE_LAYOUTS = Object.freeze({
  SINGLE: 'single',
  SINGLE_COMPARISON: 'single-comparison',
  TWO_COLUMN: 'two-column',
});

const PANE_LABELS_STORAGE_KEY = 'v4:chart-pane-labels';

const DEFAULT_PANES = Object.freeze([
  Object.freeze({
    id: CHART_PANE_IDS.PRIMARY,
    role: 'primary',
    label: 'Pane 2',
    instrument: 'NQ',
    timeframe: DEFAULT_TIMEFRAME,
    active: false,
    syncEnabled: true,
    visibleRange: null,
    layoutSlot: 'hidden',
  }),
  Object.freeze({
    id: CHART_PANE_IDS.COMPARISON,
    role: 'comparison',
    label: 'Pane 1',
    instrument: 'NQ',
    timeframe: DEFAULT_TIMEFRAME,
    active: true,
    syncEnabled: true,
    visibleRange: null,
    layoutSlot: 'single',
  }),
]);

let layout = CHART_PANE_LAYOUTS.SINGLE_COMPARISON;
let panes = applyStoredPaneLabels(clonePanes(DEFAULT_PANES));
let activePaneId = CHART_PANE_IDS.COMPARISON;

function clonePane(pane) {
  return {
    ...pane,
    visibleRange: pane.visibleRange ? { ...pane.visibleRange } : null,
  };
}

function clonePanes(source) {
  return source.map(clonePane);
}

function normalizeLayout(value) {
  return Object.values(CHART_PANE_LAYOUTS).includes(value) ? value : CHART_PANE_LAYOUTS.SINGLE;
}

function normalizePaneId(paneId) {
  return panes.some((pane) => pane.id === paneId) ? paneId : activePaneId;
}

function normalizeTimeframe(value, fallback = DEFAULT_TIMEFRAME) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizePaneLabel(value, fallback = '') {
  const label = String(value ?? '').trim();
  return label ? label.slice(0, 24) : fallback;
}

function readStoredPaneLabels() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PANE_LABELS_STORAGE_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    if (parsed[CHART_PANE_IDS.PRIMARY] === 'Pane 1' && parsed[CHART_PANE_IDS.COMPARISON] === 'Pane 2') {
      return {
        ...parsed,
        [CHART_PANE_IDS.PRIMARY]: 'Pane 2',
        [CHART_PANE_IDS.COMPARISON]: 'Pane 1',
      };
    }
    return parsed;
  } catch {
    return {};
  }
}

function persistPaneLabels() {
  try {
    localStorage.setItem(
      PANE_LABELS_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(panes.map((pane) => [pane.id, pane.label])))
    );
  } catch {
    // Storage can be unavailable in private/sandboxed contexts; labels remain in memory.
  }
}

function applyStoredPaneLabels(source) {
  const labels = readStoredPaneLabels();
  return source.map((pane) => ({
    ...pane,
    label: normalizePaneLabel(labels[pane.id], pane.label),
  }));
}

function emitChanged(reason = 'update') {
  bus.emit('chart-panes:changed', getChartPaneState(reason));
}

function rangesEqual(left, right) {
  return (
    Number(left?.from) === Number(right?.from) &&
    Number(left?.to) === Number(right?.to)
  );
}

export function getChartPaneState(reason = 'snapshot') {
  return {
    reason,
    layout,
    activePaneId,
    panes: clonePanes(panes),
  };
}

export function getChartPanes() {
  return clonePanes(panes);
}

export function getActivePaneId() {
  return activePaneId;
}

export function getActivePane() {
  return clonePane(panes.find((pane) => pane.id === activePaneId) || panes[0]);
}

export function getPaneById(paneId) {
  const pane = panes.find((candidate) => candidate.id === paneId);
  return pane ? clonePane(pane) : null;
}

export function getPaneLabel(paneId) {
  return getPaneById(paneId)?.label || String(paneId || '');
}

export function setChartPaneLayout(nextLayout) {
  const normalized = normalizeLayout(nextLayout);
  if (layout === normalized) return getChartPaneState('layout-unchanged');
  layout = normalized;
  panes = panes.map((pane) => ({
    ...pane,
    layoutSlot:
      normalized === CHART_PANE_LAYOUTS.TWO_COLUMN
        ? (pane.id === CHART_PANE_IDS.PRIMARY ? 'left' : 'right')
        : normalized === CHART_PANE_LAYOUTS.SINGLE_COMPARISON
          ? (pane.id === CHART_PANE_IDS.COMPARISON ? 'single' : 'hidden')
          : (pane.id === CHART_PANE_IDS.COMPARISON ? 'single' : 'hidden'),
  }));
  if (layout === CHART_PANE_LAYOUTS.SINGLE) activePaneId = CHART_PANE_IDS.COMPARISON;
  if (layout === CHART_PANE_LAYOUTS.SINGLE_COMPARISON) activePaneId = CHART_PANE_IDS.COMPARISON;
  panes = panes.map((pane) => ({ ...pane, active: pane.id === activePaneId }));
  emitChanged('layout');
  return getChartPaneState('layout');
}

export function setActivePane(paneId) {
  const normalized = normalizePaneId(paneId);
  if (activePaneId === normalized) return getActivePane();
  activePaneId = normalized;
  panes = panes.map((pane) => ({ ...pane, active: pane.id === activePaneId }));
  emitChanged('active');
  return getActivePane();
}

export function updatePaneDescriptor(paneId, patch = {}) {
  const normalized = normalizePaneId(paneId);
  panes = panes.map((pane) => {
    if (pane.id !== normalized) return pane;
    return {
      ...pane,
      instrument: patch.instrument ? String(patch.instrument).trim().toUpperCase() : pane.instrument,
      timeframe: patch.timeframe ? normalizeTimeframe(patch.timeframe, pane.timeframe) : pane.timeframe,
      visibleRange: patch.visibleRange === undefined
        ? pane.visibleRange
        : (patch.visibleRange ? { ...patch.visibleRange } : null),
    };
  });
  emitChanged('descriptor');
  return getPaneById(normalized);
}

export function updatePaneVisibleRange(paneId, visibleRange = null) {
  const normalized = normalizePaneId(paneId);
  let updated = null;
  panes = panes.map((pane) => {
    if (pane.id !== normalized) return pane;
    const nextRange = visibleRange ? { ...visibleRange } : null;
    if (rangesEqual(pane.visibleRange, nextRange)) {
      updated = pane;
      return pane;
    }
    updated = {
      ...pane,
      visibleRange: nextRange,
    };
    return updated;
  });
  return updated ? clonePane(updated) : getPaneById(normalized);
}

export function setPaneLabel(paneId, label) {
  const normalized = normalizePaneId(paneId);
  let updated = null;
  panes = panes.map((pane) => {
    if (pane.id !== normalized) return pane;
    updated = {
      ...pane,
      label: normalizePaneLabel(label, pane.label),
    };
    return updated;
  });
  persistPaneLabels();
  emitChanged('label');
  return updated ? clonePane(updated) : getPaneById(normalized);
}

export function setPaneSyncEnabled(paneId, enabled) {
  const normalized = normalizePaneId(paneId);
  panes = panes.map((pane) => (
    pane.id === normalized ? { ...pane, syncEnabled: Boolean(enabled) } : pane
  ));
  emitChanged('sync');
  return getPaneById(normalized);
}

export function togglePaneSync(paneId) {
  const pane = getPaneById(paneId);
  if (!pane) return null;
  return setPaneSyncEnabled(pane.id, !pane.syncEnabled);
}

export function getSyncPeerPanes(sourcePaneId) {
  const source = panes.find((pane) => pane.id === sourcePaneId);
  if (!source?.syncEnabled) return [];
  return clonePanes(panes.filter((pane) => pane.id !== sourcePaneId && pane.syncEnabled));
}

export function resetChartPaneStoreForTests() {
  layout = CHART_PANE_LAYOUTS.SINGLE_COMPARISON;
  panes = clonePanes(DEFAULT_PANES);
  activePaneId = CHART_PANE_IDS.COMPARISON;
}
