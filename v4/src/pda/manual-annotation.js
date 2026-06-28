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
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { createManualChartNoteController } from './manual-chart-note-actions.js';
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
import { createManualTimeOverlayController } from './manual-time-overlay-actions.js';
import { CHART_PANE_IDS, getPaneById, getPaneLabel, setPaneSyncEnabled } from '../chart-panes/chart-pane-store.js';

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

const chartNoteActions = createManualChartNoteController({
  getContextBar: () => contextMenuBar,
  getContextPoint: () => contextMenuPoint,
  hideContextMenu,
});

const timeOverlayActions = createManualTimeOverlayController({
  getContextBar: () => contextMenuBar,
  hideContextMenu,
});

function getPrimaryContext() {
  return getPrimaryChartContext();
}

function ensurePaneSyncForCreation(paneId) {
  const pane = getPaneById(paneId);
  if (!pane || pane.syncEnabled) return;
  setPaneSyncEnabled(paneId, true);
  bus.emit('status:update', {
    text: `${pane.label} switched to Sync for new chart object`,
    isError: false,
  });
}

function isManualPdaCreationAction(action) {
  return [
    'bsl',
    'ssl',
    'wick-ce-upper',
    'wick-ce-lower',
    'fvg',
    'ifvg',
    'ob-bullish',
    'ob-bearish',
    'ob-last-bar',
    'breaker-bullish',
    'breaker-bearish',
    'fib-start',
  ].includes(action);
}

function isPaneObjectCreationAction(action) {
  return (
    isManualPdaCreationAction(action) ||
    action === 'segment-start-low' ||
    action === 'segment-start-high' ||
    action === 'segment-finish-low' ||
    action === 'segment-finish-high' ||
    action === 'order-setup-create-bullish' ||
    action === 'order-setup-create-bearish' ||
    action === 'live-record-new-here' ||
    action === 'live-record-create-bullish' ||
    action === 'live-record-create-bearish'
  );
}

function getBarChartTime(bar) {
  return getContextBarChartTime(getPrimaryContext(), bar);
}

function getBarEventDate(bar) {
  if (!bar || !Number.isFinite(Number(bar.timestamp))) return '';
  const date = new Date(Number(bar.timestamp) * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function findDisplayBar(time) {
  return findDisplayBarInContext(getPrimaryContext(), time);
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

function renderClearMenuItems() {
  return `
    <button class="pda-menu-item" data-pda-action="clear">Clear PDA</button>
    <button class="pda-menu-item" data-pda-action="segment-clear">Clear Segments</button>
    ${timeOverlayActions.renderClearMenuItems()}
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
      chartNote: chartNoteActions.getChartNoteAtContextBar() || chartNoteActions.getChartNoteRangeAtContextBar(),
      liveRecordHit: contextMenuLiveRecordHit,
      isShift: contextMenuShiftKey,
    }),
    segmentPdaLinkItems,
    segmentGroupItems,
    segmentItems,
    pointSetItems,
    chartNoteItems: chartNoteActions.renderMenuItems(bar),
    timeOverlayItems: timeOverlayActions.renderMenuItems(bar),
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
  if (isPaneObjectCreationAction(action)) {
    ensurePaneSyncForCreation(CHART_PANE_IDS.PRIMARY);
  }

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
    sourceChartId: 'primary',
    sourceChartLabel: getPaneLabel(CHART_PANE_IDS.PRIMARY),
    sourceInstrument: getPrimaryInstrument(),
    sourceTimeframe: store.getCurrentTimeframe(),
    sourceTimeframeLabel: timeframeToString(store.getCurrentTimeframe()),
    sourceContext: `${getPrimaryInstrument()} ${timeframeToString(store.getCurrentTimeframe())}`,
    pdaHit: contextMenuPdaHit,
    segmentHit: contextMenuSegmentHit,
    segmentGroupHit: contextMenuSegmentGroupHit,
    chartNote: chartNoteActions.getChartNoteAtContextBar() || chartNoteActions.getChartNoteRangeAtContextBar(),
    liveRecordId: e.target.closest('[data-live-record-id]')?.dataset.liveRecordId || '',
    liveRecordElement: e.target.closest('[data-live-record-element]')?.dataset.liveRecordElement || '',
  })) {
    hideContextMenu();
  } else if (handleOrderSetupChartAction(action, {
    bar: contextMenuBar,
    price: contextMenuPrice,
    priceToCoordinate: chart.priceToCoordinate,
    timeframe: timeframeToString(store.getCurrentTimeframe()),
    sourceChartId: 'primary',
    sourceChartLabel: getPaneLabel(CHART_PANE_IDS.PRIMARY),
    sourceInstrument: getPrimaryInstrument(),
    sourceTimeframe: store.getCurrentTimeframe(),
    sourceTimeframeLabel: timeframeToString(store.getCurrentTimeframe()),
    sourceContext: `${getPrimaryInstrument()} ${timeframeToString(store.getCurrentTimeframe())}`,
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
  } else if (chartNoteActions.handleAction(action)) {
    // handled by chart note workflow
  } else if (await timeOverlayActions.handleAction(action)) {
    // handled by time overlay workflow
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
    if (chartNoteActions.closeEditor()) {
      // handled by chart note workflow
    } else if (cancelManualPdaWorkflow()) {
      // handled by PDA workflow
    } else if (getPointSetSelectionSummary()) {
      clearPointSetSelection();
    } else if (getSegmentSelectionSummary()) {
      cancelSegmentSelection();
    } else if (timeOverlayActions.cancelDraftIfActive()) {
      // handled by time overlay workflow
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
    timeOverlayActions.clearDraft();
    clearPointSetSelection({ silent: true });
    hideContextMenu();
    chartNoteActions.reset();
  });
  bus.on('bars:cleared', () => {
    clearManualPdaWorkflowState();
    timeOverlayActions.clearDraft();
    clearPointSetSelection({ silent: true });
    clearPdaContextDataCache();
    hideContextMenu();
    chartNoteActions.reset();
  });
}
