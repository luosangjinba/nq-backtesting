import { getSetupSets } from '../order/setup-set.js';
import { getLiveRecordSets } from '../live-record/live-record-set.js';
import { formatPdaSourceBadge } from '../pda/pda-source-format.js';
import { getAnnotations } from '../pda/pda-store.js';
import { getSegments, getSegmentById } from '../segment/segment-store.js';
import { getSegmentGroups } from '../segment/segment-group-store.js';
import { getSmtRecords } from '../smt/smt-store.js';
import { getTimeOverlaySettings } from '../time-overlays/time-overlay-store.js';
import { getVisibleEconomicEvents } from '../economic-calendar/economic-calendar-store.js';
import {
  compactUtcTime,
  dateKeyFromTimestamp,
} from '../utils.js';
import {
  CALENDAR_GROUP_ORDER,
  CALENDAR_OBJECT_TYPES,
  getCalendarGroupLabel,
} from './calendar-types.js';

function toTimestamp(value) {
  if (value === undefined || value === null || value === '') return null;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function collectTimestamps(values = []) {
  return values.map(toTimestamp).filter((value) => value !== null);
}

export { dateKeyFromTimestamp };

function timestampRangeFromValues(values = []) {
  const timestamps = collectTimestamps(values);
  if (!timestamps.length) return null;
  return { start: Math.min(...timestamps), end: Math.max(...timestamps) };
}

function calendarDateTimestamp(dateKey, timeText) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [hour, minute] = String(timeText || '').split(':').map(Number);
  if (![hour, minute].every(Number.isFinite)) return null;
  return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour, minute, 0) / 1000);
}

function compactTime(value) {
  return compactUtcTime(value, '—');
}

function formatNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '—';
}

function compactPrice(value) {
  const formatted = formatNumber(value);
  return formatted === '—' ? '' : `@ ${formatted}`;
}

function titleCase(value, fallback = '—') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function joinSummary(parts = []) {
  return parts.filter((part) => part !== undefined && part !== null && String(part).trim()).join(' · ');
}

function formatCountLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function createCalendarItem(type, dateTimestamp, label, range, ref = {}, source = null) {
  const timestamp = toTimestamp(dateTimestamp);
  const dateKey = dateKeyFromTimestamp(timestamp);
  if (!dateKey) return null;
  return {
    id: ref.id || source?.id || '',
    type,
    dateKey,
    timestamp,
    label,
    range,
    ref: { type, id: ref.id || source?.id || '' },
    source,
  };
}

function getSetupSetDateTimestamp(setupSet) {
  return (
    setupSet.orderElements?.entry?.timestamp ??
    setupSet.orderElements?.reversal?.timestamp ??
    setupSet.orderElements?.result?.timestamp ??
    setupSet.primaryTimestamp ??
    null
  );
}

function summarizeSetupSet(setupSet) {
  const entry = setupSet.orderElements?.entry || {};
  const reversal = setupSet.orderElements?.reversal || {};
  const result = setupSet.orderElements?.result || {};
  return joinSummary([
    titleCase(setupSet.direction, 'Setup'),
    titleCase(reversal.eventType, ''),
    compactTime(getSetupSetDateTimestamp(setupSet)),
    compactPrice(entry.price),
    titleCase(result.status, ''),
  ]);
}

function createSetupSetItem(setupSet) {
  return createCalendarItem(
    CALENDAR_OBJECT_TYPES.ORDER_SETUP,
    getSetupSetDateTimestamp(setupSet),
    summarizeSetupSet(setupSet),
    setupSet.range,
    { id: setupSet.id },
    setupSet
  );
}

function getLiveRecordDateTimestamp(liveRecordSet) {
  return (
    liveRecordSet.execution?.entry?.timestamp ??
    liveRecordSet.anchor?.timestamp ??
    liveRecordSet.result?.exitTimestamp ??
    liveRecordSet.primaryTimestamp ??
    null
  );
}

function summarizeLiveRecordSet(liveRecordSet) {
  const entry = liveRecordSet.execution?.entry || {};
  const anchor = liveRecordSet.anchor || {};
  const result = liveRecordSet.result || {};
  return joinSummary([
    titleCase(liveRecordSet.direction, 'Live'),
    titleCase(liveRecordSet.status, 'Draft'),
    compactTime(getLiveRecordDateTimestamp(liveRecordSet)),
    compactPrice(entry.price ?? anchor.price),
    titleCase(result.status, ''),
  ]);
}

