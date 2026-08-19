import { resolveReplayTruncationTarget } from './replay-truncation.js';
import { createReplayWorkspaceCommandPort } from './workspace-command-port.js';
import { createWorkspaceCompositionOwners } from './workspace-composition-owners.js';
import { createWorkspaceValidationCampaign } from './workspace-validation-campaign.js';
import { applyValidationRawContextIntent } from './validation-raw-context-command.js';

function createCompositionCommandPort(options, owners) {
  const { chart, checkpointPersistence, data, runtimeAssembly, session } = owners;
  const commands = createReplayWorkspaceCommandPort({
    acceptedPaneWorkspace: session.acceptedPaneWorkspace,
    annotationWorkflow: owners.annotationWorkflow,
    afterOwnersStart: owners.afterOwnersStart,
    adapter: chart.adapter,
    autoplayScheduler: runtimeAssembly.autoplayScheduler,
    beforeStart: owners.beforeStart,
    checkpointPersistence,
    disposeComposition: owners.disposeComposition,
    execution: runtimeAssembly.execution,
    isDisposed: owners.isDisposed,
    layoutSyncController: chart.layoutSyncController,
    paneTimeLocation: runtimeAssembly.paneTimeLocation,
    persistReplayNavigationSettings: options.persistReplayNavigationSettings,
    presentation: options.presentation,
    range: session.range,
    readPaneLayoutValue: session.readPaneLayout,
    readSyncTimeframe: session.readSyncTimeframe,
    readTruncationSelection: session.readTruncationSelection,
    replay: session.replay,
    restored: session.restored,
    setNavigationSchedule: session.setNavigationSchedule,
    setPaneLayoutValue: session.setPaneLayout,
    setReplayStep: session.setReplayStep,
    setSyncTimeframe: session.setSyncTimeframe,
    setTruncationSelection: owners.setTruncationSelection,
    snapshotComposition: owners.snapshotComposition,
    syncReplayStep: session.syncReplayStep,
    workstationSettings: options.workstationSettings,
    workspaceState: session.workspaceState,
  });
  return Object.freeze({
    ...commands,
    async start() {
      const result = await commands.start();
      const intent = owners.validationCampaign?.takeRawContextIntent() ?? null;
      if (intent !== null) await applyValidationRawContextIntent(commands, intent);
      return result;
    },
  });
}

function createValidationCampaign(configuration, annotationWorkflow, calculatedSeriesWorkflow,
  data, paneAddonPort, record, session, snapshotComposition) {
  return createWorkspaceValidationCampaign({
    annotationWorkflow,
    calculatedSeriesWorkflow,
    configuration,
    data,
    paneAddonPort,
    record,
    session,
    snapshotComposition,
  });
}

/**
 * Compose one Session-scoped Replay Workspace behind command and presentation ports.
 * This boundary constructs and disposes runtime owners; it never owns DOM nodes.
 */
export function createReplayWorkspaceComposition({
  annotationWorkflow: annotationWorkflowConfiguration = null,
  calculatedSeries: calculatedSeriesConfiguration = null,
  initialLayout,
  initialLayoutSync,
  initialCheckpoint = null,
  initialNavigationSettings,
  persistWorkspaceCheckpoint,
  persistReplayNavigationSettings,
  paneAddonPort = null,
  validationCampaign: validationCampaignConfiguration = null,
  record,
  presentation,
  workstationSettings,
  workstationSettingsViewConsumer,
}) {
  let chart, runtimeAssembly, session;
  let disposed = false;

  function setTruncationSelection(active, error = null) {
    session.setTruncationSelection(active);
    chart.adapter.setTruncationSelection(session.readTruncationSelection());
    presentation.setTruncationSelection({ active: session.readTruncationSelection(), error });
  }

  async function handleTruncationSelect(_paneId, selection) {
    if (disposed || !session.readTruncationSelection() || runtimeAssembly.execution.isPending()) return;
    let targetEpochMs;
    try {
      targetEpochMs = resolveReplayTruncationTarget({
        cursorEpochMs: session.replay.snapshot().cursorEpochMs,
        range: session.range,
        selection,
      });
    } catch (error) {
      presentation.setTruncationSelection({ active: true, error: error.message });
      return;
    }
    setTruncationSelection(false);
    await runtimeAssembly.execution.action('goto-exact', { targetEpochMs }, { allowDim: true });
  }

  const owners = createWorkspaceCompositionOwners({
    annotationWorkflowConfiguration,
    calculatedSeriesConfiguration,
    handleTruncationSelect,
    input: {
      initialCheckpoint, initialLayout, initialLayoutSync, initialNavigationSettings,
      persistReplayNavigationSettings, persistWorkspaceCheckpoint, presentation, record,
      workstationSettings, workstationSettingsViewConsumer,
    },
    paneAddonPort,
    readExecution: () => runtimeAssembly?.execution ?? null,
  });
  ({ chart, runtimeAssembly, session } = owners);
  const {
    annotationWorkflow, calculatedSeriesWorkflow, checkpointPersistence, data, options, runtime,
  } = owners;

  let validationCampaign = null;

  function disposeComposition() {
    if (disposed) return;
    try { workstationSettings.cancelPreview(); } catch { /* Disposal still owns teardown. */ }
    disposed = true;
    for (const unregister of [...chart.unregisterConsumers].reverse()) unregister();
    runtimeAssembly.autoplayScheduler.dispose();
    runtimeAssembly.paneTimeLocation.dispose();
    runtimeAssembly.execution.dispose();
    runtime.dispose();
    validationCampaign?.dispose();
    calculatedSeriesWorkflow?.dispose();
    chart.chartApplication.dispose();
    const annotationCleanup = annotationWorkflow?.dispose() ?? null;
    const chartCleanup = annotationCleanup === null
      ? chart.adapter.dispose()
      : Promise.resolve(annotationCleanup).then(() => chart.adapter.dispose());
    data.barData.dispose();
    data.projectedHistoryData.dispose();
    session.replay.dispose();
    session.market.dispose();
    session.workspaceState.dispose();
    return chartCleanup;
  }

  const snapshotComposition = () => Object.freeze({
    annotation: annotationWorkflow?.snapshot() ?? null,
    calculatedSeries: calculatedSeriesWorkflow?.snapshot() ?? null,
    chart: chart.adapter.snapshot(),
    crosshairSync: chart.layoutSyncController.read().crosshair,
    layoutSync: chart.layoutSyncController.snapshot(),
    paneLayout: session.readPaneLayout(),
    paneWorkspace: session.acceptedPaneWorkspace(),
    replay: session.replay.snapshot(),
    semanticState: session.workspaceState.snapshot(),
    validationCampaign: validationCampaign?.snapshot() ?? null,
    workspace: runtime.snapshot(),
  });
  validationCampaign = createValidationCampaign(
    validationCampaignConfiguration, annotationWorkflow, calculatedSeriesWorkflow,
    data, paneAddonPort, record, session, snapshotComposition,
  );
  return createCompositionCommandPort(options, {
    chart,
    annotationWorkflow,
    afterOwnersStart: () => validationCampaign?.start(),
    beforeStart: () => calculatedSeriesWorkflow?.start(),
    checkpointPersistence,
    disposeComposition,
    isDisposed: () => disposed,
    setTruncationSelection,
    snapshotComposition,
    data,
    runtimeAssembly,
    session,
    validationCampaign,
  });
}
