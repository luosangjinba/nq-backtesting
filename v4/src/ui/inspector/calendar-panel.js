import * as store from '../../data/bar-store.js';
import { getOrderReviews } from '../../order/order-review-store.js';
import { getAnnotations } from '../../pda/pda-store.js';
import { getSegments, getSegmentById } from '../../segment/segment-store.js';
import { getSegmentGroups } from '../../segment/segment-group-store.js';
import { getSmtRecords } from '../../smt/smt-store.js';
import { getTimeOverlaySettings } from '../../time-overlays/time-overlay-store.js';
import { escapeHtml, section } from './render-utils.js';

const WEEKDAYS = Object.freeze(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const MONTHS = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]);

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dateKeyFromParts(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function dateKeyFromTimestamp(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value)) return '';
  const date = new Date(value * 1000);
  return dateKeyFromParts(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function dateKeyFromInput(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function parseDateKey(dateKey) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

function shiftDateKey(dateKey, monthOffset) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;
  const shifted = new Date(Date.UTC(parsed.year, parsed.monthIndex + monthOffset, 1));
  return dateKeyFromParts(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1);
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

function getMonthCells(viewDateKey, range) {
  const parsed = parseDateKey(viewDateKey || range?.start);
  if (!parsed) return [];
  const firstWeekday = new Date(Date.UTC(parsed.year, parsed.monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(parsed.year, parsed.monthIndex + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push({ empty: true });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = dateKeyFromParts(parsed.year, parsed.monthIndex, day);
    cells.push({ empty: false, day, dateKey, inRange: isDateInRange(dateKey, range) });
  }
  while (cells.length % 7 !== 0) cells.push({ empty: true });
  return cells;
}

function getTimestampForOrder(order) {
  return (
    order.entryPlan?.entryTimestamp ??
    order.setupThesis?.primaryEventTimestamp ??
    order.resultReview?.exitTimestamp ??
    null
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

function getSegmentTimestamp(segment) {
  return segment.start?.timestamp ?? segment.start?.time ?? null;
}

function getCompositeTimestamp(group) {
  const firstId = Array.isArray(group.childSegmentIds) ? group.childSegmentIds[0] : null;
  return getSegmentTimestamp(getSegmentById(firstId));
}

function getSmtTimestamp(record) {
  return record.leftTimestamp ?? record.timestamp ?? record.fvgStartTimestamp ?? null;
}

function formatCountLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildDayItems(dateKey) {
  const settings = getTimeOverlaySettings();
  return [
    {
      label: 'Order Setups',
      rows: getOrderReviews()
        .filter((order) => dateKeyFromTimestamp(getTimestampForOrder(order)) === dateKey)
        .map((order) => `${order.direction || 'Setup'} · ${order.entryPlan?.entryModel || 'Manual'} · ${order.id}`),
    },
    {
      label: 'SMT',
      rows: getSmtRecords()
        .filter((record) => dateKeyFromTimestamp(getSmtTimestamp(record)) === dateKey)
        .map((record) => `${record.direction} ${record.type} · ${record.timeframe}`),
    },
    {
      label: 'PDA',
      rows: getAnnotations()
        .filter((annotation) => !annotation.draft && dateKeyFromTimestamp(getPdaTimestamp(annotation)) === dateKey)
        .map((annotation) => `${annotation.type?.toUpperCase() || 'PDA'} · ${annotation.id}`),
    },
    {
      label: 'Segments',
      rows: getSegments()
        .filter((segment) => dateKeyFromTimestamp(getSegmentTimestamp(segment)) === dateKey)
        .map((segment) => `${segment.timeframe || '1H'} ${segment.direction || 'segment'} · ${segment.id}`),
    },
    {
      label: 'Composite',
      rows: getSegmentGroups()
        .filter((group) => dateKeyFromTimestamp(getCompositeTimestamp(group)) === dateKey)
        .map((group) => `${formatCountLabel(group.childSegmentIds?.length || 0, 'leg')} · ${group.id}`),
    },
    {
      label: 'Killzones / Time Lines',
      rows: [
        ...(settings.killzones || [])
          .filter((killzone) => killzone.date === dateKey)
          .map((killzone) => `${killzone.label || 'Killzone'} · ${killzone.startTime}-${killzone.endTime}`),
        ...(settings.eventTimes || [])
          .filter((eventTime) => eventTime.date === dateKey)
          .map((eventTime) => `Time Line · ${eventTime.label || eventTime.time}`),
      ],
    },
  ];
}

function renderObjectGroup(group) {
  const rows = group.rows.length
    ? group.rows
        .map((row) => `<div class="calendar-object-row">${escapeHtml(row)}</div>`)
        .join('')
    : '<div class="calendar-object-empty">None</div>';
  return `
    <div class="calendar-object-group">
      <div class="calendar-object-title">${escapeHtml(group.label)}</div>
      ${rows}
    </div>
  `;
}

export function getDefaultCalendarDate() {
  const range = getLoadedDateRange();
  return range?.start || '';
}

export function renderCalendarPanel({ selectedDate = '', viewDate = '' } = {}) {
  const range = getLoadedDateRange();
  if (!range) {
    return section('Calendar', '<div class="inspector-empty">Load chart data to show calendar.</div>');
  }

  const activeDate = clampDateKey(selectedDate || range.start, range);
  const activeViewDate = viewDate || activeDate;
  const parsed = parseDateKey(activeViewDate);
  const cells = getMonthCells(activeViewDate, range);
  const title = parsed ? `${MONTHS[parsed.monthIndex]} ${parsed.year}` : 'Calendar';
  const objectGroups = buildDayItems(activeDate);

  const calendarHtml = `
    <div class="inspector-calendar" data-calendar-selected="${escapeHtml(activeDate)}" data-calendar-view="${escapeHtml(activeViewDate)}">
      <div class="inspector-calendar-range">${escapeHtml(range.start)} - ${escapeHtml(range.end)}</div>
      <div class="inspector-calendar-header">
        <button class="inspector-mini-btn" data-inspector-action="calendar-prev-month" type="button">&lt;</button>
        <div class="inspector-calendar-title">${escapeHtml(title)}</div>
        <button class="inspector-mini-btn" data-inspector-action="calendar-next-month" type="button">&gt;</button>
      </div>
      <div class="inspector-calendar-weekdays">
        ${WEEKDAYS.map((day) => `<div>${day}</div>`).join('')}
      </div>
      <div class="inspector-calendar-grid">
        ${cells
          .map((cell) => {
            if (cell.empty) return '<div class="inspector-calendar-day empty"></div>';
            const classes = ['inspector-calendar-day'];
            if (!cell.inRange) classes.push('disabled');
            if (cell.dateKey === activeDate) classes.push('selected');
            return `
              <button class="${classes.join(' ')}" data-inspector-action="calendar-select-date" data-calendar-date="${cell.dateKey}" type="button" ${cell.inRange ? '' : 'disabled'}>
                ${cell.day}
              </button>
            `;
          })
          .join('')}
      </div>
      <div class="inspector-calendar-selected">Selected: ${escapeHtml(activeDate)} 09:30</div>
      <div class="calendar-object-list">
        ${objectGroups.map(renderObjectGroup).join('')}
      </div>
    </div>
  `;

  return section('Calendar', calendarHtml);
}

export function getNextCalendarViewDate(currentViewDate, direction) {
  return shiftDateKey(currentViewDate, direction === 'prev' ? -1 : 1);
}