function createLiveRecordItem(liveRecordSet) {
  return createCalendarItem(
    CALENDAR_OBJECT_TYPES.LIVE_RECORD,
    getLiveRecordDateTimestamp(liveRecordSet),
    summarizeLiveRecordSet(liveRecordSet),
    liveRecordSet.range || (
      getLiveRecordDateTimestamp(liveRecordSet)
        ? { start: getLiveRecordDateTimestamp(liveRecordSet), end: getLiveRecordDateTimestamp(liveRecordSet) }
        : null
    ),
    { id: liveRecordSet.id },
    liveRecordSet
  );
}

function getPdaTimestamp(annotation) {
  return (
    annotation.canonicalTimestamp ??
    annotation.timestamp ??
    annotation.anchorTime ??
    annotation.start?.timestamp ??
    annotation.startTime ??
    null
  );
}

function getPdaTimestampRange(annotation) {
  return timestampRangeFromValues([
    annotation.canonicalTimestamp,
    annotation.timestamp,
    annotation.anchorTime,
    annotation.start?.timestamp,
    annotation.end?.timestamp,
    annotation.startTime,
    annotation.endTime,
  ]);
}

function summarizePda(annotation) {
  const context = formatPdaSourceBadge(annotation);
  const price = annotation.price ?? annotation.topPrice ?? annotation.priceHigh;
  const bottom = annotation.bottomPrice ?? annotation.priceLow;
  const priceText = bottom !== undefined && bottom !== null
    ? `${formatNumber(price)}-${formatNumber(bottom)}`
    : compactPrice(price);
  return joinSummary([titleCase(annotation.type, 'PDA'), context, priceText]);
}

function createPdaItem(annotation) {
  if (annotation.draft) return null;
  return createCalendarItem(
    CALENDAR_OBJECT_TYPES.PDA,
    getPdaTimestamp(annotation),
    summarizePda(annotation),
    getPdaTimestampRange(annotation),
    { id: annotation.id },
    annotation
  );
}

function getSegmentTimestamp(segment) {
  return segment.start?.timestamp ?? segment.start?.time ?? null;
}

function getSegmentTimestampRange(segment) {
  return timestampRangeFromValues([
    segment?.start?.timestamp ?? segment?.start?.time,
    segment?.end?.timestamp ?? segment?.end?.time,
  ]);
}

function summarizeSegment(segment) {
  return joinSummary([
    segment.timeframe || '1H',
    titleCase(segment.direction, 'Segment'),
    `${compactTime(segment.start?.timestamp ?? segment.start?.time)} -> ${compactTime(segment.end?.timestamp ?? segment.end?.time)}`,
  ]);
}

function createSegmentItem(segment) {
  return createCalendarItem(
    CALENDAR_OBJECT_TYPES.SEGMENT,
    getSegmentTimestamp(segment),
    summarizeSegment(segment),
    getSegmentTimestampRange(segment),
    { id: segment.id },
    segment
  );
}

function getCompositeTimestamp(group) {
  const firstId = Array.isArray(group.childSegmentIds) ? group.childSegmentIds[0] : null;
  return getSegmentTimestamp(getSegmentById(firstId));
}

function getCompositeTimestampRange(group) {
  const timestamps = (Array.isArray(group.childSegmentIds) ? group.childSegmentIds : [])
    .flatMap((id) => {
      const segment = getSegmentById(id);
      return [segment?.start?.timestamp ?? segment?.start?.time, segment?.end?.timestamp ?? segment?.end?.time];
    })
    .map(toTimestamp)
    .filter((value) => value !== null);
  if (!timestamps.length) return null;
  return { start: Math.min(...timestamps), end: Math.max(...timestamps) };
}

function summarizeComposite(group) {
  const children = (Array.isArray(group.childSegmentIds) ? group.childSegmentIds : [])
    .map(getSegmentById)
    .filter(Boolean);
  const first = children[0];
  const last = children[children.length - 1];
  const timeRange = first && last
    ? `${compactTime(first.start?.timestamp ?? first.start?.time)} -> ${compactTime(last.end?.timestamp ?? last.end?.time)}`
    : '';
  return joinSummary([
    formatCountLabel(group.childSegmentIds?.length || 0, 'leg'),
    titleCase(group.direction, ''),
    timeRange,
  ]);
}

function createCompositeItem(group) {
  return createCalendarItem(
    CALENDAR_OBJECT_TYPES.COMPOSITE,
    getCompositeTimestamp(group),
    summarizeComposite(group),
    getCompositeTimestampRange(group),
    { id: group.id },
    group
  );
}

function getSmtTimestamp(record) {
  return record.leftTimestamp ?? record.timestamp ?? record.fvgStartTimestamp ?? null;
}

function getSmtTimestampRange(record) {
  return timestampRangeFromValues([
    record.leftTimestamp,
    record.rightTimestamp,
    record.timestamp,
    record.fvgStartTimestamp,
    record.fvgEndTimestamp,
  ]);
}

