import * as bus from '../event-bus.js';
import { DEFAULT_TIMEFRAME } from '../config.js';

export const CHART_PANE_IDS = Object.freeze({
  PRIMARY: 'pane-1',
  COMPARISON: 'pane-2',
});

export const CHART_PANE_LAYOUTS = Object.freeze({
  SINGLE: 'single',
  TWO_COLUMN: 'two-column',
});

const DEFAULT_PANES = Object.freeze([
  Object.freeze({
    id: CHART_PANE_IDS.PRIMARY,
    role: 'primary',
    label: 'Pane 1',
    instrument: 'NQ',
    timeframe: DEFAULT_TIMEFRAME,
    active: true,
    syncEnabled: true,
    visibleRange: null,
    layoutSlot: 'single',
  }),
  Object.freeze({
    id: CHART_PANE_IDS.COMPARISON,
    role: 'comparison',
    label: 'Pane 2',
    instrument: 'ES',
    timeframe: DEFAULT_TIMEFRAME,
    active: false,
    syncEnabled: true,
    visibleRange: null,
    layoutSlot: 'right',
  }),
]);

let layout = CHART_PANE_LAYOUTS.SINGLE;
let panes = clonePanes(DEFAULT_PANES);
let activePaneId = CHART_PANE_IDS.PRIMARY;

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

function emitChanged(reason = 'update') {
  bus.emit('chart-panes:changed', getChartPaneState(reason));
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

export function setChartPaneLayout(nextLayout) {
  const normalized = normalizeLayout(nextLayout);
  if (layout === normalized) return getChartPaneState('layout-unchanged');
  layout = normalized;
  panes = panes.map((pane) => ({
    ...pane,
    layoutSlot:
      normalized === CHART_PANE_LAYOUTS.SINGLE
        ? (pane.id === CHART_PANE_IDS.PRIMARY ? 'single' : 'hidden')
        : (pane.id === CHART_PANE_IDS.PRIMARY ? 'left' : 'right'),
  }));
  if (layout === CHART_PANE_LAYOUTS.SINGLE) activePaneId = CHART_PANE_IDS.PRIMARY;
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
  layout = CHART_PANE_LAYOUTS.SINGLE;
  panes = clonePanes(DEFAULT_PANES);
  activePaneId = CHART_PANE_IDS.PRIMARY;
}
