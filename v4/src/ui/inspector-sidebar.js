// Hideable right-side inspector for selected chart objects.

import * as bus from '../event-bus.js';
import * as chart from '../chart/chart-manager.js';
import * as viewport from '../chart/viewport-controller.js';
import * as secondaryViewport from '../chart/secondary-viewport-controller.js';
import { clearSelection as clearPdaSelection, getSelectedPda, selectPda } from '../pda/pda-selection.js';
import { exportPdaArchive, importPdaArchive } from '../pda/pda-archive.js';
import { exportReviewArchive, importReviewArchive } from '../review/review-archive.js';
import { clearSavedAnnotations } from '../pda/pda-persistence.js';
import { fetchBars } from '../api.js';
import { getAnnotationById } from '../pda/pda-store.js';
import {
  clearSegmentGroupSelection,
  clearSegmentSelection,
  getSelectedSegment,
  getSelectedSegmentGroup,
  selectSegment,
  selectSegmentGroup,
} from '../segment/segment-selection.js';
import { getSegmentById } from '../segment/segment-store.js';
import { getSegmentGroupById } from '../segment/segment-group-store.js';
import { getDrawingSets, isDrawingSetFocused, locateDrawingSet } from '../segment/drawing-set-list.js';
import { locateSetupSet } from '../order/setup-set.js';
import { renderArchiveActions } from './inspector/archive-panel.js';
import { renderAnnotationPanel } from './inspector/pda-panel.js';
import { renderSegmentPanel } from './inspector/segment-panel.js';
import { renderSegmentGroupPanel } from './inspector/segment-group-panel.js';
import { renderSmtPanel } from './inspector/smt-panel.js';
import { renderOrderReviewDetailPanel } from './inspector/order-review-panel.js';
import { renderDailyTimeReviewPanel } from './inspector/time-reaction-panel.js';
import { createOrderReviewActionController } from './inspector/order-review-actions.js';
import {
  canPopInspectorPage,
  getInspectorPage,
  popInspectorPage,
  pushInspectorPage,
  replaceInspectorPage,
  resetInspectorPage,
} from './inspector/page-stack.js';
import { createPdaInspectorActionController } from './inspector/pda-actions.js';
import { createSegmentInspectorActionController } from './inspector/segment-actions.js';
import {
  getDefaultCalendarDate,
  getCalendarDateTimestamp,
  getNextCalendarViewDate,
  renderCalendarPanel,
} from './inspector/calendar-panel.js';
import { updateTimeOverlaySettings } from '../time-overlays/time-overlay-store.js';
import { updateEconomicCalendarFilters } from '../economic-calendar/economic-calendar-store.js';
import { deleteSmtRecord, getSmtRecordById, getSmtRecords, updateSmtRecord } from '../smt/smt-store.js';
import * as store from '../data/bar-store.js';
import * as secondaryStore from '../data/secondary-chart-store.js';
import { resolveChartLoadRange } from '../data/load-range-policy.js';
import {
  getActiveReviewSetId,
  setActiveReviewSet,
} from '../order/order-review-active.js';
import { getSelectedOrderSetupElement } from '../order/order-setup-selection.js';
import {
  getOrderReviewById,
  ORDER_REF_ROLES,
  ORDER_REF_TYPES,
} from '../order/order-review-store.js';
import {
  buildPdaOrderRefMetadata,
  buildSegmentOrderRefMetadata,
  getPdaOrderRefLabel,
  getSegmentOrderRefLabel,
} from '../order/order-ref-metadata.js';
import {
  addDailyTimeReviewRef,
  addDailyTimeContextItem,
  addDailyTimeReactionItem,
  addDailyTimeSummaryItem,
  getDailyTimeReviewByDate,
  getOrCreateDailyTimeReview,
  removeDailyTimeReviewRef,
  removeDailyTimeContextItem,
  removeDailyTimeReactionItem,
  removeDailyTimeSummaryItem,
  updateDailyTimeContextItem,
  updateDailyTimeReactionItem,
  updateDailyTimeReaction,
  updateDailyTimeReviewSection,
  updateDailyTimeSummaryItem,
} from '../time-reaction/daily-time-review-store.js';
import { recordHistory } from '../history/history-manager.js';

let sidebarEl = null;
let bodyEl = null;
let currentPanel = 'empty';
let expandedOrderReviewId = null;
let selectedSmtId = null;
let calendarSelectedDate = '';
let calendarViewDate = '';
let suppressActiveReviewRender = false;
let suppressSelectionBackTarget = false;
let pendingDailyTimeRefPick = null;

const orderReviewActions = createOrderReviewActionController({
  getExpandedOrderReviewId: () => expandedOrderReviewId,
  setExpandedOrderReviewId: (orderReviewId) => {
    expandedOrderReviewId = orderReviewId;
  },
  getSelectedSmtId: () => selectedSmtId,
  getCompositeTimestamp,
  syncCalendarToOrderReview,
  refreshSelection,
});

const pdaActions = createPdaInspectorActionController({
  getCurrentAnnotation,
  renderEmpty: renderAfterDetailDeleted,
});

const segmentActions = createSegmentInspectorActionController({
  getCurrentSegment,
  getCurrentSegmentGroup,
  getBodyEl: () => bodyEl,
  renderEmpty: renderAfterDetailDeleted,
});

function getOrderReviewPanelOptions(extra = {}) {
  return {
    expandedOrderReviewId,
    activeOrderReviewId: getActiveReviewSetId(),
    selectedOrderSetupElement: getSelectedOrderSetupElement(),
    ...extra,
  };
}

function renderInspectorBackAction() {
  if (!canPopInspectorPage()) return '';
  return `
    <div class="inspector-return-bar">
      <button class="inspector-button secondary" data-inspector-action="inspector-back" type="button">
        Back
      </button>
    </div>
  `;
}

