import * as bus from '../../event-bus.js';
import {
  activateCatalogItem,
  addCatalogItem,
  deactivateCatalogItem,
  renameCatalogItem,
  setCatalogItemLessonRoles,
  setCatalogItemSort,
} from '../../entry-context/entry-context-catalog-store.js';

function getTargetMeta(target = {}) {
  return {
    group: String(target.dataset?.entryContextGroup || '').trim(),
    id: String(target.dataset?.entryContextId || '').trim(),
  };
}

function emitStatus(text, isError = false) {
  bus.emit('status:update', { text, isError });
}

export function createEntryContextCatalogActionController({
  renderCatalogPanel,
  recordInspectorHistory,
} = {}) {
  function mutate(label, mutator) {
    return recordInspectorHistory?.(label, mutator) ?? mutator();
  }

  function refresh() {
    renderCatalogPanel?.();
  }

  function handleChange(action, target) {
    if (action === 'entry-context-catalog-label') {
      const { group, id } = getTargetMeta(target);
      const label = String(target.value || '').trim();
      if (!group || !id || !label) return true;
      const updated = mutate('Rename Entry Context Catalog Item', () => renameCatalogItem(group, id, label));
      if (updated) {
        refresh();
        emitStatus('Catalog item renamed');
      }
      return true;
    }

    if (action === 'entry-context-catalog-sort') {
      const { group, id } = getTargetMeta(target);
      const updated = mutate('Sort Entry Context Catalog Item', () => setCatalogItemSort(group, id, target.value));
      if (updated) {
        refresh();
        emitStatus('Catalog item order updated');
      }
      return true;
    }

    if (action === 'entry-context-catalog-lesson-role') {
      const { group, id } = getTargetMeta(target);
      if (group !== 'lessons' || !id) return true;
      const itemEl = target.closest('.entry-context-catalog-item');
      const roles = [...(itemEl?.querySelectorAll('[data-inspector-action="entry-context-catalog-lesson-role"]:checked') || [])]
        .map((input) => String(input.dataset?.entryContextLessonRole || '').trim())
        .filter(Boolean);
      const updated = mutate('Set Lesson Scope', () => setCatalogItemLessonRoles(group, id, roles));
      if (updated) {
        refresh();
        emitStatus('Lesson scope updated');
      }
      return true;
    }

    return false;
  }

  function handleClick(action, actionEl) {
    if (action === 'entry-context-catalog-add') {
      const { group } = getTargetMeta(actionEl);
      const input = actionEl
        .closest('.entry-context-catalog-add')
        ?.querySelector('[data-entry-context-add-input]');
      const label = String(input?.value || '').trim();
      if (!group || !label) {
        emitStatus('Catalog item label is required', true);
        return true;
      }
      const item = mutate('Add Entry Context Catalog Item', () => addCatalogItem(group, label));
      if (item) {
        if (input) input.value = '';
        refresh();
        emitStatus('Catalog item added');
      }
      return true;
    }

    if (action === 'entry-context-catalog-deactivate' || action === 'entry-context-catalog-activate') {
      const { group, id } = getTargetMeta(actionEl);
      const updater = action === 'entry-context-catalog-activate' ? activateCatalogItem : deactivateCatalogItem;
      const item = mutate('Toggle Entry Context Catalog Item', () => updater(group, id));
      if (item) {
        refresh();
        emitStatus(item.active === false ? 'Catalog item deactivated' : 'Catalog item activated');
      }
      return true;
    }

    return false;
  }

  return { handleChange, handleClick };
}
