import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { recordHistory } from '../history/history-manager.js';
import {
  deleteChartNote,
  getChartNoteForBar,
  getChartNoteRangesForBar,
  updateChartNote,
  upsertChartNote,
} from '../chart-notes/chart-note-store.js';
import { CHART_PANE_IDS, getPaneLabel } from '../chart-panes/chart-pane-store.js';

export function createManualChartNoteController({
  getContextBar,
  getContextPoint,
  hideContextMenu,
}) {
  let editorEl = null;
  let rangeDraft = null;

  function closeEditor() {
    if (!editorEl) return false;
    editorEl.remove();
    editorEl = null;
    return true;
  }

  function showEditor({ title, defaultText = '', x = 20, y = 20, onSave }) {
    const chartEl = document.getElementById('chart');
    if (!chartEl) return;

    closeEditor();

    const editor = document.createElement('div');
    editor.className = 'chart-note-editor';
    editor.innerHTML = `
      <div class="chart-note-editor-title"></div>
      <textarea class="chart-note-editor-text" rows="4" spellcheck="false"></textarea>
      <div class="chart-note-editor-actions">
        <button class="chart-note-editor-btn chart-note-editor-save" type="button">Save</button>
        <button class="chart-note-editor-btn" type="button" data-action="cancel">Cancel</button>
      </div>
    `;

    const titleEl = editor.querySelector('.chart-note-editor-title');
    const textarea = editor.querySelector('.chart-note-editor-text');
    const saveBtn = editor.querySelector('.chart-note-editor-save');
    const cancelBtn = editor.querySelector('[data-action="cancel"]');
    titleEl.textContent = title || 'Chart Note';
    textarea.value = defaultText || '';

    chartEl.appendChild(editor);
    const width = 260;
    const height = 154;
    const rect = chartEl.getBoundingClientRect();
    editor.style.left = `${Math.min(Math.max(6, x), Math.max(6, rect.width - width - 6))}px`;
    editor.style.top = `${Math.min(Math.max(6, y), Math.max(6, rect.height - height - 6))}px`;

    const save = () => {
      const text = textarea.value.trim();
      if (!text) {
        bus.emit('status:update', { text: 'Chart Note 内容不能为空', isError: true });
        textarea.focus();
        return;
      }
      onSave?.(text);
      closeEditor();
    };

    saveBtn.addEventListener('click', save);
    cancelBtn.addEventListener('click', closeEditor);
    editor.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        closeEditor();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'enter') {
        event.preventDefault();
        save();
      }
    });

    textarea.focus();
    textarea.select();
    editorEl = editor;
  }

  function getChartNoteAtContextBar() {
    const contextMenuBar = getContextBar();
    if (!contextMenuBar) return null;
    return getChartNoteForBar({
      instrument: getPrimaryInstrument(),
      timeframe: store.getCurrentTimeframe(),
      timestamp: contextMenuBar.timestamp,
    });
  }

  function getChartNoteRangeAtContextBar() {
    const contextMenuBar = getContextBar();
    if (!contextMenuBar) return null;
    return getChartNoteRangesForBar({
      instrument: getPrimaryInstrument(),
      timeframe: store.getCurrentTimeframe(),
      timestamp: contextMenuBar.timestamp,
    })[0] || null;
  }

  function renderMenuItems(bar) {
    const disabled = bar ? '' : 'disabled';
    const existingNote = bar ? getChartNoteAtContextBar() : null;
    const existingRangeNote = bar ? getChartNoteRangeAtContextBar() : null;
    const rangeDraftLabel = rangeDraft
      ? ` · ${rangeDraft.label || rangeDraft.timestamp}`
      : '';
    const finishRangeDisabled = bar && rangeDraft ? '' : 'disabled';
    return `
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Chart Note</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="chart-note-add" ${existingNote ? 'disabled' : disabled}>Add Note Here</button>
        <button class="pda-menu-item" data-pda-action="chart-note-edit" ${existingNote ? '' : 'disabled'}>Edit Note</button>
        <button class="pda-menu-item" data-pda-action="chart-note-delete" ${existingNote ? '' : 'disabled'}>Delete Note</button>
        <div class="pda-menu-divider"></div>
        <button class="pda-menu-item" data-pda-action="chart-note-range-start" ${disabled}>Start Range Note Here</button>
        <button class="pda-menu-item" data-pda-action="chart-note-range-finish" ${finishRangeDisabled}>Finish Range Note Here${rangeDraftLabel}</button>
        <button class="pda-menu-item" data-pda-action="chart-note-range-edit" ${existingRangeNote ? '' : 'disabled'}>Edit Range Note</button>
        <button class="pda-menu-item" data-pda-action="chart-note-range-delete" ${existingRangeNote ? '' : 'disabled'}>Delete Range Note</button>
        </div>
      </div>
    `;
  }

  function handleAction(action) {
    const contextMenuBar = getContextBar();
    if (action === 'chart-note-add') {
      if (!contextMenuBar) {
        bus.emit('status:update', { text: '无法添加 Chart Note：没有可用 K 线', isError: true });
      } else {
        const bar = contextMenuBar;
        const timeframe = store.getCurrentTimeframe();
        const instrument = getPrimaryInstrument();
        const point = getContextPoint() || { x: 20, y: 20 };
        hideContextMenu();
        showEditor({
          title: `Add Note · ${bar.tradingDay || bar.time || ''}`,
          x: point.x,
          y: point.y,
          onSave: (text) => {
            recordHistory('Add Chart Note', () =>
              upsertChartNote({
                instrument,
                timeframe,
                timestamp: bar.timestamp,
                text,
              })
            );
            bus.emit('status:update', { text: 'Chart Note 已添加', isError: false });
          },
        });
        return true;
      }
      hideContextMenu();
      return true;
    }

    if (action === 'chart-note-edit') {
      const note = getChartNoteAtContextBar();
      if (!note) {
        bus.emit('status:update', { text: '当前 K 线没有可编辑的 Chart Note', isError: true });
      } else {
        const bar = contextMenuBar;
        const point = getContextPoint() || { x: 20, y: 20 };
        hideContextMenu();
        showEditor({
          title: `Edit Note · ${bar?.tradingDay || bar?.time || ''}`,
          defaultText: note.text,
          x: point.x,
          y: point.y,
          onSave: (text) => {
            recordHistory('Edit Chart Note', () => updateChartNote(note.id, { text }));
            bus.emit('status:update', { text: 'Chart Note 已更新', isError: false });
          },
        });
        return true;
      }
      hideContextMenu();
      return true;
    }

    if (action === 'chart-note-delete') {
      const note = getChartNoteAtContextBar();
      if (!note) {
        bus.emit('status:update', { text: '当前 K 线没有可删除的 Chart Note', isError: true });
      } else {
        recordHistory('Delete Chart Note', () => deleteChartNote(note.id));
        bus.emit('status:update', { text: 'Chart Note 已删除', isError: false });
      }
      hideContextMenu();
      return true;
    }

    if (action === 'chart-note-range-start') {
      if (!contextMenuBar) {
        bus.emit('status:update', { text: 'Cannot start range note: no chart bar selected', isError: true });
      } else {
        rangeDraft = {
          timestamp: Number(contextMenuBar.timestamp),
          timeframe: store.getCurrentTimeframe(),
          instrument: getPrimaryInstrument(),
          label: contextMenuBar.tradingDay || contextMenuBar.time || '',
        };
        bus.emit('status:update', { text: 'Range note start selected', isError: false });
      }
      hideContextMenu();
      return true;
    }

    if (action === 'chart-note-range-finish') {
      if (!contextMenuBar || !rangeDraft) {
        bus.emit('status:update', { text: 'Cannot finish range note: missing start or end bar', isError: true });
        hideContextMenu();
      } else {
        const startTimestamp = Number(rangeDraft.timestamp);
        const endTimestamp = Number(contextMenuBar.timestamp);
        const timeframe = Number(rangeDraft.timeframe);
        const instrument = getPrimaryInstrument();
        if (rangeDraft.instrument && rangeDraft.instrument !== instrument) {
          bus.emit('status:update', { text: `Range note must finish on the same ${getPaneLabel(CHART_PANE_IDS.PRIMARY)} instrument`, isError: true });
          hideContextMenu();
          return true;
        }
        if (Number(store.getCurrentTimeframe()) !== timeframe) {
          bus.emit('status:update', { text: 'Range note must finish on the same timeframe', isError: true });
          hideContextMenu();
          return true;
        }
        if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp) || startTimestamp === endTimestamp) {
          bus.emit('status:update', { text: 'Range note needs two different bars', isError: true });
          hideContextMenu();
          return true;
        }
        const point = getContextPoint() || { x: 20, y: 20 };
        const rangeStart = Math.min(startTimestamp, endTimestamp);
        const rangeEnd = Math.max(startTimestamp, endTimestamp);
        rangeDraft = null;
        hideContextMenu();
        showEditor({
          title: 'Add Range Note',
          x: point.x,
          y: point.y,
          onSave: (text) => {
            recordHistory('Add Range Chart Note', () =>
              upsertChartNote({
                kind: 'range',
                instrument,
                timeframe,
                timestamp: rangeStart,
                startTimestamp: rangeStart,
                endTimestamp: rangeEnd,
                text,
              })
            );
            bus.emit('status:update', { text: 'Range Chart Note added', isError: false });
          },
        });
      }
      return true;
    }

    if (action === 'chart-note-range-edit') {
      const note = getChartNoteRangeAtContextBar();
      if (!note) {
        bus.emit('status:update', { text: 'No editable range Chart Note at this bar', isError: true });
      } else {
        const point = getContextPoint() || { x: 20, y: 20 };
        hideContextMenu();
        showEditor({
          title: 'Edit Range Note',
          defaultText: note.text,
          x: point.x,
          y: point.y,
          onSave: (text) => {
            recordHistory('Edit Range Chart Note', () => updateChartNote(note.id, { text }));
            bus.emit('status:update', { text: 'Range Chart Note updated', isError: false });
          },
        });
        return true;
      }
      hideContextMenu();
      return true;
    }

    if (action === 'chart-note-range-delete') {
      const note = getChartNoteRangeAtContextBar();
      if (!note) {
        bus.emit('status:update', { text: 'No deletable range Chart Note at this bar', isError: true });
      } else {
        recordHistory('Delete Range Chart Note', () => deleteChartNote(note.id));
        bus.emit('status:update', { text: 'Range Chart Note deleted', isError: false });
      }
      hideContextMenu();
      return true;
    }

    return false;
  }

  function reset() {
    rangeDraft = null;
    closeEditor();
  }

  return {
    closeEditor,
    getChartNoteAtContextBar,
    getChartNoteRangeAtContextBar,
    handleAction,
    renderMenuItems,
    reset,
  };
}