function dateKeyFromTimestamp(timestamp) {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed) || parsed <= 0) return '';
  const date = new Date(parsed * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function firstDateKeyFromValues(values = []) {
  for (const value of values) {
    const dateKey = dateKeyFromTimestamp(value);
    if (dateKey) return dateKey;
  }
  return '';
}

export function getOrderReviewCalendarDate(order = {}) {
  return dateKeyFromTimestamp(
    order.entryPlan?.entryTimestamp ??
      order.setupThesis?.primaryEventTimestamp ??
      order.resultReview?.exitTimestamp ??
      null
  );
}

function getAnnotationCalendarDate(annotation = {}) {
  return firstDateKeyFromValues([
    annotation.canonicalTimestamp,
    annotation.timestamp,
    annotation.anchorTime,
    annotation.start?.timestamp,
    annotation.start?.time,
    annotation.end?.timestamp,
    annotation.end?.time,
    ...(Array.isArray(annotation.points)
      ? annotation.points.map((point) => point?.canonicalTimestamp ?? point?.timestamp ?? point?.anchorTime ?? point?.time)
      : []),
  ]);
}

function getSegmentCalendarDate(segment = {}) {
  return firstDateKeyFromValues([
    segment.end?.timestamp,
    segment.end?.time,
    segment.start?.timestamp,
    segment.start?.time,
  ]);
}

function getCompositeCalendarDate(segmentGroup = {}) {
  return firstDateKeyFromValues([getCompositeTimestamp(segmentGroup)]);
}

function getSmtCalendarDate(record = {}) {
  return firstDateKeyFromValues([
    record.leftTimestamp,
    record.fvgStartTimestamp,
    record.timestamp,
    record.rightTimestamp,
    record.fvgEndTimestamp,
  ]);
}

function syncCalendarToOrderReview(orderReviewId) {
  const order = getOrderReviewById(orderReviewId);
  const dateKey = getOrderReviewCalendarDate(order);
  if (!dateKey) return false;
  calendarSelectedDate = dateKey;
  calendarViewDate = dateKey;
  return true;
}

function setCalendarDateContext(dateKey) {
  if (!dateKey) return false;
  calendarSelectedDate = dateKey;
  calendarViewDate = dateKey;
  updateTimeOverlaySettings({ selectedDate: dateKey });
  return true;
}

function prepareDetailBackTarget(dateKey) {
  if (!setCalendarDateContext(dateKey)) return false;
  resetInspectorPage({ kind: 'home', selectedDate: dateKey, viewDate: dateKey });
  pushInspectorPage({ kind: 'detail', selectedDate: dateKey, viewDate: dateKey });
  return true;
}

function normalizeCalendarDatePayload(payload = {}) {
  const dateKey = String(payload.dateKey || '').match(/^\d{4}-\d{2}-\d{2}$/)
    ? String(payload.dateKey)
    : dateKeyFromTimestamp(payload.timestamp);
  return dateKey || '';
}

function openCalendarDate(payload = {}) {
  const dateKey = normalizeCalendarDatePayload(payload);
  if (!dateKey) {
    bus.emit('status:update', { text: 'Cannot locate Calendar date: missing chart time', isError: true });
    return false;
  }
  setCalendarDateContext(dateKey);
  clearPdaSelection();
  clearSegmentSelection();
  clearSegmentGroupSelection();
  selectedSmtId = null;
  resetInspectorPage({ kind: 'home', selectedDate: dateKey, viewDate: dateKey });
  renderEmpty();
  openSidebar();
  bus.emit('status:update', {
    text: `Calendar selected ${dateKey}${payload.source ? ` from ${payload.source}` : ''}`,
    isError: false,
  });
  return true;
}

function renderAnnotation(annotation) {
  currentPanel = 'selection';
  replaceInspectorPage({
    kind: 'detail',
    objectType: 'pda',
    objectId: annotation.id,
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderInspectorBackAction()}
    ${renderAnnotationPanel(annotation, renderArchiveActions())}
  `;
}

function renderSegment(segment) {
  currentPanel = 'selection';
  replaceInspectorPage({
    kind: 'detail',
    objectType: 'segment',
    objectId: segment.id,
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderInspectorBackAction()}
    ${renderSegmentPanel(segment)}
  `;
}

function renderSegmentGroup(segmentGroup) {
  currentPanel = 'selection';
  replaceInspectorPage({
    kind: 'detail',
    objectType: 'composite',
    objectId: segmentGroup.id,
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderInspectorBackAction()}
    ${renderSegmentGroupPanel(segmentGroup)}
  `;
}

function renderSmtSelection() {
  currentPanel = 'selection';
  replaceInspectorPage({
    kind: 'detail',
    objectType: 'smt',
    objectId: selectedSmtId,
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderInspectorBackAction()}
    ${renderSmtPanel(getSmtRecords(), { selectedSmtId })}
  `;
}

function renderOrderSetupDetail(orderReviewId) {
  const order = getOrderReviewById(orderReviewId);
  currentPanel = 'detail';
  replaceInspectorPage({
    kind: 'detail',
    objectType: 'order-setup',
    objectId: orderReviewId,
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderInspectorBackAction()}
    ${renderOrderReviewDetailPanel(order, getOrderReviewPanelOptions({
      activeOrderReviewId: orderReviewId,
    }))}
  `;
}

function renderDailyTimeReviewDetail(dateKey) {
  const review = getDailyTimeReviewByDate(dateKey) || getOrCreateDailyTimeReview(dateKey);
  currentPanel = 'detail';
  setCalendarDateContext(dateKey);
  replaceInspectorPage({
    kind: 'detail',
    objectType: 'time-reaction',
    objectId: dateKey,
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderInspectorBackAction()}
    ${renderDailyTimeReviewPanel(review, { pendingRefPick: pendingDailyTimeRefPick })}
  `;
}

function renderEmpty() {
  currentPanel = 'empty';
  if (!calendarSelectedDate) calendarSelectedDate = getDefaultCalendarDate();
  if (!calendarViewDate) calendarViewDate = calendarSelectedDate;
  replaceInspectorPage({
    kind: 'home',
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderCalendarPanel({ selectedDate: calendarSelectedDate, viewDate: calendarViewDate })}
    ${renderArchiveActions()}
  `;
}

function renderArchivePanel() {
  currentPanel = 'archive';
  if (!calendarSelectedDate) calendarSelectedDate = getDefaultCalendarDate();
  if (!calendarViewDate) calendarViewDate = calendarSelectedDate;
  replaceInspectorPage({
    kind: 'archive',
    selectedDate: calendarSelectedDate,
    viewDate: calendarViewDate,
  });
  bodyEl.innerHTML = `
    ${renderCalendarPanel({ selectedDate: calendarSelectedDate, viewDate: calendarViewDate })}
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

function focusActiveOrderSetupPanel() {
  const section = bodyEl?.querySelector('[data-inspector-section="order-setup-detail"]');
  section?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function showActiveOrderSetupPanel() {
  const dateSynced = syncCalendarToOrderReview(getActiveReviewSetId());
  if (dateSynced) prepareDetailBackTarget(calendarSelectedDate);
  renderOrderSetupDetail(getActiveReviewSetId());
  openSidebar();
  requestAnimationFrame(() => focusActiveOrderSetupPanel());
}

function restoreCalendarStateFromPage(page = {}) {
  if (page.selectedDate) calendarSelectedDate = page.selectedDate;
  if (page.viewDate) calendarViewDate = page.viewDate;
}

function renderPageFromState(page = getInspectorPage()) {
  restoreCalendarStateFromPage(page);
  if (page.kind === 'archive') {
    renderArchivePanel();
    return;
  }
  if (page.kind === 'detail') {
    if (page.objectType === 'order-setup') {
      if (getOrderReviewById(page.objectId)) {
        renderOrderSetupDetail(page.objectId);
        return;
      }
    } else if (page.objectType === 'pda') {
      const annotation = getAnnotationById(page.objectId);
      if (annotation) {
        renderAnnotation(annotation);
        return;
      }
    } else if (page.objectType === 'segment') {
      const segment = getSegmentById(page.objectId);
      if (segment) {
        renderSegment(segment);
        return;
      }
    } else if (page.objectType === 'composite') {
      const segmentGroup = getSegmentGroupById(page.objectId);
      if (segmentGroup) {
        renderSegmentGroup(segmentGroup);
        return;
      }
    } else if (page.objectType === 'smt') {
      if (getSmtRecordById(page.objectId)) {
        selectedSmtId = page.objectId;
        renderSmtSelection();
        return;
      }
    } else if (page.objectType === 'time-reaction') {
      if (String(page.objectId || '').match(/^\d{4}-\d{2}-\d{2}$/)) {
        renderDailyTimeReviewDetail(page.objectId);
        return;
      }
    }
    renderPageFromState(popInspectorPage());
    return;
  }
  clearPdaSelection();
  clearSegmentSelection();
  clearSegmentGroupSelection();
  selectedSmtId = null;
  renderEmpty();
}

function renderAfterDetailDeleted() {
  renderPageFromState(popInspectorPage());
}

function refreshSelection() {
  const page = getInspectorPage();
  if (page.kind === 'detail') {
    renderPageFromState(page);
    return;
  }

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

function recordInspectorHistory(label, mutator) {
  return recordHistory(label, mutator);
}

function getCompositeTimestamp(group) {
  const childIds = Array.isArray(group?.childSegmentIds) ? group.childSegmentIds : [];
  const childSegments = childIds.map(getSegmentById).filter(Boolean);
  const terminal = childSegments[childSegments.length - 1];
  return terminal?.end?.timestamp ?? terminal?.end?.time ?? terminal?.start?.timestamp ?? terminal?.start?.time ?? null;
}

function getDailyTimeTargetFromElement(actionEl) {
  const section = actionEl.dataset.dailyTimeTargetSection;
  if (section === 'reaction') {
    return {
      section: 'reaction',
      time: actionEl.dataset.dailyTimeReactionTime || '09:30',
    };
  }
  if (section === 'reactionItem') {
    return {
      section: 'reactionItem',
      time: actionEl.dataset.dailyTimeReactionTime || '09:30',
      itemId: actionEl.dataset.dailyTimeContextItemId || '',
    };
  }
  if (section === 'pre0930Item') {
    return {
      section: 'pre0930Item',
      itemId: actionEl.dataset.dailyTimeContextItemId || '',
    };
  }
  if (section === 'summaryItem') {
    return {
      section: 'summaryItem',
      itemId: actionEl.dataset.dailyTimeContextItemId || '',
    };
  }
  if (section === 'summary0930To1100') return { section: 'summary' };
  return { section: 'pre0930Context' };
}

function getDailyTimeTargetKey(target = {}) {
  return [
    target.section || '',
    target.itemId || '',
    target.time || '',
  ].join(':');
}

function getDailyTimeSectionName(target = {}) {
  return target.section === 'summary' ? 'summary0930To1100' : 'pre0930Context';
}

function getDailyTimeTargetLabel(target = {}) {
  if (target.section === 'reaction') return target.time || 'reaction';
  if (target.section === 'reactionItem') return target.time || 'reaction';
  if (target.section === 'pre0930Item') return 'Pre 09:30 Context';
  if (target.section === 'summaryItem') return '09:30-11:00 Summary';
  if (target.section === 'summary') return '09:30-11:00 Summary';
  return 'Pre 09:30 Context';
}

function startDailyTimeRefPick(actionEl) {
  const date = actionEl.dataset.dailyTimeDate;
  const target = getDailyTimeTargetFromElement(actionEl);
  pendingDailyTimeRefPick = {
    date,
    target,
    targetKey: getDailyTimeTargetKey(target),
  };
  bus.emit('status:update', {
    text: `Select chart object for ${getDailyTimeTargetLabel(target)}. Press Escape to cancel.`,
    isError: false,
  });
  refreshSelection();
}

function clearDailyTimeRefPick({ silent = false } = {}) {
  if (!pendingDailyTimeRefPick) return;
  pendingDailyTimeRefPick = null;
  if (!silent) bus.emit('status:update', { text: 'Object select cancelled', isError: false });
  refreshSelection();
}

function linkPickedDailyTimeRef(ref, label) {
  if (!pendingDailyTimeRefPick || !ref?.type || !ref?.id) return false;
  const { date, target } = pendingDailyTimeRefPick;
  const added = recordInspectorHistory('Link Time Reaction Object', () => (
    addDailyTimeReviewRef(date, target, ref)
  ));
  const targetLabel = getDailyTimeTargetLabel(target);
  pendingDailyTimeRefPick = null;
  if (added) {
    setCalendarDateContext(date);
    renderDailyTimeReviewDetail(date);
    openSidebar();
  }
  bus.emit('status:update', {
    text: added ? `${label} linked to ${targetLabel}` : 'Link selected object failed',
    isError: !added,
  });
  return Boolean(added);
}

function getDailyTimeTargetTime(target = {}) {
  if (target.section === 'reaction' || target.section === 'reactionItem') return target.time || '09:30';
  if (target.section === 'summary' || target.section === 'summaryItem') return '11:00';
  return '09:30';
}

function getDailyTimeLocateRange(date, target = {}) {
  if (target.section === 'summary') {
    return {
      start: getCalendarDateTimestamp(date, '09:30'),
      end: getCalendarDateTimestamp(date, '11:00'),
    };
  }
  const timestamp = getCalendarDateTimestamp(date, getDailyTimeTargetTime(target));
  return { start: timestamp, end: timestamp };
}

function asTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function timestampRangeFromValues(values = []) {
  const timestamps = values.map(asTimestamp).filter((value) => value !== null);
  if (!timestamps.length) return null;
  return { start: Math.min(...timestamps), end: Math.max(...timestamps) };
}

function getAnnotationTimestampRange(annotation = {}) {
  const pointTimestamps = Array.isArray(annotation.points)
    ? annotation.points
        .map((point) => asTimestamp(point?.canonicalTimestamp ?? point?.timestamp ?? point?.anchorTime ?? point?.time))
        .filter((timestamp) => timestamp !== null)
    : [];
  if (pointTimestamps.length) {
    return { start: Math.min(...pointTimestamps), end: Math.max(...pointTimestamps) };
  }
  return timestampRangeFromValues([
    annotation.startTimeTimestamp,
    annotation.start?.timestamp,
    annotation.start?.time,
    annotation.endTimeTimestamp,
    annotation.end?.timestamp,
    annotation.end?.time,
    annotation.canonicalTimestamp,
    annotation.timestamp,
    annotation.anchorTime,
  ]);
}

function getSegmentTimestampRange(segment = {}) {
  return timestampRangeFromValues([
    segment.start?.timestamp ?? segment.start?.time,
    segment.end?.timestamp ?? segment.end?.time,
  ]);
}

function getCompositeTimestampRange(segmentGroup = {}) {
  const timestamps = (Array.isArray(segmentGroup.childSegmentIds) ? segmentGroup.childSegmentIds : [])
    .flatMap((id) => {
      const segment = getSegmentById(id);
      return [segment?.start?.timestamp ?? segment?.start?.time, segment?.end?.timestamp ?? segment?.end?.time];
    });
  return timestampRangeFromValues(timestamps);
}

function getSmtTimestampRange(record = {}) {
  return timestampRangeFromValues([
    record.leftTimestamp,
    record.rightTimestamp,
    record.timestamp,
    record.fvgStartTimestamp,
    record.fvgEndTimestamp,
  ]);
}

function getTimeframeFromLabel(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;
  if (/^\d+$/.test(text)) return text;
  if (text === '1m') return '1';
  if (text === '5m') return '5';
  if (text === '15m') return '15';
  if (text === '30m') return '30';
  if (text === '1h') return '60';
  if (text === '4h') return '240';
  if (text === 'd' || text === '1d' || text === 'daily') return '1440';
  return null;
}

function getRefTimeframe(ref = {}, fallback = null) {
  return getTimeframeFromLabel(ref.sourceTimeframe)
    || getTimeframeFromLabel(ref.sourceTimeframeLabel)
    || getTimeframeFromLabel(ref.timeframe)
    || fallback;
}

function getDailyTimeRefsForTarget(date, target = {}) {
  const review = getDailyTimeReviewByDate(date);
  if (!review) return [];
  if (target.section === 'reactionItem') {
    const reaction = review.reactions.find((item) => item.time === getDailyTimeTargetTime(target));
    const item = (reaction?.items || []).find((candidate) => candidate.id === target.itemId);
    return Array.isArray(item?.refs) ? item.refs : [];
  }
  if (target.section === 'pre0930Item') {
    const item = (review.pre0930Context?.items || []).find((candidate) => candidate.id === target.itemId);
    return Array.isArray(item?.refs) ? item.refs : [];
  }
  if (target.section === 'summaryItem') {
    const item = (review.summary0930To1100?.items || []).find((candidate) => candidate.id === target.itemId);
    return Array.isArray(item?.refs) ? item.refs : [];
  }
  return [];
}

function getDailyTimeRefByTarget(date, target = {}, refIndex) {
  const index = Number(refIndex);
  if (!Number.isInteger(index) || index < 0) return null;
  return getDailyTimeRefsForTarget(date, target)[index] || null;
}

function getDailyTimeTargetLocate(date, target = {}) {
  const review = getDailyTimeReviewByDate(date) || getOrCreateDailyTimeReview(date);
  if (!review) return {};
  if (target.section === 'reaction') {
    return review.reactions.find((reaction) => reaction.time === getDailyTimeTargetTime(target))?.locate || {};
  }
  if (target.section === 'reactionItem') {
    const reaction = review.reactions.find((item) => item.time === getDailyTimeTargetTime(target));
    return (reaction?.items || []).find((item) => item.id === target.itemId)?.locate || {};
  }
  if (target.section === 'pre0930Item') {
    return (review.pre0930Context?.items || []).find((item) => item.id === target.itemId)?.locate || {};
  }
  if (target.section === 'summaryItem') {
    return (review.summary0930To1100?.items || []).find((item) => item.id === target.itemId)?.locate || {};
  }
  return review[getDailyTimeSectionName(target)]?.locate || {};
}

function patchDailyTimeTargetLocate(date, target = {}, patch = {}) {
  const currentLocate = getDailyTimeTargetLocate(date, target);
  const locate = { ...currentLocate, ...patch };
  if (target.section === 'reaction') {
    return updateDailyTimeReaction(date, getDailyTimeTargetTime(target), { locate });
  }
  if (target.section === 'reactionItem') {
    return updateDailyTimeReactionItem(date, getDailyTimeTargetTime(target), target.itemId, { locate });
  }
  if (target.section === 'pre0930Item') {
    return updateDailyTimeContextItem(date, target.itemId, { locate });
  }
  if (target.section === 'summaryItem') {
    return updateDailyTimeSummaryItem(date, target.itemId, { locate });
  }
  return updateDailyTimeReviewSection(date, getDailyTimeSectionName(target), { locate });
}

function syncPrimaryToolbarRange(start, end, timeframe) {
  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');
  const tfSelect = document.getElementById('tfSelect');
  if (startInput) startInput.value = start || startInput.value;
  if (endInput) endInput.value = end || endInput.value;
  if (tfSelect && timeframe) tfSelect.value = String(timeframe);
}

async function ensurePrimaryTimeframe(timeframe) {
  const targetTimeframe = Number(timeframe) || store.getCurrentTimeframe();
  if (Number(store.getCurrentTimeframe()) === targetTimeframe) return true;
  const currentRange = store.getCurrentRange();
  if (!currentRange.start || !currentRange.end) {
    bus.emit('status:update', { text: 'Cannot switch timeframe: no loaded primary range', isError: true });
    return false;
  }
  const loadRange = resolveChartLoadRange(currentRange.start, currentRange.end, targetTimeframe);
  if (!loadRange.ok) {
    bus.emit('status:update', { text: loadRange.message, isError: true });
    return false;
  }
  bus.emit('status:update', { text: 'Loading primary timeframe...', isError: false });
  try {
    const result = await fetchBars(loadRange.start, loadRange.end, targetTimeframe);
    syncPrimaryToolbarRange(loadRange.start, loadRange.end, targetTimeframe);
    store.setBars(result.bars, loadRange.start, loadRange.end, targetTimeframe, result.requestedRange, {
      outerRange: loadRange.outerRange,
    });
    return true;
  } catch (err) {
    bus.emit('status:update', { text: `Timeframe load failed: ${err.message}`, isError: true });
    return false;
  }
}

async function locateDailyTimeTarget(actionEl) {
  const date = actionEl.dataset.dailyTimeDate;
  const target = getDailyTimeTargetFromElement(actionEl);
  const locate = getDailyTimeTargetLocate(date, target);
  const range = getDailyTimeLocateRange(date, target);
  if (!Number.isFinite(range.start) || !Number.isFinite(range.end)) {
    bus.emit('status:update', { text: 'Time Reaction locate target is invalid', isError: true });
    return;
  }

  if (locate.chart === 'secondary') {
    const located = secondaryStore.isSecondaryEnabled()
      && secondaryStore.getSecondaryDisplayBars().length > 0
      && secondaryViewport.locateSecondaryTimestampRange(range.start, range.end);
    bus.emit('status:update', {
      text: located
        ? `Located ${date} ${getDailyTimeTargetLabel(target)} on secondary`
        : 'Secondary chart is not enabled or loaded for this locate target',
      isError: !located,
    });
    return;
  }

  if (!(await ensurePrimaryTimeframe(locate.timeframe))) return;
  requestAnimationFrame(() => {
    const located = viewport.locateTimestampRange(range.start, range.end);
    bus.emit('status:update', {
      text: located
        ? `Located ${date} ${getDailyTimeTargetLabel(target)}`
        : 'Primary chart cannot locate this time target',
      isError: !located,
    });
  });
}

async function locateDailyTimeRef(actionEl) {
  const date = actionEl.dataset.dailyTimeDate;
  const target = getDailyTimeTargetFromElement(actionEl);
  const ref = getDailyTimeRefByTarget(date, target, actionEl.dataset.refIndex);
  if (!ref) {
    bus.emit('status:update', { text: 'Linked object not found', isError: true });
    return;
  }

  const type = String(ref.type || ref.refType || '').toLowerCase();
  const id = ref.id || ref.refId;
  let range = null;
  let label = 'linked object';

  if (type === ORDER_REF_TYPES.PDA) {
    const annotation = getAnnotationById(id);
    if (!annotation) {
      bus.emit('status:update', { text: 'Linked PDA not found', isError: true });
      return;
    }
    range = getAnnotationTimestampRange(annotation);
    label = getPdaOrderRefLabel(annotation);
  } else if (type === ORDER_REF_TYPES.SEGMENT) {
    const segment = getSegmentById(id);
    if (!segment) {
      bus.emit('status:update', { text: 'Linked segment not found', isError: true });
      return;
    }
    range = getSegmentTimestampRange(segment);
    label = getSegmentOrderRefLabel(segment);
  } else if (type === ORDER_REF_TYPES.COMPOSITE) {
    const group = getSegmentGroupById(id);
    if (!group) {
      bus.emit('status:update', { text: 'Linked composite not found', isError: true });
      return;
    }
    range = getCompositeTimestampRange(group);
    label = 'Composite Move';
  } else if (type === ORDER_REF_TYPES.SMT) {
    const record = getSmtRecordById(id);
    if (!record) {
      bus.emit('status:update', { text: 'Linked SMT not found', isError: true });
      return;
    }
    range = getSmtTimestampRange(record);
    label = 'SMT';
  } else if (type === ORDER_REF_TYPES.ORDER_SETUP) {
    const order = getOrderReviewById(id);
    if (!order) {
      bus.emit('status:update', { text: 'Linked Order Setup not found', isError: true });
      return;
    }
    const targetTimeframe = getRefTimeframe(ref, null);
    if (targetTimeframe && !(await ensurePrimaryTimeframe(targetTimeframe))) return;
    const located = locateSetupSet(order.id, viewport.locateTimestampRange);
    bus.emit('status:update', {
      text: located ? 'Located Order Setup' : 'Order Setup has no locatable range',
      isError: !located,
    });
    return;
  }

  if (!range) {
    bus.emit('status:update', { text: 'Linked object has no locatable range', isError: true });
    return;
  }

  const useSecondary = ref.sourceChartId === 'secondary';
  if (useSecondary) {
    const located = secondaryStore.isSecondaryEnabled()
      && secondaryStore.getSecondaryDisplayBars().length > 0
      && secondaryViewport.locateSecondaryTimestampRange(range.start, range.end);
    if (located) {
      bus.emit('status:update', { text: `Located ${label} on secondary`, isError: false });
      return;
    }
  }

  const targetTimeframe = getRefTimeframe(ref, store.getCurrentTimeframe());
  if (!(await ensurePrimaryTimeframe(targetTimeframe))) return;
  requestAnimationFrame(() => {
    const located = viewport.locateTimestampRange(range.start, range.end);
    bus.emit('status:update', {
      text: located
        ? `${useSecondary ? 'Secondary unavailable; ' : ''}Located ${label} on primary`
        : 'Primary chart cannot locate this linked object',
      isError: !located,
    });
  });
}

function buildPdaDailyTimeRef(annotation) {
  return {
    type: ORDER_REF_TYPES.PDA,
    id: annotation.id,
    role: ORDER_REF_ROLES.CONTEXT,
    ...buildPdaOrderRefMetadata(annotation),
  };
}

function buildCompositeDailyTimeRef(segmentGroup) {
  return {
    type: ORDER_REF_TYPES.COMPOSITE,
    id: segmentGroup.id,
    role: ORDER_REF_ROLES.CONTEXT,
  };
}

function buildSmtDailyTimeRef(smtId) {
  return {
    type: ORDER_REF_TYPES.SMT,
    id: smtId,
    role: ORDER_REF_ROLES.CONFIRMATION,
  };
}

function buildOrderSetupDailyTimeRef(order) {
  return {
    type: ORDER_REF_TYPES.ORDER_SETUP,
    id: order.id,
    role: ORDER_REF_ROLES.CONTEXT,
    sourceInstrument: order.instrument || 'NQ',
    sourceContext: 'Order Setup',
  };
}

function buildSegmentDailyTimeRef(segment) {
  return {
    type: ORDER_REF_TYPES.SEGMENT,
    id: segment.id,
    role: ORDER_REF_ROLES.CONTEXT,
    ...buildSegmentOrderRefMetadata(segment),
  };
}

function openCalendarObject(type, id) {
  if (!type || !id) return false;
  if (type === 'order-setup') {
    suppressActiveReviewRender = true;
    let selected = false;
    try {
      selected = Boolean(setActiveReviewSet(id));
    } finally {
      suppressActiveReviewRender = false;
    }
    if (!selected) {
      return false;
    }
    if (selected) {
      clearPdaSelection();
      clearSegmentSelection();
      clearSegmentGroupSelection();
      syncCalendarToOrderReview(id);
      pushInspectorPage({
        kind: 'detail',
        objectType: 'order-setup',
        objectId: id,
        selectedDate: calendarSelectedDate,
        viewDate: calendarViewDate,
      });
      renderOrderSetupDetail(id);
    }
    return selected;
  }
  if (type === 'pda') {
    if (!getAnnotationById(id)) return false;
    clearSegmentSelection();
    clearSegmentGroupSelection();
    pushInspectorPage({
      kind: 'detail',
      objectType: 'pda',
      objectId: id,
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    suppressSelectionBackTarget = true;
    try {
      return Boolean(selectPda(id));
    } finally {
      suppressSelectionBackTarget = false;
    }
  }
  if (type === 'segment') {
    if (!getSegmentById(id)) return false;
    pushInspectorPage({
      kind: 'detail',
      objectType: 'segment',
      objectId: id,
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    suppressSelectionBackTarget = true;
    try {
      return Boolean(selectSegment(id));
    } finally {
      suppressSelectionBackTarget = false;
    }
  }
  if (type === 'composite') {
    if (!getSegmentGroupById(id)) return false;
    pushInspectorPage({
      kind: 'detail',
      objectType: 'composite',
      objectId: id,
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    suppressSelectionBackTarget = true;
    try {
      return Boolean(selectSegmentGroup(id));
    } finally {
      suppressSelectionBackTarget = false;
    }
  }
  if (type === 'smt') {
    if (!getSmtRecordById(id)) return false;
    pushInspectorPage({
      kind: 'detail',
      objectType: 'smt',
      objectId: id,
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    selectedSmtId = id;
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    renderSmtSelection();
    return true;
  }
  if (type === 'time-reaction') {
    if (!String(id || '').match(/^\d{4}-\d{2}-\d{2}$/)) return false;
    setCalendarDateContext(id);
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    selectedSmtId = null;
    pushInspectorPage({
      kind: 'detail',
      objectType: 'time-reaction',
      objectId: id,
      selectedDate: calendarSelectedDate,
      viewDate: calendarViewDate,
    });
    renderDailyTimeReviewDetail(id);
    return true;
  }
  return false;
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

  if (action === 'daily-time-section-note') {
    const date = e.target.dataset.dailyTimeDate;
    const sectionName = e.target.dataset.dailyTimeSection;
    recordInspectorHistory('Update Time Reaction Section', () => (
      updateDailyTimeReviewSection(date, sectionName, { note: e.target.value })
    ));
    refreshSelection();
    return;
  }

  if (action === 'daily-time-reaction-note') {
    const date = e.target.dataset.dailyTimeDate;
    const time = e.target.dataset.dailyTimeReactionTime;
    recordInspectorHistory('Update Time Reaction Note', () => (
      updateDailyTimeReaction(date, time, { note: e.target.value })
    ));
    refreshSelection();
    return;
  }

  if (action === 'daily-time-reaction-item-note') {
    const date = e.target.dataset.dailyTimeDate;
    const time = e.target.dataset.dailyTimeReactionTime;
    const itemId = e.target.dataset.dailyTimeContextItemId;
    recordInspectorHistory('Update Time Reaction Event', () => (
      updateDailyTimeReactionItem(date, time, itemId, { note: e.target.value })
    ));
    refreshSelection();
    return;
  }

  if (action === 'daily-time-context-item-note') {
    const date = e.target.dataset.dailyTimeDate;
    const itemId = e.target.dataset.dailyTimeContextItemId;
    recordInspectorHistory('Update Time Context Note', () => (
      updateDailyTimeContextItem(date, itemId, { note: e.target.value })
    ));
    refreshSelection();
    return;
  }

  if (action === 'daily-time-summary-item-note') {
    const date = e.target.dataset.dailyTimeDate;
    const itemId = e.target.dataset.dailyTimeContextItemId;
    recordInspectorHistory('Update Time Summary Event', () => (
      updateDailyTimeSummaryItem(date, itemId, { note: e.target.value })
    ));
    refreshSelection();
    return;
  }

  if (action === 'daily-time-locate-timeframe') {
    const date = e.target.dataset.dailyTimeDate;
    const target = getDailyTimeTargetFromElement(e.target);
    recordInspectorHistory('Update Time Reaction Locate TF', () => (
      patchDailyTimeTargetLocate(date, target, { timeframe: e.target.value })
    ));
    refreshSelection();
    return;
  }

  if (action === 'daily-time-locate-chart') {
    const date = e.target.dataset.dailyTimeDate;
    const target = getDailyTimeTargetFromElement(e.target);
    recordInspectorHistory('Update Time Reaction Locate Chart', () => (
      patchDailyTimeTargetLocate(date, target, { chart: e.target.value })
    ));
    refreshSelection();
    return;
  }

  if (orderReviewActions.handleOrderReviewChange(action, e.target)) {
    return;
  }

  if (segmentActions.handleSegmentChange(action, e.target)) {
    return;
  }

  pdaActions.handlePdaChange(action, e.target);
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

  if (action === 'economic-calendar-filter') {
    const key = actionEl.dataset.economicFilter;
    if (key) {
      updateEconomicCalendarFilters({ [key]: actionEl.checked });
      refreshSelection();
    }
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

  if (action === 'inspector-back') {
    renderPageFromState(popInspectorPage());
    bus.emit('status:update', { text: 'Returned', isError: false });
    return;
  }

  if (action === 'daily-time-ref-pick-start') {
    startDailyTimeRefPick(actionEl);
    return;
  }

  if (action === 'daily-time-ref-pick-cancel') {
    clearDailyTimeRefPick();
    return;
  }

  if (action === 'daily-time-context-item-add') {
    recordInspectorHistory('Add Time Context', () => addDailyTimeContextItem(actionEl.dataset.dailyTimeDate));
    refreshSelection();
    return;
  }

  if (action === 'daily-time-reaction-item-add') {
    recordInspectorHistory('Add Time Reaction Event', () => (
      addDailyTimeReactionItem(actionEl.dataset.dailyTimeDate, actionEl.dataset.dailyTimeReactionTime)
    ));
    refreshSelection();
    return;
  }

  if (action === 'daily-time-summary-item-add') {
    recordInspectorHistory('Add Time Summary Event', () => addDailyTimeSummaryItem(actionEl.dataset.dailyTimeDate));
    refreshSelection();
    return;
  }

  if (action === 'daily-time-context-item-remove') {
    recordInspectorHistory('Remove Time Context', () => (
      removeDailyTimeContextItem(actionEl.dataset.dailyTimeDate, actionEl.dataset.dailyTimeContextItemId)
    ));
    refreshSelection();
    return;
  }

  if (action === 'daily-time-reaction-item-remove') {
    recordInspectorHistory('Remove Time Reaction Event', () => (
      removeDailyTimeReactionItem(
        actionEl.dataset.dailyTimeDate,
        actionEl.dataset.dailyTimeReactionTime,
        actionEl.dataset.dailyTimeContextItemId
      )
    ));
    refreshSelection();
    return;
  }

  if (action === 'daily-time-summary-item-remove') {
    recordInspectorHistory('Remove Time Summary Event', () => (
      removeDailyTimeSummaryItem(actionEl.dataset.dailyTimeDate, actionEl.dataset.dailyTimeContextItemId)
    ));
    refreshSelection();
    return;
  }

  if (action === 'daily-time-locate') {
    locateDailyTimeTarget(actionEl);
    return;
  }

  if (action === 'daily-time-ref-locate') {
    locateDailyTimeRef(actionEl);
    return;
  }

  if (action === 'daily-time-ref-remove') {
    const date = actionEl.dataset.dailyTimeDate;
    const target = getDailyTimeTargetFromElement(actionEl);
    const removed = recordInspectorHistory('Remove Time Reaction Ref', () => (
      removeDailyTimeReviewRef(date, target, Number(actionEl.dataset.refIndex))
    ));
    bus.emit('status:update', {
      text: removed ? `Removed linked object from ${getDailyTimeTargetLabel(target)}` : 'Remove linked object failed',
      isError: !removed,
    });
    refreshSelection();
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
    const deletedId = actionEl.dataset.smtId;
    recordInspectorHistory('Delete SMT', () => deleteSmtRecord(actionEl.dataset.smtId));
    if (selectedSmtId === deletedId) selectedSmtId = null;
    const page = getInspectorPage();
    if (page.kind === 'detail' && page.objectType === 'smt' && String(page.objectId) === String(deletedId)) {
      renderAfterDetailDeleted();
      return;
    }
    if (currentPanel === 'archive') renderArchivePanel();
    return;
  }

  if (action === 'smt-select') {
    const record = getSmtRecordById(actionEl.dataset.smtId);
    if (record) {
      if (pendingDailyTimeRefPick) {
        selectedSmtId = record.id;
        linkPickedDailyTimeRef(buildSmtDailyTimeRef(record.id), 'SMT');
        return;
      }
      prepareDetailBackTarget(getSmtCalendarDate(record));
      selectedSmtId = record.id;
      renderSmtSelection();
      openSidebar();
    }
    return;
  }

  if (orderReviewActions.handleOrderReviewClick(action, actionEl)) {
    return;
  }

  if (action === 'drawing-set-locate') {
    locateDrawingSet(actionEl.dataset.setType, actionEl.dataset.setId);
    return;
  }

  const segment = getCurrentSegment();
  if (segment && orderReviewActions.handleOrderReviewClick(action, actionEl, { segment })) {
    return;
  }

  const segmentGroup = getCurrentSegmentGroup();
  if (segmentGroup && orderReviewActions.handleOrderReviewClick(action, actionEl, { segmentGroup })) {
    return;
  }

  if (segmentActions.handleSegmentClick(action, actionEl)) {
    return;
  }

  const annotation = getCurrentAnnotation();
  if (!annotation) return;

  if (orderReviewActions.handleOrderReviewClick(action, actionEl, { annotation })) {
    return;
  }

  pdaActions.handlePdaClick(action, actionEl);
}

export function initInspectorSidebar() {
  resetInspectorPage({ kind: 'home' });
  createSidebar();
  document.getElementById('chart')?.addEventListener('click', orderReviewActions.handleExitPickChartClick, true);
  document.getElementById('chart')?.addEventListener('click', segmentActions.handleActorPickChartClick, true);
  chart.onCrosshairMove(orderReviewActions.handleExitPickHover);
  chart.onCrosshairMove(segmentActions.handleActorPickHover);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      orderReviewActions.clearExitPickState();
      segmentActions.clearActorPickState();
      clearDailyTimeRefPick({ silent: true });
    }
  });
  bus.on('pda:selected', ({ annotation }) => {
    if (pendingDailyTimeRefPick) {
      linkPickedDailyTimeRef(buildPdaDailyTimeRef(annotation), getPdaOrderRefLabel(annotation));
      return;
    }
    if (!suppressSelectionBackTarget) prepareDetailBackTarget(getAnnotationCalendarDate(annotation));
    renderAnnotation(annotation);
    openSidebar();
  });
  bus.on('pda:selection-cleared', refreshSelection);
  bus.on('pda:changed', refreshSelection);
  bus.on('segment:selected', ({ segment }) => {
    if (pendingDailyTimeRefPick) {
      linkPickedDailyTimeRef(buildSegmentDailyTimeRef(segment), getSegmentOrderRefLabel(segment));
      return;
    }
    if (!suppressSelectionBackTarget) prepareDetailBackTarget(getSegmentCalendarDate(segment));
    renderSegment(segment);
    openSidebar();
  });
  bus.on('segment-group:selected', ({ segmentGroup }) => {
    if (pendingDailyTimeRefPick) {
      linkPickedDailyTimeRef(buildCompositeDailyTimeRef(segmentGroup), 'Composite Move');
      return;
    }
    if (!suppressSelectionBackTarget) prepareDetailBackTarget(getCompositeCalendarDate(segmentGroup));
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
  bus.on('daily-time-review:changed', refreshSelection);
  bus.on('economic-calendar:changed', refreshSelection);
  bus.on('inspector:open-calendar-date', openCalendarDate);
  bus.on('order-setup-element:selected', () => {
    if (pendingDailyTimeRefPick) {
      const order = getOrderReviewById(getSelectedOrderSetupElement()?.setupId);
      if (order) linkPickedDailyTimeRef(buildOrderSetupDailyTimeRef(order), 'Order Setup');
      return;
    }
    showActiveOrderSetupPanel();
  });
  bus.on('order-setup-element:selection-cleared', refreshSelection);
  bus.on('order-review-active:changed', ({ activeReviewSetId }) => {
    if (suppressActiveReviewRender) return;
    if (pendingDailyTimeRefPick && activeReviewSetId) {
      const order = getOrderReviewById(activeReviewSetId);
      if (order) linkPickedDailyTimeRef(buildOrderSetupDailyTimeRef(order), 'Order Setup');
      return;
    }
    if (activeReviewSetId) {
      showActiveOrderSetupPanel();
      return;
    }
    refreshSelection();
  });
  bus.on('inspector:open-archive', () => {
    clearPdaSelection();
    clearSegmentSelection();
    clearSegmentGroupSelection();
    renderArchivePanel();
    openSidebar();
  });
  bus.on('bars:cleared', () => {
    segmentActions.clearActorPickState({ silent: true });
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
