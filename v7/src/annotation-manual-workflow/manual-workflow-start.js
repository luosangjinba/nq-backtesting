import { createRestoredAnnotationRuntime } from '../annotation-runtime/public.js';
import { createManualInspectorAssembly } from './manual-inspector-assembly.js';

/** Start durable Runtime, host Inspector, and contribution bindings in dependency order. */
export async function startManualWorkflowOwners({
  catalog,
  chartProjection,
  geometryContract,
  nowEpochMs,
  onFailure,
  onInspectorError,
  onPublish,
  onSettled,
  onStatus,
  packageId,
  previewPort,
  readHostSnapshot,
  reconcile,
  repository,
  semanticRegistry,
  sessionId,
} = {}) {
  await semanticRegistry.enablePackage(packageId);
  const runtime = await createRestoredAnnotationRuntime({
    geometryContract,
    repository,
    semanticContract: semanticRegistry,
    sessionId,
  });
  const inspectorAssembly = createManualInspectorAssembly({
    chartProjection,
    nowEpochMs,
    onFailure,
    onInspectorError,
    onPublish,
    onSettled,
    onStatus,
    previewPort,
    readRuntime: () => runtime,
    reconcile,
    semanticRegistry,
    sessionId,
  });
  return Object.freeze({
    inspector: inspectorAssembly.inspector,
    inspectorActions: inspectorAssembly.actions,
    runtime,
    tools: catalog.list({
      hostSnapshot: readHostSnapshot(),
      semanticTools: semanticRegistry.listTools(),
      semanticTypes: semanticRegistry.listSemanticTypes(),
    }),
  });
}
