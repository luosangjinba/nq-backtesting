import * as bus from '../../event-bus.js';
import { DEFAULT_TIMEFRAME, TIMEFRAME_MAP } from '../../config.js';
import * as store from '../../data/bar-store.js';
import { setPrimaryInstrumentCommand, setPrimaryTimeframeCommand } from '../../runtime/commands.js';
import {
  getComparisonWindowState,
  setComparisonInstrument,
  setComparisonTimeframe,
  setComparisonWindowEnabled,
} from '../../comparison/comparison-window-store.js';
import {
  CHART_PANE_IDS,
  CHART_PANE_LAYOUTS,
  getActivePane,
  getChartPaneState,
  getPaneLabel,
  setChartPaneLayout,
  updatePaneDescriptor,
} from '../../chart-panes/chart-pane-store.js';

export function syncPaneStateFromComparison(state = getComparisonWindowState()) {
  const currentLayout = getChartPaneState().layout;
  if (state.enabled && currentLayout === CHART_PANE_LAYOUTS.SINGLE) {
    setChartPaneLayout(CHART_PANE_LAYOUTS.SINGLE_COMPARISON);
  } else if (!state.enabled) {
    setComparisonWindowEnabled(true);
    setChartPaneLayout(CHART_PANE_LAYOUTS.SINGLE_COMPARISON);
    return;
  }
  const descriptor = state.descriptor || {};
  updatePaneDescriptor(CHART_PANE_IDS.COMPARISON, {
    instrument: descriptor.instrument,
    timeframe: descriptor.timeframe,
  });
}

export function syncActivePaneToolbarControls() {
  const activePane = getActivePane();
  const primaryInstrumentSelect = document.getElementById('primaryInstrumentSelect');
  const tfSelect = document.getElementById('tfSelect');
  if (primaryInstrumentSelect) primaryInstrumentSelect.value = activePane.instrument;
  if (tfSelect) tfSelect.value = String(activePane.timeframe);
}

export function applyActivePaneInstrument(nextInstrument, reloadPrimaryRange) {
  const activePane = getActivePane();
  if (activePane.id === CHART_PANE_IDS.COMPARISON) {
    const descriptor = updatePaneDescriptor(CHART_PANE_IDS.COMPARISON, { instrument: nextInstrument });
    setComparisonInstrument(descriptor.instrument);
    bus.emit('status:update', { text: `${getPaneLabel(CHART_PANE_IDS.COMPARISON)} ${descriptor.instrument}`, isError: false });
    syncActivePaneToolbarControls();
    return;
  }

  const instrument = setPrimaryInstrumentCommand({ instrument: nextInstrument });
  bus.emit('status:update', { text: `${getPaneLabel(CHART_PANE_IDS.PRIMARY)} ${instrument}`, isError: false });
  syncActivePaneToolbarControls();
  if (store.getBars().length > 0) {
    reloadPrimaryRange();
  }
}

export function applyActivePaneTimeframe(nextTimeframe, reloadPrimaryRange) {
  const activePane = getActivePane();
  const timeframe = Number(nextTimeframe) || DEFAULT_TIMEFRAME;
  if (activePane.id === CHART_PANE_IDS.COMPARISON) {
    updatePaneDescriptor(CHART_PANE_IDS.COMPARISON, { timeframe });
    setComparisonTimeframe(timeframe);
    bus.emit('status:update', { text: `${getPaneLabel(CHART_PANE_IDS.COMPARISON)} ${TIMEFRAME_MAP[timeframe] || `${timeframe}M`}`, isError: false });
    syncActivePaneToolbarControls();
    return;
  }

  setPrimaryTimeframeCommand({ timeframe });
  syncActivePaneToolbarControls();
  if (store.getBars().length > 0) {
    reloadPrimaryRange();
  }
}
