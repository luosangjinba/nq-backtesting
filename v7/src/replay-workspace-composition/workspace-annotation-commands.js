/** Add package-neutral optional Annotation intents without exposing its controller to UI. */
export function createWorkspaceAnnotationCommands({ annotationWorkflow, autoplayScheduler } = {}) {
  function pauseAnd(work) {
    if (annotationWorkflow === null) return undefined;
    autoplayScheduler.pause();
    return work();
  }
  return Object.freeze({
    applyAnnotationInspector: () => pauseAnd(() => annotationWorkflow.applyInspector()),
    cancelAnnotationInspector: () => pauseAnd(() => annotationWorkflow.cancelInspector()),
    resetAnnotationInspector: () => pauseAnd(() => annotationWorkflow.resetInspector()),
    selectAnnotationEvidenceSource: (artifactId) => (
      pauseAnd(() => annotationWorkflow.selectEvidenceSource(artifactId))
    ),
    toggleAnnotationTool: (toolId) => pauseAnd(() => annotationWorkflow.toggleTool(toolId)),
    updateAnnotationInspectorField: (value) => (
      pauseAnd(() => annotationWorkflow.updateInspectorField(value))
    ),
  });
}
