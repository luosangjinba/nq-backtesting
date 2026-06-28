import { CALENDAR_OBJECT_TYPES } from '../../../calendar/calendar-types.js';
import { getPrimaryInstrument } from '../../../data/primary-instrument-store.js';
import {
  getDailyTimeReviewByDate,
  hasDailyTimeReviewContent,
} from '../../../time-reaction/daily-time-review-store.js';
import { dateKeyFromUtcParts } from '../../../utils.js';

export const DAILY_TIME_REVIEW_CALENDAR_ROWS = Object.freeze([
  {
    key: 'bias',
    label: 'Bias',
    fallbackTime: '00:00',
    legacySections: ['weeklyBias', 'dailyBias'],
    openSection: 'bias',
  },
  {
    key: 'openingThesisReview',
    label: 'Opening Thesis Review',
    fallbackTime: '00:00',
    rangeEndTime: '16:59',
    legacySections: ['pre0930Analysis', 'summary0930To1100', 'fullDaySummary'],
    openSection: 'openingThesisReview',
  },
  {
    key: 'fixedTimeState',
    label: '固定时点状态',
    fallbackTime: '09:30',
    rangeEndTime: '11:00',
    legacySections: ['fixedTimeState'],
    openSection: 'fixedTimeState',
  },
]);

function parseDateKey(dateKey) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

export function getCalendarDateTimestamp(dateKey, timeText = '09:30') {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  const [hour, minute] = String(timeText).split(':').map(Number);
  if (![hour, minute].every(Number.isFinite)) return null;
  return Math.floor(Date.UTC(parsed.year, parsed.monthIndex, parsed.day, hour, minute, 0) / 1000);
}

function getSectionRefCount(sectionData = {}) {
  const sectionRefs = Array.isArray(sectionData.refs) ? sectionData.refs.length : 0;
  const itemRefs = Array.isArray(sectionData.items)
    ? sectionData.items.reduce((sum, item) => sum + (Array.isArray(item.refs) ? item.refs.length : 0), 0)
    : 0;
  return sectionRefs + itemRefs;
}

function getSectionPreview(sectionData = {}) {
  const note = String(sectionData.note || '').trim();
  const itemNote = Array.isArray(sectionData.items)
    ? sectionData.items
        .map((item) => {
          const itemText = String(item.note || '').trim();
          return itemText ? `${item.time || ''} ${itemText}`.trim() : '';
        })
        .find(Boolean)
    : '';
  const preview = note || itemNote;
  if (!preview) return '';
  return preview.replace(/\s+/g, ' ').slice(0, 48);
}

function getDailyTimeReviewPreview(rowKey, review = {}) {
  const safeReview = review || {};
  if (rowKey === 'bias') {
    return safeReview.bias?.dailyBiasPrediction
      || safeReview.bias?.dailyBiasReview
      || safeReview.bias?.weeklyBiasPrediction
      || safeReview.bias?.weeklyBiasReview
      || safeReview.bias?.weeklyBias
      || safeReview.bias?.dailyBias
      || safeReview.bias?.biasReview
      || '';
  }
  if (rowKey === 'openingThesisReview') {
    return safeReview.openingThesisReview?.preOpenThesis
      || safeReview.openingThesisReview?.morningSummary0930To1100
      || safeReview.openingThesisReview?.fullDaySummary
      || safeReview.openingThesisReview?.thesisReview
      || '';
  }
  return '';
}

function getDailyTimeReviewRowRefCount(row, review = {}) {
  return (row.legacySections || []).reduce((total, sectionKey) => (
    total + getSectionRefCount(review?.[sectionKey] || {})
  ), 0);
}

function summarizeTimeReactionRow(row, review = {}) {
  const sectionData = review?.[row.key] || {};
  const refCount = getDailyTimeReviewRowRefCount(row, review);
  const preview = getDailyTimeReviewPreview(row.key, review) || getSectionPreview(sectionData);
  if (preview && refCount) return `${preview} · ${refCount} refs`;
  if (preview) return preview;
  if (refCount) return `${refCount} refs`;
  return 'No notes yet';
}

function createTimeReactionItem(dateKey, row, review = getDailyTimeReviewByDate(dateKey)) {
  const start = getCalendarDateTimestamp(dateKey, row.fallbackTime || '09:30');
  const end = getCalendarDateTimestamp(dateKey, row.rangeEndTime || row.fallbackTime || '09:30');
  const sectionKey = row.openSection || '';
  return {
    id: `${dateKey}:${row.key}`,
    type: CALENDAR_OBJECT_TYPES.TIME_REACTION,
    dateKey,
    timestamp: Number.isFinite(start) ? start : null,
    label: `${row.label} · ${summarizeTimeReactionRow(row, review)}`,
    range: Number.isFinite(start) && Number.isFinite(end) ? { start, end } : null,
    ref: { type: CALENDAR_OBJECT_TYPES.TIME_REACTION, id: dateKey, section: sectionKey },
    source: { sectionKey, sectionLabel: row.label, review },
  };
}

export function addTimeReactionGroup(groups, dateKey, options = {}) {
  const instrument = options.instrument || getPrimaryInstrument();
  const review = getDailyTimeReviewByDate(dateKey, instrument);
  if (!options.includeEmpty && !hasDailyTimeReviewContent(review)) {
    return groups.filter((item) => item.type !== CALENDAR_OBJECT_TYPES.TIME_REACTION);
  }
  const group = {
    type: CALENDAR_OBJECT_TYPES.TIME_REACTION,
    label: 'Time Reaction Observation',
    rows: DAILY_TIME_REVIEW_CALENDAR_ROWS.map((row) => createTimeReactionItem(dateKey, row, review)),
  };
  const existing = groups.filter((item) => item.type !== CALENDAR_OBJECT_TYPES.TIME_REACTION);
  const liveRecordIndex = existing.findIndex((item) => item.type === CALENDAR_OBJECT_TYPES.LIVE_RECORD);
  const orderSetupIndex = existing.findIndex((item) => item.type === CALENDAR_OBJECT_TYPES.ORDER_SETUP);
  const insertAfterIndex = liveRecordIndex >= 0 ? liveRecordIndex : orderSetupIndex;
  if (insertAfterIndex < 0) return [group, ...existing];
  return [
    ...existing.slice(0, insertAfterIndex + 1),
    group,
    ...existing.slice(insertAfterIndex + 1),
  ];
}

export function getNextCalendarViewDate(currentViewDate, direction) {
  const parsed = parseDateKey(currentViewDate);
  if (!parsed) return currentViewDate;
  const shifted = new Date(Date.UTC(parsed.year, parsed.monthIndex + (direction === 'prev' ? -1 : 1), 1));
  return dateKeyFromUtcParts(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1);
}
