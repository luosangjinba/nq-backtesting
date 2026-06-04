import * as bus from '../../event-bus.js';
import * as viewport from '../../chart/viewport-controller.js';
import * as secondaryViewport from '../../chart/secondary-viewport-controller.js';
import { fetchBars } from '../../api.js';
import { getAnnotationById } from '../../pda/pda-store.js';
import { locatePdaProjection } from '../../pda/pda-locate-actions.js';
import { getSegmentById } from '../../segment/segment-store.js';
import { getSegmentGroupById } from '../../segment/segment-group-store.js';
import { locateSetupSet } from '../../order/setup-set.js';
import * as store from '../../data/bar-store.js';
import * as secondaryStore from '../../data/secondary-chart-store.js';
import { resolveChartLoadRange } from '../../data/load-range-policy.js';
import { getSmtRecordById } from '../../smt/smt-store.js';
import {
  getOrderReviewById,
} from '../../order/order-review-store.js';
import {
  ORDER_REF_ROLES,
  ORDER_REF_TYPES,
} from '../../order/order-review-types.js';
import {
  buildPdaOrderRefMetadata,
  buildSegmentOrderRefMetadata,
  getPdaOrderRefLabel,
  getSegmentOrderRefLabel,
} from '../../order/order-ref-metadata.js';
import {
  DAILY_TIME_REVIEW_SECTION_KEYS,
  addDailyTimeReviewRef,
  addDailyTimeContextItem,
  addDailyTimeReactionItem,
  addDailyTimeSummaryItem,
  getDailyTimeReviewByDate,
  getDailyTimeReviewSectionDefinition,
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
} from '../../time-reaction/daily-time-review-store.js';
import { getCalendarDateTimestamp } from './calendar-panel.js';

let pendingDailyTimeRefPick = null;

export function getPendingDailyTimeRefPick() {
  return pendingDailyTimeRefPick;
}

export function setPendingDailyTimeRefPick(nextPick) {
  pendingDailyTimeRefPick = nextPick || null;
  return pendingDailyTimeRefPick;
}

export function clearPendingDailyTimeRefPick() {
  pendingDailyTimeRefPick = null;
}

export function hasPendingDailyTimeRefPick() {
  return Boolean(pendingDailyTimeRefPick);
}

