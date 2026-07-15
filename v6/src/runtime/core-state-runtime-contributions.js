import { createAppRuntime } from './app-runtime.js';
import { createBarDataRuntime } from '../bar-data/bar-data-runtime.js';
import { createChartBoundaryMetadataRuntime } from '../chart-boundary-metadata/chart-boundary-metadata-runtime.js';
import { createChartDataRuntime } from '../chart-data/chart-data-runtime.js';
import { createChartDataProjectionRuntime } from '../chart-data-projection/chart-data-projection-runtime.js';
import { createChartEntryContextRuntime } from '../chart-entry/chart-entry-context-runtime.js';
import { createChartEntryInitializationRuntime } from '../chart-entry/chart-entry-initialization-runtime.js';
import { createChartEntryRuntime } from '../chart-entry/chart-entry-runtime.js';
import { LEFTWARD_MAX_SOURCE_BAR_LIMIT } from '../chart-history/leftward-source-window-policy.js';
import { createJournalRuntime } from '../journal/journal-runtime.js';
import { createJournalPersistenceRuntime } from '../journal-persistence/journal-persistence-runtime.js';
import { createLayoutPaneBootstrapRuntime } from '../layout/layout-pane-bootstrap-runtime.js';
import { createLayoutRuntime } from '../layout/layout-runtime.js';
import { createPaneIntentReloadRuntime } from '../pane-intent-reload/pane-intent-reload-runtime.js';
import { createPaneIntentSyncRuntime } from '../pane-intent-sync/pane-intent-sync-runtime.js';
import { createPaneRuntime } from '../panes/pane-runtime.js';
import { createPersistenceRuntime } from '../persistence/persistence-runtime.js';
import { createSessionRuntime } from '../session/session-runtime.js';
import { createSettingsRuntime } from '../settings/settings-runtime.js';

export function createCoreStateRuntimeContributions({
  persistenceRepository,
  sessionRepository,
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
  ]);
}
