import { createWorkspaceAnnotationWorkflow } from './workspace-annotation-workflow.js';
import { createWorkspaceCalculatedSeriesWorkflow } from './workspace-calculated-series-workflow.js';
import { createWorkspaceChartAssembly } from './workspace-chart-assembly.js';
import { createWorkspaceCheckpointPersistence } from './workspace-checkpoint-persistence.js';
import { createWorkspaceDataAssembly } from './workspace-data-assembly.js';
import { createWorkspacePublicationAssembly } from './workspace-publication-assembly.js';
import { createWorkspaceRuntimeAssembly } from './workspace-runtime-assembly.js';
import { createWorkspaceSessionState } from './workspace-session-state.js';

function compositionOptions(input, calculatedSeriesWorkflow) {
  return Object.freeze({
    auxiliaryTransactionPorts: calculatedSeriesWorkflow === null
      ? Object.freeze([]) : Object.freeze([calculatedSeriesWorkflow.workspaceParticipant]),
    initialCheckpoint: input.initialCheckpoint,
    initialLayout: input.initialLayout,
    initialLayoutSync: input.initialLayoutSync,
    initialNavigationSettings: input.initialNavigationSettings,
    persistWorkspaceCheckpoint: input.persistWorkspaceCheckpoint,
    persistReplayNavigationSettings: input.persistReplayNavigationSettings,
    presentation: input.presentation,
    record: input.record,
    workstationSettings: input.workstationSettings,
    workstationSettingsViewConsumer: input.workstationSettingsViewConsumer,
  });
}

function checkpointPersistence(options, session) {
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

function runtimeGraph(options, session, chart, persistence, annotationWorkflow) {
  let runtime = null;
  const data = createWorkspaceDataAssembly({ getRuntime: () => runtime, session });
  const publication = createWorkspacePublicationAssembly({
    checkpointPersistence: persistence,
    data,
    onAcceptedWorkspace: (candidate) => annotationWorkflow?.acceptWorkspace(candidate),
    presentation: options.presentation,
    session,
  });
  const runtimeAssembly = createWorkspaceRuntimeAssembly({
    auxiliaryTransactionPorts: options.auxiliaryTransactionPorts ?? [],
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

export function createWorkspaceCompositionOwners({
  annotationWorkflowConfiguration,
  calculatedSeriesConfiguration,
  handleTruncationSelect,
  input,
  paneAddonPort,
  readExecution,
}) {
  const calculatedSeriesWorkflow = createWorkspaceCalculatedSeriesWorkflow({
    configuration: calculatedSeriesConfiguration,
    paneAddonPort,
    record: input.record,
  });
  const options = compositionOptions(input, calculatedSeriesWorkflow);
  const session = createWorkspaceSessionState(options);
  const persistence = checkpointPersistence(options, session);
  const chart = createWorkspaceChartAssembly({
    calculatedSeriesPort: calculatedSeriesWorkflow?.workspacePort ?? null,
    checkpointPersistence: persistence,
    getExecution: readExecution,
    handleTruncationSelect,
    initialLayoutSync: options.initialLayoutSync,
    presentation: options.presentation,
    record: options.record,
    session,
    workstationSettings: options.workstationSettings,
    workstationSettingsViewConsumer: options.workstationSettingsViewConsumer,
  });
  calculatedSeriesWorkflow?.bindChartAdapter(chart.adapter);
  const annotationWorkflow = createWorkspaceAnnotationWorkflow({
    chartAdapter: chart.adapter,
    configuration: annotationWorkflowConfiguration,
    presentation: options.presentation,
    record: options.record,
  });
  session.setLayoutSyncReader(chart.layoutSyncController.snapshot);
  return Object.freeze({
    annotationWorkflow,
    calculatedSeriesWorkflow,
    chart,
    checkpointPersistence: persistence,
    options,
    session,
    ...runtimeGraph(options, session, chart, persistence, annotationWorkflow),
  });
}
