import { createChartEntryAutoPlayRuntime } from '../chart-entry/chart-entry-auto-play-runtime.js';
import { createChartEntryDefaultWallPlanRuntime } from '../chart-entry/chart-entry-default-wall-plan-runtime.js';
import { createChartEntryManualNextRuntime } from '../chart-entry/chart-entry-manual-next-runtime.js';
import { createChartEntryManualPreviousRuntime } from '../chart-entry/chart-entry-manual-previous-runtime.js';
import { createChartEntryProjectionApplyRuntime } from '../chart-entry/chart-entry-projection-apply-runtime.js';
import { createChartEntryProjectionPreparationRuntime } from '../chart-entry/chart-entry-projection-preparation-runtime.js';
import { createChartEntryReplayBootstrapRuntime } from '../chart-entry/chart-entry-replay-bootstrap-runtime.js';
import { createChartEntryRestartRuntime } from '../chart-entry/chart-entry-restart-runtime.js';
import { createLeftwardHistoryExtensionRuntime } from '../chart-history/leftward-history-extension-runtime.js';
import { createChartViewportRuntime } from '../chart-viewport/chart-viewport-runtime.js';
import { createDefaultWallRuntime } from '../default-wall/default-wall-runtime.js';
import { createDisplayTimeframeRuntime } from '../display-timeframe/display-timeframe-runtime.js';
import { createPaneIntentReloadChartDataRuntime } from '../pane-intent-reload/pane-intent-reload-chart-data-runtime.js';
import { createPaneIntentReloadDataRuntime } from '../pane-intent-reload/pane-intent-reload-data-runtime.js';
import { createPaneIntentReloadViewportRuntime } from '../pane-intent-reload/pane-intent-reload-viewport-runtime.js';
import { createPaneIntentReloadWindowRuntime } from '../pane-intent-reload/pane-intent-reload-window-runtime.js';
import { createPlaybackPeriodRuntime } from '../playback-period/playback-period-runtime.js';
import { createReplayCoordinationMaterializationRuntimeHandoff } from '../replay/replay-coordination-materialization-runtime-handoff.js';
import { createReplayRuntime } from '../replay/replay-runtime.js';
import { createTargetMaterializationReplayDiagnosticsRuntime } from '../replay/target-materialization-replay-diagnostics-runtime.js';
import { createReplayNavigationPreferencesRuntime } from '../replay-navigation/replay-navigation-preferences-runtime.js';
import { createReplayNavigationRuntime } from '../replay-navigation/replay-navigation-runtime.js';

export function createReplayPipelineRuntimeContributions({
  dispatchCommand,
  replayNavigationPreferencesStorage,
  subscribeEvent,
} = {}) {
  return Object.freeze([
    createReplayRuntime({ enableInternalTimer: false }),
    createReplayNavigationPreferencesRuntime({ storage: replayNavigationPreferencesStorage }),
    createReplayNavigationRuntime({ dispatchCommand }),
    createTargetMaterializationReplayDiagnosticsRuntime(),
    createPaneIntentReloadWindowRuntime(),
    createPaneIntentReloadDataRuntime(),
    createPaneIntentReloadChartDataRuntime(),
    createPaneIntentReloadViewportRuntime(),
    createChartEntryReplayBootstrapRuntime(),
    createChartEntryDefaultWallPlanRuntime(),
    createChartEntryProjectionPreparationRuntime(),
    createChartViewportRuntime(),
    createChartEntryProjectionApplyRuntime(),
    createChartEntryManualNextRuntime(),
    createReplayCoordinationMaterializationRuntimeHandoff({ dispatchCommand, subscribeEvent }),
    createChartEntryManualPreviousRuntime(),
    createChartEntryAutoPlayRuntime(),
    createChartEntryRestartRuntime(),
    createLeftwardHistoryExtensionRuntime(),
    createDefaultWallRuntime(),
    createDisplayTimeframeRuntime(),
    createPlaybackPeriodRuntime(),
  ]);
}
