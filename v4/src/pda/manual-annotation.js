// Manual PDA annotation entry points. The first pass supports BSL/SSL via chart context menu.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import { getPrimaryChartContext } from '../chart/chart-context.js';
import { VIEWPORT_TARGETS, locateChartRange } from '../chart/viewport-router.js';
import * as store from '../data/bar-store.js';
import { timeframeToString } from '../config.js';
import { clearAnnotations, getAnnotationById } from './pda-store.js';
import { clearPdaContextDataCache } from './pda-context-data.js';
import { getPdaType } from './pda-types.js';
import { hitTestPdaAnnotations } from './pda-hit-test.js';
import { toggleThisWeekNwog, toggleTodayNdog } from './objective-gaps.js';
import {
  findDisplayBarInContext,
  getBarChartTime as getContextBarChartTime,
} from './manual-pda-actions.js';
import {
  cancelManualPdaWorkflow,
  clearManualPdaWorkflowState,
  handleManualPdaAction,
  handleManualPdaShiftContext,
} from './manual-pda-workflow.js';
import {
  cancelSegmentSelection,
  clearManualSegments,
  finishSegment,
  getSegmentSelectionSummary,
  startSegment,
} from '../segment/manual-segment.js';
import { getSelectedSegment } from '../segment/segment-selection.js';
import { hitTestSegmentGroups, hitTestSegments } from '../segment/segment-hit-test.js';
import { clearAllPdaResponses, getSegmentById, linkPdaResponse } from '../segment/segment-store.js';
import {
  addSegmentToDraftGroup,
  clearDraftSegmentGroup,
  createCompositeMove,
  removeSegmentFromDraftGroup,
  setDraftSegmentGroupTarget,
} from '../segment/segment-group-store.js';
import {
  appendPointToPointSet,
  addPointSetPoint,
  cancelPointSet,
  clearPointSetSelection,
  finishPointSet,
  getPointSetSelectionSummary,
  startPointSet,
} from './point-set-annotation.js';
import { getSelectedPda } from './pda-selection.js';
import { startFvgSmt, startLiquiditySmt } from '../smt/manual-smt.js';
import {
  handleOrderSetupChartAction,
  renderOrderSetupMenuItems,
} from '../order/order-setup-chart-actions.js';
import {
  handleLiveRecordChartAction,
  renderLiveRecordMenuItems,
} from '../live-record/live-record-chart-actions.js';
import { hitTestLiveRecordElements } from '../live-record/live-record-hit-test.js';
import { hitTestOrderSetupElements } from '../order/order-setup-hit-test.js';
import { recordHistory } from '../history/history-manager.js';
import {
  addKillzone,
  addEventTime,
  clearEventTimes,
  clearKillzones,
  clearKillzoneDraft,
  deleteEventTime,
  deleteKillzone,
  getTimeOverlaySettings,
  normalizeEventTimeValue,
  setKillzoneDraft,
  updateKillzone,
  updateTimeOverlaySettings,
} from '../time-overlays/time-overlay-store.js';
import {
  deleteChartNote,
  getChartNoteForBar,
  getChartNoteRangesForBar,
  updateChartNote,
  upsertChartNote,
} from '../chart-notes/chart-note-store.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import {
  clampMenuPosition,
  getPdaLabel,
  getSegmentLabel,
  initContextMenuSubmenuPositioning,
  renderManualContextMenu,
  renderSegmentGroupItems,
  renderSegmentPdaLinkItems,
  repositionContextMenu,
} from './manual-context-menu.js';
import { CHART_PANE_IDS, getPaneLabel } from '../chart-panes/chart-pane-store.js';

let controlsEl = null;
let contextMenuBar = null;
let contextMenuPrice = null;
let contextMenuPdaHit = null;
let contextMenuSegmentHit = null;
let contextMenuSegmentGroupHit = null;
let contextMenuOrderSetupHit = null;
let contextMenuLiveRecordHit = null;
let contextMenuShiftKey = false;
let contextMenuPoint = null;
let chartNoteEditorEl = null;
let chartNoteRangeDraft = null;

function getPrimaryContext() {
  return getPrimaryChartContext();
}

function getBarChartTime(bar) {
  return getContextBarChartTime(getPrimaryContext(), bar);
}

