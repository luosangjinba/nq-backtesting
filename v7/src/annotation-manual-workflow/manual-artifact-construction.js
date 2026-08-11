import * as barPickerContract from '../annotation-bar-picker/public.js';
import {
  readAcceptedManualWorkspace,
  resolveManualToolEvidence,
} from './accepted-workspace-evidence.js';

/** Resolve one exact selection and commit one package-constructed draft through Runtime. */
export async function constructManualSemanticArtifact({
  evidenceContract,
  idFactory,
  nowEpochMs,
  runtime,
  selection,
  semanticRegistry,
  sessionId,
  tool,
  workspace,
} = {}) {
  const exactSelection = barPickerContract.readExactAnnotationBarSelection(selection);
  const accepted = readAcceptedManualWorkspace(workspace);
  const evidence = resolveManualToolEvidence({
    artifacts: runtime.listSemanticArtifacts(),
    evidenceContract,
    requirement: tool.evidenceRequirement,
    selection: exactSelection,
    sessionId,
    workspace: accepted,
  });
  const artifactId = `artifact.manual.${idFactory()}`;
  const draft = semanticRegistry.constructArtifactDraft({
    artifactId,
    construction: {
      createdAtEpochMs: nowEpochMs(),
      evidence,
      mode: 'evidence-derived',
      sessionId,
    },
    typeId: tool.typeId,
    typeVersion: tool.typeVersion,
  });
  await runtime.createSemanticArtifact({
    draft,
    expectedDocumentRevision: runtime.getDocument().revision,
    sessionId,
  });
  return artifactId;
}
