const TAB_LABELS = Object.freeze({
  evidence: 'Evidence',
  history: 'History',
  inputs: 'Inputs',
  style: 'Style',
  visibility: 'Visibility',
});

function toolView(tool, activeToolId, operable) {
  return Object.freeze({
    active: tool.id === activeToolId,
    description: tool.description,
    disabled: !operable || tool.state !== 'active',
    displayName: tool.displayName,
    id: tool.id,
    packageName: tool.packageName,
    packageVersion: tool.packageVersion,
    state: tool.state,
  });
}

function inspectorTabs(tool, groups) {
  const byId = new Map(groups.map((group) => [group.id, group]));
  const tabs = tool?.inspectorParameters?.tabs ?? [];
  return Object.freeze(tabs
    .filter(({ source }) => source.kind === 'inspector-groups')
    .map(({ id, source }) => Object.freeze({
      groups: Object.freeze(source.groupIds.map((groupId) => byId.get(groupId)).filter(Boolean)),
      id,
      label: TAB_LABELS[id] ?? id,
    }))
    .filter(({ groups: values }) => values.length > 0));
}

function inspectorView({ artifact, inspector, tool }) {
  const open = inspector.selectedArtifactId !== null;
  return Object.freeze({
    artifactId: inspector.selectedArtifactId,
    artifactRevision: artifact?.revision ?? null,
    canApply: inspector.dirty,
    canCancel: open,
    canReset: inspector.status === 'selected',
    dirty: inspector.dirty,
    draftRevision: inspector.draftRevision,
    fieldValues: inspector.fieldValues,
    open,
    packageName: tool?.packageName ?? artifact?.definition?.packageId ?? 'Semantic Artifact',
    packageVersion: tool?.packageVersion ?? artifact?.definition?.packageVersion ?? null,
    state: tool?.state ?? 'unresolved',
    status: inspector.status,
    tabs: inspectorTabs(tool, inspector.groups),
  });
}

/** Project mutable workflow owners into one deeply immutable UI-only snapshot. */
export function createManualWorkflowViewModel({
  activeToolId,
  error,
  inspector,
  runtime,
  status,
  tools,
  workspaceReady,
} = {}) {
  const artifact = inspector.selectedArtifactId === null
    ? null : runtime?.getSemanticArtifact(inspector.selectedArtifactId) ?? null;
  const selectedTool = artifact === null ? null : tools.find((tool) => (
    tool.packageId === artifact.definition?.packageId
      && tool.typeId === artifact.typeId
      && tool.typeVersion === artifact.typeVersion
  )) ?? null;
  const busy = ['starting', 'constructing', 'saving'].includes(status)
    || status === 'picking'
    || inspector.dirty;
  const operable = workspaceReady && status !== 'starting' && status !== 'disposed';
  return Object.freeze({
    activeToolId,
    busy,
    error: error === null ? null : Object.freeze({ code: error.code, message: error.message }),
    inspector: inspectorView({ artifact, inspector, tool: selectedTool }),
    status,
    tools: Object.freeze(tools.map((tool) => toolView(tool, activeToolId, operable))),
  });
}

export function emptyInspectorSnapshot() {
  return Object.freeze({
    dirty: false,
    draftRevision: 0,
    fieldValues: Object.freeze({}),
    groups: Object.freeze([]),
    lastErrorCode: null,
    replayCutoffEpochMs: null,
    selectedArtifactId: null,
    status: 'idle',
  });
}
