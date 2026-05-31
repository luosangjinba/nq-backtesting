import * as store from '../../data/bar-store.js';
import {
  getCalendarDayGroups,
  getCalendarReviewIndex,
} from '../../calendar/calendar-review-index.js';
import { CALENDAR_OBJECT_TYPES } from '../../calendar/calendar-types.js';
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

const CALENDAR_CELL_INDICATORS = Object.freeze([
  {
    key: 'smt',
    label: 'SMT',
    className: 'smt',
    types: [CALENDAR_OBJECT_TYPES.SMT],
  },
  {
    key: 'pda',
    label: 'PDA',
    className: 'pda',
    types: [CALENDAR_OBJECT_TYPES.PDA],
  },
  {
    key: 'structure',
    label: 'Structure',
    className: 'structure',
    types: [CALENDAR_OBJECT_TYPES.SEGMENT, CALENDAR_OBJECT_TYPES.COMPOSITE],
  },
  {
    key: 'time',
    label: 'Time',
    className: 'time',
    types: [CALENDAR_OBJECT_TYPES.KILLZONE],
  },
]);

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dateKeyFromParts(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function dateKeyFromTimestamp(timestamp) {
  if (!Number.isFinite(Number(timestamp))) return '';
  const date = new Date(Number(timestamp) * 1000);
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

export function getCalendarDateTimestamp(dateKey, timeText = '09:30') {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  const [hour, minute] = String(timeText).split(':').map(Number);
  if (![hour, minute].every(Number.isFinite)) return null;
  return Math.floor(Date.UTC(parsed.year, parsed.monthIndex, parsed.day, hour, minute, 0) / 1000);
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

function getDayObjectOverview(dateKey, calendarIndex) {
  const groups = getCalendarDayGroups(dateKey, calendarIndex);
  const countByType = new Map(groups.map((group) => [group.type, group.rows.length]));
  const setupCount = countByType.get(CALENDAR_OBJECT_TYPES.ORDER_SETUP) || 0;
  const indicators = CALENDAR_CELL_INDICATORS.map((indicator) => {
    const count = indicator.types.reduce((sum, type) => sum + (countByType.get(type) || 0), 0);
    return { ...indicator, count };
  }).filter((indicator) => indicator.count > 0);
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  return {
    setupCount,
    total,
    indicators,
  };
}

function renderCalendarDayOverview(overview) {
  if (!overview.total) return '';
  const dots = overview.indicators
    .map(
      (indicator) =>
        `<span class="calendar-object-dot ${escapeHtml(indicator.className)}" title="${escapeHtml(`${indicator.label}: ${indicator.count}`)}"></span>`
    )
    .join('');
  return `
    <span class="calendar-day-overview" aria-label="${escapeHtml(`${overview.total} calendar objects`)}">
      <span class="calendar-object-total">${escapeHtml(overview.total)}</span>
      <span class="calendar-object-dots">${dots}</span>
    </span>
  `;
}

function getCalendarDayTitle(dateKey, overview) {
  if (!overview.total) return dateKey;
  const parts = [];
  if (overview.setupCount) parts.push(`Order Setups: ${overview.setupCount}`);
  overview.indicators.forEach((indicator) => {
    parts.push(`${indicator.label}: ${indicator.count}`);
  });
  return `${dateKey} · ${parts.join(' · ')}`;
}

function compactTime(timestamp) {
  if (!Number.isFinite(Number(timestamp))) return '--:--';
  const date = new Date(Number(timestamp) * 1000);
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}

function getObjectTypeLabel(item) {
  if (item.type === CALENDAR_OBJECT_TYPES.ORDER_SETUP) return 'Setup';
  if (item.type === CALENDAR_OBJECT_TYPES.SMT) return 'SMT';
  if (item.type === CALENDAR_OBJECT_TYPES.PDA) return 'PDA';
  if (item.type === CALENDAR_OBJECT_TYPES.SEGMENT) return 'Seg';
  if (item.type === CALENDAR_OBJECT_TYPES.COMPOSITE) return 'Comp';
  if (item.type === CALENDAR_OBJECT_TYPES.KILLZONE) return item.ref?.type === CALENDAR_OBJECT_TYPES.TIME_LINE ? 'Time' : 'KZ';
  return 'Obj';
}

function renderObjectActionButtons(item) {
  const canLocate = Number.isFinite(item.range?.start) && Number.isFinite(item.range?.end);
  const canOpen = ['order-setup', 'pda', 'segment', 'composite', 'smt'].includes(item.ref?.type);
  const canToggleSetup = item.ref?.type === 'order-setup' && item.ref?.id;
  const setupHidden = Boolean(item.source?.display?.hidden);
  const typeLabel = getObjectTypeLabel(item);
  return `
    <button
      class="inspector-mini-btn calendar-object-locate"
      data-inspector-action="calendar-object-locate"
      data-locate-start="${canLocate ? item.range.start : ''}"
      data-locate-end="${canLocate ? item.range.end : ''}"
      data-object-label="${escapeHtml(`${typeLabel} ${item.label}`)}"
      type="button"
      ${canLocate ? '' : 'disabled'}
    >Locate</button>
    ${
      canOpen
        ? `<button
            class="inspector-mini-btn calendar-object-open"
            data-inspector-action="calendar-object-open"
            data-object-type="${escapeHtml(item.ref.type)}"
            data-object-id="${escapeHtml(item.ref.id)}"
            type="button"
          >Open</button>`
        : ''
    }
    ${
      canToggleSetup
        ? `<button
            class="inspector-mini-btn calendar-object-open"
            data-inspector-action="order-review-toggle-hidden"
            data-order-review-id="${escapeHtml(item.ref.id)}"
            type="button"
          >${setupHidden ? 'Show' : 'Hide'}</button>`
        : ''
    }
    ${
      canToggleSetup
        ? `<button
            class="inspector-mini-btn calendar-object-open calendar-object-delete"
            data-inspector-action="order-review-delete"
            data-order-review-id="${escapeHtml(item.ref.id)}"
            type="button"
          >Delete</button>`
        : ''
    }
  `;
}

function renderObjectActions(item) {
  const actionButtons = renderObjectActionButtons(item);
  if (item.ref?.type !== 'order-setup') {
    return `<div class="calendar-object-actions">${actionButtons}</div>`;
  }
  return `
    <details class="calendar-object-menu">
      <summary class="calendar-object-menu-trigger" aria-label="Order Setup actions">...</summary>
      <div class="calendar-object-menu-panel">${actionButtons}</div>
    </details>
  `;
}

function renderSetupVisibilityToggle(item) {
  if (item.ref?.type !== 'order-setup' || !item.ref?.id) return '';
  const hidden = Boolean(item.source?.display?.hidden);
  const label = hidden ? 'Hidden setup. Click to show.' : 'Visible setup. Click to hide.';
  return `
    <button
      class="calendar-setup-visibility ${hidden ? 'is-hidden' : 'is-visible'}"
      data-inspector-action="order-review-toggle-hidden"
      data-order-review-id="${escapeHtml(item.ref.id)}"
      aria-label="${label}"
      title="${label}"
      type="button"
    ></button>
  `;
}

function renderObjectRow(item) {
  const timeLabel = compactTime(item.timestamp);
  const typeLabel = getObjectTypeLabel(item);
  const isOrderSetup = item.ref?.type === 'order-setup';
  return `
    <div class="calendar-object-row ${isOrderSetup ? 'calendar-object-row-setup' : ''}">
      <div class="calendar-object-main ${isOrderSetup ? 'calendar-object-main-setup' : ''}">
        <span class="calendar-object-time">${escapeHtml(timeLabel)}</span>
        <span class="calendar-object-type">${escapeHtml(typeLabel)}</span>
        ${renderSetupVisibilityToggle(item)}
        <span class="calendar-object-summary" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
      </div>
      ${renderObjectActions(item)}
    </div>
  `;
}

function renderObjectGroup(group) {
  const rows = group.rows.length
    ? group.rows.map(renderObjectRow).join('')
    : '<div class="calendar-object-empty">None</div>';
  const isOrderSetupGroup = group.type === CALENDAR_OBJECT_TYPES.ORDER_SETUP;
  const countLabel = `${group.rows.length}`;
  return `
    <details class="calendar-object-group" ${isOrderSetupGroup ? 'open' : ''}>
      <summary class="calendar-object-title">
        <span>${escapeHtml(group.label)}</span>
        <span class="calendar-object-count">${escapeHtml(countLabel)}</span>
      </summary>
      <div class="calendar-object-group-body">${rows}</div>
    </details>
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
  const calendarIndex = getCalendarReviewIndex();
  const objectGroups = getCalendarDayGroups(activeDate, calendarIndex);
  const overlaySelectedDate = getTimeOverlaySettings().selectedDate;
  const overlayFilterLabel = overlaySelectedDate
    ? `Manual overlays: ${overlaySelectedDate}`
    : 'Manual overlays: All loaded days';

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
            const overview = getDayObjectOverview(cell.dateKey, calendarIndex);
            const hasOrderSetup = overview.setupCount > 0;
            if (hasOrderSetup) classes.push('has-order-setup');
            if (overview.total) classes.push('has-calendar-objects');
            return `
              <button class="${classes.join(' ')}" data-inspector-action="calendar-select-date" data-calendar-date="${cell.dateKey}" type="button" title="${escapeHtml(getCalendarDayTitle(cell.dateKey, overview))}" ${cell.inRange ? '' : 'disabled'}>
                <span class="calendar-day-number">${cell.day}</span>
                ${hasOrderSetup ? '<span class="calendar-order-badge" aria-label="Order Setup"></span>' : ''}
                ${renderCalendarDayOverview(overview)}
              </button>
            `;
          })
          .join('')}
      </div>
      <div class="inspector-calendar-selected">
        <span>Selected: ${escapeHtml(activeDate)} 09:30</span>
        <span class="inspector-calendar-overlay-state">${escapeHtml(overlayFilterLabel)}</span>
        ${
          overlaySelectedDate
            ? `<button class="inspector-mini-btn" data-inspector-action="calendar-show-all-days" type="button">All loaded days</button>`
            : ''
        }
      </div>
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
