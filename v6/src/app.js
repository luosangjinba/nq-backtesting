import { renderAppShell } from './shell/app-shell.js';
import { createRuntimeRegistry } from './runtime/lifecycle.js';
import { createCoreRuntimeContributions } from './runtime/core-runtime-manifest.js';
import { dispatchCommand } from './runtime/commands.js';
import { emitEvent, subscribeEvent } from './runtime/events.js';
import { connectChartDataSurfaceBridge } from './chart-engine/chart-data-surface-bridge.js';
import { connectChartViewportSurfaceBridge } from './chart-engine/chart-viewport-surface-bridge.js';
import { connectLayoutSyncSurfaceBridge } from './chart-engine/layout-sync-surface-bridge.js';
import { connectLayoutSurfaceBridge } from './chart-engine/layout-surface-bridge.js';
import { connectMaximizeRestoreControl } from './chart-engine/maximize-restore-control-bridge.js';
import { connectManualWallInputBridge } from './chart-engine/manual-wall-input-bridge.js';
import { connectPaneActiveSurfaceBridge } from './chart-engine/pane-active-surface-bridge.js';
import { connectResetViewControl } from './chart-engine/reset-view-control-bridge.js';
import { mountWorkstationChartSurface } from './chart-engine/workstation-chart-surface.js';
import { connectLeftwardHistoryInputBridge } from './chart-history/leftward-history-input-bridge.js';
import { createSessionMetadataStorage } from './session/session-metadata-storage.js';
import { createInMemorySessionRepository } from './session/session-repository.js';
import { mountDisplayTimeframeControl } from './shell/display-timeframe-control.js';
import { connectDisplayTimeframePaneTargetBridge } from './shell/display-timeframe-pane-target-bridge.js';
import { mountJournalSurface } from './shell/journal-surface.js';
import { createJournalRowActionAdapter } from './shell/journal-row-action-adapter.js';
import { mountLayoutMenuControl } from './shell/layout-menu-control.js';
import { mountPaneStatusReadout } from './shell/pane-status-readout.js';
import { mountReadinessSurface } from './shell/readiness-surface.js';
import { mountReplayWorkflowSurface } from './shell/replay-workflow-surface.js';
import { mountReplayTransport } from './shell/replay-transport.js';
import { mountReplayNavigationControl } from './shell/replay-navigation-control.js';
import { createReplayTransportPositionPreference } from './shell/replay-transport-position-preference.js';
import { createReplayNavigationPreferencesStorage } from './replay-navigation/replay-navigation-preferences-storage.js';
import { mountSessionDashboard } from './shell/session-dashboard.js';
import { mountSettingsPanel } from './shell/settings-panel.js';
import { mountSessionsSurface } from './shell/sessions-surface.js';
import { mountStatusReadout } from './shell/status-readout.js';
import { connectTopSymbolActivePaneBridge } from './shell/top-symbol-active-pane-bridge.js';
import { createWorkflowPanelCoordinator } from './shell/workflow-panel-coordinator.js';

const root = document.querySelector('[data-v6-root]');

if (!root) {
  throw new Error('V6 root element is missing.');
}

renderAppShell(root);
const registry = createRuntimeRegistry();
const sessionRepository = createInMemorySessionRepository({
  metadataStore: createSessionMetadataStorage(),
});
const replayNavigationPreferencesStorage = createReplayNavigationPreferencesStorage();
createCoreRuntimeContributions({
  dispatchCommand,
  replayNavigationPreferencesStorage,
  sessionRepository,
  subscribeEvent,
})
  .forEach((runtime) => registry.registerRuntime(runtime));
await registry.start({ root, emitEvent, subscribeEvent });
const workflowPanelCoordinator = createWorkflowPanelCoordinator();
const workstationChartSurface = mountWorkstationChartSurface(root, { emitEvent });
const chartDataSurfaceBridge = connectChartDataSurfaceBridge({
  chartSurface: workstationChartSurface,
  subscribeEvent,
});
const chartViewportSurfaceBridge = connectChartViewportSurfaceBridge({
  chartSurface: workstationChartSurface,
  subscribeEvent,
});
const layoutSurfaceBridge = connectLayoutSurfaceBridge({
  chartSurface: workstationChartSurface,
  subscribeEvent,
});
const layoutSyncSurfaceBridge = connectLayoutSyncSurfaceBridge({
  chartSurface: workstationChartSurface,
  subscribeEvent,
});
const manualWallInputBridge = connectManualWallInputBridge({
  chartSurface: workstationChartSurface,
});
const leftwardHistoryInputBridge = connectLeftwardHistoryInputBridge({
  chartSurface: workstationChartSurface,
  subscribeEvent,
});
const paneActiveSurfaceBridge = connectPaneActiveSurfaceBridge({
  chartSurface: workstationChartSurface,
});
const layoutMenuControl = mountLayoutMenuControl(root);
const paneStatusReadout = mountPaneStatusReadout(root);
const maximizeRestoreControls = [...root.querySelectorAll('[data-v6-chart-maximize-restore]')]
  .map((button) => connectMaximizeRestoreControl({
    button,
    chartSurface: workstationChartSurface,
    paneId: button.dataset.v6ChartMaximizePaneId,
  }));
