// Hideable right-side inspector for selected chart objects.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as viewport from '../chart/viewport-controller.js';
import * as secondaryViewport from '../chart/secondary-viewport-controller.js';
import * as store from '../data/bar-store.js';
import { timeframeToString } from '../config.js';
import { clearSelection as clearPdaSelection, getSelectedPda, selectPda } from '../pda/pda-selection.js';
import { exportPdaArchive, importPdaArchive } from '../pda/pda-archive.js';
import { exportReviewArchive, importReviewArchive } from '../review/review-archive.js';
import { clearSavedAnnotations } from '../pda/pda-persistence.js';
import { deleteAnnotation, getAnnotationById, updateAnnotation } from '../pda/pda-store.js';
import { buildExtendDisplayPatch } from '../pda/pda-extend.js';
import { getPdaType } from '../pda/pda-types.js';
import {
  clearSegmentGroupSelection,
  clearSegmentSelection,
  getSelectedSegment,
  getSelectedSegmentGroup,
  selectSegment,
  selectSegmentGroup,
} from '../segment/segment-selection.js';
import {
  deleteSegment,
  getSegmentById,
  removePdaResponse,
  setSegmentIsolated,
  updatePdaResponse,
  updateSegment,
} from '../segment/segment-store.js';
import {
  addSegmentToDraftGroup,
  clearDraftSegmentGroup,
  createCompositeMove,
  deleteSegmentGroup,
  removeSegmentFromDraftGroup,
  setDraftSegmentGroupTarget,
  updateSegmentGroup,
  getSegmentGroupById,
} from '../segment/segment-group-store.js';
import { getDrawingSets, isDrawingSetFocused, locateDrawingSet } from '../segment/drawing-set-list.js';
import { renderArchiveActions } from './inspector/archive-panel.js';
import {
  getPointSetContext,
  getPointSetReference,
  renderAnnotationPanel,
} from './inspector/pda-panel.js';
import { parseTags, renderSegmentPanel } from './inspector/segment-panel.js';
import { renderSegmentGroupPanel } from './inspector/segment-group-panel.js';
import { renderSmtPanel } from './inspector/smt-panel.js';
import { renderOrderReviewPanel } from './inspector/order-review-panel.js';
import {
  getDefaultCalendarDate,
  getCalendarDateTimestamp,
  getNextCalendarViewDate,
  renderCalendarPanel,
} from './inspector/calendar-panel.js';
import { updateTimeOverlaySettings } from '../time-overlays/time-overlay-store.js';
import { deleteSmtRecord, getSmtRecordById, getSmtRecords, updateSmtRecord } from '../smt/smt-store.js';
import {
  clearActiveReviewSet,
  getActiveReviewSetId,
  getActiveReviewSet,
  linkRefToActiveReviewSet,
  setActiveReviewSet,
} from '../order/order-review-active.js';
import {
  addOrderReview,
  deleteOrderReview,
  getOrderReviewById,
  getOrderReviews,
  ORDER_EVENT_TYPES,
  ORDER_REF_ROLES,
  ORDER_REF_TYPES,
  updateOrderReview,
} from '../order/order-review-store.js';
import {
  buildPdaOrderRefMetadata,
  buildSegmentOrderRefMetadata,
  getPdaOrderRefLabel,
  getSegmentOrderRefLabel,
} from '../order/order-ref-metadata.js';
import { locateReviewSet } from '../order/order-review-set.js';
import {
  EVIDENCE_TYPES,
  buildDefaultActorFromSegment,
  createReactionEvidence,
  normalizeReactionEvidenceList,
  parseEvidenceTimestamp,
} from '../segment/reaction-evidence.js';
import { recordHistory } from '../history/history-manager.js';

let sidebarEl = null;
let bodyEl = null;
let currentPanel = 'empty';
let actorPickState = null;
let orderReviewTimePickState = null;
let orderReviewPricePickState = null;
let expandedOrderReviewId = null;
let selectedSmtId = null;
let calendarSelectedDate = '';
let calendarViewDate = '';
let calendarReturnContext = null;

function getOrderReviewPanelOptions(extra = {}) {
  return {
    expandedOrderReviewId,
    activeOrderReviewId: getActiveReviewSetId(),
    ...extra,
  };
}

function renderCalendarReturnAction(type, id) {
  if (
    !calendarReturnContext ||
    calendarReturnContext.type !== type ||
    String(calendarReturnContext.id) !== String(id)
  ) {
    return '';
  }
  return `
    <div class="inspector-return-bar">
      <button class="inspector-button secondary" data-inspector-action="calendar-return" type="button">
        Back to Calendar
      </button>
    </div>
  `;
}

function normalizeTimeKey(time) {
  if (time && typeof time === 'object') {
    const month = String(time.month).padStart(2, '0');
    const day = String(time.day).padStart(2, '0');
    return `${time.year}-${month}-${day}`;
  }
  return time;
}

function getBarChartTime(bar, timeframe = store.getCurrentTimeframe()) {
  return timeframe === 1440 ? bar.tradingDay : bar.timestamp;
}

function findDisplayBarByChartTime(time) {
  if (time === undefined || time === null) return null;
  const target = normalizeTimeKey(time);
  const timeframe = store.getCurrentTimeframe();
  return (
    store
      .getDisplayBars()
      .find((bar) => normalizeTimeKey(getBarChartTime(bar, timeframe)) === target) || null
  );
}

function clearActorPickState({ silent = false } = {}) {
  if (!actorPickState) return false;
  actorPickState = null;
  chart.hidePickPreviewCursor();
  if (!silent) {
    bus.emit('status:update', { text: 'Actor bar pick 已取消', isError: false });
  }
  return true;
}

function clearOrderReviewPickState({ silent = false } = {}) {
  if (!orderReviewTimePickState && !orderReviewPricePickState) return false;
  orderReviewTimePickState = null;
  orderReviewPricePickState = null;
  chart.hidePickPreviewCursor();
  if (!silent) {
    bus.emit('status:update', { text: 'Order Review pick 已取消', isError: false });
  }
  return true;
}

function getActorFieldLabel(actorField) {
  if (actorField === 'firstBarTimestamp') return 'Actor First';
  if (actorField === 'lastBarTimestamp') return 'Actor Last';
  if (actorField === 'terminalBarTimestamp') return 'Actor Terminal';
  return 'Actor Bar';
}

function getOrderReviewPickLabel(section, field) {
  if (section === 'setupThesis' && field === 'primaryEventTimestamp') return 'Setup Event Time';
  if (section === 'entryPlan' && field === 'entryTimestamp') return 'Entry Time';
  if (section === 'resultReview' && field === 'exitTimestamp') return 'Exit Time';
  return 'Order Setup Time';
}

function getOrderReviewPricePickLabel(field) {
  if (field === 'entryPrice') return 'Entry Price';
  if (field === 'stopLoss') return 'Stop Loss';
  if (field === 'finalTarget') return 'Final Target';
  return 'Order Setup Price';
}

