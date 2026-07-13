import { createAppRuntime } from './app-runtime.js';
import { createBarDataRuntime } from '../bar-data/bar-data-runtime.js';
import { createChartBoundaryMetadataRuntime } from '../chart-boundary-metadata/chart-boundary-metadata-runtime.js';
import { createChartDataRuntime } from '../chart-data/chart-data-runtime.js';
import { createChartDataProjectionRuntime } from '../chart-data-projection/chart-data-projection-runtime.js';
import { createChartEntryAutoPlayRuntime } from '../chart-entry/chart-entry-auto-play-runtime.js';
import { createChartEntryContextRuntime } from '../chart-entry/chart-entry-context-runtime.js';
import { createChartEntryDefaultWallPlanRuntime } from '../chart-entry/chart-entry-default-wall-plan-runtime.js';
import { createChartEntryInitializationRuntime } from '../chart-entry/chart-entry-initialization-runtime.js';
import { createChartEntryManualNextRuntime } from '../chart-entry/chart-entry-manual-next-runtime.js';
import { createChartEntryManualPreviousRuntime } from '../chart-entry/chart-entry-manual-previous-runtime.js';
import { createChartEntryProjectionApplyRuntime } from '../chart-entry/chart-entry-projection-apply-runtime.js';
import { createChartEntryProjectionPreparationRuntime } from '../chart-entry/chart-entry-projection-preparation-runtime.js';
import { createChartEntryReplayBootstrapRuntime } from '../chart-entry/chart-entry-replay-bootstrap-runtime.js';
import { createChartEntryRestartRuntime } from '../chart-entry/chart-entry-restart-runtime.js';
import { createChartEntryRuntime } from '../chart-entry/chart-entry-runtime.js';
import { createLeftwardHistoryExtensionRuntime } from '../chart-history/leftward-history-extension-runtime.js';
import { LEFTWARD_MAX_SOURCE_BAR_LIMIT } from '../chart-history/leftward-source-window-policy.js';
import { createChartViewportRuntime } from '../chart-viewport/chart-viewport-runtime.js';
import { createDefaultWallRuntime } from '../default-wall/default-wall-runtime.js';
import { createDisplayTimeframeRuntime } from '../display-timeframe/display-timeframe-runtime.js';
import { createJournalRuntime } from '../journal/journal-runtime.js';
import { createJournalPersistenceRuntime } from '../journal-persistence/journal-persistence-runtime.js';
import { createLayoutPaneBootstrapRuntime } from '../layout/layout-pane-bootstrap-runtime.js';
import { createLayoutRuntime } from '../layout/layout-runtime.js';
import { createPaneIntentReloadChartDataRuntime } from '../pane-intent-reload/pane-intent-reload-chart-data-runtime.js';
import { createPaneIntentReloadDataRuntime } from '../pane-intent-reload/pane-intent-reload-data-runtime.js';
import { createPaneIntentReloadRuntime } from '../pane-intent-reload/pane-intent-reload-runtime.js';
import { createPaneIntentReloadViewportRuntime } from '../pane-intent-reload/pane-intent-reload-viewport-runtime.js';
import { createPaneIntentReloadWindowRuntime } from '../pane-intent-reload/pane-intent-reload-window-runtime.js';
import { createPaneIntentSyncRuntime } from '../pane-intent-sync/pane-intent-sync-runtime.js';
import { createPaneRuntime } from '../panes/pane-runtime.js';
import { createPersistenceRuntime } from '../persistence/persistence-runtime.js';
import { createPersistenceRepository } from '../persistence/persistence-repository.js';
import { createPlaybackPeriodRuntime } from '../playback-period/playback-period-runtime.js';
import { createReplayCoordinationMaterializationRuntimeHandoff } from '../replay/replay-coordination-materialization-runtime-handoff.js';
import { createReplayNavigationPreferencesRuntime } from '../replay-navigation/replay-navigation-preferences-runtime.js';
import { createReplayNavigationRuntime } from '../replay-navigation/replay-navigation-runtime.js';
import { createReplayRuntime } from '../replay/replay-runtime.js';
import { createTargetMaterializationReplayDiagnosticsRuntime } from '../replay/target-materialization-replay-diagnostics-runtime.js';
import { createSessionRuntime } from '../session/session-runtime.js';
import { createSettingsRuntime } from '../settings/settings-runtime.js';

export function createCoreRuntimeContributions({
  dispatchCommand,
  persistenceRepository = createPersistenceRepository(),
  replayNavigationPreferencesStorage,
  sessionRepository,
  subscribeEvent,
} = {}) {
  return Object.freeze([
    createAppRuntime(),
    createSessionRuntime({ repository: sessionRepository }),
    createPersistenceRuntime({ repository: persistenceRepository }),
    createSettingsRuntime({ persistenceRepository }),
    createJournalRuntime(),
    createJournalPersistenceRuntime(),
    createPaneRuntime(),
    createLayoutRuntime(),
    createPaneIntentSyncRuntime(),
    createPaneIntentReloadRuntime(),
    createLayoutPaneBootstrapRuntime(),
    createBarDataRuntime({ maxBarsPerWindow: LEFTWARD_MAX_SOURCE_BAR_LIMIT }),
    createChartBoundaryMetadataRuntime(),
    createChartDataRuntime(),
    createChartDataProjectionRuntime(),
    createChartEntryRuntime(),
    createChartEntryInitializationRuntime(),
    createChartEntryContextRuntime(),
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
