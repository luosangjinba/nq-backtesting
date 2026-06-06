import * as bus from '../../event-bus.js';
import * as viewport from '../../chart/viewport-controller.js';
import {
  deleteChartNote,
  getChartNoteById,
  updateChartNote,
} from '../../chart-notes/chart-note-store.js';

export function createChartNoteInspectorActionController({
  recordInspectorHistory,
} = {}) {
  function locate(note) {
    if (!note || !Number.isFinite(Number(note.timestamp))) {
      bus.emit('status:update', { text: 'Chart Note locate target is invalid', isError: true });
      return true;
    }

    const located = viewport.locateTimestampRange(note.timestamp, note.timestamp);
    bus.emit('status:update', {
      text: located ? 'Located Chart Note' : 'Chart Note time is not loaded on the current chart',
      isError: !located,
    });
    return true;
  }

  function handleClick(action, actionEl) {
    if (!action?.startsWith('chart-note-')) return false;

    const note = getChartNoteById(actionEl.dataset.chartNoteId || '');
    if (!note) {
      bus.emit('status:update', { text: 'Chart Note not found', isError: true });
      return true;
    }

    if (action === 'chart-note-locate') {
      return locate(note);
    }

    if (action === 'chart-note-edit-focus') {
      const input = actionEl
        .closest('.time-reaction-chart-note-row')
        ?.querySelector('[data-inspector-action="chart-note-edit"]');
      input?.focus();
      input?.select?.();
      return true;
    }

    if (action === 'chart-note-delete') {
      const deleted = recordInspectorHistory?.('Delete Chart Note', () => deleteChartNote(note.id));
      bus.emit('status:update', {
        text: deleted ? 'Chart Note deleted' : 'Delete Chart Note failed',
        isError: !deleted,
      });
      return true;
    }

    return false;
  }

  function handleChange(action, targetEl) {
    if (action !== 'chart-note-edit') return false;

    const note = getChartNoteById(targetEl.dataset.chartNoteId || '');
    if (!note) {
      bus.emit('status:update', { text: 'Chart Note not found', isError: true });
      return true;
    }

    const text = String(targetEl.value || '').trim();
    if (!text) {
      bus.emit('status:update', { text: 'Chart Note cannot be empty', isError: true });
      targetEl.value = note.text || '';
      return true;
    }

    if (text === note.text) return true;
    const updated = recordInspectorHistory?.('Edit Chart Note', () => updateChartNote(note.id, { text }));
    bus.emit('status:update', {
      text: updated ? 'Chart Note updated' : 'Edit Chart Note failed',
      isError: !updated,
    });
    return true;
  }

  return {
    handleChange,
    handleClick,
  };
}