function summarizeSmt(record) {
  return joinSummary([
    titleCase(record.direction, ''),
    titleCase(record.type, 'SMT'),
    record.timeframe,
  ]);
}

function createSmtItem(record) {
  return createCalendarItem(
    CALENDAR_OBJECT_TYPES.SMT,
    getSmtTimestamp(record),
    summarizeSmt(record),
    getSmtTimestampRange(record),
    { id: record.id },
    record
  );
}

function summarizeEconomicEvent(event) {
  return joinSummary([
    event.displayTime || (event.allDay ? 'All Day' : ''),
    titleCase(event.impact, ''),
    event.currency || 'USD',
    event.title,
  ]);
}

function createEconomicEventItem(event) {
  const timestamp = toTimestamp(event.locateTimestamp);
  if (timestamp === null) return null;
  return createCalendarItem(
    CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT,
    timestamp,
    summarizeEconomicEvent(event),
    { start: timestamp, end: timestamp },
    { id: event.id },
    event
  );
}

function createKillzoneItem(killzone) {
  const start = calendarDateTimestamp(killzone.date, killzone.startTime);
  const end = calendarDateTimestamp(killzone.date, killzone.endTime);
  if (![start, end].every(Number.isFinite)) return null;
  return createCalendarItem(
    CALENDAR_OBJECT_TYPES.KILLZONE,
    Math.min(start, end),
    `${killzone.label || 'Killzone'} · ${killzone.startTime}-${killzone.endTime}`,
    { start: Math.min(start, end), end: Math.max(start, end) },
    { id: killzone.id },
    killzone
  );
}

function createTimeLineItem(eventTime) {
  const timestamp = calendarDateTimestamp(eventTime.date, eventTime.time);
  if (!Number.isFinite(timestamp)) return null;
  return createCalendarItem(
    CALENDAR_OBJECT_TYPES.TIME_LINE,
    timestamp,
    `Time Line · ${eventTime.label || eventTime.time}`,
    { start: timestamp, end: timestamp },
    { id: eventTime.id },
    eventTime
  );
}

function createCalendarItems() {
  const settings = getTimeOverlaySettings();
  return [
    ...getSetupSets().map(createSetupSetItem),
    ...getLiveRecordSets().map(createLiveRecordItem),
    ...getVisibleEconomicEvents().map(createEconomicEventItem),
    ...getSmtRecords().map(createSmtItem),
    ...getAnnotations().map(createPdaItem),
    ...getSegments().map(createSegmentItem),
    ...getSegmentGroups().map(createCompositeItem),
    ...(settings.killzones || []).map(createKillzoneItem),
    ...(settings.eventTimes || []).map(createTimeLineItem),
  ].filter(Boolean);
}

function makeEmptyDay(dateKey) {
  return {
    dateKey,
    groups: new Map(CALENDAR_GROUP_ORDER.map((type) => [type, []])),
  };
}

function getCombinedGroupKey(type) {
  if (type === CALENDAR_OBJECT_TYPES.TIME_LINE) return CALENDAR_OBJECT_TYPES.KILLZONE;
  return type;
}

export function getCalendarReviewIndex() {
  const days = new Map();
  createCalendarItems().forEach((item) => {
    if (!days.has(item.dateKey)) days.set(item.dateKey, makeEmptyDay(item.dateKey));
    const day = days.get(item.dateKey);
    const groupKey = getCombinedGroupKey(item.type);
    if (!day.groups.has(groupKey)) day.groups.set(groupKey, []);
    day.groups.get(groupKey).push(item);
  });

  days.forEach((day) => {
    day.groups.forEach((items) => {
      items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    });
  });

  return { days };
}

export function getCalendarDayGroups(dateKey, index = getCalendarReviewIndex()) {
  const day = index.days.get(dateKey) || makeEmptyDay(dateKey);
  return CALENDAR_GROUP_ORDER
    .filter((type) => type !== CALENDAR_OBJECT_TYPES.TIME_LINE)
    .map((type) => ({
      type,
      label: getCalendarGroupLabel(type),
      rows: [...(day.groups.get(type) || [])],
    }));
}

export function getCalendarObjectDateKeys(type = null, index = getCalendarReviewIndex()) {
  const keys = new Set();
  index.days.forEach((day, dateKey) => {
    if (!type) {
      keys.add(dateKey);
      return;
    }
    const groupKey = getCombinedGroupKey(type);
    if ((day.groups.get(groupKey) || []).some((item) => item.type === type)) {
      keys.add(dateKey);
    }
  });
  return keys;
}
