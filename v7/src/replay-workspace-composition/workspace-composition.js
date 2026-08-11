import { resolveReplayTruncationTarget } from './replay-truncation.js';
import { createReplayWorkspaceCommandPort } from './workspace-command-port.js';
import { createWorkspaceChartAssembly } from './workspace-chart-assembly.js';
import { createWorkspaceCheckpointPersistence } from './workspace-checkpoint-persistence.js';
import { createWorkspaceDataAssembly } from './workspace-data-assembly.js';
import { createWorkspacePublicationAssembly } from './workspace-publication-assembly.js';
import { createWorkspaceRuntimeAssembly } from './workspace-runtime-assembly.js';
import { createWorkspaceSessionState } from './workspace-session-state.js';
import { createWorkspaceAnnotationWorkflow } from './workspace-annotation-workflow.js';

function createCheckpointPersistence(options, session) {
  return createWorkspaceCheckpointPersistence({
    initialCheckpoint: options.initialCheckpoint,
    initialLayout: session.readPaneLayout(),
    initialLayoutSync: options.initialLayoutSync,
    persist: options.persistWorkspaceCheckpoint,
    readLayout: session.readPaneLayout,
    readLayoutSync: () => session.readLayoutSync() ?? options.initialLayoutSync,
    view: options.presentation,
    workspaceState: session.workspaceState,
  });
}

function createChartAssembly(options, session, checkpointPersistence, handleTruncationSelect, getExecution) {
  return createWorkspaceChartAssembly({
    checkpointPersistence,
    getExecution,
    handleTruncationSelect,
    initialLayoutSync: options.initialLayoutSync,
    presentation: options.presentation,
    record: options.record,
    session,
    workstationSettings: options.workstationSettings,
    workstationSettingsViewConsumer: options.workstationSettingsViewConsumer,
  });
}

function createRuntimeGraph(options, session, chart, checkpointPersistence, annotationWorkflow) {
  let runtime = null;
  const data = createWorkspaceDataAssembly({ getRuntime: () => runtime, session });
  const publication = createWorkspacePublicationAssembly({
    checkpointPersistence,
    data,
    onAcceptedWorkspace: (candidate) => annotationWorkflow?.acceptWorkspace(candidate),
    presentation: options.presentation,
    session,
  });
  const runtimeAssembly = createWorkspaceRuntimeAssembly({
    chart,
    data,
    presentation: options.presentation,
    publication,
    record: options.record,
    session,
    workstationSettings: options.workstationSettings,
  });
  runtime = runtimeAssembly.runtime;
  return Object.freeze({ data, runtime, runtimeAssembly });
}

function createCompositionCommandPort(options, owners) {
  const { chart, checkpointPersistence, data, runtimeAssembly, session } = owners;
  return createReplayWorkspaceCommandPort({
    acceptedPaneWorkspace: session.acceptedPaneWorkspace,
    annotationWorkflow: owners.annotationWorkflow,
    adapter: chart.adapter,
    autoplayScheduler: runtimeAssembly.autoplayScheduler,
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
}

/**
 * Compose one Session-scoped Replay Workspace behind command and presentation ports.
 * This boundary constructs and disposes runtime owners; it never owns DOM nodes.
 */
export function createReplayWorkspaceComposition({
  annotationWorkflow: annotationWorkflowConfiguration = null,
  initialLayout,
  initialLayoutSync,
  initialCheckpoint = null,
  initialNavigationSettings,
  persistWorkspaceCheckpoint,
  persistReplayNavigationSettings,
  record,
  presentation,
  workstationSettings,
  workstationSettingsViewConsumer,
}) {
  const options = Object.freeze({
    initialCheckpoint,
    initialLayout,
    initialLayoutSync,
    initialNavigationSettings,
    persistWorkspaceCheckpoint,
    persistReplayNavigationSettings,
    presentation,
    record,
    workstationSettings,
    workstationSettingsViewConsumer,
  });
  const session = createWorkspaceSessionState(options);
  let runtimeAssembly, disposed = false;
  const checkpointPersistence = createCheckpointPersistence(options, session);

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

  const chart = createChartAssembly(
    options,
    session,
    checkpointPersistence,
    handleTruncationSelect,
    () => runtimeAssembly?.execution ?? null,
  );
  const annotationWorkflow = createWorkspaceAnnotationWorkflow({
    chartAdapter: chart.adapter,
    configuration: annotationWorkflowConfiguration,
    presentation,
    record,
  });
  session.setLayoutSyncReader(chart.layoutSyncController.snapshot);
  const graph = createRuntimeGraph(options, session, chart, checkpointPersistence, annotationWorkflow);
  ({ runtimeAssembly } = graph);
  const { data, runtime } = graph;

  function disposeComposition() {
    if (disposed) return;
    try { workstationSettings.cancelPreview(); } catch { /* Disposal still owns teardown. */ }
    disposed = true;
    for (const unregister of [...chart.unregisterConsumers].reverse()) unregister();
    runtimeAssembly.autoplayScheduler.dispose();
    runtimeAssembly.paneTimeLocation.dispose();
    runtimeAssembly.execution.dispose();
    runtime.dispose();
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
    chart: chart.adapter.snapshot(),
    crosshairSync: chart.layoutSyncController.read().crosshair,
    layoutSync: chart.layoutSyncController.snapshot(),
    paneLayout: session.readPaneLayout(),
    paneWorkspace: session.acceptedPaneWorkspace(),
    replay: session.replay.snapshot(),
    semanticState: session.workspaceState.snapshot(),
    workspace: runtime.snapshot(),
  });
  return createCompositionCommandPort(options, {
    chart,
    annotationWorkflow,
    checkpointPersistence,
    disposeComposition,
    isDisposed: () => disposed,
    setTruncationSelection,
    snapshotComposition,
    data,
    runtimeAssembly,
    session,
  });
}