export function getDailyTimeTargetFromElement(actionEl) {
  const section = actionEl.dataset.dailyTimeTargetSection;
  if (DAILY_TIME_REVIEW_SECTION_KEYS.includes(section)) {
    return { section };
  }
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

export function getDailyTimeTargetKey(target = {}) {
  return [
    target.section || '',
    target.itemId || '',
    target.time || '',
  ].join(':');
}

export function getDailyTimeSectionName(target = {}) {
  if (DAILY_TIME_REVIEW_SECTION_KEYS.includes(target.section)) return target.section;
  return target.section === 'summary' ? 'summary0930To1100' : 'pre0930Context';
}

export function getDailyTimeTargetLabel(target = {}) {
  const sectionDefinition = getDailyTimeReviewSectionDefinition(target.section);
  if (sectionDefinition) return sectionDefinition.label;
  if (target.section === 'reaction') return target.time || 'reaction';
  if (target.section === 'reactionItem') return target.time || 'reaction';
  if (target.section === 'pre0930Item') return 'Pre 09:30 Context';
  if (target.section === 'summaryItem') return '09:30-11:00 Summary';
  if (target.section === 'summary') return '09:30-11:00 Summary';
  return 'Pre 09:30 Context';
}

export function getDailyTimeTargetTime(target = {}) {
  const sectionDefinition = getDailyTimeReviewSectionDefinition(target.section);
  if (sectionDefinition) return sectionDefinition.fallbackTime || '09:30';
  if (target.section === 'reaction' || target.section === 'reactionItem') return target.time || '09:30';
  if (target.section === 'summary' || target.section === 'summaryItem') return '11:00';
  return '09:30';
}

export function getDailyTimeLocateRange(date, target = {}) {
  const sectionDefinition = getDailyTimeReviewSectionDefinition(target.section);
  if (sectionDefinition) {
    return {
      start: getCalendarDateTimestamp(date, sectionDefinition.fallbackTime || '09:30'),
      end: getCalendarDateTimestamp(
        date,
        sectionDefinition.rangeEndTime || sectionDefinition.fallbackTime || '09:30'
      ),
    };
  }
  if (target.section === 'summary' || target.section === 'summaryItem') {
    return {
      start: getCalendarDateTimestamp(date, '09:30'),
      end: getCalendarDateTimestamp(date, '11:00'),
    };
  }
  const timestamp = getCalendarDateTimestamp(date, getDailyTimeTargetTime(target));
  return { start: timestamp, end: timestamp };
}

export function asTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export function timestampRangeFromValues(values = []) {
  const timestamps = values.map(asTimestamp).filter((value) => value !== null);
  if (!timestamps.length) return null;
  return { start: Math.min(...timestamps), end: Math.max(...timestamps) };
}

export function getTimeframeFromLabel(value) {
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

export function getRefTimeframe(ref = {}, fallback = null) {
  return getTimeframeFromLabel(ref.sourceTimeframe)
    || getTimeframeFromLabel(ref.sourceTimeframeLabel)
    || getTimeframeFromLabel(ref.timeframe)
    || fallback;
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

function getDailyTimeRefsForTarget(date, target = {}) {
  const review = getDailyTimeReviewByDate(date);
  if (!review) return [];
  if (DAILY_TIME_REVIEW_SECTION_KEYS.includes(target.section)) {
    return Array.isArray(review[target.section]?.refs) ? review[target.section].refs : [];
  }
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
  if (DAILY_TIME_REVIEW_SECTION_KEYS.includes(target.section)) {
    return review[target.section]?.locate || {};
  }
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

export function createDailyTimeInspectorActionController({
  renderDailyTimeReviewDetail,
  refreshSelection,
  openSidebar,
  setCalendarDateContext,
  recordInspectorHistory,
} = {}) {
  function startRefPick(actionEl) {
    const date = actionEl.dataset.dailyTimeDate;
    const target = getDailyTimeTargetFromElement(actionEl);
    setPendingDailyTimeRefPick({
      date,
      target,
      targetKey: getDailyTimeTargetKey(target),
    });
    bus.emit('status:update', {
      text: `Select chart object for ${getDailyTimeTargetLabel(target)}. Press Escape to cancel.`,
      isError: false,
    });
    refreshSelection?.();
  }

  function clearRefPick({ silent = false } = {}) {
    if (!hasPendingDailyTimeRefPick()) return;
    clearPendingDailyTimeRefPick();
    if (!silent) bus.emit('status:update', { text: 'Object select cancelled', isError: false });
    refreshSelection?.();
  }

  function linkPickedRef(ref, label) {
    const pendingPick = getPendingDailyTimeRefPick();
    if (!pendingPick || !ref?.type || !ref?.id) return false;
    const { date, target } = pendingPick;
    const added = recordInspectorHistory?.('Link Time Reaction Object', () => (
      addDailyTimeReviewRef(date, target, ref)
    ));
    const targetLabel = getDailyTimeTargetLabel(target);
    clearPendingDailyTimeRefPick();
    if (added) {
      setCalendarDateContext?.(date);
      renderDailyTimeReviewDetail?.(
        date,
        DAILY_TIME_REVIEW_SECTION_KEYS.includes(target.section) ? target.section : ''
      );
      openSidebar?.();
    }
    bus.emit('status:update', {
      text: added ? `${label} linked to ${targetLabel}` : 'Link selected object failed',
      isError: !added,
    });
    return Boolean(added);
  }

  async function locateTarget(actionEl) {
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

  async function locateRef(actionEl) {
    const date = actionEl.dataset.dailyTimeDate;
    const target = getDailyTimeTargetFromElement(actionEl);
    const ref = getDailyTimeRefByTarget(date, target, actionEl.dataset.refIndex);
    const locateChart = actionEl.dataset.locateChart === 'secondary' ? 'secondary' : 'primary';
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
      const result = locatePdaProjection(annotation, { chart: locateChart });
      bus.emit('status:update', {
        text: result.primary.located && result.secondary.located
          ? `Located ${label} on primary and secondary`
          : result.primary.located
            ? `Located ${label} on primary`
            : result.secondary.located
              ? `Located ${label} on secondary`
              : `${label} has no locatable loaded chart`,
        isError: !result.located,
      });
      return;
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
      if (locateChart === 'secondary') {
        bus.emit('status:update', { text: 'Order Setup can only locate on primary', isError: true });
        return;
      }
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

    let secondaryLocated = false;
    if (locateChart === 'secondary') {
      secondaryLocated = secondaryStore.isSecondaryEnabled()
        && secondaryStore.getSecondaryDisplayBars().length > 0
        && secondaryViewport.locateSecondaryTimestampRange(range.start, range.end);
      bus.emit('status:update', {
        text: secondaryLocated
          ? `Located ${label} on secondary`
          : 'Secondary chart is not enabled or loaded for this linked object',
        isError: !secondaryLocated,
      });
      return;
    }

    const targetTimeframe = getRefTimeframe(ref, store.getCurrentTimeframe());
    if (!(await ensurePrimaryTimeframe(targetTimeframe))) return;
    requestAnimationFrame(() => {
      const primaryLocated = viewport.locateTimestampRange(range.start, range.end);
      bus.emit('status:update', {
        text: primaryLocated ? `Located ${label} on primary` : 'Primary chart cannot locate this linked object',
        isError: !primaryLocated,
      });
    });
  }

  function handleChange(action, targetEl) {
    if (action === 'daily-time-section-note') {
      const date = targetEl.dataset.dailyTimeDate;
      const sectionName = targetEl.dataset.dailyTimeSection;
      recordInspectorHistory?.('Update Time Reaction Section', () => (
        updateDailyTimeReviewSection(date, sectionName, { note: targetEl.value })
      ));
      refreshSelection?.();
      return true;
    }
    if (action === 'daily-time-reaction-note') {
      const date = targetEl.dataset.dailyTimeDate;
      const time = targetEl.dataset.dailyTimeReactionTime;
      recordInspectorHistory?.('Update Time Reaction Note', () => (
        updateDailyTimeReaction(date, time, { note: targetEl.value })
      ));
      refreshSelection?.();
      return true;
    }
    if (action === 'daily-time-reaction-item-note') {
      const date = targetEl.dataset.dailyTimeDate;
      const time = targetEl.dataset.dailyTimeReactionTime;
      const itemId = targetEl.dataset.dailyTimeContextItemId;
      recordInspectorHistory?.('Update Time Reaction Event', () => (
        updateDailyTimeReactionItem(date, time, itemId, { note: targetEl.value })
      ));
      refreshSelection?.();
      return true;
    }
    if (action === 'daily-time-context-item-note') {
      const date = targetEl.dataset.dailyTimeDate;
      const itemId = targetEl.dataset.dailyTimeContextItemId;
      recordInspectorHistory?.('Update Time Context Note', () => (
        updateDailyTimeContextItem(date, itemId, { note: targetEl.value })
      ));
      refreshSelection?.();
      return true;
    }
    if (action === 'daily-time-summary-item-note') {
      const date = targetEl.dataset.dailyTimeDate;
      const itemId = targetEl.dataset.dailyTimeContextItemId;
      recordInspectorHistory?.('Update Time Summary Event', () => (
        updateDailyTimeSummaryItem(date, itemId, { note: targetEl.value })
      ));
      refreshSelection?.();
      return true;
    }
    if (action === 'daily-time-locate-timeframe') {
      const date = targetEl.dataset.dailyTimeDate;
      const target = getDailyTimeTargetFromElement(targetEl);
      recordInspectorHistory?.('Update Time Reaction Locate TF', () => (
        patchDailyTimeTargetLocate(date, target, { timeframe: targetEl.value })
      ));
      refreshSelection?.();
      return true;
    }
    if (action === 'daily-time-locate-chart') {
      const date = targetEl.dataset.dailyTimeDate;
      const target = getDailyTimeTargetFromElement(targetEl);
      recordInspectorHistory?.('Update Time Reaction Locate Chart', () => (
        patchDailyTimeTargetLocate(date, target, { chart: targetEl.value })
      ));
      refreshSelection?.();
      return true;
    }
    return false;
  }

  function handleClick(action, actionEl) {
    if (action === 'daily-time-ref-pick-start') {
      startRefPick(actionEl);
      return true;
    }
    if (action === 'daily-time-ref-pick-cancel') {
      clearRefPick();
      return true;
    }
    if (action === 'daily-time-context-item-add') {
      recordInspectorHistory?.('Add Time Context', () => addDailyTimeContextItem(actionEl.dataset.dailyTimeDate));
      refreshSelection?.();
      return true;
    }
    if (action === 'daily-time-reaction-item-add') {
      recordInspectorHistory?.('Add Time Reaction Event', () => (
        addDailyTimeReactionItem(actionEl.dataset.dailyTimeDate, actionEl.dataset.dailyTimeReactionTime)
      ));
      refreshSelection?.();
      return true;
    }
    if (action === 'daily-time-summary-item-add') {
      recordInspectorHistory?.('Add Time Summary Event', () => addDailyTimeSummaryItem(actionEl.dataset.dailyTimeDate));
      refreshSelection?.();
      return true;
    }
    if (action === 'daily-time-context-item-remove') {
      recordInspectorHistory?.('Remove Time Context', () => (
        removeDailyTimeContextItem(actionEl.dataset.dailyTimeDate, actionEl.dataset.dailyTimeContextItemId)
      ));
      refreshSelection?.();
      return true;
    }
    if (action === 'daily-time-reaction-item-remove') {
      recordInspectorHistory?.('Remove Time Reaction Event', () => (
        removeDailyTimeReactionItem(
          actionEl.dataset.dailyTimeDate,
          actionEl.dataset.dailyTimeReactionTime,
          actionEl.dataset.dailyTimeContextItemId
        )
      ));
      refreshSelection?.();
      return true;
    }
    if (action === 'daily-time-summary-item-remove') {
      recordInspectorHistory?.('Remove Time Summary Event', () => (
        removeDailyTimeSummaryItem(actionEl.dataset.dailyTimeDate, actionEl.dataset.dailyTimeContextItemId)
      ));
      refreshSelection?.();
      return true;
    }
    if (action === 'daily-time-locate') {
      locateTarget(actionEl);
      return true;
    }
    if (action === 'daily-time-ref-locate') {
      locateRef(actionEl);
      return true;
    }
    if (action === 'daily-time-ref-remove') {
      const date = actionEl.dataset.dailyTimeDate;
      const target = getDailyTimeTargetFromElement(actionEl);
      const removed = recordInspectorHistory?.('Remove Time Reaction Ref', () => (
        removeDailyTimeReviewRef(date, target, Number(actionEl.dataset.refIndex))
      ));
      bus.emit('status:update', {
        text: removed ? `Removed linked object from ${getDailyTimeTargetLabel(target)}` : 'Remove linked object failed',
        isError: !removed,
      });
      refreshSelection?.();
      return true;
    }
    return false;
  }

  return {
    clearRefPick,
    getPendingRefPick: getPendingDailyTimeRefPick,
    handleChange,
    handleClick,
    handlePickedPda: (annotation) => linkPickedRef(buildPdaDailyTimeRef(annotation), getPdaOrderRefLabel(annotation)),
    handlePickedSegment: (segment) => linkPickedRef(buildSegmentDailyTimeRef(segment), getSegmentOrderRefLabel(segment)),
    handlePickedComposite: (segmentGroup) => linkPickedRef(buildCompositeDailyTimeRef(segmentGroup), 'Composite Move'),
    handlePickedSmt: (record) => linkPickedRef(buildSmtDailyTimeRef(record?.id || record), 'SMT'),
    handlePickedOrderSetup: (order) => linkPickedRef(buildOrderSetupDailyTimeRef(order), 'Order Setup'),
    isPicking: hasPendingDailyTimeRefPick,
  };
}