function renderAnnotation(annotation) {
  currentPanel = 'selection';
  bodyEl.innerHTML = `
    ${renderCalendarReturnAction('pda', annotation.id)}
    ${renderAnnotationPanel(annotation, renderArchiveActions())}
  `;
}

function renderSegment(segment) {
  currentPanel = 'selection';
  bodyEl.innerHTML = `
    ${renderCalendarReturnAction('segment', segment.id)}
    ${renderSegmentPanel(segment)}
    ${renderOrderReviewPanel(getOrderReviews(), getOrderReviewPanelOptions({
      createAction: 'order-review-create-segment',
      createLabel: 'Create Setup With Segment',
    }))}
  `;
}

function renderSegmentGroup(segmentGroup) {
  currentPanel = 'selection';
  bodyEl.innerHTML = `
    ${renderCalendarReturnAction('composite', segmentGroup.id)}
    ${renderSegmentGroupPanel(segmentGroup)}
    ${renderOrderReviewPanel(getOrderReviews(), getOrderReviewPanelOptions({
      createAction: 'order-review-create-composite',
      createLabel: 'Create Setup With Composite',
    }))}
  `;
}

function renderSmtSelection() {
  currentPanel = 'selection';
  bodyEl.innerHTML = `
    ${renderCalendarReturnAction('smt', selectedSmtId)}
    ${renderSmtPanel(getSmtRecords(), { selectedSmtId })}
  `;
}

function renderEmpty({ preserveCalendarReturn = false } = {}) {
  currentPanel = 'empty';
  if (!preserveCalendarReturn) calendarReturnContext = null;
  if (!calendarSelectedDate) calendarSelectedDate = getDefaultCalendarDate();
  if (!calendarViewDate) calendarViewDate = calendarSelectedDate;
  bodyEl.innerHTML = `
    ${preserveCalendarReturn ? renderCalendarReturnAction('order-setup', getActiveReviewSetId()) : ''}
    <div class="inspector-empty">
      Select a PDA or 1H segment on the chart.
    </div>
    ${renderCalendarPanel({ selectedDate: calendarSelectedDate, viewDate: calendarViewDate })}
    ${renderOrderReviewPanel(getOrderReviews(), getOrderReviewPanelOptions({
      createAction: 'order-review-create-empty',
      createLabel: 'Create Order Setup',
    }))}
    ${renderSmtPanel(getSmtRecords(), { selectedSmtId })}
    ${renderDrawingSetList()}
    ${renderArchiveActions()}
  `;
}

function renderArchivePanel() {
  currentPanel = 'archive';
  calendarReturnContext = null;
  if (!calendarSelectedDate) calendarSelectedDate = getDefaultCalendarDate();
  if (!calendarViewDate) calendarViewDate = calendarSelectedDate;
  bodyEl.innerHTML = `
    ${renderCalendarPanel({ selectedDate: calendarSelectedDate, viewDate: calendarViewDate })}
    ${renderOrderReviewPanel(getOrderReviews(), getOrderReviewPanelOptions())}
    ${renderSmtPanel(getSmtRecords(), { selectedSmtId })}
    ${renderArchiveActions()}
  `;
}

function renderDrawingSetList() {
  const sets = getDrawingSets();
  const rows = sets.length
    ? sets
        .map(
          (set) => {
            const isFocused = isDrawingSetFocused(set.type, set.id);
            return `
            <button class="drawing-set-row${isFocused ? ' active' : ''}" data-inspector-action="drawing-set-locate" data-set-type="${set.type}" data-set-id="${set.id}" type="button" aria-pressed="${isFocused ? 'true' : 'false'}">
              <span class="drawing-set-main">${set.label}</span>
              <span class="drawing-set-meta">${set.detail}</span>
            </button>
          `;
          }
        )
        .join('')
    : '<div class="drawing-set-empty">No segment or composite sets.</div>';

  return `
    <section class="inspector-section drawing-set-section">
      <div class="inspector-section-title">Structure Sets</div>
      <div class="drawing-set-list">${rows}</div>
    </section>
  `;
}

function openSidebar() {
  sidebarEl?.classList.add('open');
}

function closeSidebar() {
  sidebarEl?.classList.remove('open');
}

function refreshSelection() {
  if (currentPanel === 'archive') {
    renderArchivePanel();
    return;
  }

  const pdaSelection = getSelectedPda();
  if (pdaSelection) {
    const annotation = getAnnotationById(pdaSelection.id);
    if (annotation) {
      renderAnnotation(annotation);
      return;
    }
  }

  const segmentSelection = getSelectedSegment();
  if (segmentSelection) {
    const segment = getSegmentById(segmentSelection.id);
    if (segment) {
      renderSegment(segment);
      return;
    }
  }

  const segmentGroupSelection = getSelectedSegmentGroup();
  if (segmentGroupSelection) {
    const segmentGroup = getSegmentGroupById(segmentGroupSelection.id);
    if (segmentGroup) {
      renderSegmentGroup(segmentGroup);
      return;
    }
  }

  renderEmpty();
}

function createSidebar() {
  sidebarEl = document.createElement('aside');
  sidebarEl.id = 'inspector-sidebar';
  sidebarEl.innerHTML = `
    <div class="inspector-header">
      <div class="inspector-title">Inspector</div>
      <button class="inspector-close" type="button" title="Close inspector">X</button>
    </div>
    <div class="inspector-body"></div>
  `;
  document.getElementById('workspace')?.appendChild(sidebarEl);
  bodyEl = sidebarEl.querySelector('.inspector-body');
  sidebarEl.querySelector('.inspector-close')?.addEventListener('click', closeSidebar);
  sidebarEl.addEventListener('change', handleInspectorChange);
  sidebarEl.addEventListener('click', handleInspectorClick);
  renderEmpty();
}

function getCurrentAnnotation() {
  const selection = getSelectedPda();
  return selection ? getAnnotationById(selection.id) : null;
}

function getCurrentSegment() {
  const selection = getSelectedSegment();
  return selection ? getSegmentById(selection.id) : null;
}

function getCurrentSegmentGroup() {
  const selection = getSelectedSegmentGroup();
  return selection ? getSegmentGroupById(selection.id) : null;
}

function getSegmentResponse(segment, pdaId) {
  return (Array.isArray(segment?.pdaResponses) ? segment.pdaResponses : []).find(
    (response) => response.pdaId === pdaId
  );
}

function getSegmentTimestamp(segment) {
  return segment?.end?.timestamp ?? segment?.end?.time ?? segment?.start?.timestamp ?? segment?.start?.time ?? null;
}

function getSegmentPrice(segment) {
  return segment?.end?.price ?? segment?.start?.price ?? null;
}

function getCompositeTimestamp(group) {
  const childIds = Array.isArray(group?.childSegmentIds) ? group.childSegmentIds : [];
  const childSegments = childIds.map(getSegmentById).filter(Boolean);
  const terminal = childSegments[childSegments.length - 1];
  return getSegmentTimestamp(terminal);
}

