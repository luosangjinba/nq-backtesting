function requireConfiguration(value) {
  if (value === null || value === undefined) return null;
  if (typeof value.api?.createProductionManualAnnotationWorkflow !== 'function'
    || !Array.isArray(value.moduleDescriptors)
    || typeof value.readModuleHostSnapshot !== 'function'
    || typeof value.idFactory !== 'function'
    || typeof value.nowEpochMs !== 'function') {
    throw new TypeError('Replay Workspace received an invalid optional Annotation workflow.');
  }
  return value;
}

/** Bind the optional Session-scoped Annotation composition to public Workspace owners only. */
export function createWorkspaceAnnotationWorkflow({
  chartAdapter,
  configuration,
  presentation,
  record,
} = {}) {
  const value = requireConfiguration(configuration);
  if (value === null) return null;
  const workflow = value.api.createProductionManualAnnotationWorkflow({
    chartSurfacePort: chartAdapter,
    idFactory: value.idFactory,
    moduleDescriptors: value.moduleDescriptors,
    nowEpochMs: value.nowEpochMs,
    readModuleHostSnapshot: value.readModuleHostSnapshot,
    sessionId: record.sessionId,
    sessionRevision: record.revision,
    storage: value.storage,
    view: presentation,
  });
  return Object.freeze({
    ...workflow,
    selectEvidenceSource: (artifactId) => workflow.selectEvidenceSource(artifactId),
  });
}
