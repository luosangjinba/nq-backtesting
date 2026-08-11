/** Coordinate package-neutral Inspector commands with accepted projection settlement. */
export function createInspectorWorkflowActions({
  inspector,
  onFailure,
  onSettled,
  onStatus,
  reconcile,
} = {}) {
  async function fail(cause, code, restoreAccepted = false) {
    if (restoreAccepted && !inspector.snapshot().dirty) await reconcile().catch(() => null);
    onFailure(cause, code);
    return null;
  }

  return Object.freeze({
    async apply() {
      if (!inspector.snapshot().dirty) return null;
      onStatus('saving');
      try {
        const result = await inspector.save();
        await reconcile();
        onSettled('ready');
        return result;
      } catch (cause) {
        return fail(cause, 'MANUAL_WORKFLOW_INSPECTOR_SAVE_FAILED');
      }
    },
    async cancel() {
      try {
        const result = await inspector.cancel();
        await reconcile();
        onSettled('ready');
        return result;
      } catch (cause) {
        return fail(cause, 'MANUAL_WORKFLOW_INSPECTOR_CANCEL_FAILED');
      }
    },
    async reset() {
      const wasDirty = inspector.snapshot().dirty;
      try {
        if (!wasDirty) await reconcile({ excludeSelected: true });
        const result = await inspector.resetDraft();
        await reconcile({ excludeSelected: result.dirty });
        onSettled(result.dirty ? 'editing' : 'ready');
        return result;
      } catch (cause) {
        return fail(cause, 'MANUAL_WORKFLOW_INSPECTOR_RESET_FAILED', true);
      }
    },
    async update({ expectedDraftRevision, field, value } = {}) {
      const wasDirty = inspector.snapshot().dirty;
      try {
        if (!wasDirty) await reconcile({ excludeSelected: true });
        const result = await inspector.updateDraft({ expectedDraftRevision, field, value });
        onSettled('editing');
        return result;
      } catch (cause) {
        return fail(cause, 'MANUAL_WORKFLOW_INSPECTOR_UPDATE_FAILED', true);
      }
    },
  });
}