function createOrderReviewFromSegment(segment) {
  const timestamp = getSegmentTimestamp(segment);
  const segmentRef = buildSegmentOrderReviewRef(segment);
  const order = addOrderReview({
    setupThesis: {
      primaryEventTimestamp: timestamp,
      primaryEventTimeframe: segment.timeframe || '1H',
      primaryEventType: ORDER_EVENT_TYPES.OTHER,
      primaryEventPrice: getSegmentPrice(segment),
      linkedObjectRefs: [
        segmentRef,
      ],
    },
    entryPlan: {
      entryTimestamp: timestamp,
      entryTimeframe: segment.timeframe || '1H',
    },
  });
  expandedOrderReviewId = order.id;
  setActiveReviewSet(order.id);
  refreshSelection();
  bus.emit('status:update', { text: `已创建 Order Setup: ${order.id}`, isError: false });
  return order;
}

function createOrderReviewFromComposite(group) {
  const timestamp = getCompositeTimestamp(group);
  const order = addOrderReview({
    setupThesis: {
      primaryEventTimestamp: timestamp,
      primaryEventTimeframe: '1H',
      primaryEventType: ORDER_EVENT_TYPES.OTHER,
      linkedObjectRefs: [
        {
          type: ORDER_REF_TYPES.COMPOSITE,
          id: group.id,
          role: ORDER_REF_ROLES.CONTEXT,
        },
      ],
      narrative: group.notes || '',
    },
    entryPlan: {
      entryTimestamp: timestamp,
      entryTimeframe: '1H',
    },
  });
  expandedOrderReviewId = order.id;
  setActiveReviewSet(order.id);
  refreshSelection();
  bus.emit('status:update', { text: `已创建 Order Setup: ${order.id}`, isError: false });
  return order;
}

function createBlankOrderReview() {
  const order = addOrderReview();
  expandedOrderReviewId = order.id;
  setActiveReviewSet(order.id);
  refreshSelection();
  bus.emit('status:update', { text: `已创建空白 Order Setup: ${order.id}`, isError: false });
  return order;
}

function parseOrderReviewFieldValue(target) {
  const field = target.dataset.orderReviewField;
  if (target.type === 'checkbox') return target.checked;
  if (
    field === 'primaryEventTimestamp' ||
    field === 'entryTimestamp' ||
    field === 'exitTimestamp'
  ) {
    return parseEvidenceTimestamp(target.value);
  }
  if (
    field === 'primaryEventPrice' ||
    field === 'entryPrice' ||
    field === 'stopLoss' ||
    field === 'targetInternal' ||
    field === 'targetSwing' ||
    field === 'targetExternal' ||
    field === 'finalTarget' ||
    field === 'exitPrice'
  ) {
    return target.value === '' ? null : Number(target.value);
  }
  return target.value;
}

function isOrderReviewTimestampField(field) {
  return field === 'primaryEventTimestamp' || field === 'entryTimestamp' || field === 'exitTimestamp';
}

function isOrderReviewNumberField(field) {
  return (
    field === 'primaryEventPrice' ||
    field === 'entryPrice' ||
    field === 'stopLoss' ||
    field === 'targetInternal' ||
    field === 'targetSwing' ||
    field === 'targetExternal' ||
    field === 'finalTarget' ||
    field === 'exitPrice'
  );
}

function getOrderReviewFieldLabel(section, field) {
  if (section === 'setupThesis' && field === 'primaryEventTimestamp') return 'Setup event time';
  if (section === 'setupThesis' && field === 'primaryEventPrice') return 'Setup event price';
  if (section === 'entryPlan' && field === 'entryTimestamp') return 'Entry time';
  if (section === 'entryPlan' && field === 'entryPrice') return 'Entry price';
  if (section === 'entryPlan' && field === 'stopLoss') return 'Stop loss';
  if (section === 'entryPlan' && field === 'targetInternal') return 'Internal target';
  if (section === 'entryPlan' && field === 'targetSwing') return 'Swing target';
  if (section === 'entryPlan' && field === 'targetExternal') return 'External target';
  if (section === 'entryPlan' && field === 'finalTarget') return 'Final target';
  if (section === 'resultReview' && field === 'exitTimestamp') return 'Exit time';
  if (section === 'resultReview' && field === 'exitPrice') return 'Exit price';
  return field;
}

function recordInspectorHistory(label, mutator) {
  return recordHistory(label, mutator);
}

function validateOrderReviewFieldValue(target, value) {
  const section = target.dataset.orderReviewSection;
  const field = target.dataset.orderReviewField;
  const label = getOrderReviewFieldLabel(section, field);
  if (isOrderReviewTimestampField(field) && target.value && value === null) {
    bus.emit('status:update', { text: `${label} 格式无效，请使用 YYYY-MM-DD HH:mm`, isError: true });
    return false;
  }
  if (isOrderReviewNumberField(field) && target.value !== '' && !Number.isFinite(value)) {
    bus.emit('status:update', { text: `${label} 必须是数字`, isError: true });
    return false;
  }
  return true;
}

function updateOrderReviewSetupField(target) {
  const orderReviewId = target.dataset.orderReviewId;
  const field = target.dataset.orderReviewField;
  if (!orderReviewId || !field) return false;

  expandedOrderReviewId = orderReviewId;
  const value = parseOrderReviewFieldValue(target);
  if (!validateOrderReviewFieldValue(target, value)) return true;

  recordInspectorHistory('Update Order Setup', () => updateOrderReview(orderReviewId, {
    setupThesis: {
      [field]: value,
    },
  }));
  return true;
}

function updateOrderReviewEntryField(target) {
  const orderReviewId = target.dataset.orderReviewId;
  const field = target.dataset.orderReviewField;
  if (!orderReviewId || !field) return false;

  expandedOrderReviewId = orderReviewId;
  const value = parseOrderReviewFieldValue(target);
  if (!validateOrderReviewFieldValue(target, value)) return true;

  recordInspectorHistory('Update Order Entry', () => updateOrderReview(orderReviewId, {
    entryPlan: {
      [field]: value,
    },
  }));
  return true;
}

function updateOrderReviewResultField(target) {
  const orderReviewId = target.dataset.orderReviewId;
  const field = target.dataset.orderReviewField;
  if (!orderReviewId || !field) return false;

  expandedOrderReviewId = orderReviewId;
  const value = parseOrderReviewFieldValue(target);
  if (!validateOrderReviewFieldValue(target, value)) return true;

  recordInspectorHistory('Update Order Result', () => updateOrderReview(orderReviewId, {
    resultReview: {
      [field]: value,
    },
  }));
  return true;
}

function getOrderReviewRefs(order) {
  return Array.isArray(order?.setupThesis?.linkedObjectRefs) ? order.setupThesis.linkedObjectRefs : [];
}

function patchOrderReviewRefs(orderReviewId, refs) {
  expandedOrderReviewId = orderReviewId;
  recordInspectorHistory('Update Order Refs', () => updateOrderReview(orderReviewId, {
    setupThesis: {
      linkedObjectRefs: refs,
    },
  }));
}

