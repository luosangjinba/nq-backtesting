import { AnnotationInteractionError, failInteraction } from './interaction-error.js';
import { requireFactory, requirePreviewPort } from './interaction-ports.js';
import {
  editableFieldValues,
  fieldValues,
  requireSemanticArtifactPort,
  requireSemanticArtifactRecord,
  requireSemanticInspection,
  requireSemanticPatch,
  requireSemanticRegistryPort,
  requireSemanticSelection,
} from './semantic-inspector-contract.js';

const EDITOR_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

/** Own one package-neutral, cutoff-bound Semantic Artifact Inspector draft and Preview. */
export function createSemanticArtifactInspectorController({
  artifactPort,
  createPreviewIdentity,
  editorId,
  nowEpochMs,
  onError = () => {},
  onStateChange = () => {},
  previewPort,
  projectPreview,
  semanticRegistryPort,
} = {}) {
  const artifacts = requireSemanticArtifactPort(artifactPort);
  const registry = requireSemanticRegistryPort(semanticRegistryPort);
  const previews = requirePreviewPort(previewPort);
  const identityFactory = requireFactory(
    createPreviewIdentity,
    'ANNOTATION_INTERACTION_PREVIEW_IDENTITY_FACTORY_INVALID',
    'Preview identity factory',
  );
  const clock = requireFactory(
    nowEpochMs,
    'ANNOTATION_SEMANTIC_INSPECTOR_CLOCK_INVALID',
    'Semantic Inspector clock',
  );
  const projector = requireFactory(
    projectPreview,
    'ANNOTATION_INTERACTION_PROJECTOR_INVALID',
    'Semantic Inspector projector',
  );
  if (typeof editorId !== 'string' || !EDITOR_ID.test(editorId)) {
    failInteraction(
      'ANNOTATION_SEMANTIC_INSPECTOR_EDITOR_INVALID',
      'Semantic Inspector editor id is invalid.',
    );
  }
  if (typeof onError !== 'function' || typeof onStateChange !== 'function') {
    failInteraction('ANNOTATION_INTERACTION_CALLBACK_INVALID', 'Inspector callbacks must be functions.');
  }

  let accepted = null;
  let busy = false;
  let disposed = false;
  let draft = null;
  let draftRevision = 0;
  let fields = new Map();
  let groups = Object.freeze([]);
  let lastError = null;
  let previewIdentity = null;
  let previewRevision = 0;
  let replayCutoffEpochMs = null;
  let selectedArtifactId = null;
  let status = 'idle';
  let values = Object.freeze({});

  function snapshot() {
    return Object.freeze({
      dirty: draft !== null,
      draftRevision,
      fieldValues: values,
      groups,
      lastErrorCode: lastError?.code ?? null,
      replayCutoffEpochMs,
      selectedArtifactId,
      status,
    });
  }

  function publish() {
    try { onStateChange(snapshot()); } catch { /* UI observers never own Inspector state. */ }
  }

  function fail(code, message, cause) {
    const error = new AnnotationInteractionError(code, message, { cause });
    lastError = error;
    try { onError(error); } catch { /* Stable Inspector failure remains authoritative. */ }
    return error;
  }

  function report(error) {
    if (lastError !== error) {
      lastError = error;
      try { onError(error); } catch { /* Stable Inspector failure remains authoritative. */ }
    }
    return error;
  }

  function requireOperable() {
    if (disposed) {
      failInteraction('ANNOTATION_SEMANTIC_INSPECTOR_DISPOSED', 'Semantic Inspector is disposed.');
    }
    if (busy) {
      failInteraction('ANNOTATION_SEMANTIC_INSPECTOR_BUSY', 'Semantic Inspector is settling another operation.');
    }
  }

  async function clearPreview() {
    if (previewIdentity !== null) await previews.clear(previewIdentity);
  }

  function clearState() {
    accepted = null;
    draft = null;
    draftRevision = 0;
    fields = new Map();
    groups = Object.freeze([]);
    previewIdentity = null;
    previewRevision = 0;
    replayCutoffEpochMs = null;
    selectedArtifactId = null;
    values = Object.freeze({});
    if (!disposed) status = 'idle';
  }

  function revisionDraft(nextValues) {
    const editedAtEpochMs = clock();
    if (!Number.isSafeInteger(editedAtEpochMs) || editedAtEpochMs < 0) {
      failInteraction(
        'ANNOTATION_SEMANTIC_INSPECTOR_CLOCK_INVALID',
        'Semantic Inspector clock returned an invalid time.',
      );
    }
    return registry.createArtifactRevisionDraft(Object.freeze({
      artifact: accepted.artifact,
      revision: Object.freeze({
        editedAtEpochMs,
        editorId,
        fields: editableFieldValues(fields, nextValues),
        replayCutoffEpochMs,
      }),
    }));
  }

  async function previewDraft(candidate) {
    const subjects = registry.projectionInputsForArtifactRevisionDraft(
      candidate,
      Object.freeze({ replayCutoffEpochMs }),
    );
    if (!Array.isArray(subjects) || subjects.length > 8) {
      failInteraction(
        'ANNOTATION_SEMANTIC_INSPECTOR_PROJECTION_INVALID',
        'Semantic Inspector Preview subjects are invalid.',
      );
    }
    const nextPreviewRevision = previewRevision + 1;
    await previews.replace(
      previewIdentity,
      subjects.map((subject, index) => projector(Object.freeze({
        index,
        previewRevision: nextPreviewRevision,
        subject,
      }))),
    );
    previewRevision = nextPreviewRevision;
  }

  async function applyValues(nextValues) {
    const candidate = revisionDraft(nextValues);
    await previewDraft(candidate);
    draft = candidate;
    values = Object.freeze({ ...nextValues });
    draftRevision += 1;
    status = 'selected';
  }

  async function operation(work) {
    requireOperable();
    busy = true;
    try {
      return await work();
    } catch (cause) {
      if (cause instanceof AnnotationInteractionError) throw report(cause);
      throw fail(
        'ANNOTATION_SEMANTIC_INSPECTOR_OPERATION_FAILED',
        'Semantic Inspector operation was rejected.',
        cause,
      );
    } finally {
      busy = false;
      publish();
    }
  }

  return Object.freeze({
    async cancel() {
      return operation(async () => {
        try { await clearPreview(); } catch (cause) {
          throw fail(
            'ANNOTATION_SEMANTIC_INSPECTOR_CANCEL_FAILED',
            'Semantic Inspector Preview could not clear.',
            cause,
          );
        }
        clearState();
        return snapshot();
      });
    },
    async dispose() {
      if (disposed) return snapshot();
      if (busy) {
        failInteraction(
          'ANNOTATION_SEMANTIC_INSPECTOR_BUSY',
          'Semantic Inspector is settling another operation.',
        );
      }
      try { await clearPreview(); } catch { /* Preview owner remains separately authoritative. */ }
      disposed = true;
      clearState();
      status = 'disposed';
      publish();
      return snapshot();
    },
    async resetDraft() {
      return operation(async () => {
        if (accepted === null || status !== 'selected') {
          failInteraction(
            'ANNOTATION_SEMANTIC_INSPECTOR_SELECTION_REQUIRED',
            'Select one editable Semantic Artifact before resetting.',
          );
        }
        const baselineValues = Object.freeze(Object.fromEntries([...fields]
          .filter(([, field]) => !field.readOnly)
          .map(([id, field]) => [id, field.baselineValue])));
        const acceptedValues = fieldValues(fields);
        const alreadyAccepted = Object.keys(baselineValues).every(
          (id) => baselineValues[id] === acceptedValues[id],
        );
        if (alreadyAccepted) {
          await clearPreview();
          draft = null;
          values = acceptedValues;
          draftRevision += 1;
          return snapshot();
        }
        await applyValues(Object.freeze({ ...values, ...baselineValues }));
        return snapshot();
      });
    },
    async save() {
      return operation(async () => {
        if (accepted === null || draft === null || status !== 'selected') {
          failInteraction(
            'ANNOTATION_SEMANTIC_INSPECTOR_DIRTY_DRAFT_REQUIRED',
            'Semantic Inspector requires one changed draft before saving.',
          );
        }
        status = 'saving';
        publish();
        let result;
        try {
          result = await artifacts.reviseArtifact(Object.freeze({
            draft,
            expectedArtifactRevision: accepted.artifact.revision,
            expectedDocumentRevision: accepted.documentRevision,
          }));
        } catch (cause) {
          status = 'selected';
          throw fail(
            'ANNOTATION_SEMANTIC_INSPECTOR_SAVE_FAILED',
            'Semantic Inspector save failed and retained its draft.',
            cause,
          );
        }
        draft = null;
        accepted = null;
        try { await clearPreview(); } catch (cause) {
          status = 'cleanup-failed';
          throw fail(
            'ANNOTATION_SEMANTIC_INSPECTOR_SAVE_PREVIEW_CLEAR_FAILED',
            'Semantic Artifact saved, but its transient Preview did not clear.',
            cause,
          );
        }
        clearState();
        return result;
      });
    },
    async select(value) {
      return operation(async () => {
        await clearPreview();
        clearState();
        if (value === null) return snapshot();
        const selection = requireSemanticSelection(value);
        selectedArtifactId = selection.artifactId;
        replayCutoffEpochMs = selection.replayCutoffEpochMs;
        accepted = requireSemanticArtifactRecord(
          await artifacts.readArtifact(Object.freeze({ artifactId: selectedArtifactId })),
          selectedArtifactId,
        );
        const inspection = requireSemanticInspection(
          registry.inspectArtifactAtReplayCutoff(accepted.artifact, replayCutoffEpochMs),
        );
        groups = inspection.groups;
        fields = inspection.fields;
        values = fieldValues(fields);
        draftRevision = 1;
        if (inspection.visibility.status === 'hidden-before-observation') {
          status = 'hidden';
          return snapshot();
        }
        if (![...fields.values()].some(({ readOnly }) => !readOnly)) {
          status = 'read-only';
          return snapshot();
        }
        previewIdentity = identityFactory(`semantic.${selectedArtifactId}`);
        status = 'selected';
        return snapshot();
      });
    },
    snapshot,
    async updateDraft(value) {
      return operation(async () => {
        if (accepted === null || status !== 'selected') {
          failInteraction(
            'ANNOTATION_SEMANTIC_INSPECTOR_SELECTION_REQUIRED',
            'Select one editable Semantic Artifact before editing.',
          );
        }
        const patch = requireSemanticPatch(value, draftRevision, fields);
        await applyValues(Object.freeze({ ...values, [patch.field]: patch.value }));
        return snapshot();
      });
    },
  });
}