function getBarEventTime(bar) {
  if (!bar || !Number.isFinite(Number(bar.timestamp))) return '';
  const date = new Date(Number(bar.timestamp) * 1000);
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function getBarEventDate(bar) {
  if (!bar || !Number.isFinite(Number(bar.timestamp))) return '';
  const date = new Date(Number(bar.timestamp) * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getEventTimeLabel(time) {
  return normalizeEventTimeValue(time, '').replace(':', '').replace(/^0/, '');
}

function getContextEventTime() {
  return normalizeEventTimeValue(getBarEventTime(contextMenuBar), '');
}

function getContextEventDate() {
  return getBarEventDate(contextMenuBar);
}

function getEventTimeAtContextBar() {
  const time = getContextEventTime();
  const date = getContextEventDate();
  if (!time || !date) return null;
  return (
    getTimeOverlaySettings().eventTimes.find(
      (eventTime) => eventTime.date === date && eventTime.time === time
    ) || null
  );
}

function getKillzoneAtContextBar() {
  const time = getContextEventTime();
  const date = getContextEventDate();
  if (!time || !date) return null;
  return (
    (getTimeOverlaySettings().killzones || []).find((killzone) => {
      if (killzone.date !== date || killzone.enabled === false) return false;
      const start = killzone.startTime <= killzone.endTime ? killzone.startTime : killzone.endTime;
      const end = killzone.startTime <= killzone.endTime ? killzone.endTime : killzone.startTime;
      return time >= start && time <= end;
    }) || null
  );
}

function promptKillzoneLabel(defaultLabel = 'Killzone') {
  const value = window.prompt('Killzone name', defaultLabel);
  if (value === null) return null;
  return value.trim() || defaultLabel;
}

function findDisplayBar(time) {
  return findDisplayBarInContext(getPrimaryContext(), time);
}

function closeChartNoteEditor() {
  chartNoteEditorEl?.remove();
  chartNoteEditorEl = null;
}

function showChartNoteEditor({ title, defaultText = '', x = 20, y = 20, onSave }) {
  const chartEl = document.getElementById('chart');
  if (!chartEl) return;

  closeChartNoteEditor();

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
    closeChartNoteEditor();
  };

  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', closeChartNoteEditor);
  editor.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      closeChartNoteEditor();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'enter') {
      event.preventDefault();
      save();
    }
  });

  textarea.focus();
  textarea.select();
  chartNoteEditorEl = editor;
}

function locateComparisonAtBar(bar) {
  const label = getPaneLabel(CHART_PANE_IDS.COMPARISON);
  if (!bar) return;
  if (!Number.isFinite(Number(bar.timestamp))) {
    bus.emit('status:update', { text: `${label} locate failed: no chart time selected`, isError: true });
    return;
  }
  const result = locateChartRange(
    VIEWPORT_TARGETS.COMPARISON,
    { start: bar.timestamp, end: bar.timestamp }
  );
  const located = Boolean(result.targets?.[VIEWPORT_TARGETS.COMPARISON]?.located);
  bus.emit('status:update', {
    text: located
      ? `${label} located to ${bar.tradingDay || bar.time}`
      : `${label} locate failed: window disabled or no matching bar`,
    isError: !located,
  });
}

function renderTimeOverlayMenuItems(bar) {
  const time = normalizeEventTimeValue(getBarEventTime(bar), '');
  const date = getBarEventDate(bar);
  const settings = getTimeOverlaySettings();
  const existingEventTime = time
    ? settings.eventTimes.find(
        (eventTime) => eventTime.date === date && eventTime.time === time
      )
    : null;
  const disabled = time && date ? '' : 'disabled';
  const removeDisabled = existingEventTime ? '' : 'disabled';
  const clearDisabled = settings.eventTimes.length ? '' : 'disabled';
  const label = time ? getEventTimeLabel(time) : '';
  const hitKillzone = getKillzoneAtContextBar();
  const killzoneDraft = settings.killzoneDraft;
  const endDisabled = killzoneDraft && date === killzoneDraft.date && time ? '' : 'disabled';
  const editKillzoneDisabled = hitKillzone ? '' : 'disabled';
  const draftLabel = killzoneDraft ? ` · ${killzoneDraft.date} ${getEventTimeLabel(killzoneDraft.startTime)}` : '';
  return `
    <div class="pda-menu-section pda-menu-submenu">
      <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Time Overlays</div>
      <div class="pda-submenu-panel">
      <button class="pda-menu-item" data-pda-action="time-overlay-add-event" ${disabled}>Add ${label || 'Time'} Line Here</button>
      <button class="pda-menu-item" data-pda-action="time-overlay-delete-event" ${removeDisabled}>Delete ${label || 'Time'} Line</button>
      <button class="pda-menu-item" data-pda-action="time-overlay-clear-events" ${clearDisabled}>Clear Time Lines</button>
      <div class="pda-menu-divider"></div>
      <button class="pda-menu-item" data-pda-action="time-overlay-killzone-start" ${disabled}>Start Killzone Here</button>
      <button class="pda-menu-item" data-pda-action="time-overlay-killzone-end" ${endDisabled}>End Killzone Here${draftLabel}</button>
      <button class="pda-menu-item" data-pda-action="time-overlay-killzone-rename" ${editKillzoneDisabled}>Rename Killzone Here</button>
      <button class="pda-menu-item" data-pda-action="time-overlay-killzone-delete" ${editKillzoneDisabled}>Delete Killzone Here</button>
      </div>
    </div>
  `;
}