function addOrderReviewRef(orderReviewId, ref) {
  const order = getOrderReviewById(orderReviewId);
  if (!order || !ref?.type || !ref?.id) return false;
  patchOrderReviewRefs(orderReviewId, [...getOrderReviewRefs(order), ref]);
  return true;
}

function buildPdaOrderReviewRef(annotation) {
  return {
    type: ORDER_REF_TYPES.PDA,
    id: annotation.id,
    role: ORDER_REF_ROLES.CONTEXT,
    ...buildPdaOrderRefMetadata(annotation),
  };
}

function buildSegmentOrderReviewRef(segment) {
  return {
    type: ORDER_REF_TYPES.SEGMENT,
    id: segment.id,
    role: ORDER_REF_ROLES.CONTEXT,
    ...buildSegmentOrderRefMetadata(segment),
  };
}

function removeOrderReviewRef(orderReviewId, refIndex) {
  const order = getOrderReviewById(orderReviewId);
  const refs = getOrderReviewRefs(order);
  if (!order || refIndex < 0 || refIndex >= refs.length) return false;
  patchOrderReviewRefs(
    orderReviewId,
    refs.filter((_, index) => index !== refIndex)
  );
  return true;
}

function addSelectedOrderReviewRef(action, orderReviewId) {
  if (action === 'order-review-ref-add-selected-pda') {
    const selection = getSelectedPda();
    if (!selection) {
      bus.emit('status:update', { text: '没有选中的 PDA', isError: true });
      return true;
    }
    const annotation = getAnnotationById(selection.id);
    if (!annotation) {
      bus.emit('status:update', { text: '选中的 PDA 不存在', isError: true });
      return true;
    }
    addOrderReviewRef(orderReviewId, buildPdaOrderReviewRef(annotation));
    return true;
  }

  if (action === 'order-review-ref-add-selected-segment') {
    const selection = getSelectedSegment();
    if (!selection) {
      bus.emit('status:update', { text: '没有选中的 Segment', isError: true });
      return true;
    }
    const segment = getSegmentById(selection.id);
    if (!segment) {
      bus.emit('status:update', { text: '选中的 Segment 不存在', isError: true });
      return true;
    }
    addOrderReviewRef(orderReviewId, buildSegmentOrderReviewRef(segment));
    return true;
  }

  if (action === 'order-review-ref-add-selected-composite') {
    const selection = getSelectedSegmentGroup();
    if (!selection) {
      bus.emit('status:update', { text: '没有选中的 Composite Move', isError: true });
      return true;
    }
    addOrderReviewRef(orderReviewId, {
      type: ORDER_REF_TYPES.COMPOSITE,
      id: selection.id,
      role: ORDER_REF_ROLES.CONTEXT,
    });
    return true;
  }

  if (action === 'order-review-ref-add-selected-smt') {
    if (!selectedSmtId || !getSmtRecordById(selectedSmtId)) {
      bus.emit('status:update', { text: '没有选中的 SMT', isError: true });
      return true;
    }
    addOrderReviewRef(orderReviewId, {
      type: ORDER_REF_TYPES.SMT,
      id: selectedSmtId,
      role: ORDER_REF_ROLES.CONFIRMATION,
    });
    return true;
  }

  return false;
}

function startOrderReviewTimePick(target) {
  const orderReviewId = target.dataset.orderReviewId;
  const section = target.dataset.orderReviewSection;
  const field = target.dataset.orderReviewField;
  if (!orderReviewId || !section || !field || !isOrderReviewTimestampField(field)) return;
  if (!store.getDisplayBars().length) {
    bus.emit('status:update', { text: '当前图表没有可 pick 的 K 线', isError: true });
    return;
  }

  clearActorPickState({ silent: true });
  clearOrderReviewPickState({ silent: true });
  expandedOrderReviewId = orderReviewId;
  orderReviewTimePickState = {
    orderReviewId,
    section,
    field,
  };
  bus.emit('status:update', {
    text: `点击主图 K 线选择 ${getOrderReviewPickLabel(section, field)}`,
    isError: false,
  });
}

function startOrderReviewPricePick(target) {
  const orderReviewId = target.dataset.orderReviewId;
  const section = target.dataset.orderReviewSection;
  const field = target.dataset.orderReviewField;
  if (!orderReviewId || !section || !field || !isOrderReviewNumberField(field)) return;
  if (!store.getDisplayBars().length) {
    bus.emit('status:update', { text: '当前图表没有可 pick 的 K 线', isError: true });
    return;
  }

  clearActorPickState({ silent: true });
  clearOrderReviewPickState({ silent: true });
  expandedOrderReviewId = orderReviewId;
  orderReviewPricePickState = {
    orderReviewId,
    section,
    field,
  };
  bus.emit('status:update', {
    text: `点击主图选择 ${getOrderReviewPricePickLabel(field)}`,
    isError: false,
  });
}

function normalizePricePickSource(value) {
  const source = String(value || 'current').trim().toLowerCase();
  if (source === 'o') return 'open';
  if (source === 'h') return 'high';
  if (source === 'l') return 'low';
  if (source === 'c') return 'close';
  if (['open', 'high', 'low', 'close', 'current'].includes(source)) return source;
  return null;
}

function getPickedPrice(bar, currentPrice, source) {
  if (source === 'current') return currentPrice;
  return Number(bar?.[source]);
}

function locateOrderReview(order) {
  if (!locateReviewSet(order?.id, viewport.locateTimestampRange)) {
    bus.emit('status:update', { text: '该 Order Setup 没有可定位时间', isError: true });
    return;
  }
}

function openCalendarObject(type, id) {
  if (!type || !id) return false;
  calendarReturnContext = {
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
    type,
    id,
  };
  if (type === 'order-setup') {
    const selected = Boolean(setActiveReviewSet(id));
    if (!selected) {
      calendarReturnContext = null;
      return false;
    }
    if (selected) {
      calendarReturnContext = {
        selectedDate: calendarSelectedDate,
        viewDate: calendarViewDate,
        type,
        id,
      };
      clearPdaSelection();
      clearSegmentSelection();
      clearSegmentGroupSelection();
      renderEmpty({ preserveCalendarReturn: true });
    }
    return selected;
  }
  if (type === 'pda') {
    clearSegmentSelection();
    clearSegmentGroupSelection();
    const selected = Boolean(selectPda(id));
    if (!selected) calendarReturnContext = null;
    return selected;
  }
  if (type === 'segment') {
    const selected = Boolean(selectSegment(id));
    if (!selected) calendarReturnContext = null;
    return selected;
  }
  if (type === 'composite') {
    const selected = Boolean(selectSegmentGroup(id));
    if (!selected) calendarReturnContext = null;
    return selected;
  }
  if (type === 'smt') {
    const selected = Boolean(getSmtRecordById(id));
    if (!selected) {
      calendarReturnContext = null;
      return false;
    }
    selectedSmtId = id;
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    renderSmtSelection();
    return true;
  }
  calendarReturnContext = null;
  return false;
}

