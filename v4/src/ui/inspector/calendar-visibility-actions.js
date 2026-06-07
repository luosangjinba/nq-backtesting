import { getCalendarDayGroups, getCalendarReviewIndex } from '../../calendar/calendar-review-index.js';
import { CALENDAR_OBJECT_TYPES } from '../../calendar/calendar-types.js';
import { getAnnotationById, updateAnnotation } from '../../pda/pda-store.js';
import { getSegmentById, updateSegment } from '../../segment/segment-store.js';
import { getSegmentGroupById, updateSegmentGroup } from '../../segment/segment-group-store.js';
import { getSmtRecordById, updateSmtRecord } from '../../smt/smt-store.js';
import { updateEventTime, updateKillzone } from '../../time-overlays/time-overlay-store.js';
import { getChartNotes, updateChartNote } from '../../chart-notes/chart-note-store.js';

function isCalendarVisibilityType(type) {
  return [
    CALENDAR_OBJECT_TYPES.SMT,
    CALENDAR_OBJECT_TYPES.PDA,
    CALENDAR_OBJECT_TYPES.SEGMENT,
    CALENDAR_OBJECT_TYPES.COMPOSITE,
    CALENDAR_OBJECT_TYPES.KILLZONE,
    CALENDAR_OBJECT_TYPES.TIME_LINE,
  ].includes(type);
}

function isCalendarChartObjectBulkType(type) {
  return isCalendarVisibilityType(type);
}

export function getCalendarVisibilitySummaryForItems(items = []) {
  const seen = new Set();
  let total = 0;
  let hidden = 0;

  items.forEach((item) => {
    const type = item?.ref?.type;
    const id = item?.ref?.id;
    if (!isCalendarChartObjectBulkType(type) || !id) return;
    const key = `${type}:${id}`;
    if (seen.has(key)) return;
    seen.add(key);
    total += 1;
    if (isCalendarObjectHidden(type, id)) hidden += 1;
  });

  const visible = total - hidden;
  const state =
    total === 0
      ? 'disabled'
      : hidden === 0
        ? 'checked'
        : visible === 0
          ? 'unchecked'
          : 'mixed';

  return { total, visible, hidden, state };
}

export function getCalendarDayVisibilitySummaries(dateKey) {
  const groups = getCalendarDayGroups(dateKey, getCalendarReviewIndex());
  return new Map(
    groups
      .filter((group) => isCalendarVisibilityType(group.type))
      .map((group) => [group.type, getCalendarVisibilitySummaryForItems(group.rows)])
  );
}

export function isCalendarObjectHidden(type, id) {
  if (type === CALENDAR_OBJECT_TYPES.SMT) return Boolean(getSmtRecordById(id)?.display?.hidden);
  if (type === CALENDAR_OBJECT_TYPES.PDA) return Boolean(getAnnotationById(id)?.display?.hidden);
  if (type === CALENDAR_OBJECT_TYPES.SEGMENT) return Boolean(getSegmentById(id)?.display?.hidden);
  if (type === CALENDAR_OBJECT_TYPES.COMPOSITE) return Boolean(getSegmentGroupById(id)?.display?.hidden);
  const index = getCalendarReviewIndex();
  const item = Array.from(index.days.values())
    .flatMap((day) => Array.from(day.groups.values()).flat())
    .find((candidate) => candidate.ref?.type === type && candidate.ref?.id === id);
  if (type === CALENDAR_OBJECT_TYPES.KILLZONE || type === CALENDAR_OBJECT_TYPES.TIME_LINE) {
    return item?.source?.enabled === false;
  }
  return false;
}

export function setCalendarObjectHidden(type, id, hidden) {
  if (!type || !id || !isCalendarVisibilityType(type)) return false;
  if (isCalendarObjectHidden(type, id) === hidden) return false;
  if (type === CALENDAR_OBJECT_TYPES.SMT) {
    const record = getSmtRecordById(id);
    if (!record) return false;
    updateSmtRecord(id, { display: { ...(record.display || {}), hidden } });
    return true;
  }
  if (type === CALENDAR_OBJECT_TYPES.PDA) {
    const annotation = getAnnotationById(id);
    if (!annotation) return false;
    updateAnnotation(id, { display: { ...(annotation.display || {}), hidden } });
    return true;
  }
  if (type === CALENDAR_OBJECT_TYPES.SEGMENT) {
    const segment = getSegmentById(id);
    if (!segment) return false;
    updateSegment(id, { display: { ...(segment.display || {}), hidden } });
    return true;
  }
  if (type === CALENDAR_OBJECT_TYPES.COMPOSITE) {
    const group = getSegmentGroupById(id);
    if (!group) return false;
    updateSegmentGroup(id, { display: { ...(group.display || {}), hidden } });
    return true;
  }
  if (type === CALENDAR_OBJECT_TYPES.KILLZONE) {
    return Boolean(updateKillzone(id, { enabled: !hidden }));
  }
  if (type === CALENDAR_OBJECT_TYPES.TIME_LINE) {
    return Boolean(updateEventTime(id, { enabled: !hidden }));
  }
  return false;
}

export function setCalendarDayChartObjectsHidden(dateKey, hidden) {
  const groups = getCalendarDayGroups(dateKey, getCalendarReviewIndex());
  let changed = 0;
  const seen = new Set();
  groups.flatMap((group) => group.rows).forEach((item) => {
    const type = item.ref?.type;
    const id = item.ref?.id;
    if (!isCalendarChartObjectBulkType(type) || !id) return;
    const key = `${type}:${id}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (setCalendarObjectHidden(type, id, hidden)) changed += 1;
  });
  getChartNotes()
    .filter((note) => note.instrument === 'NQ')
    .filter((note) => dateKeyFromTimestamp(note.timestamp) === dateKey)
    .forEach((note) => {
      if (Boolean(note.display?.hidden) === hidden) return;
      if (updateChartNote(note.id, { display: { ...(note.display || {}), hidden } })) changed += 1;
    });
  return changed;
}

function dateKeyFromTimestamp(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return '';
  const date = new Date(value * 1000);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}
