import { createPaneSetChartSnapshotApplication } from '../chart-snapshot-application/public.js';
import { createLightweightPaneSetAdapter } from '../lightweight-chart-adapter/public.js';
import { createLayoutSyncController } from './layout-sync-controller.js';
import { createViewportSettingsConsumer } from './viewport-settings-consumer.js';

/** Construct the Chart adapter/application and Settings presentation consumers. */
export function createWorkspaceChartAssembly({
  calculatedSeriesPort,
  checkpointPersistence,
  getExecution,
  handleTruncationSelect,
  initialLayoutSync,
  presentation,
  record,
  session,
  workstationSettings,
  workstationSettingsViewConsumer,
}) {
  const { market, workspaceState } = session;
  const adapter = createLightweightPaneSetAdapter({
    calculatedSeriesPort,
    onCrosshairChange: ({ panes }) => presentation.setPaneOhlc(panes),
    onHistoryBoundary: (paneId, logicalRange) => {
      if (logicalRange.from < 24) void getExecution()?.requestHistory(paneId);
    },
    onTruncationSelect: handleTruncationSelect,
    onViewportIntent: (paneId, intent) => {
      presentation.setWall(paneId, intent.origin);
      checkpointPersistence.save({ message: 'Pane viewport could not be saved locally.' });
    },
    resolveInstrumentLabel: (instrumentId) => {
      const instrument = market.instrumentOptions.find(({ id }) => id === instrumentId);
      if (!instrument) throw new TypeError(`Unknown instrument ${instrumentId}.`);
      return instrument.label;
    },
    resolvePriceIncrement: (instrumentId) => {
      const instrument = market.instruments.find(({ id }) => id === instrumentId);
      if (!instrument) throw new TypeError(`Unknown instrument ${instrumentId}.`);
      return instrument.priceIncrement;
    },
    resolveViewportPort: workspaceState.viewportPort,
    surfacePort: presentation.surfacePort,
  });
  const layoutSyncController = createLayoutSyncController({
    adapter,
    initialLayoutSync,
    persist: (layoutSync) => checkpointPersistence.save({ layoutSync, rethrow: true }),
    view: presentation,
  });
  const unregisterConsumers = Object.freeze([
    workstationSettings.registerConsumer(
      createViewportSettingsConsumer({ viewportDefaultsPort: workspaceState }),
    ),
    workstationSettings.registerConsumer(adapter.workstationSettingsConsumer),
    workstationSettings.registerConsumer(workstationSettingsViewConsumer),
  ]);
  const chartApplication = createPaneSetChartSnapshotApplication({
    activationGeneration: record.activationGeneration,
    adapter,
    sessionId: record.sessionId,
  });
  return Object.freeze({ adapter, chartApplication, layoutSyncController, unregisterConsumers });
}
