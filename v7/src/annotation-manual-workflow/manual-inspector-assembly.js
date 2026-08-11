import { createSemanticArtifactInspectorController } from '../annotation-interaction/public.js';
import { createInspectorWorkflowActions } from './inspector-workflow-actions.js';

/** Assemble one package-neutral host Inspector plus accepted-settlement actions. */
export function createManualInspectorAssembly({
  chartProjection,
  nowEpochMs,
  onFailure,
  onInspectorError,
  onPublish,
  onSettled,
  onStatus,
  previewPort,
  readRuntime,
  reconcile,
  semanticRegistry,
  sessionId,
} = {}) {
  const inspector = createSemanticArtifactInspectorController({
    artifactPort: {
      async readArtifact({ artifactId }) {
        const runtime = readRuntime();
        return Object.freeze({
          artifact: runtime.getSemanticArtifact(artifactId),
          documentRevision: runtime.getDocument().revision,
        });
      },
      async reviseArtifact(value) {
        return readRuntime().reviseSemanticArtifact({ ...value, sessionId });
      },
    },
    createPreviewIdentity: (id) => chartProjection.createAnnotationPreviewIdentity(`preview.${id}`),
    editorId: 'local.trader',
    nowEpochMs,
    onError: onInspectorError,
    onStateChange: onPublish,
    previewPort,
    projectPreview: ({ index, previewRevision, subject }) => Object.freeze({
      index,
      previewRevision,
      subject,
    }),
    semanticRegistryPort: semanticRegistry,
  });
  return Object.freeze({
    actions: createInspectorWorkflowActions({
      inspector,
      onFailure,
      onSettled,
      onStatus,
      reconcile,
    }),
    inspector,
  });
}