function updateReactionEvidenceList(segment, pdaId, updater) {
  const response = getSegmentResponse(segment, pdaId);
  if (!response) return;
  const evidenceList = normalizeReactionEvidenceList(response.reactionEvidence);
  recordInspectorHistory('Update Reaction Evidence', () => updatePdaResponse(segment.id, pdaId, {
    reactionEvidence: updater(evidenceList),
  }));
}

function addReactionEvidence(segment, pdaId, type) {
  const actor = buildDefaultActorFromSegment(segment, segment.timeframe || '1H');
  const evidence = createReactionEvidence({
    type,
    pdaId,
    timeframe: actor.timeframe,
    firstBarTimestamp: actor.firstBarTimestamp,
    lastBarTimestamp: actor.lastBarTimestamp,
    terminalBarTimestamp: actor.terminalBarTimestamp,
    params: type === EVIDENCE_TYPES.FVG_RESPECT ? { entrySide: 'from-above' } : {},
  });
  updateReactionEvidenceList(segment, pdaId, (evidenceList) => [...evidenceList, evidence]);
}

function patchReactionEvidence(segment, pdaId, evidenceId, patcher) {
  updateReactionEvidenceList(segment, pdaId, (evidenceList) =>
    evidenceList.map((evidence) =>
      evidence.id === evidenceId
        ? {
            ...evidence,
            ...patcher(evidence),
            updatedAt: Date.now(),
          }
        : evidence
    )
  );
}

function startActorBarPick(segment, target) {
  if (!store.getDisplayBars().length) {
    bus.emit('status:update', { text: '当前图表没有可 pick 的 K 线', isError: true });
    return;
  }

  const response = getSegmentResponse(segment, target.pdaId);
  const evidence = normalizeReactionEvidenceList(response?.reactionEvidence).find(
    (item) => item.id === target.evidenceId
  );
  if (!evidence) return;

  const currentTimeframe = timeframeToString(store.getCurrentTimeframe());
  const actorTimeframe = evidence.actor?.timeframe || currentTimeframe;
  if (actorTimeframe !== currentTimeframe) {
    bus.emit('status:update', {
      text: `Actor TF ${actorTimeframe} 与当前图表周期 ${currentTimeframe} 不一致，不能从当前图表 pick`,
      isError: true,
    });
    return;
  }

  actorPickState = {
    segmentId: segment.id,
    pdaId: target.pdaId,
    evidenceId: target.evidenceId,
    actorField: target.actorField,
  };
  bus.emit('status:update', { text: `点击图表选择 ${getActorFieldLabel(target.actorField)}`, isError: false });
}

function handleActorPickChartClick(e) {
  if (!actorPickState && !orderReviewTimePickState && !orderReviewPricePickState) return;
  e.preventDefault();
  e.stopImmediatePropagation();

  const chartEl = document.getElementById('chart');
  if (!chartEl) return;

  const rect = chartEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const time = chart.coordinateToTime(x);
  const bar = findDisplayBarByChartTime(time);
  if (!bar) {
    chart.hidePickPreviewCursor();
    return;
  }

  if (orderReviewTimePickState) {
    const { orderReviewId, section, field } = orderReviewTimePickState;
    clearOrderReviewPickState({ silent: true });
    expandedOrderReviewId = orderReviewId;
    recordInspectorHistory('Pick Order Time', () => updateOrderReview(orderReviewId, {
      [section]: {
        [field]: bar.timestamp,
      },
    }));
    bus.emit('status:update', {
      text: `${getOrderReviewPickLabel(section, field)} 已选择: ${bar.time || bar.tradingDay}`,
      isError: false,
    });
    return;
  }

  if (orderReviewPricePickState) {
    const { orderReviewId, section, field } = orderReviewPricePickState;
    const currentPrice = chart.coordinateToPrice(y);
    const source = normalizePricePickSource(
      window.prompt('Price source: current, open, high, low, close', 'current')
    );
    if (!source) {
      clearOrderReviewPickState({ silent: true });
      bus.emit('status:update', { text: '价格来源无效，已取消 price pick', isError: true });
      return;
    }
    const price = getPickedPrice(bar, currentPrice, source);
    if (!Number.isFinite(Number(price))) {
      clearOrderReviewPickState({ silent: true });
      bus.emit('status:update', { text: '无法从当前点击位置取得价格', isError: true });
      return;
    }

    clearOrderReviewPickState({ silent: true });
    expandedOrderReviewId = orderReviewId;
    recordInspectorHistory('Pick Order Price', () => updateOrderReview(orderReviewId, {
      [section]: {
        [field]: Number(price),
      },
    }));
    bus.emit('status:update', {
      text: `${getOrderReviewPricePickLabel(field)} 已选择 ${source}: ${Number(price).toFixed(2)}`,
      isError: false,
    });
    return;
  }

  const segment = getSegmentById(actorPickState.segmentId);
  if (!segment) {
    clearActorPickState({ silent: true });
    return;
  }

  const { pdaId, evidenceId, actorField } = actorPickState;
  clearActorPickState({ silent: true });
  recordInspectorHistory('Pick Reaction Evidence Bar', () => patchReactionEvidence(segment, pdaId, evidenceId, (evidence) => ({
    actor: {
      ...(evidence.actor || {}),
      [actorField]: bar.timestamp,
      timeframe: timeframeToString(store.getCurrentTimeframe()),
    },
  })));
  bus.emit('status:update', {
    text: `${getActorFieldLabel(actorField)} 已选择: ${bar.time || bar.tradingDay}`,
    isError: false,
  });
}

function handleActorPickHover(param) {
  if (!actorPickState && !orderReviewTimePickState && !orderReviewPricePickState) return;
  const bar = findDisplayBarByChartTime(param?.time);
  if (!bar) {
    chart.hidePickPreviewCursor();
    return;
  }
  chart.showPickPreviewCursor(getBarChartTime(bar));
}

