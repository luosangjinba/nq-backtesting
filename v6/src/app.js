import { renderAppShell } from './shell/app-shell.js';
import { createAppRuntime } from './runtime/app-runtime.js';
import { createRuntimeRegistry } from './runtime/lifecycle.js';
import { emitEvent, subscribeEvent } from './runtime/events.js';
import { createBarDataRuntime } from './bar-data/bar-data-runtime.js';
import { createChartDataRuntime } from './chart-data/chart-data-runtime.js';
import { createChartEntryAutoPlayRuntime } from './chart-entry/chart-entry-auto-play-runtime.js';
import { createChartEntryContextRuntime } from './chart-entry/chart-entry-context-runtime.js';
import { createChartEntryDefaultWallPlanRuntime } from './chart-entry/chart-entry-default-wall-plan-runtime.js';
import { createChartEntryInitializationRuntime } from './chart-entry/chart-entry-initialization-runtime.js';
import { createChartEntryManualNextRuntime } from './chart-entry/chart-entry-manual-next-runtime.js';
import { createChartEntryProjectionApplyRuntime } from './chart-entry/chart-entry-projection-apply-runtime.js';
import { createChartEntryProjectionPreparationRuntime } from './chart-entry/chart-entry-projection-preparation-runtime.js';
import { createChartEntryReplayBootstrapRuntime } from './chart-entry/chart-entry-replay-bootstrap-runtime.js';
import { createChartEntryRestartRuntime } from './chart-entry/chart-entry-restart-runtime.js';
import { createChartEntryRuntime } from './chart-entry/chart-entry-runtime.js';
import { connectChartDataSurfaceBridge } from './chart-engine/chart-data-surface-bridge.js';
import { connectChartViewportSurfaceBridge } from './chart-engine/chart-viewport-surface-bridge.js';
import { connectLayoutSyncSurfaceBridge } from './chart-engine/layout-sync-surface-bridge.js';
import { connectLayoutSurfaceBridge } from './chart-engine/layout-surface-bridge.js';
import { connectManualWallInputBridge } from './chart-engine/manual-wall-input-bridge.js';
import { connectResetViewControl } from './chart-engine/reset-view-control-bridge.js';
import { mountWorkstationChartSurface } from './chart-engine/workstation-chart-surface.js';
import { connectLeftwardHistoryInputBridge } from './chart-history/leftward-history-input-bridge.js';
import { createLeftwardHistoryExtensionRuntime } from './chart-history/leftward-history-extension-runtime.js';
import { createChartViewportRuntime } from './chart-viewport/chart-viewport-runtime.js';
import { createDisplayTimeframeRuntime } from './display-timeframe/display-timeframe-runtime.js';
import { createDefaultWallRuntime } from './default-wall/default-wall-runtime.js';
import { createJournalPersistenceRuntime } from './journal-persistence/journal-persistence-runtime.js';
import { createLayoutPaneBootstrapRuntime } from './layout/layout-pane-bootstrap-runtime.js';
import { createLayoutRuntime } from './layout/layout-runtime.js';
import { createJournalRuntime } from './journal/journal-runtime.js';
import { createPaneRuntime } from './panes/pane-runtime.js';
import { createPlaybackPeriodRuntime } from './playback-period/playback-period-runtime.js';
import { createPersistenceRuntime } from './persistence/persistence-runtime.js';
import { createReplayRuntime } from './replay/replay-runtime.js';
import { createSessionMetadataStorage } from './session/session-metadata-storage.js';
import { createInMemorySessionRepository } from './session/session-repository.js';
import { createSessionRuntime } from './session/session-runtime.js';
import { createSettingsRuntime } from './settings/settings-runtime.js';
import { mountDisplayTimeframeControl } from './shell/display-timeframe-control.js';
import { mountJournalSurface } from './shell/journal-surface.js';
import { createJournalRowActionAdapter } from './shell/journal-row-action-adapter.js';
import { mountLayoutMenuControl } from './shell/layout-menu-control.js';
import { mountReadinessSurface } from './shell/readiness-surface.js';
import { mountReplayWorkflowSurface } from './shell/replay-workflow-surface.js';
import { mountReplayTransport } from './shell/replay-transport.js';
import { createReplayTransportPositionPreference } from './shell/replay-transport-position-preference.js';
import { mountSessionDashboard } from './shell/session-dashboard.js';
import { mountSettingsPanel } from './shell/settings-panel.js';
import { mountSessionsSurface } from './shell/sessions-surface.js';
import { mountStatusReadout } from './shell/status-readout.js';
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
registry.registerRuntime(createAppRuntime());
registry.registerRuntime(createSessionRuntime({ repository: sessionRepository }));
registry.registerRuntime(createSettingsRuntime());
registry.registerRuntime(createPersistenceRuntime());
registry.registerRuntime(createJournalRuntime());
registry.registerRuntime(createJournalPersistenceRuntime());
registry.registerRuntime(createPaneRuntime());
registry.registerRuntime(createLayoutRuntime());
registry.registerRuntime(createLayoutPaneBootstrapRuntime());
registry.registerRuntime(createBarDataRuntime());
registry.registerRuntime(createChartDataRuntime());
registry.registerRuntime(createChartEntryRuntime());
registry.registerRuntime(createChartEntryInitializationRuntime());
registry.registerRuntime(createChartEntryContextRuntime());
registry.registerRuntime(createReplayRuntime({ enableInternalTimer: false }));
registry.registerRuntime(createChartEntryReplayBootstrapRuntime());
registry.registerRuntime(createChartEntryDefaultWallPlanRuntime());
registry.registerRuntime(createChartEntryProjectionPreparationRuntime());
registry.registerRuntime(createChartViewportRuntime());
registry.registerRuntime(createChartEntryProjectionApplyRuntime());
registry.registerRuntime(createChartEntryManualNextRuntime());
registry.registerRuntime(createChartEntryAutoPlayRuntime());
registry.registerRuntime(createChartEntryRestartRuntime());
registry.registerRuntime(createLeftwardHistoryExtensionRuntime());
registry.registerRuntime(createDefaultWallRuntime());
registry.registerRuntime(createDisplayTimeframeRuntime());
registry.registerRuntime(createPlaybackPeriodRuntime());
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
});
const layoutMenuControl = mountLayoutMenuControl(root);
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
  positionPreference: createReplayTransportPositionPreference(),
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
root.__v6JournalSurface = journalSurface;
root.__v6JournalRowAction = journalRowAction;
root.__v6LayoutMenuControl = layoutMenuControl;
root.__v6ReadinessSurface = readinessSurface;
root.__v6ReplayWorkflowSurface = replayWorkflowSurface;
root.__v6RuntimeRegistry = registry;
root.__v6ReplayTransport = replayTransport;
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
root.__v6ResetViewControl = resetViewControl;
root.dataset.booted = 'true';
