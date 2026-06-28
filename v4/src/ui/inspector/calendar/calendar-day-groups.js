import {
  getCalendarDayGroups,
} from '../../../calendar/calendar-review-index.js';
import { CALENDAR_OBJECT_TYPES } from '../../../calendar/calendar-types.js';
import { getChartNotes } from '../../../chart-notes/chart-note-store.js';
import { isChartNoteInDate } from '../../../chart-notes/chart-note-visible-day.js';
import { getPrimaryInstrument } from '../../../data/primary-instrument-store.js';
import { getDailyTimeReviewByDate } from '../../../time-reaction/daily-time-review-store.js';
import { dateKeyFromTimestamp } from '../../../utils.js';
import { addTimeReactionGroup } from './calendar-daily-time-summary.js';

export function getEconomicImpactClass(event = {}) {
  if (event.allDay || event.eventType === 'holiday') return 'economic-holiday';
  const impact = String(event.impact || '').toLowerCase();
  if (impact === 'high') return 'economic-high';
  if (impact === 'medium') return 'economic-medium';
  return '';
}

export function getEconomicImpactLabel(event = {}) {
  if (event.allDay || event.eventType === 'holiday') return 'Holiday';
  return event.impact || 'Event';
}

function getChartNotesForDate(dateKey, instrument = 'NQ') {
  return getChartNotes()
    .filter((note) => note.instrument === instrument)
    .filter((note) => isChartNoteInDate(note, dateKey))
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
}

function createChartNoteItem(note) {
  const timestamp = Number(note.timestamp);
  const preview = String(note.text || '').replace(/\s+/g, ' ').trim() || 'Chart note';
  return {
    id: note.id,
    type: CALENDAR_OBJECT_TYPES.CHART_NOTE,
    dateKey: dateKeyFromTimestamp(timestamp),
    timestamp: Number.isFinite(timestamp) ? timestamp : null,
    label: preview,
    range: note.kind === 'range'
      ? { start: Number(note.startTimestamp), end: Number(note.endTimestamp) }
      : Number.isFinite(timestamp)
        ? { start: timestamp, end: timestamp }
        : null,
    ref: { type: CALENDAR_OBJECT_TYPES.CHART_NOTE, id: note.id },
    source: note,
  };
}

function createChartNotesGroup(dateKey, instrument = 'NQ') {
  return {
    type: CALENDAR_OBJECT_TYPES.CHART_NOTE,
    label: 'Chart Notes',
    rows: getChartNotesForDate(dateKey, instrument).map(createChartNoteItem),
  };
}

export function addChartNotesGroup(groups, dateKey, options = {}) {
  const instrument = options.instrument || getPrimaryInstrument();
  const review = getDailyTimeReviewByDate(dateKey, instrument);
  const group = createChartNotesGroup(dateKey, review?.instrument || instrument);
  if (!options.includeEmpty && !group.rows.length) {
    return groups.filter((item) => item.type !== CALENDAR_OBJECT_TYPES.CHART_NOTE);
  }
  const existing = groups.filter((item) => item.type !== CALENDAR_OBJECT_TYPES.CHART_NOTE);
  const timeReactionIndex = existing.findIndex((item) => item.type === CALENDAR_OBJECT_TYPES.TIME_REACTION);
  if (timeReactionIndex >= 0) {
    return [
      ...existing.slice(0, timeReactionIndex + 1),
      group,
      ...existing.slice(timeReactionIndex + 1),
    ];
  }
  const orderSetupIndex = existing.findIndex((item) => item.type === CALENDAR_OBJECT_TYPES.ORDER_SETUP);
  if (orderSetupIndex < 0) return [group, ...existing];
  return [
    ...existing.slice(0, orderSetupIndex + 1),
    group,
    ...existing.slice(orderSetupIndex + 1),
  ];
}

export function getCalendarObjectGroups(dateKey, calendarIndex, options = {}) {
  const instrument = options.instrument || getPrimaryInstrument();
  return addChartNotesGroup(
    addTimeReactionGroup(getCalendarDayGroups(dateKey, calendarIndex), dateKey, {
      includeEmpty: Boolean(options.includeEmpty),
      instrument,
    }),
    dateKey,
    { includeEmpty: Boolean(options.includeEmpty), instrument }
  );
}

export function getDayObjectOverview(dateKey, calendarIndex) {
  const instrument = getPrimaryInstrument();
  const groups = getCalendarObjectGroups(dateKey, calendarIndex, { includeEmpty: false, instrument });
  const countByType = new Map(groups.map((group) => [group.type, group.rows.length]));
  const setupCount = countByType.get(CALENDAR_OBJECT_TYPES.ORDER_SETUP) || 0;
  const liveRecordCount = countByType.get(CALENDAR_OBJECT_TYPES.LIVE_RECORD) || 0;
  const economicGroup = groups.find((group) => group.type === CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT);
  const economicIndicators = [];
  (economicGroup?.rows || []).forEach((item) => {
    const className = getEconomicImpactClass(item.source);
    if (!className) return;
    const label = getEconomicImpactLabel(item.source);
    const existing = economicIndicators.find((indicator) => indicator.className === className);
    if (existing) {
      existing.count += 1;
    } else {
      economicIndicators.push({
        key: className,
        label,
        className,
        count: 1,
      });
    }
  });
  return {
    setupCount,
    liveRecordCount,
    total: setupCount + liveRecordCount + economicIndicators.reduce((sum, indicator) => sum + indicator.count, 0),
    indicators: economicIndicators,
  };
}

function canToggleObjectVisibility(item) {
  return [
    CALENDAR_OBJECT_TYPES.SMT,
    CALENDAR_OBJECT_TYPES.CHART_NOTE,
    CALENDAR_OBJECT_TYPES.PDA,
    CALENDAR_OBJECT_TYPES.SEGMENT,
    CALENDAR_OBJECT_TYPES.COMPOSITE,
    CALENDAR_OBJECT_TYPES.KILLZONE,
    CALENDAR_OBJECT_TYPES.TIME_LINE,
  ].includes(item.ref?.type);
}

function isDayBulkChartObject(item) {
  return canToggleObjectVisibility(item);
}

export function countDayBulkChartObjects(groups = []) {
  return groups
    .flatMap((group) => group.rows || [])
    .filter(isDayBulkChartObject)
    .length;
}
