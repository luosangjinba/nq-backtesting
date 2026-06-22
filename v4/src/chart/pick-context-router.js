import * as primaryChart from './chart-manager.js';
import * as secondaryChart from './secondary-chart-manager.js';
import * as primaryStore from '../data/bar-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { findDisplayBarFast } from './display-bar-lookup.js';
import { getBarChartTime as getProjectedBarChartTime } from './time-projection.js';

export const PICK_CONTEXT_TARGETS = Object.freeze({
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  COMPARISON: 'comparison-window',
});

const TARGET_BY_ELEMENT_ID = Object.freeze({
  chart: PICK_CONTEXT_TARGETS.PRIMARY,
  'secondary-chart': PICK_CONTEXT_TARGETS.SECONDARY,
  'comparison-chart-canvas': PICK_CONTEXT_TARGETS.COMPARISON,
  'comparison-chart-view': PICK_CONTEXT_TARGETS.COMPARISON,
});

function getDocumentElement(id) {
  return typeof document === 'undefined' ? null : document.getElementById(id);
}

function normalizeTargetId(value) {
  const id = String(value || '').trim();
  if (id === PICK_CONTEXT_TARGETS.SECONDARY) return PICK_CONTEXT_TARGETS.SECONDARY;
  if (id === PICK_CONTEXT_TARGETS.COMPARISON) return PICK_CONTEXT_TARGETS.COMPARISON;
  return PICK_CONTEXT_TARGETS.PRIMARY;
}

function getElementId(element) {
  if (!element) return '';
  if (element.id) return element.id;
  return element.closest?.('[id]')?.id || '';
}

function targetIdFromEvent(eventOrTarget) {
  if (typeof eventOrTarget === 'string') return normalizeTargetId(eventOrTarget);
  const element = eventOrTarget?.currentTarget || eventOrTarget?.target || null;
  const elementId = getElementId(element);
  return TARGET_BY_ELEMENT_ID[elementId] || normalizeTargetId(elementId);
}

function createContext(definition, chartId) {
  if (!definition) return null;
  const getTimeframe = () => Number(definition.timeframe?.()) || null;
  const getDisplayBars = () => {
    const bars = definition.getDisplayBars?.();
    return Array.isArray(bars) ? bars : [];
  };
  return {
    chartId,
    chartEl: definition.chartEl?.() || null,
    label: definition.label || chartId,
    timeframe: getTimeframe,
    getDisplayBars,
    coordinateToTime: (x) => definition.coordinateToTime?.(x) ?? null,
    getBarChartTime: (bar) => getProjectedBarChartTime(bar, getTimeframe()),
    findBar: (chartTime) => findDisplayBarFast(getDisplayBars(), chartTime, getTimeframe()),
    showPreviewCursor: (time) => definition.showPreviewCursor?.(time),
    hidePreviewCursor: () => definition.hidePreviewCursor?.(),
    isEnabled: () => Boolean(definition.isEnabled?.()),
  };
}

function defaultDefinitions() {
  return {
    [PICK_CONTEXT_TARGETS.PRIMARY]: {
      label: 'primary',
      chartEl: () => getDocumentElement('chart'),
      timeframe: primaryStore.getCurrentTimeframe,
      getDisplayBars: primaryStore.getDisplayBars,
      coordinateToTime: primaryChart.coordinateToTime,
      showPreviewCursor: primaryChart.showPickPreviewCursor,
      hidePreviewCursor: primaryChart.hidePickPreviewCursor,
      isEnabled: () => Boolean(primaryChart.getChart() && primaryChart.getSeries() && primaryStore.getDisplayBars().length),
    },
    [PICK_CONTEXT_TARGETS.SECONDARY]: {
      label: 'secondary',
      chartEl: () => getDocumentElement('secondary-chart'),
      timeframe: secondaryStore.getSecondaryTimeframe,
      getDisplayBars: secondaryStore.getSecondaryDisplayBars,
      coordinateToTime: (x) => secondaryChart.getSecondaryChart()?.timeScale?.().coordinateToTime(x) ?? null,
      showPreviewCursor: secondaryChart.showSecondaryPickPreviewCursor,
      hidePreviewCursor: secondaryChart.hideSecondaryPickPreviewCursor,
      isEnabled: () => Boolean(
        secondaryStore.isSecondaryEnabled() &&
        secondaryChart.getSecondaryChart() &&
        secondaryChart.getSecondarySeries() &&
        secondaryStore.getSecondaryDisplayBars().length
      ),
    },
  };
}

export function createPickContextRouter(definitions = defaultDefinitions()) {
  function getPickContextById(chartId) {
    const targetId = normalizeTargetId(chartId);
    return createContext(definitions[targetId], targetId);
  }

  function getPickContext(chartIdOrEvent) {
    return getPickContextById(targetIdFromEvent(chartIdOrEvent));
  }

  function getPickContextFromCrosshairSource(source = PICK_CONTEXT_TARGETS.PRIMARY) {
    return getPickContextById(normalizeTargetId(source));
  }

  function clearOtherPickPreviewCursors(activeChartId) {
    const activeTarget = normalizeTargetId(activeChartId);
    Object.entries(definitions).forEach(([chartId, definition]) => {
      if (chartId !== activeTarget) definition.hidePreviewCursor?.();
    });
  }

  function clearAllPickPreviewCursors() {
    Object.values(definitions).forEach((definition) => definition.hidePreviewCursor?.());
  }

  return {
    getPickContext,
    getPickContextById,
    getPickContextFromCrosshairSource,
    clearOtherPickPreviewCursors,
    clearAllPickPreviewCursors,
  };
}

const defaultRouter = createPickContextRouter();

export function getPickContext(chartIdOrEvent) {
  return defaultRouter.getPickContext(chartIdOrEvent);
}

export function getPickContextById(chartId) {
  return defaultRouter.getPickContextById(chartId);
}

export function getPickContextFromCrosshairSource(source) {
  return defaultRouter.getPickContextFromCrosshairSource(source);
}

export function clearOtherPickPreviewCursors(activeChartId) {
  return defaultRouter.clearOtherPickPreviewCursors(activeChartId);
}

export function clearAllPickPreviewCursors() {
  return defaultRouter.clearAllPickPreviewCursors();
}

export function findBarByChartTime(context, chartTime) {
  return context?.findBar?.(chartTime) || null;
}
