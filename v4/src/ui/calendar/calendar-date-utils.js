import { dateKeyFromInput, dateKeyFromUtcParts } from '../../utils.js';

export const TARGET_TIME = '09:30';
export const FULL_DAY_START_TIME = '00:00';
export const FULL_DAY_END_TIME = '23:59';
export const LOAD_PADDING_DAYS = 3;

export function dateTimePartsFromInput(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  return {
    dateKey: `${match[1]}-${match[2]}-${match[3]}`,
    time: match[4] && match[5] ? `${match[4]}:${match[5]}` : '',
  };
}

export function parseDateKey(dateKey) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

export function getTodayDateKey() {
  const now = new Date();
  return dateKeyFromUtcParts(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export function getCalendarDateTimestamp(dateKey, timeText = TARGET_TIME) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  const [hour, minute] = String(timeText).split(':').map(Number);
  if (![hour, minute].every(Number.isFinite)) return null;
  return Math.floor(Date.UTC(parsed.year, parsed.monthIndex, parsed.day, hour, minute, 0) / 1000);
}

export function shiftDate(dateKey, dayOffset) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;
  const date = new Date(Date.UTC(parsed.year, parsed.monthIndex, parsed.day + dayOffset));
  return dateKeyFromUtcParts(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function shiftMonth(dateKey, monthOffset) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;
  const date = new Date(Date.UTC(parsed.year, parsed.monthIndex + monthOffset, 1));
  return dateKeyFromUtcParts(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function formatDateTime(dateKey, timeText) {
  return `${dateKey} ${timeText}`;
}

export function formatRangeLabel(startDate, endDate) {
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  if (startDate) return `${startDate} - ...`;
  if (endDate) return `... - ${endDate}`;
  return 'Date Range';
}

export function formatLoadedRangeLabel(range) {
  const startParts = dateTimePartsFromInput(range.rawStart);
  const endParts = dateTimePartsFromInput(range.rawEnd);
  const hasPreciseStart = startParts?.time && startParts.time !== FULL_DAY_START_TIME;
  const hasPreciseEnd = endParts?.time && endParts.time !== FULL_DAY_END_TIME;
  if (hasPreciseStart || hasPreciseEnd) {
    return formatRangeLabel(range.rawStart || range.start, range.rawEnd || range.end);
  }
  return formatRangeLabel(range.start, range.end);
}

export function formatHistoryItemLabel(item) {
  const range = {
    start: dateKeyFromInput(item.start),
    end: dateKeyFromInput(item.end),
    rawStart: item.start,
    rawEnd: item.end,
  };
  return formatLoadedRangeLabel(range);
}

export function getMonthCells(dateKey) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return [];

  const firstWeekday = new Date(Date.UTC(parsed.year, parsed.monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(parsed.year, parsed.monthIndex + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push({ empty: true });
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      empty: false,
      day,
      dateKey: dateKeyFromUtcParts(parsed.year, parsed.monthIndex, day),
    });
  }
  while (cells.length % 7 !== 0) cells.push({ empty: true });
  return cells;
}
