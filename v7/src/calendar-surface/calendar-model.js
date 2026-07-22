export const MONTH_LABELS = Object.freeze([
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]);

export const WEEKDAY_LABELS = Object.freeze(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_RANGES = new WeakSet();

function dateIdentity({ year, month, day }) {
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Create one immutable wall-date range for reusable Calendar presentation. */
export function createCalendarDateRange({ end, start }) {
  const boundaries = [start, end].map((value) => {
    const match = typeof value === 'string' ? DATE_PATTERN.exec(value) : null;
    if (!match) return null;
    const [year, month, day] = value.split('-').map(Number);
    try {
      createLocalDate({ year, month: month - 1, day });
      return value;
    } catch {
      return null;
    }
  });
  if (boundaries.includes(null) || end < start) {
    throw new TypeError('Calendar date range requires ordered YYYY-MM-DD boundaries.');
  }
  const range = Object.freeze({ end, start });
  DATE_RANGES.add(range);
  return range;
}

/** Classify one calendar cell without knowing Replay or business-event state. */
export function calendarDateRangeState(range, parts) {
  if (!DATE_RANGES.has(range)) throw new TypeError('A Calendar date range is required.');
  const value = dateIdentity(parts);
  if (value < range.start) return 'before';
  if (value > range.end) return 'after';
  if (value === range.start && value === range.end) return 'single';
  if (value === range.start) return 'start';
  if (value === range.end) return 'end';
  return 'inside';
}

function localDayIdentity(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Owner: Calendar Surface adapter.
 * Purpose: build a deterministic six-week month grid without DOM state.
 * Inputs: displayed year/month and optional selected/today local Dates.
 * Outputs: immutable 42-cell calendar model including adjacent-month days.
 * Side effects: none.
 * Protected invariant: visual navigation cannot mutate Session date values.
 */
export function createMonthGrid({ year, month, selected = null, today = new Date() }) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const firstCell = new Date(year, month, 1 - firstWeekday);
  const selectedId = selected ? localDayIdentity(selected) : null;
  const todayId = localDayIdentity(today);
  return Object.freeze(Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index);
    const identity = localDayIdentity(date);
    return Object.freeze({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      outside: date.getMonth() !== month,
      selected: identity === selectedId,
      today: identity === todayId,
    });
  }));
}

/**
 * Owner: Calendar Surface adapter.
 * Purpose: return the ten-year page containing a displayed year.
 * Inputs: integer year.
 * Outputs: immutable start/end/year-list model.
 * Side effects: none.
 */
export function createDecadePage(year) {
  const start = Math.floor(year / 10) * 10;
  return Object.freeze({
    start,
    end: start + 9,
    years: Object.freeze(Array.from({ length: 10 }, (_, index) => start + index)),
  });
}

/**
 * Owner: Calendar Surface adapter.
 * Purpose: create a local Date while preserving explicit wall-clock parts.
 * Inputs: date parts plus optional time parts.
 * Outputs: valid local Date.
 * Side effects: none.
 * Errors: rejects calendar overflow such as February 31.
 */
export function createLocalDate({ year, month, day, hour = 0, minute = 0, second = 0 }) {
  const date = new Date(year, month, day, hour, minute, second, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    throw new RangeError('Date-time calendar parts are invalid.');
  }
  return date;
}
