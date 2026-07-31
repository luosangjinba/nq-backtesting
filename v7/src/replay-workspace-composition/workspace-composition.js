import { resolveReplayTruncationTarget } from './replay-truncation.js';
import { createReplayWorkspaceCommandPort } from './workspace-command-port.js';
import { createWorkspaceChartAssembly } from './workspace-chart-assembly.js';
import { createWorkspaceCheckpointPersistence } from './workspace-checkpoint-persistence.js';
import { createWorkspaceDataAssembly } from './workspace-data-assembly.js';
import { createWorkspacePublicationAssembly } from './workspace-publication-assembly.js';
import { createWorkspaceRuntimeAssembly } from './workspace-runtime-assembly.js';
import { createWorkspaceSessionState } from './workspace-session-state.js';

/**
 * Compose one Session-scoped Replay Workspace behind command and presentation ports.
 * This boundary constructs and disposes runtime owners; it never owns DOM nodes.
 */
export function createReplayWorkspaceComposition({
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
  const session = createWorkspaceSessionState({
    initialCheckpoint,
    initialLayout,
    initialNavigationSettings,
    presentation,
    record,
    workstationSettings,
  });
  let chart;
  let runtimeAssembly;
  let disposed = false;
  const checkpointPersistence = createWorkspaceCheckpointPersistence({
    initialCheckpoint,
    initialLayout: session.readPaneLayout(),
    initialLayoutSync,
    persist: persistWorkspaceCheckpoint,
    readLayout: session.readPaneLayout,
    readLayoutSync: () => session.readLayoutSync() ?? initialLayoutSync,
    view: presentation,
    workspaceState: session.workspaceState,
  });

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

  chart = createWorkspaceChartAssembly({
    checkpointPersistence,
    getExecution: () => runtimeAssembly?.execution ?? null,
    handleTruncationSelect,
    initialLayoutSync,
    presentation,
    record,
    session,
    workstationSettings,
    workstationSettingsViewConsumer,
  });
  session.setLayoutSyncReader(chart.layoutSyncController.snapshot);
  let runtime = null;
  const data = createWorkspaceDataAssembly({ getRuntime: () => runtime, session });
  const publication = createWorkspacePublicationAssembly({
    checkpointPersistence,
    data,
    presentation,
    session,
  });
  runtimeAssembly = createWorkspaceRuntimeAssembly({
    chart,
    data,
    presentation,
    publication,
    record,
    session,
    workstationSettings,
  });
  runtime = runtimeAssembly.runtime;

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
    chart.adapter.dispose();
    data.barData.dispose();
    data.projectedHistoryData.dispose();
    session.replay.dispose();
    session.market.dispose();
    session.workspaceState.dispose();
  }

  const snapshotComposition = () => Object.freeze({
    chart: chart.adapter.snapshot(),
    crosshairSync: chart.layoutSyncController.read().crosshair,
    layoutSync: chart.layoutSyncController.snapshot(),
    paneLayout: session.readPaneLayout(),
    paneWorkspace: session.acceptedPaneWorkspace(),
    replay: session.replay.snapshot(),
    semanticState: session.workspaceState.snapshot(),
    workspace: runtime.snapshot(),
  });
  return createReplayWorkspaceCommandPort({
    acceptedPaneWorkspace: session.acceptedPaneWorkspace,
    adapter: chart.adapter,
    autoplayScheduler: runtimeAssembly.autoplayScheduler,
    checkpointPersistence,
    disposeComposition,
    execution: runtimeAssembly.execution,
    isDisposed: () => disposed,
    layoutSyncController: chart.layoutSyncController,
    paneTimeLocation: runtimeAssembly.paneTimeLocation,
    persistReplayNavigationSettings,
    presentation,
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
    setTruncationSelection,
    snapshotComposition,
    syncReplayStep: session.syncReplayStep,
    workstationSettings,
    workspaceState: session.workspaceState,
  });
}
