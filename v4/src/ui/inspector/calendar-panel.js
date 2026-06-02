import * as store from '../../data/bar-store.js';
import {
  getCalendarDayGroups,
  getCalendarReviewIndex,
} from '../../calendar/calendar-review-index.js';
import { CALENDAR_OBJECT_TYPES } from '../../calendar/calendar-types.js';
import { getTimeOverlaySettings } from '../../time-overlays/time-overlay-store.js';
import { getEconomicCalendarFilters } from '../../economic-calendar/economic-calendar-store.js';
import {
  getDailyTimeReviewByDate,
  hasDailyTimeReviewContent,
} from '../../time-reaction/daily-time-review-store.js';
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

function getEconomicImpactClass(event = {}) {
  if (event.allDay || event.eventType === 'holiday') return 'economic-holiday';
  const impact = String(event.impact || '').toLowerCase();
  if (impact === 'high') return 'economic-high';
  if (impact === 'medium') return 'economic-medium';
  if (impact === 'low') return 'economic-low';
  return 'economic-holiday';
}

function getEconomicImpactLabel(event = {}) {
  if (event.allDay || event.eventType === 'holiday') return 'Holiday';
  return event.impact || 'Event';
}

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
  const groups = addTimeReactionGroup(getCalendarDayGroups(dateKey, calendarIndex), dateKey, { includeEmpty: false });
  const countByType = new Map(groups.map((group) => [group.type, group.rows.length]));
  const setupCount = countByType.get(CALENDAR_OBJECT_TYPES.ORDER_SETUP) || 0;
  const economicGroup = groups.find((group) => group.type === CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT);
  const economicIndicators = [];
  (economicGroup?.rows || []).forEach((item) => {
    const className = getEconomicImpactClass(item.source);
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
  const indicators = CALENDAR_CELL_INDICATORS.map((indicator) => {
    const count = indicator.types.reduce((sum, type) => sum + (countByType.get(type) || 0), 0);
    return { ...indicator, count };
  }).filter((indicator) => indicator.count > 0);
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  return {
    setupCount,
    total,
    indicators: [...economicIndicators, ...indicators],
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
  if (item.type === CALENDAR_OBJECT_TYPES.TIME_REACTION) return 'Time';
  if (item.type === CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT) return 'Econ';
  if (item.type === CALENDAR_OBJECT_TYPES.SMT) return 'SMT';
  if (item.type === CALENDAR_OBJECT_TYPES.PDA) return 'PDA';
  if (item.type === CALENDAR_OBJECT_TYPES.SEGMENT) return 'Seg';
  if (item.type === CALENDAR_OBJECT_TYPES.COMPOSITE) return 'Comp';
  if (item.type === CALENDAR_OBJECT_TYPES.KILLZONE) return item.ref?.type === CALENDAR_OBJECT_TYPES.TIME_LINE ? 'Time' : 'KZ';
  return 'Obj';
}

function canToggleObjectVisibility(item) {
  return [
    CALENDAR_OBJECT_TYPES.SMT,
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

function countDayBulkChartObjects(groups = []) {
  return groups
    .flatMap((group) => group.rows || [])
    .filter(isDayBulkChartObject)
    .length;
}

function isCalendarObjectHidden(item) {
  if (item.ref?.type === CALENDAR_OBJECT_TYPES.KILLZONE || item.ref?.type === CALENDAR_OBJECT_TYPES.TIME_LINE) {
    return item.source?.enabled === false;
  }
  return Boolean(item.source?.display?.hidden);
}

function renderObjectActionButtons(item) {
  const canLocate = Number.isFinite(item.range?.start) && Number.isFinite(item.range?.end);
  const canOpen = ['order-setup', 'time-reaction', 'pda', 'segment', 'composite', 'smt'].includes(item.ref?.type);
  const canToggleSetup = item.ref?.type === 'order-setup' && item.ref?.id;
  const setupHidden = Boolean(item.source?.display?.hidden);
  const typeLabel = getObjectTypeLabel(item);
  const locateLabel = item.type === CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT
    ? `${item.source?.title || 'Economic Event'} · ${item.source?.displayTime || '09:30'}`
    : `${typeLabel} ${item.label}`;
  return `
    <button
      class="inspector-mini-btn calendar-object-locate"
      data-inspector-action="calendar-object-locate"
      data-locate-start="${canLocate ? item.range.start : ''}"
      data-locate-end="${canLocate ? item.range.end : ''}"
      data-object-label="${escapeHtml(locateLabel)}"
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

function renderObjectVisibilityToggle(item) {
  if (!canToggleObjectVisibility(item) || !item.ref?.id) return '';
  const hidden = isCalendarObjectHidden(item);
  const label = hidden ? 'Hidden object. Click to show.' : 'Visible object. Click to hide.';
  return `
    <button
      class="calendar-object-visibility ${hidden ? 'is-hidden' : 'is-visible'}"
      data-inspector-action="calendar-object-toggle-hidden"
      data-object-type="${escapeHtml(item.ref.type)}"
      data-object-id="${escapeHtml(item.ref.id)}"
      aria-label="${label}"
      title="${label}"
      type="button"
    ></button>
  `;
}

function renderEconomicEventRow(item) {
  const event = item.source || {};
  const impactLabel = getEconomicImpactLabel(event);
  const dotClass = getEconomicImpactClass(event);
  const timeLabel = event.allDay ? 'All Day' : event.displayTime || compactTime(item.timestamp);
  return `
    <div class="calendar-object-row calendar-economic-row">
      <div class="calendar-economic-main">
        <span class="calendar-economic-dot ${escapeHtml(dotClass)}" title="${escapeHtml(impactLabel)}"></span>
        <span class="calendar-economic-time">${escapeHtml(timeLabel)}</span>
        <span class="calendar-economic-impact">${escapeHtml(impactLabel)}</span>
        <span class="calendar-economic-currency">${escapeHtml(event.currency || 'USD')}</span>
        <span class="calendar-economic-title">${escapeHtml(event.title || item.label)}</span>
      </div>
      ${renderObjectActions(item)}
    </div>
  `;
}

function renderObjectRow(item) {
  if (item.type === CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT) return renderEconomicEventRow(item);
  const isTimeReaction = item.ref?.type === 'time-reaction';
  const timeLabel = isTimeReaction ? 'Daily' : compactTime(item.timestamp);
  const typeLabel = getObjectTypeLabel(item);
  const isOrderSetup = item.ref?.type === 'order-setup';
  const isHidden = isCalendarObjectHidden(item);
  return `
    <div class="calendar-object-row ${isOrderSetup ? 'calendar-object-row-setup' : ''}${isTimeReaction ? ' calendar-object-row-time-reaction' : ''}${isHidden ? ' is-hidden' : ''}">
      <div class="calendar-object-main ${isOrderSetup ? 'calendar-object-main-setup' : ''}">
        <span class="calendar-object-time">${escapeHtml(timeLabel)}</span>
        <span class="calendar-object-type">${escapeHtml(typeLabel)}</span>
        ${renderSetupVisibilityToggle(item)}
        ${renderObjectVisibilityToggle(item)}
        <span class="calendar-object-summary" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
      </div>
      ${renderObjectActions(item)}
    </div>
  `;
}

function countSectionContent(sectionData = {}) {
  return (sectionData.note ? 1 : 0) + (Array.isArray(sectionData.refs) && sectionData.refs.length ? 1 : 0);
}

function summarizeTimeReactionReview(review) {
  if (!review) return 'No observations yet';
  let sections = countSectionContent(review.pre0930Context) + countSectionContent(review.summary0930To1100);
  (review.pre0930Context?.items || []).forEach((item) => {
    if (item.note || (Array.isArray(item.refs) && item.refs.length)) sections += 1;
  });
  (review.summary0930To1100?.items || []).forEach((item) => {
    if (item.note || (Array.isArray(item.refs) && item.refs.length)) sections += 1;
  });
  let refs = (review.pre0930Context?.refs || []).length
    + (review.summary0930To1100?.refs || []).length
    + (review.pre0930Context?.items || []).reduce((sum, item) => sum + (item.refs || []).length, 0)
    + (review.summary0930To1100?.items || []).reduce((sum, item) => sum + (item.refs || []).length, 0);
  (review.reactions || []).forEach((reaction) => {
    const hasNote = Boolean(reaction.note);
    const refCount = Array.isArray(reaction.refs) ? reaction.refs.length : 0;
    if (hasNote || refCount) sections += 1;
    refs += refCount;
    (reaction.items || []).forEach((item) => {
      const itemRefCount = Array.isArray(item.refs) ? item.refs.length : 0;
      if (item.note || itemRefCount) sections += 1;
      refs += itemRefCount;
    });
  });
  if (!sections && !refs) return 'No observations yet';
  return [
    sections ? `${sections} sections` : '',
    refs ? `${refs} refs` : '',
  ].filter(Boolean).join(' · ');
}

function createTimeReactionItem(dateKey, review = getDailyTimeReviewByDate(dateKey)) {
  const start = getCalendarDateTimestamp(dateKey, '09:30');
  const end = getCalendarDateTimestamp(dateKey, '10:30');
  return {
    id: dateKey,
    type: CALENDAR_OBJECT_TYPES.TIME_REACTION,
    dateKey,
    timestamp: Number.isFinite(start) ? start : null,
    label: summarizeTimeReactionReview(review),
    range: Number.isFinite(start) && Number.isFinite(end) ? { start, end } : null,
    ref: { type: CALENDAR_OBJECT_TYPES.TIME_REACTION, id: dateKey },
    source: null,
  };
}

function addTimeReactionGroup(groups, dateKey, options = {}) {
  const review = getDailyTimeReviewByDate(dateKey);
  if (!options.includeEmpty && !hasDailyTimeReviewContent(review)) {
    return groups.filter((item) => item.type !== CALENDAR_OBJECT_TYPES.TIME_REACTION);
  }
  const group = {
    type: CALENDAR_OBJECT_TYPES.TIME_REACTION,
    label: 'Time Reaction Observation',
    rows: [createTimeReactionItem(dateKey, review)],
  };
  const existing = groups.filter((item) => item.type !== CALENDAR_OBJECT_TYPES.TIME_REACTION);
  const orderSetupIndex = existing.findIndex((item) => item.type === CALENDAR_OBJECT_TYPES.ORDER_SETUP);
  if (orderSetupIndex < 0) return [group, ...existing];
  return [
    ...existing.slice(0, orderSetupIndex + 1),
    group,
    ...existing.slice(orderSetupIndex + 1),
  ];
}

function renderObjectGroup(group, options = {}) {
  const isEconomicGroup = group.type === CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT;
  const rows = group.rows.length
    ? group.rows.map(renderObjectRow).join('')
    : '<div class="calendar-object-empty">None</div>';
  const isOrderSetupGroup = group.type === CALENDAR_OBJECT_TYPES.ORDER_SETUP;
  const openGroups = options.openGroups instanceof Set ? options.openGroups : new Set(options.openGroups || []);
  const isOpen = isOrderSetupGroup || openGroups.has(group.type);
  const countLabel = `${group.rows.length}`;
  return `
    <details class="calendar-object-group" data-calendar-group-type="${escapeHtml(group.type)}" ${isOpen ? 'open' : ''}>
      <summary class="calendar-object-title">
        <span>${escapeHtml(group.label)}</span>
        <span class="calendar-object-count">${escapeHtml(countLabel)}</span>
      </summary>
      <div class="calendar-object-group-body">
        ${isEconomicGroup ? renderEconomicCalendarFilters() : ''}
        ${rows}
      </div>
    </details>
  `;
}

function renderEconomicCalendarFilters() {
  const filters = getEconomicCalendarFilters();
  const items = [
    ['high', 'H'],
    ['medium', 'M'],
    ['low', 'L'],
    ['holiday', 'Holiday'],
  ];
  return `
    <div class="calendar-economic-filters" aria-label="Economic calendar filters">
      ${items.map(([key, label]) => `
        <label class="calendar-economic-filter ${filters[key] ? 'is-active' : ''}">
          <input
            type="checkbox"
            data-inspector-action="economic-calendar-filter"
            data-economic-filter="${escapeHtml(key)}"
            ${filters[key] ? 'checked' : ''}
          />
          <span class="calendar-economic-dot economic-${escapeHtml(key === 'holiday' ? 'holiday' : key)}"></span>
          <span>${escapeHtml(label)}</span>
        </label>
      `).join('')}
    </div>
  `;
}

export function getDefaultCalendarDate() {
  const range = getLoadedDateRange();
  return range?.start || '';
}

export function renderCalendarPanel({ selectedDate = '', viewDate = '', openGroups = [] } = {}) {
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
  const objectGroups = addTimeReactionGroup(getCalendarDayGroups(activeDate, calendarIndex), activeDate, { includeEmpty: true });
  const dayChartObjectCount = countDayBulkChartObjects(objectGroups);
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
      <div class="calendar-day-visibility-actions">
        <button
          class="inspector-mini-btn"
          data-inspector-action="calendar-day-show-chart-objects"
          data-calendar-date="${escapeHtml(activeDate)}"
          type="button"
          ${dayChartObjectCount ? '' : 'disabled'}
        >Show Day Objects${dayChartObjectCount ? ` (${dayChartObjectCount})` : ''}</button>
        <button
          class="inspector-mini-btn"
          data-inspector-action="calendar-day-hide-chart-objects"
          data-calendar-date="${escapeHtml(activeDate)}"
          type="button"
          ${dayChartObjectCount ? '' : 'disabled'}
        >Hide Day Objects${dayChartObjectCount ? ` (${dayChartObjectCount})` : ''}</button>
      </div>
      <div class="calendar-object-list">
        ${objectGroups.map((group) => renderObjectGroup(group, { openGroups })).join('')}
      </div>
    </div>
  `;

  return section('Calendar', calendarHtml);
}

export function getNextCalendarViewDate(currentViewDate, direction) {
  return shiftDateKey(currentViewDate, direction === 'prev' ? -1 : 1);
}