function handleInspectorChange(e) {
  const action = e.target.dataset.inspectorAction;
  if (!action) return;

  if (action === 'import-pda-file') {
    importPdaArchive(e.target.files?.[0]);
    e.target.value = '';
    return;
  }

  if (action === 'import-review-file') {
    importReviewArchive(e.target.files?.[0]);
    e.target.value = '';
    return;
  }

  if (action === 'smt-note') {
    recordInspectorHistory('Update SMT Note', () => updateSmtRecord(e.target.dataset.smtId, { note: e.target.value }));
    return;
  }

  if (action === 'order-review-note') {
    recordInspectorHistory('Update Order Note', () => updateOrderReview(e.target.dataset.orderReviewId, { note: e.target.value }));
    return;
  }

  if (action === 'order-review-result') {
    recordInspectorHistory('Update Order Result', () => updateOrderReview(e.target.dataset.orderReviewId, {
      resultReview: { result: e.target.value },
    }));
    return;
  }

  if (action === 'order-review-edit-field') {
    if (e.target.dataset.orderReviewSection === 'setupThesis') {
      updateOrderReviewSetupField(e.target);
    } else if (e.target.dataset.orderReviewSection === 'entryPlan') {
      updateOrderReviewEntryField(e.target);
    } else if (e.target.dataset.orderReviewSection === 'resultReview') {
      updateOrderReviewResultField(e.target);
    }
    return;
  }

  if (action === 'order-review-pick-time') {
    startOrderReviewTimePick(e.target);
    return;
  }

  if (action === 'order-review-pick-price') {
    startOrderReviewPricePick(e.target);
    return;
  }

  if (action === 'order-review-ref-remove') {
    removeOrderReviewRef(e.target.dataset.orderReviewId, Number(e.target.dataset.refIndex));
    return;
  }

  if (action.startsWith('order-review-ref-add-selected-')) {
    addSelectedOrderReviewRef(action, e.target.dataset.orderReviewId);
    return;
  }

  const segment = getCurrentSegment();
  if (segment) {
    if (action === 'segment-toggle-label') {
      recordInspectorHistory('Toggle Segment Label', () => updateSegment(segment.id, {
        display: {
          ...(segment.display || {}),
          showLabel: e.target.checked,
        },
      }));
      return;
    }

    if (action === 'segment-toggle-isolate') {
      recordInspectorHistory('Toggle Segment Isolate', () => setSegmentIsolated(segment.id, e.target.checked));
      return;
    }

    if (action === 'segment-isolate-display-mode') {
      recordInspectorHistory('Update Segment Display', () => updateSegment(segment.id, {
        display: {
          ...(segment.display || {}),
          isolateDisplayMode: e.target.value,
        },
      }));
      return;
    }

    if (action === 'segment-isolate-previous-count') {
      const parsed = Number(e.target.value);
      recordInspectorHistory('Update Segment Isolate Count', () => updateSegment(segment.id, {
        display: {
          ...(segment.display || {}),
          isolatePreviousCount: Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0,
        },
      }));
      return;
    }

    if (action === 'segment-toggle-isolate-previous-pda') {
      recordInspectorHistory('Update Segment Isolate PDA', () => updateSegment(segment.id, {
        display: {
          ...(segment.display || {}),
          isolatePreviousIncludePda: e.target.checked,
        },
      }));
      return;
    }

    if (action === 'segment-narrative') {
      recordInspectorHistory('Update Segment Narrative', () => updateSegment(segment.id, { narrative: e.target.value }));
      return;
    }

    if (action === 'segment-tags') {
      recordInspectorHistory('Update Segment Tags', () => updateSegment(segment.id, { tags: parseTags(e.target.value) }));
      return;
    }

    if (action === 'segment-response-relation') {
      recordInspectorHistory('Update PDA Response', () => updatePdaResponse(segment.id, e.target.dataset.pdaId, { relation: e.target.value }));
      return;
    }

    if (action === 'segment-response-display-mode') {
      recordInspectorHistory('Update PDA Response Display', () => updatePdaResponse(segment.id, e.target.dataset.pdaId, {
        displayMode: e.target.value,
        selected: e.target.value === 'highlight',
      }));
      return;
    }

    if (action === 'segment-response-note') {
      recordInspectorHistory('Update PDA Response Note', () => updatePdaResponse(segment.id, e.target.dataset.pdaId, { note: e.target.value }));
      return;
    }

    if (action === 'reaction-evidence-entry-side') {
      patchReactionEvidence(segment, e.target.dataset.pdaId, e.target.dataset.evidenceId, (evidence) => ({
        params: {
          ...(evidence.params || {}),
          entrySide: e.target.value,
        },
      }));
      return;
    }

    if (action === 'reaction-evidence-timeframe') {
      patchReactionEvidence(segment, e.target.dataset.pdaId, e.target.dataset.evidenceId, (evidence) => ({
        actor: {
          ...(evidence.actor || {}),
          timeframe: e.target.value,
        },
      }));
      return;
    }

    if (action === 'reaction-evidence-first-bar') {
      patchReactionEvidence(segment, e.target.dataset.pdaId, e.target.dataset.evidenceId, (evidence) => ({
        actor: {
          ...(evidence.actor || {}),
          firstBarTimestamp: parseEvidenceTimestamp(e.target.value),
        },
      }));
      return;
    }

    if (action === 'reaction-evidence-last-bar') {
      patchReactionEvidence(segment, e.target.dataset.pdaId, e.target.dataset.evidenceId, (evidence) => ({
        actor: {
          ...(evidence.actor || {}),
          lastBarTimestamp: parseEvidenceTimestamp(e.target.value),
        },
      }));
      return;
    }

    if (action === 'reaction-evidence-terminal-bar') {
      patchReactionEvidence(segment, e.target.dataset.pdaId, e.target.dataset.evidenceId, (evidence) => ({
        actor: {
          ...(evidence.actor || {}),
          terminalBarTimestamp: parseEvidenceTimestamp(e.target.value),
        },
      }));
      return;
    }

    if (action === 'reaction-evidence-note') {
      patchReactionEvidence(segment, e.target.dataset.pdaId, e.target.dataset.evidenceId, () => ({
        note: e.target.value,
      }));
      return;
    }

    if (action === 'segment-group-outcome') {
      recordInspectorHistory('Update Composite Outcome', () => updateSegmentGroup(e.target.dataset.groupId, { outcome: e.target.value }));
      return;
    }

    if (action === 'segment-group-notes') {
      recordInspectorHistory('Update Composite Notes', () => updateSegmentGroup(e.target.dataset.groupId, { notes: e.target.value }));
      return;
    }

    if (action === 'segment-group-target') {
      recordInspectorHistory('Set Composite Draft Target', () => setDraftSegmentGroupTarget(e.target.value));
      return;
    }
  }

  const segmentGroup = getCurrentSegmentGroup();
  if (segmentGroup) {
    if (action === 'segment-group-current-target') {
      recordInspectorHistory('Update Composite Target', () => updateSegmentGroup(segmentGroup.id, { targetSegmentId: e.target.value }));
      return;
    }

    if (action === 'segment-group-current-objective') {
      recordInspectorHistory('Update Composite Objective', () => updateSegmentGroup(segmentGroup.id, { objective: e.target.value }));
      return;
    }

    if (action === 'segment-group-current-outcome') {
      recordInspectorHistory('Update Composite Outcome', () => updateSegmentGroup(segmentGroup.id, { outcome: e.target.value }));
      return;
    }

    if (action === 'segment-group-current-notes') {
      recordInspectorHistory('Update Composite Notes', () => updateSegmentGroup(segmentGroup.id, { notes: e.target.value }));
      return;
    }

    if (action === 'segment-group-toggle-label') {
      recordInspectorHistory('Toggle Composite Label', () => updateSegmentGroup(segmentGroup.id, {
        display: {
          ...(segmentGroup.display || {}),
          showLabel: e.target.checked,
        },
      }));
      return;
    }
  }

  const annotation = getCurrentAnnotation();
  if (!annotation) return;

  if (action === 'toggle-current-label') {
    recordInspectorHistory('Toggle PDA Label', () => updateAnnotation(annotation.id, {
      display: {
        ...(annotation.display || {}),
        showLabel: e.target.checked,
      },
    }));
    return;
  }

  if (action === 'extend-bars') {
    const parsed = Number(e.target.value);
    const extendBars = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    recordInspectorHistory('Update PDA Extend', () => updateAnnotation(annotation.id, {
      display: {
        ...(annotation.display || {}),
        ...buildExtendDisplayPatch(extendBars, store.getCurrentTimeframe()),
      },
    }));
    return;
  }

  if (action === 'note') {
    recordInspectorHistory('Update PDA Note', () => updateAnnotation(annotation.id, { note: e.target.value }));
    return;
  }

  if (action === 'toggle-ce') {
    recordInspectorHistory('Toggle PDA CE', () => updateAnnotation(annotation.id, {
      display: {
        ...(annotation.display || {}),
        showCe: e.target.checked,
      },
    }));
  }
}