function getChartNoteAtContextBar() {
  if (!contextMenuBar) return null;
  return getChartNoteForBar({
    instrument: getPrimaryInstrument(),
    timeframe: store.getCurrentTimeframe(),
    timestamp: contextMenuBar.timestamp,
  });
}

function getChartNoteRangeAtContextBar() {
  if (!contextMenuBar) return null;
  return getChartNoteRangesForBar({
    instrument: getPrimaryInstrument(),
    timeframe: store.getCurrentTimeframe(),
    timestamp: contextMenuBar.timestamp,
  })[0] || null;
}

function renderChartNoteMenuItems(bar) {
  const disabled = bar ? '' : 'disabled';
  const existingNote = bar ? getChartNoteAtContextBar() : null;
  const existingRangeNote = bar ? getChartNoteRangeAtContextBar() : null;
  const rangeDraftLabel = chartNoteRangeDraft
    ? ` · ${chartNoteRangeDraft.label || chartNoteRangeDraft.timestamp}`
    : '';
  const finishRangeDisabled = bar && chartNoteRangeDraft ? '' : 'disabled';
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

function renderClearMenuItems() {
  const settings = getTimeOverlaySettings();
  const clearKillzonesDisabled = settings.killzones?.length ? '' : 'disabled';
  return `
    <button class="pda-menu-item" data-pda-action="clear">Clear PDA</button>
    <button class="pda-menu-item" data-pda-action="segment-clear">Clear Segments</button>
    <button class="pda-menu-item" data-pda-action="time-overlay-killzone-clear" ${clearKillzonesDisabled}>Clear Killzones</button>
  `;
}

function showContextMenu(x, y, bar, pdaHit = null, segmentHit = null, segmentGroupHit = null) {
  if (!controlsEl) return;
  contextMenuBar = bar;
  contextMenuPdaHit = pdaHit;
  contextMenuSegmentHit = segmentHit;
  contextMenuSegmentGroupHit = segmentGroupHit;
  const { x: left, y: top, maxHeight, submenuDirection } = clampMenuPosition(controlsEl, x, y);
  const disabled = bar ? '' : 'disabled';
  const timeLabel = bar ? bar.tradingDay || bar.time : 'No bar';
  const activeSet = getPointSetSelectionSummary();
  const activeSegment = getSegmentSelectionSummary();
  const selected = getSelectedPda();
  const selectedAnnotation = selected ? getAnnotationById(selected.id) : null;
  const selectedPdaType = selectedAnnotation ? getPdaType(selectedAnnotation.type) : null;
  const currentSegmentLabel = `${timeframeToString(store.getCurrentTimeframe())} Segments`;
  const segmentPdaLinkItems = renderSegmentPdaLinkItems(pdaHit);
  const segmentGroupItems = renderSegmentGroupItems(segmentHit);
  const selectedSetItem =
    !activeSet && selectedPdaType?.pointSet
      ? `<button class="pda-menu-item" data-pda-action="selected-pointset-add" ${disabled}>Add to Selected ${selectedPdaType.label}</button>`
      : '';
  const pointSetItems = activeSet
    ? `
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">${activeSet.label} set · ${activeSet.count} point${activeSet.count === 1 ? '' : 's'}</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="pointset-add" ${disabled}>Add ${activeSet.label} Point</button>
        <button class="pda-menu-item" data-pda-action="pointset-finish">Finish ${activeSet.label}</button>
        <button class="pda-menu-item" data-pda-action="pointset-cancel">Cancel Set</button>
        </div>
      </div>
    `
    : `
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">Point Sets</div>
        <div class="pda-submenu-panel">
        ${selectedSetItem}
        <button class="pda-menu-item" data-pda-action="eqh-start" ${disabled}>Start EQH Set</button>
        <button class="pda-menu-item" data-pda-action="eql-start" ${disabled}>Start EQL Set</button>
        </div>
      </div>
    `;
  const segmentItems = activeSegment
    ? `
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">${activeSegment.label}</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="segment-finish-high" ${disabled}>End Segment at High</button>
        <button class="pda-menu-item" data-pda-action="segment-finish-low" ${disabled}>End Segment at Low</button>
        <button class="pda-menu-item" data-pda-action="segment-cancel">Cancel Segment</button>
        </div>
      </div>
    `
    : `
      <div class="pda-menu-section pda-menu-submenu">
        <div class="pda-menu-item pda-menu-submenu-trigger" tabindex="0">${currentSegmentLabel}</div>
        <div class="pda-submenu-panel">
        <button class="pda-menu-item" data-pda-action="segment-start-low" ${disabled}>Start Segment from Low</button>
        <button class="pda-menu-item" data-pda-action="segment-start-high" ${disabled}>Start Segment from High</button>
        </div>
      </div>
    `;

  controlsEl.innerHTML = renderManualContextMenu({
    left,
    top,
    maxHeight,
    submenuDirection,
    timeLabel,
    disabled,
    orderSetupItems: renderOrderSetupMenuItems({ bar, pdaHit, segmentHit, segmentGroupHit, orderSetupHit: contextMenuOrderSetupHit, isShift: contextMenuShiftKey }),
    liveRecordItems: renderLiveRecordMenuItems({
      bar,
      pdaHit,
      segmentHit,
      segmentGroupHit,
      chartNote: getChartNoteAtContextBar() || getChartNoteRangeAtContextBar(),
      liveRecordHit: contextMenuLiveRecordHit,
      isShift: contextMenuShiftKey,
    }),
    segmentPdaLinkItems,
    segmentGroupItems,
    segmentItems,
    pointSetItems,
    chartNoteItems: renderChartNoteMenuItems(bar),
    timeOverlayItems: renderTimeOverlayMenuItems(bar),
    clearItems: renderClearMenuItems(),
  });
  const menuEl = controlsEl.querySelector('.pda-menu');
  repositionContextMenu(menuEl, x, y);
  initContextMenuSubmenuPositioning(menuEl);
}

function hideContextMenu() {
  contextMenuBar = null;
  contextMenuPrice = null;
  contextMenuPdaHit = null;
  contextMenuSegmentHit = null;
  contextMenuSegmentGroupHit = null;
  contextMenuOrderSetupHit = null;
  contextMenuLiveRecordHit = null;
  contextMenuShiftKey = false;
  contextMenuPoint = null;
  if (controlsEl) {
    controlsEl.innerHTML = '';
  }
}

function handleContextMenu(e) {
  if (
    e.target.closest('#viewport-controls') ||
    e.target.closest('#comparison-viewport-controls') ||
    e.target.closest('.pda-menu')
  ) return;

  e.preventDefault();
  const chartEl = document.getElementById('chart');
  if (!chartEl) return;

  const rect = chartEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const time = chart.coordinateToTime(x);
  const bar = findDisplayBar(time);
  const price = chart.coordinateToPrice(y);
  contextMenuPrice = price;
  const pdaHit = hitTestPdaAnnotations({ x, y, time, price });
  const segmentHit = hitTestSegments({ x, y });
  const segmentGroupHit = hitTestSegmentGroups({ x, y });
  const orderSetupHit = hitTestOrderSetupElements({ x, y });
  const liveRecordHit = hitTestLiveRecordElements({ x, y });
  contextMenuOrderSetupHit = orderSetupHit;
  contextMenuLiveRecordHit = liveRecordHit;
  contextMenuShiftKey = e.shiftKey;
  contextMenuPoint = { x, y };

  if (e.shiftKey && handleManualPdaShiftContext({ bar, context: getPrimaryContext(), hideContextMenu })) {
    return;
  }

  showContextMenu(x, y, bar, pdaHit, segmentHit, segmentGroupHit);
}

async function handleControlClick(e) {
  const action = e.target.closest('[data-pda-action]')?.dataset.pdaAction;
  if (!action) return;
  e.stopPropagation();

  if (await handleManualPdaAction(action, {
    bar: contextMenuBar,
    context: getPrimaryContext(),
    price: contextMenuPrice,
    hideContextMenu,
  })) {
    return;
  } else if (handleLiveRecordChartAction(action, {
    bar: contextMenuBar,
    price: contextMenuPrice,
    timeframe: timeframeToString(store.getCurrentTimeframe()),
    pdaHit: contextMenuPdaHit,
    segmentHit: contextMenuSegmentHit,
    segmentGroupHit: contextMenuSegmentGroupHit,
    chartNote: getChartNoteAtContextBar() || getChartNoteRangeAtContextBar(),
    liveRecordId: e.target.closest('[data-live-record-id]')?.dataset.liveRecordId || '',
    liveRecordElement: e.target.closest('[data-live-record-element]')?.dataset.liveRecordElement || '',
  })) {
    hideContextMenu();
  } else if (handleOrderSetupChartAction(action, {
    bar: contextMenuBar,
    price: contextMenuPrice,
    priceToCoordinate: chart.priceToCoordinate,
    timeframe: timeframeToString(store.getCurrentTimeframe()),
    pdaHit: contextMenuPdaHit,
    segmentHit: contextMenuSegmentHit,
    segmentGroupHit: contextMenuSegmentGroupHit,
    orderSetupId: e.target.closest('[data-order-setup-id]')?.dataset.orderSetupId || '',
    orderSetupElement: e.target.closest('[data-order-setup-element]')?.dataset.orderSetupElement || '',
  })) {
    hideContextMenu();
  } else if (action === 'comparison-locate-time') {
    locateComparisonAtBar(contextMenuBar);
    hideContextMenu();
  } else if (action === 'calendar-locate-date') {
    if (!contextMenuBar || !Number.isFinite(Number(contextMenuBar.timestamp))) {
      bus.emit('status:update', { text: 'Cannot locate Calendar date: no chart bar selected', isError: true });
    } else {
      bus.emit('inspector:open-calendar-date', {
        timestamp: contextMenuBar.timestamp,
        dateKey: getBarEventDate(contextMenuBar),
        source: 'primary chart',
      });
    }
    hideContextMenu();
  } else if (action === 'smt-liquidity-bearish' || action === 'smt-liquidity-bullish') {
    startLiquiditySmt(action === 'smt-liquidity-bullish' ? 'bullish' : 'bearish', contextMenuBar);
    hideContextMenu();
  } else if (action === 'smt-fvg-bearish' || action === 'smt-fvg-bullish') {
    startFvgSmt(action === 'smt-fvg-bullish' ? 'bullish' : 'bearish');
    hideContextMenu();
  } else if (action === 'chart-note-add') {
    if (!contextMenuBar) {
      bus.emit('status:update', { text: '无法添加 Chart Note：没有可用 K 线', isError: true });
    } else {
      const bar = contextMenuBar;
      const timeframe = store.getCurrentTimeframe();
      const instrument = getPrimaryInstrument();
      const point = contextMenuPoint || { x: 20, y: 20 };
      hideContextMenu();
      showChartNoteEditor({
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
      return;
    }
    hideContextMenu();
  } else if (action === 'chart-note-edit') {
    const note = getChartNoteAtContextBar();
    if (!note) {
      bus.emit('status:update', { text: '当前 K 线没有可编辑的 Chart Note', isError: true });
    } else {
      const bar = contextMenuBar;
      const point = contextMenuPoint || { x: 20, y: 20 };
      hideContextMenu();
      showChartNoteEditor({
        title: `Edit Note · ${bar?.tradingDay || bar?.time || ''}`,
        defaultText: note.text,
        x: point.x,
        y: point.y,
        onSave: (text) => {
          recordHistory('Edit Chart Note', () => updateChartNote(note.id, { text }));
          bus.emit('status:update', { text: 'Chart Note 已更新', isError: false });
        },
      });
      return;
    }
    hideContextMenu();
  } else if (action === 'chart-note-delete') {
    const note = getChartNoteAtContextBar();
    if (!note) {
      bus.emit('status:update', { text: '当前 K 线没有可删除的 Chart Note', isError: true });
    } else {
      recordHistory('Delete Chart Note', () => deleteChartNote(note.id));
      bus.emit('status:update', { text: 'Chart Note 已删除', isError: false });
    }
    hideContextMenu();
  } else if (action === 'chart-note-range-start') {
    if (!contextMenuBar) {
      bus.emit('status:update', { text: 'Cannot start range note: no chart bar selected', isError: true });
    } else {
      chartNoteRangeDraft = {
        timestamp: Number(contextMenuBar.timestamp),
        timeframe: store.getCurrentTimeframe(),
        instrument: getPrimaryInstrument(),
        label: contextMenuBar.tradingDay || contextMenuBar.time || '',
      };
      bus.emit('status:update', { text: 'Range note start selected', isError: false });
    }
    hideContextMenu();
  } else if (action === 'chart-note-range-finish') {
    if (!contextMenuBar || !chartNoteRangeDraft) {
      bus.emit('status:update', { text: 'Cannot finish range note: missing start or end bar', isError: true });
      hideContextMenu();
    } else {
      const startTimestamp = Number(chartNoteRangeDraft.timestamp);
      const endTimestamp = Number(contextMenuBar.timestamp);
      const timeframe = Number(chartNoteRangeDraft.timeframe);
      const instrument = getPrimaryInstrument();
      if (chartNoteRangeDraft.instrument && chartNoteRangeDraft.instrument !== instrument) {
        bus.emit('status:update', { text: `Range note must finish on the same ${getPaneLabel(CHART_PANE_IDS.PRIMARY)} instrument`, isError: true });
        hideContextMenu();
        return;
      }
      if (Number(store.getCurrentTimeframe()) !== timeframe) {
        bus.emit('status:update', { text: 'Range note must finish on the same timeframe', isError: true });
        hideContextMenu();
        return;
      }
      if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp) || startTimestamp === endTimestamp) {
        bus.emit('status:update', { text: 'Range note needs two different bars', isError: true });
        hideContextMenu();
        return;
      }
      const point = contextMenuPoint || { x: 20, y: 20 };
      const rangeStart = Math.min(startTimestamp, endTimestamp);
      const rangeEnd = Math.max(startTimestamp, endTimestamp);
      chartNoteRangeDraft = null;
      hideContextMenu();
      showChartNoteEditor({
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
      return;
    }
  } else if (action === 'chart-note-range-edit') {
    const note = getChartNoteRangeAtContextBar();
    if (!note) {
      bus.emit('status:update', { text: 'No editable range Chart Note at this bar', isError: true });
    } else {
      const point = contextMenuPoint || { x: 20, y: 20 };
      hideContextMenu();
      showChartNoteEditor({
        title: 'Edit Range Note',
        defaultText: note.text,
        x: point.x,
        y: point.y,
        onSave: (text) => {
          recordHistory('Edit Range Chart Note', () => updateChartNote(note.id, { text }));
          bus.emit('status:update', { text: 'Range Chart Note updated', isError: false });
        },
      });
      return;
    }
    hideContextMenu();
  } else if (action === 'chart-note-range-delete') {
    const note = getChartNoteRangeAtContextBar();
    if (!note) {
      bus.emit('status:update', { text: 'No deletable range Chart Note at this bar', isError: true });
    } else {
      recordHistory('Delete Range Chart Note', () => deleteChartNote(note.id));
      bus.emit('status:update', { text: 'Range Chart Note deleted', isError: false });
    }
    hideContextMenu();
  } else if (action === 'time-overlay-add-event') {
    const time = getContextEventTime();
    const date = getContextEventDate();
    if (!time || !date) {
      bus.emit('status:update', { text: '无法添加时间线：没有可用 K 线时间', isError: true });
    } else if (getEventTimeAtContextBar()) {
      updateTimeOverlaySettings({ selectedDate: '' });
      bus.emit('status:update', { text: `${date} ${getEventTimeLabel(time)} 时间线已存在`, isError: false });
    } else {
      recordHistory('Add Time Line', () => {
        updateTimeOverlaySettings({ selectedDate: '' });
        return addEventTime({ date, time, label: getEventTimeLabel(time) });
      });
      bus.emit('status:update', { text: `已添加 ${date} ${getEventTimeLabel(time)} 时间线`, isError: false });
    }
    hideContextMenu();
  } else if (action === 'time-overlay-delete-event') {
    const eventTime = getEventTimeAtContextBar();
    if (!eventTime) {
      bus.emit('status:update', { text: '当前时间没有可删除的时间线', isError: true });
    } else {
      recordHistory('Delete Time Line', () => deleteEventTime(eventTime.id));
      bus.emit('status:update', {
        text: `已删除 ${eventTime.date} ${eventTime.label || getEventTimeLabel(eventTime.time)} 时间线`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'time-overlay-clear-events') {
    const cleared = await recordHistory('Clear Time Lines', () => clearEventTimes());
    bus.emit('status:update', {
      text: cleared ? '已清除所有时间线' : '没有可清除的时间线',
      isError: false,
    });
    hideContextMenu();
  } else if (action === 'time-overlay-killzone-start') {
    const time = getContextEventTime();
    const date = getContextEventDate();
    if (!time || !date) {
      bus.emit('status:update', { text: '无法设置 Killzone：没有可用 K 线时间', isError: true });
    } else {
      recordHistory('Start Killzone', () => setKillzoneDraft({ date, startTime: time }));
      bus.emit('status:update', {
        text: `Killzone 起点: ${date} ${getEventTimeLabel(time)}`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'time-overlay-killzone-end') {
    const time = getContextEventTime();
    const date = getContextEventDate();
    const killzoneDraft = getTimeOverlaySettings().killzoneDraft;
    if (!time || !date || !killzoneDraft || killzoneDraft.date !== date) {
      bus.emit('status:update', { text: '无法完成 Killzone：请先在同一天设置起点', isError: true });
    } else if (time === killzoneDraft.startTime) {
      bus.emit('status:update', { text: 'Killzone 起点和终点不能相同', isError: true });
    } else {
      const label = promptKillzoneLabel('Killzone');
      if (label !== null) {
        const killzone = await recordHistory('Create Killzone', () => {
          const nextKillzone = addKillzone({
            date,
            label,
            startTime: killzoneDraft.startTime,
            endTime: time,
          });
          clearKillzoneDraft();
          return nextKillzone;
        });
        bus.emit('status:update', {
          text: killzone
            ? `已创建 Killzone: ${killzone.label} ${date} ${getEventTimeLabel(killzone.startTime)}-${getEventTimeLabel(killzone.endTime)}`
            : 'Killzone 创建失败',
          isError: !killzone,
        });
      }
    }
    hideContextMenu();
  } else if (action === 'time-overlay-killzone-rename') {
    const killzone = getKillzoneAtContextBar();
    if (!killzone) {
      bus.emit('status:update', { text: '当前位置没有 Killzone', isError: true });
    } else {
      const label = promptKillzoneLabel(killzone.label || 'Killzone');
      if (label !== null) {
        recordHistory('Rename Killzone', () => updateKillzone(killzone.id, { label }));
        bus.emit('status:update', { text: `Killzone 已重命名为 ${label}`, isError: false });
      }
    }
    hideContextMenu();
  } else if (action === 'time-overlay-killzone-delete') {
    const killzone = getKillzoneAtContextBar();
    const deleted = killzone ? await recordHistory('Delete Killzone', () => deleteKillzone(killzone.id)) : false;
    bus.emit('status:update', {
      text: deleted ? `已删除 Killzone: ${killzone.label}` : '当前位置没有可删除的 Killzone',
      isError: !deleted,
    });
    hideContextMenu();
  } else if (action === 'time-overlay-killzone-clear') {
    const cleared = await recordHistory('Clear Killzones', () => clearKillzones());
    bus.emit('status:update', {
      text: cleared ? 'Killzones 已清除' : '没有可清除的 Killzone',
      isError: false,
    });
    hideContextMenu();
  } else if (action === 'eqh-start' || action === 'eql-start') {
    recordHistory(`Start ${action === 'eqh-start' ? 'EQH' : 'EQL'} Set`, () =>
      startPointSet(action === 'eqh-start' ? 'eqh' : 'eql', contextMenuBar, getBarChartTime)
    );
    hideContextMenu();
  } else if (action === 'pointset-add') {
    recordHistory('Add Point Set Point', () => addPointSetPoint(contextMenuBar, getBarChartTime));
    hideContextMenu();
  } else if (action === 'pointset-finish') {
    recordHistory('Finish Point Set', () => finishPointSet());
    hideContextMenu();
  } else if (action === 'pointset-cancel') {
    recordHistory('Cancel Point Set', () => cancelPointSet());
    hideContextMenu();
  } else if (action === 'selected-pointset-add') {
    const selected = getSelectedPda();
    if (selected) recordHistory('Add Point To Selected Set', () => appendPointToPointSet(selected.id, contextMenuBar, getBarChartTime));
    hideContextMenu();
  } else if (action === 'segment-start-low' || action === 'segment-start-high') {
    recordHistory('Start Segment', () =>
      startSegment(contextMenuBar, action === 'segment-start-high' ? 'swing-high' : 'swing-low')
    );
    hideContextMenu();
  } else if (action === 'segment-finish-low' || action === 'segment-finish-high') {
    recordHistory('Finish Segment', () =>
      finishSegment(contextMenuBar, action === 'segment-finish-high' ? 'swing-high' : 'swing-low')
    ).catch((err) => {
      console.warn('[manual-annotation] finish segment failed', err);
      bus.emit('status:update', { text: '行情段创建失败', isError: true });
    });
    hideContextMenu();
  } else if (action === 'segment-cancel') {
    recordHistory('Cancel Segment', () => cancelSegmentSelection());
    hideContextMenu();
  } else if (action === 'segment-clear') {
    recordHistory('Clear Segments', () => clearManualSegments());
    hideContextMenu();
  } else if (action === 'segment-link-pda') {
    const selectedSegment = getSelectedSegment();
    const annotation = contextMenuPdaHit ? getAnnotationById(contextMenuPdaHit.id) : null;
    const relation = e.target.closest('[data-relation]')?.dataset.relation;
    if (selectedSegment && annotation && relation) {
      recordHistory('Link PDA To Segment', () =>
        linkPdaResponse(selectedSegment.id, {
          pdaId: annotation.id,
          pdaType: annotation.type,
          relation,
        })
      );
      bus.emit('status:update', {
        text: `${getPdaLabel(annotation)} linked to selected segment as ${relation}`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'segment-group-add') {
    const segment = contextMenuSegmentHit ? getSegmentById(contextMenuSegmentHit.id) : null;
    if (segment) {
      const draftIds = await recordHistory('Add Segment To Composite Draft', () => addSegmentToDraftGroup(segment.id) || []);
      bus.emit('status:update', {
        text: `${getSegmentLabel(segment)} added to Composite Draft (${draftIds.length})`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'segment-group-remove') {
    const segment = contextMenuSegmentHit ? getSegmentById(contextMenuSegmentHit.id) : null;
    if (segment) {
      const draftIds = await recordHistory('Remove Segment From Composite Draft', () => removeSegmentFromDraftGroup(segment.id));
      bus.emit('status:update', {
        text: `${getSegmentLabel(segment)} removed from Composite Draft (${draftIds.length})`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'segment-group-set-target') {
    const segment = contextMenuSegmentHit ? getSegmentById(contextMenuSegmentHit.id) : null;
    if (segment) {
      recordHistory('Set Composite Target', () => setDraftSegmentGroupTarget(segment.id));
      bus.emit('status:update', {
        text: `${getSegmentLabel(segment)} set as Composite Target`,
        isError: false,
      });
    }
    hideContextMenu();
  } else if (action === 'segment-group-create') {
    const group = await recordHistory('Create Composite Move', () => createCompositeMove({ outcome: 'pending' }));
    bus.emit('status:update', {
      text: group ? `Composite Move created: ${group.childSegmentIds.length} legs` : 'Composite Move 至少需要 2 个 staged segments',
      isError: !group,
    });
    hideContextMenu();
  } else if (action === 'segment-group-clear') {
    recordHistory('Clear Composite Draft', () => clearDraftSegmentGroup());
    bus.emit('status:update', { text: 'Composite Draft cleared', isError: false });
    hideContextMenu();
  } else if (action === 'toggle-ndog') {
    await toggleTodayNdog(contextMenuBar);
    hideContextMenu();
  } else if (action === 'toggle-nwog') {
    toggleThisWeekNwog(contextMenuBar);
    hideContextMenu();
  } else if (action === 'clear') {
    recordHistory('Clear PDA', () => {
      clearAnnotations();
      clearAllPdaResponses();
      clearManualPdaWorkflowState();
      clearPointSetSelection({ silent: true });
    });
    hideContextMenu();
    bus.emit('status:update', { text: 'PDA 标注已清除', isError: false });
  }
}

function handleGlobalClick(e) {
  if (!e.target.closest('.pda-menu')) {
    hideContextMenu();
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    if (chartNoteEditorEl) {
      closeChartNoteEditor();
    } else if (cancelManualPdaWorkflow()) {
      // handled by PDA workflow
    } else if (getPointSetSelectionSummary()) {
      clearPointSetSelection();
    } else if (getSegmentSelectionSummary()) {
      cancelSegmentSelection();
    } else if (getTimeOverlaySettings().killzoneDraft) {
      clearKillzoneDraft();
      bus.emit('status:update', { text: 'Killzone 选择已取消', isError: false });
    }
    hideContextMenu();
  }
}

export function initManualAnnotation() {
  controlsEl = document.getElementById('pda-context-menu');
  if (!controlsEl) return;

  controlsEl.addEventListener('click', handleControlClick);
  document.getElementById('chart')?.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', handleGlobalClick);
  window.addEventListener('keydown', handleKeydown);
  bus.on('bars:loaded', () => {
    clearManualPdaWorkflowState();
    clearKillzoneDraft();
    clearPointSetSelection({ silent: true });
    hideContextMenu();
    closeChartNoteEditor();
  });
  bus.on('bars:cleared', () => {
    clearManualPdaWorkflowState();
    clearKillzoneDraft();
    clearPointSetSelection({ silent: true });
    clearPdaContextDataCache();
    hideContextMenu();
    closeChartNoteEditor();
  });
}
