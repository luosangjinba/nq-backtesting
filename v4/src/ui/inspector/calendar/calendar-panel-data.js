import * as store from '../../../data/bar-store.js';
import {
  getCalendarReviewIndex,
} from '../../../calendar/calendar-review-index.js';
import { getPrimaryInstrument } from '../../../data/primary-instrument-store.js';
import { getTimeOverlaySettings } from '../../../time-overlays/time-overlay-store.js';
import { getDailyRegimeByDate } from '../../../daily-regime/daily-regime-store.js';
import { getDailyRegimeSummary } from '../../../daily-regime/daily-regime-types.js';
import {
  dateKeyFromInput,
  dateKeyFromTimestamp,
  dateKeyFromUtcParts,
} from '../../../utils.js';
import { resolveInspectorCalendarDate } from '../calendar-day-context.js';
import {
  countDayBulkChartObjects,
  getCalendarObjectGroups,
  getDayObjectOverview,
} from './calendar-day-groups.js';

export function parseCalendarDateKey(dateKey) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

function getLoadedDateRange() {
  const currentRange = store.getCurrentRange();
  const start = dateKeyFromInput(currentRange.start);
  const end = dateKeyFromInput(currentRange.end);
  if (start && end) return { start, end };

  const bars = store.getDisplayBars();
  if (!bars.length) return null;
  return {
    start: dateKeyFromTimestamp(bars[0].timestamp),
    end: dateKeyFromTimestamp(bars[bars.length - 1].timestamp),
  };
}

function clampDateKey(dateKey, range) {
  if (!range) return dateKey;
  if (!dateKey || dateKey < range.start) return range.start;
  if (dateKey > range.end) return range.end;
  return dateKey;
}

function isDateInRange(dateKey, range) {
  return Boolean(range && dateKey >= range.start && dateKey <= range.end);
}

function getMonthCells(viewDateKey, range, calendarIndex) {
  const parsed = parseCalendarDateKey(viewDateKey || range?.start);
  if (!parsed) return [];
  const firstWeekday = new Date(Date.UTC(parsed.year, parsed.monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(parsed.year, parsed.monthIndex + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push({ empty: true });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = dateKeyFromUtcParts(parsed.year, parsed.monthIndex, day);
    cells.push({
      empty: false,
      day,
      dateKey,
      inRange: isDateInRange(dateKey, range),
      overview: getDayObjectOverview(dateKey, calendarIndex),
    });
  }
  while (cells.length % 7 !== 0) cells.push({ empty: true });
  return cells;
}

export function getDefaultCalendarDate() {
  const range = getLoadedDateRange();
  return range?.start || '';
}

export function buildCalendarPanelData({ selectedDate = '', viewDate = '', openGroups = [] } = {}) {
  const range = getLoadedDateRange();
  if (!range) return { hasData: false };

  const activeDate = clampDateKey(resolveInspectorCalendarDate({ selectedDate, fallbackDate: range.start }), range);
  const activeViewDate = viewDate || activeDate;
  const calendarIndex = getCalendarReviewIndex();
  const instrument = getPrimaryInstrument();
  const parsedViewDate = parseCalendarDateKey(activeViewDate);
  const objectGroups = getCalendarObjectGroups(activeDate, calendarIndex, {
    includeEmpty: true,
    instrument,
  });
  const overlaySelectedDate = getTimeOverlaySettings().selectedDate;
  const regime = getDailyRegimeByDate(activeDate, instrument);

  return {
    hasData: true,
    range,
    activeDate,
    activeViewDate,
    parsedViewDate,
    cells: getMonthCells(activeViewDate, range, calendarIndex),
    objectGroups,
    openGroups,
    dayChartObjectCount: countDayBulkChartObjects(objectGroups),
    overlaySelectedDate,
    overlayFilterLabel: overlaySelectedDate
      ? `Manual overlays: ${overlaySelectedDate}`
      : 'Manual overlays: All loaded days',
    dailyRegimeSummary: getDailyRegimeSummary(regime),
  };
}