function handleInspectorClick(e) {
  const actionEl = e.target.closest('[data-inspector-action]');
  const action = actionEl?.dataset.inspectorAction;
  if (!action) return;

  if (action === 'calendar-select-date') {
    calendarSelectedDate = actionEl.dataset.calendarDate || calendarSelectedDate;
    calendarViewDate = calendarSelectedDate;
    updateTimeOverlaySettings({ selectedDate: calendarSelectedDate });
    const targetTimestamp = getCalendarDateTimestamp(calendarSelectedDate, '09:30');
    if (targetTimestamp !== null) {
      viewport.locateTimestampRange(targetTimestamp, targetTimestamp);
      secondaryViewport.locateSecondaryTimestampRange(targetTimestamp, targetTimestamp);
    }
    bus.emit('status:update', {
      text: targetTimestamp === null
        ? `Calendar selected ${calendarSelectedDate}`
        : `Calendar located ${calendarSelectedDate} 09:30`,
      isError: targetTimestamp === null,
    });
    refreshSelection();
    return;
  }

  if (action === 'calendar-show-all-days') {
    updateTimeOverlaySettings({ selectedDate: '' });
    bus.emit('status:update', { text: 'Calendar overlays show all loaded days', isError: false });
    refreshSelection();
    return;
  }

  if (action === 'calendar-object-locate') {
    const start = Number(actionEl.dataset.locateStart);
    const end = Number(actionEl.dataset.locateEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      bus.emit('status:update', { text: 'Calendar object has no locatable time', isError: true });
      return;
    }
    viewport.locateTimestampRange(start, end);
    secondaryViewport.locateSecondaryTimestampRange(start, end);
    const label = actionEl.dataset.objectLabel || 'Calendar object';
    bus.emit('status:update', { text: `Located ${label}`, isError: false });
    return;
  }

  if (action === 'calendar-object-open') {
    const opened = openCalendarObject(actionEl.dataset.objectType, actionEl.dataset.objectId);
    bus.emit('status:update', {
      text: opened ? 'Calendar object opened' : 'Calendar object cannot be opened',
      isError: !opened,
    });
    return;
  }

  if (action === 'calendar-return') {
    const target = calendarReturnContext;
    calendarReturnContext = null;
    if (target?.selectedDate) calendarSelectedDate = target.selectedDate;
    if (target?.viewDate) calendarViewDate = target.viewDate;
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    renderEmpty();
    bus.emit('status:update', { text: 'Returned to Calendar', isError: false });
    return;
  }

  if (action === 'calendar-prev-month' || action === 'calendar-next-month') {
    calendarViewDate = getNextCalendarViewDate(
      calendarViewDate || calendarSelectedDate || getDefaultCalendarDate(),
      action === 'calendar-prev-month' ? 'prev' : 'next'
    );
    refreshSelection();
    return;
  }

  if (action === 'export-pda') {
    exportPdaArchive();
    return;
  }

  if (action === 'export-review') {
    exportReviewArchive();
    return;
  }

  if (action === 'import-pda') {
    bodyEl?.querySelector('[data-inspector-action="import-pda-file"]')?.click();
    return;
  }

  if (action === 'import-review') {
    bodyEl?.querySelector('[data-inspector-action="import-review-file"]')?.click();
    return;
  }

  if (action === 'clear-saved') {
    clearSavedAnnotations();
    return;
  }

  if (action === 'smt-locate') {
    const record = getSmtRecordById(actionEl.dataset.smtId);
    if (record) {
      viewport.locateTimestampRange(
        record.leftTimestamp ?? record.fvgStartTimestamp ?? record.timestamp,
        record.rightTimestamp ?? record.fvgEndTimestamp ?? record.timestamp
      );
    }
    return;
  }

  if (action === 'smt-delete') {
    recordInspectorHistory('Delete SMT', () => deleteSmtRecord(actionEl.dataset.smtId));
    if (selectedSmtId === actionEl.dataset.smtId) selectedSmtId = null;
    if (currentPanel === 'archive') renderArchivePanel();
    return;
  }

  if (action === 'smt-select') {
    selectedSmtId = actionEl.dataset.smtId;
    refreshSelection();
    return;
  }

  if (action === 'order-review-create-empty') {
    recordInspectorHistory('Create Order Setup', () => createBlankOrderReview());
    return;
  }

  if (action === 'order-review-locate') {
    const order = getOrderReviewById(actionEl.dataset.orderReviewId);
    if (order) locateOrderReview(order);
    return;
  }

  if (action === 'order-review-delete') {
    recordInspectorHistory('Delete Order Setup', () => deleteOrderReview(actionEl.dataset.orderReviewId));
    return;
  }

  if (action === 'order-review-set-active') {
    setActiveReviewSet(actionEl.dataset.orderReviewId);
    expandedOrderReviewId = actionEl.dataset.orderReviewId;
    refreshSelection();
    return;
  }

  if (action === 'order-review-clear-active') {
    clearActiveReviewSet();
    refreshSelection();
    return;
  }

  if (action === 'drawing-set-locate') {
    locateDrawingSet(actionEl.dataset.setType, actionEl.dataset.setId);
    return;
  }

  const segment = getCurrentSegment();
  if (segment) {
    if (action === 'reaction-evidence-add-fvg') {
      recordInspectorHistory('Add Reaction Evidence', () => addReactionEvidence(segment, actionEl.dataset.pdaId, EVIDENCE_TYPES.FVG_RESPECT));
      return;
    }

    if (action === 'reaction-evidence-add-liquidity') {
      recordInspectorHistory('Add Reaction Evidence', () => addReactionEvidence(segment, actionEl.dataset.pdaId, EVIDENCE_TYPES.LIQUIDITY_SWEEP));
      return;
    }

    if (action === 'reaction-evidence-delete') {
      recordInspectorHistory('Delete Reaction Evidence', () => updateReactionEvidenceList(segment, actionEl.dataset.pdaId, (evidenceList) =>
        evidenceList.filter((evidence) => evidence.id !== actionEl.dataset.evidenceId)
      ));
      return;
    }

    if (action === 'reaction-evidence-pick-actor-bar') {
      startActorBarPick(segment, {
        pdaId: actionEl.dataset.pdaId,
        evidenceId: actionEl.dataset.evidenceId,
        actorField: actionEl.dataset.actorField,
      });
      return;
    }
  }

  if (segment) {
    if (action === 'segment-link-active-setup') {
      const active = getActiveReviewSet();
      if (!active?.orderReview) {
        bus.emit('status:update', { text: '没有 active setup 可链接', isError: true });
        return;
      }
      recordInspectorHistory('Link Segment To Active Setup', () =>
        linkRefToActiveReviewSet(buildSegmentOrderReviewRef(segment))
      );
      bus.emit('status:update', {
        text: `${getSegmentOrderRefLabel(segment)} linked to active setup`,
        isError: false,
      });
      refreshSelection();
      return;
    }

    if (action === 'segment-delete') {
      recordInspectorHistory('Delete Segment', () => deleteSegment(segment.id));
      clearSegmentSelection();
      renderEmpty();
      return;
    }

    if (action === 'segment-response-remove') {
      recordInspectorHistory('Remove PDA Response', () => removePdaResponse(segment.id, actionEl.dataset.pdaId));
      return;
    }

    if (action === 'segment-group-draft-add') {
      recordInspectorHistory('Add Segment To Composite Draft', () => addSegmentToDraftGroup(segment.id));
      return;
    }

    if (action === 'segment-group-draft-remove') {
      recordInspectorHistory('Remove Segment From Composite Draft', () => removeSegmentFromDraftGroup(segment.id));
      return;
    }

    if (action === 'segment-group-draft-clear') {
      recordInspectorHistory('Clear Composite Draft', () => clearDraftSegmentGroup());
      return;
    }

    if (action === 'segment-group-create') {
      const targetSegmentId = bodyEl?.querySelector('[data-inspector-action="segment-group-target"]')?.value || '';
      const objective =
        bodyEl?.querySelector('[data-inspector-action="segment-group-objective"]')?.value ||
        'break-previous-extreme';
      const outcome =
        bodyEl?.querySelector('[data-inspector-action="segment-group-create-outcome"]')?.value || 'pending';
      const group = recordInspectorHistory('Create Composite Move', () =>
        createCompositeMove({ targetSegmentId, objective, outcome })
      );
      bus.emit('status:update', {
        text: group ? `已创建 Composite Move: ${group.childSegmentIds.length} legs` : '至少需要 2 个 staged segments',
        isError: !group,
      });
      return;
    }

    if (action === 'order-review-create-segment') {
      recordInspectorHistory('Create Order Review', () => createOrderReviewFromSegment(segment));
      return;
    }

    if (action === 'segment-group-delete') {
      recordInspectorHistory('Delete Composite Move', () => deleteSegmentGroup(actionEl.dataset.groupId));
      return;
    }
  }

  const segmentGroup = getCurrentSegmentGroup();
  if (segmentGroup) {
    if (action === 'order-review-create-composite') {
      recordInspectorHistory('Create Order Review', () => createOrderReviewFromComposite(segmentGroup));
      return;
    }

    if (action === 'segment-group-current-delete') {
      recordInspectorHistory('Delete Composite Move', () => deleteSegmentGroup(segmentGroup.id));
      clearSegmentGroupSelection();
      renderEmpty();
      return;
    }
  }

  const annotation = getCurrentAnnotation();
  if (!annotation) return;

  if (action === 'pda-link-active-setup') {
    const active = getActiveReviewSet();
    if (!active?.orderReview) {
      bus.emit('status:update', { text: '没有 active setup 可链接', isError: true });
      return;
    }
    recordInspectorHistory('Link PDA To Active Setup', () =>
      linkRefToActiveReviewSet(buildPdaOrderReviewRef(annotation))
    );
    bus.emit('status:update', {
      text: `${getPdaOrderRefLabel(annotation)} linked to active setup`,
      isError: false,
    });
    refreshSelection();
    return;
  }

  if (action === 'delete') {
    recordInspectorHistory('Delete PDA', () => deleteAnnotation(annotation.id));
    clearPdaSelection();
    renderEmpty();
    return;
  }

  if (action === 'remove-point') {
    recordInspectorHistory('Remove Point From Set', () =>
      removePointFromSet(annotation, Number(actionEl.dataset.pointIndex))
    );
  }
}