const maximizeRestoreControl = {
  controls: maximizeRestoreControls,
  destroy() {
    maximizeRestoreControls.forEach((control) => control.destroy());
  },
};
const resetViewControls = [...root.querySelectorAll('[data-v6-reset-view]')]
  .map((button) => connectResetViewControl({
    button,
    chartSurface: workstationChartSurface,
    paneId: button.dataset.v6ResetPaneId,
  }));
const resetViewControl = {
  controls: resetViewControls,
  destroy() {
    resetViewControls.forEach((control) => control.destroy());
  },
  resetView(payload = {}) {
    const paneId = String(payload.paneId || 'main');
    const control = resetViewControls.find((candidate) => candidate.paneId === paneId) || resetViewControls[0];
    return control?.resetView() ?? null;
  },
};
const displayTimeframeControl = mountDisplayTimeframeControl(root);
const displayTimeframePaneTargetBridge = connectDisplayTimeframePaneTargetBridge({
  displayTimeframeControl,
});
const topSymbolActivePaneBridge = connectTopSymbolActivePaneBridge({
  symbolElement: root.querySelector('[data-v6-top-symbol]'),
});
const journalSurface = mountJournalSurface(root, {
  onOpen: () => workflowPanelCoordinator.closeOthers('journal'),
});
const journalRowAction = createJournalRowActionAdapter({
  journalSurface,
  onOpen: () => workflowPanelCoordinator.closeOthers('journal'),
});
const readinessSurface = mountReadinessSurface(root, { registry });
const replayWorkflowSurface = mountReplayWorkflowSurface(root, {
  onOpen: () => workflowPanelCoordinator.closeOthers('replay'),
});
const replayTransport = mountReplayTransport(root.querySelector('[data-v6-transport]'), {
  getVisiblePaneIds: () => workstationChartSurface.getState().layout.visiblePaneIds,
  positionPreference: createReplayTransportPositionPreference(),
});
const replayNavigationControl = mountReplayNavigationControl(root, {
  getVisiblePaneIds: () => workstationChartSurface.getState().layout.visiblePaneIds,
});
const sessionDashboard = mountSessionDashboard(root, {
  journalRowAction,
});
const settingsPanel = mountSettingsPanel(root, {
  onOpen: () => workflowPanelCoordinator.closeOthers('settings'),
});
const sessionsSurface = mountSessionsSurface(root, {
  onOpen: () => workflowPanelCoordinator.closeOthers('sessions'),
});
workflowPanelCoordinator.register('journal', journalSurface);
workflowPanelCoordinator.register('replay', replayWorkflowSurface);
workflowPanelCoordinator.register('settings', settingsPanel);
workflowPanelCoordinator.register('sessions', sessionsSurface);
const statusReadout = mountStatusReadout(root);
root.__v6DisplayTimeframeControl = displayTimeframeControl;
root.__v6DisplayTimeframePaneTargetBridge = displayTimeframePaneTargetBridge;
root.__v6TopSymbolActivePaneBridge = topSymbolActivePaneBridge;
root.__v6JournalSurface = journalSurface;
root.__v6JournalRowAction = journalRowAction;
root.__v6LayoutMenuControl = layoutMenuControl;
root.__v6PaneStatusReadout = paneStatusReadout;
root.__v6ReadinessSurface = readinessSurface;
root.__v6ReplayWorkflowSurface = replayWorkflowSurface;
root.__v6RuntimeRegistry = registry;
root.__v6ReplayTransport = replayTransport;
root.__v6ReplayNavigationControl = replayNavigationControl;
root.__v6SessionDashboard = sessionDashboard;
root.__v6SettingsPanel = settingsPanel;
root.__v6SessionsSurface = sessionsSurface;
root.__v6StatusReadout = statusReadout;
root.__v6WorkstationChartSurface = workstationChartSurface;
root.__v6ChartDataSurfaceBridge = chartDataSurfaceBridge;
root.__v6ChartViewportSurfaceBridge = chartViewportSurfaceBridge;
root.__v6LayoutSyncSurfaceBridge = layoutSyncSurfaceBridge;
root.__v6LayoutSurfaceBridge = layoutSurfaceBridge;
root.__v6LeftwardHistoryInputBridge = leftwardHistoryInputBridge;
root.__v6ManualWallInputBridge = manualWallInputBridge;
root.__v6MaximizeRestoreControl = maximizeRestoreControl;
root.__v6PaneActiveSurfaceBridge = paneActiveSurfaceBridge;
root.__v6ResetViewControl = resetViewControl;
root.dataset.booted = 'true';
