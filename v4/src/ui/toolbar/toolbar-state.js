import { isGridVisible } from '../../chart/grid-visibility.js';
import {
  CHART_PANE_IDS,
  getActivePane,
  getChartPaneState,
  getPaneLabel,
} from '../../chart-panes/chart-pane-store.js';
import { isComparisonWindowEnabled } from '../../comparison/comparison-window-store.js';
import { getDisplayMode } from '../../display/display-mode.js';
import { getDisplayPreferences } from '../../display/display-preferences.js';
import { getTimeOverlaySettings } from '../../time-overlays/time-overlay-store.js';

export function getToolbarRenderState() {
  return {
    activePane: getActivePane(),
    comparisonEnabled: isComparisonWindowEnabled(),
    displayMode: getDisplayMode(),
    gridVisible: isGridVisible(),
    layout: getChartPaneState().layout,
    preferences: getDisplayPreferences(),
    primaryLabel: getPaneLabel(CHART_PANE_IDS.PRIMARY),
    comparisonLabel: getPaneLabel(CHART_PANE_IDS.COMPARISON),
    timeOverlaySettings: getTimeOverlaySettings(),
  };
}

export function getToolbarSettingsState() {
  return {
    preferences: getDisplayPreferences(),
  };
}