function removePointFromSet(annotation, pointIndex) {
  if (!Array.isArray(annotation.points) || !Number.isInteger(pointIndex)) return;
  const nextPoints = annotation.points.filter((_, index) => index !== pointIndex);

  if (nextPoints.length < 2) {
    deleteAnnotation(annotation.id);
    clearPdaSelection();
    renderEmpty();
    bus.emit('status:update', {
      text: `${getPdaType(annotation.type)?.label || annotation.type.toUpperCase()} 少于 2 个点，集合已删除`,
      isError: false,
    });
    return;
  }

  const referencePrice = getPointSetReference(annotation.type, nextPoints);
  updateAnnotation(annotation.id, {
    points: nextPoints,
    referencePrice,
    price: referencePrice,
    contexts: [getPointSetContext(annotation, nextPoints)],
  });
}

export function initInspectorSidebar() {
  createSidebar();
  document.getElementById('chart')?.addEventListener('click', handleActorPickChartClick, true);
  chart.onCrosshairMove(handleActorPickHover);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearActorPickState();
      clearOrderReviewPickState();
    }
  });
  bus.on('pda:selected', ({ annotation }) => {
    renderAnnotation(annotation);
    openSidebar();
  });
  bus.on('pda:selection-cleared', refreshSelection);
  bus.on('pda:changed', refreshSelection);
  bus.on('segment:selected', ({ segment }) => {
    renderSegment(segment);
    openSidebar();
  });
  bus.on('segment-group:selected', ({ segmentGroup }) => {
    renderSegmentGroup(segmentGroup);
    openSidebar();
  });
  bus.on('segment:selection-cleared', refreshSelection);
  bus.on('segment-group:selection-cleared', refreshSelection);
  bus.on('segment:changed', refreshSelection);
  bus.on('segment-group:changed', refreshSelection);
  bus.on('drawing-set-focus:changed', refreshSelection);
  bus.on('smt:changed', refreshSelection);
  bus.on('order-review:changed', refreshSelection);
  bus.on('order-review-active:changed', refreshSelection);
  bus.on('inspector:open-archive', () => {
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    renderArchivePanel();
    openSidebar();
  });
  bus.on('bars:cleared', () => {
    clearActorPickState({ silent: true });
    clearOrderReviewPickState({ silent: true });
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    calendarSelectedDate = '';
    calendarViewDate = '';
    renderEmpty();
  });
  bus.on('bars:loaded', () => {
    calendarSelectedDate = getDefaultCalendarDate();
    calendarViewDate = calendarSelectedDate;
    refreshSelection();
  });
}
