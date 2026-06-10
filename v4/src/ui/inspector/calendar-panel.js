import * as store from '../../data/bar-store.js';
import {
  getCalendarDayGroups,
  getCalendarReviewIndex,
} from '../../calendar/calendar-review-index.js';
import { CALENDAR_OBJECT_TYPES } from '../../calendar/calendar-types.js';
import { getChartNotes } from '../../chart-notes/chart-note-store.js';
import { isChartNoteInDate } from '../../chart-notes/chart-note-visible-day.js';
import { getTimeOverlaySettings } from '../../time-overlays/time-overlay-store.js';
import { getEconomicCalendarFilters } from '../../economic-calendar/economic-calendar-store.js';
import { getDailyRegimeByDate } from '../../daily-regime/daily-regime-store.js';
import { getDailyRegimeSummary } from '../../daily-regime/daily-regime-types.js';
import {
  compactUtcTime,
  dateKeyFromInput,
  dateKeyFromTimestamp,
  dateKeyFromUtcParts,
} from '../../utils.js';
import { getCalendarVisibilitySummaryForItems } from './calendar-visibility-actions.js';
import {
  getDailyTimeReviewByDate,
  hasDailyTimeReviewContent,
} from '../../time-reaction/daily-time-review-store.js';
import { escapeHtml, section } from './render-utils.js';
import { resolveInspectorCalendarDate } from './calendar-day-context.js';

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

const DAILY_TIME_REVIEW_CALENDAR_ROWS = Object.freeze([
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

function getEconomicImpactClass(event = {}) {
  if (event.allDay || event.eventType === 'holiday') return 'economic-holiday';
  const impact = String(event.impact || '').toLowerCase();
  if (impact === 'high') return 'economic-high';
  if (impact === 'medium') return 'economic-medium';
  return '';
}

function getEconomicImpactLabel(event = {}) {
  if (event.allDay || event.eventType === 'holiday') return 'Holiday';
  return event.impact || 'Event';
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
  return dateKeyFromUtcParts(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1);
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
    const dateKey = dateKeyFromUtcParts(parsed.year, parsed.monthIndex, day);
    cells.push({ empty: false, day, dateKey, inRange: isDateInRange(dateKey, range) });
  }
  while (cells.length % 7 !== 0) cells.push({ empty: true });
  return cells;
}

function getDayObjectOverview(dateKey, calendarIndex) {
  const groups = addChartNotesGroup(
    addTimeReactionGroup(getCalendarDayGroups(dateKey, calendarIndex), dateKey, { includeEmpty: false }),
    dateKey,
    { includeEmpty: false }
  );
  const countByType = new Map(groups.map((group) => [group.type, group.rows.length]));
  const setupCount = countByType.get(CALENDAR_OBJECT_TYPES.ORDER_SETUP) || 0;
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
    total: setupCount + economicIndicators.reduce((sum, indicator) => sum + indicator.count, 0),
    indicators: economicIndicators,
  };
}

function renderCalendarDayOverview(overview) {
  if (!overview.indicators.length) return '';
  const dots = overview.indicators
    .map(
      (indicator) =>
        `<span class="calendar-object-dot ${escapeHtml(indicator.className)}" title="${escapeHtml(`${indicator.label}: ${indicator.count}`)}"></span>`
    )
    .join('');
  return `
    <span class="calendar-day-overview" aria-label="${escapeHtml(`${overview.indicators.length} calendar event markers`)}">
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
  return compactUtcTime(timestamp, '--:--');
}

function getObjectTimeLabel(item) {
  if (item.type === CALENDAR_OBJECT_TYPES.CHART_NOTE && item.source?.kind === 'range') {
    return [
      compactTime(item.source.startTimestamp || item.timestamp),
      compactTime(item.source.endTimestamp || item.timestamp),
    ].join('-');
  }
  return compactTime(item.timestamp);
}

function getObjectTypeLabel(item) {
  if (item.type === CALENDAR_OBJECT_TYPES.ORDER_SETUP) return 'Setup';
  if (item.type === CALENDAR_OBJECT_TYPES.TIME_REACTION) return 'Time';
  if (item.type === CALENDAR_OBJECT_TYPES.CHART_NOTE) return 'Note';
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
  const canOpen = ['order-setup', 'time-reaction', 'economic-event', 'pda', 'segment', 'composite', 'smt'].includes(item.ref?.type);
  const canToggleSetup = item.ref?.type === 'order-setup' && item.ref?.id;
  const canDeletePda = item.ref?.type === 'pda' && item.ref?.id;
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
      data-object-type="${escapeHtml(item.ref?.type || '')}"
      data-object-id="${escapeHtml(item.ref?.id || '')}"
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
            data-time-reaction-section="${escapeHtml(item.ref.section || '')}"
            type="button"
          >Open</button>`
        : ''
    }
    ${
      canDeletePda
        ? `<button
            class="inspector-mini-btn calendar-pda-delete"
            data-inspector-action="calendar-pda-delete"
            data-object-id="${escapeHtml(item.ref.id)}"
            type="button"
            title="Delete PDA"
            aria-label="Delete PDA"
          >X</button>`
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
  if (!actionButtons.trim()) return '';
  return `
    <details class="calendar-object-menu">
      <summary class="calendar-object-menu-trigger" aria-label="Calendar object actions">...</summary>
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
  const timeLabel = getObjectTimeLabel(item);
  const typeLabel = getObjectTypeLabel(item);
  const showTypeLabel = item.ref?.type !== 'pda';
  const isOrderSetup = item.ref?.type === 'order-setup';
  const isHidden = isCalendarObjectHidden(item);
  const chartNoteGuidesToggle = item.ref?.type === CALENDAR_OBJECT_TYPES.CHART_NOTE
    ? `<label class="inspector-toggle calendar-chart-note-guides">
        <input
          data-inspector-action="chart-note-toggle-guides"
          data-chart-note-id="${escapeHtml(item.ref.id)}"
          type="checkbox"
          ${item.source?.display?.showGuides ? 'checked' : ''}
        />
        <span>Guides</span>
      </label>`
    : '';
  return `
    <div class="calendar-object-row ${isOrderSetup ? 'calendar-object-row-setup' : ''}${isTimeReaction ? ' calendar-object-row-time-reaction' : ''}${isHidden ? ' is-hidden' : ''}">
      <div class="calendar-object-main">
        ${
          isTimeReaction
            ? ''
            : `<div class="calendar-object-meta">
                <span class="calendar-object-time">${escapeHtml(timeLabel)}</span>
                ${showTypeLabel ? `<span class="calendar-object-type">${escapeHtml(typeLabel)}</span>` : ''}
                ${renderSetupVisibilityToggle(item)}
                ${renderObjectVisibilityToggle(item)}
                ${chartNoteGuidesToggle}
              </div>`
        }
        <span class="calendar-object-summary" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
      </div>
      ${renderObjectActions(item)}
    </div>
  `;
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

function addTimeReactionGroup(groups, dateKey, options = {}) {
  const review = getDailyTimeReviewByDate(dateKey);
  if (!options.includeEmpty && !hasDailyTimeReviewContent(review)) {
    return groups.filter((item) => item.type !== CALENDAR_OBJECT_TYPES.TIME_REACTION);
  }
  const group = {
    type: CALENDAR_OBJECT_TYPES.TIME_REACTION,
    label: 'Time Reaction Observation',
    rows: [
      ...DAILY_TIME_REVIEW_CALENDAR_ROWS.map((row) => createTimeReactionItem(dateKey, row, review)),
    ],
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

function addChartNotesGroup(groups, dateKey, options = {}) {
  const review = getDailyTimeReviewByDate(dateKey);
  const group = createChartNotesGroup(dateKey, review?.instrument || 'NQ');
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

function renderObjectGroup(group, options = {}) {
  const isEconomicGroup = group.type === CALENDAR_OBJECT_TYPES.ECONOMIC_EVENT;
  const rows = group.rows.length
    ? group.rows.map(renderObjectRow).join('')
    : '<div class="calendar-object-empty">None</div>';
  const isOrderSetupGroup = group.type === CALENDAR_OBJECT_TYPES.ORDER_SETUP;
  const openGroups = options.openGroups instanceof Set ? options.openGroups : new Set(options.openGroups || []);
  const isOpen = isOrderSetupGroup || openGroups.has(group.type);
  const countLabel = `${group.rows.length}`;
  const visibilityControl = renderGroupVisibilityControl(group, options.activeDate || '');
  return `
    <details class="calendar-object-group" data-calendar-group-type="${escapeHtml(group.type)}" ${isOpen ? 'open' : ''}>
      <summary class="calendar-object-title">
        ${visibilityControl}
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

function isVisibilityControlGroup(type) {
  return [
    CALENDAR_OBJECT_TYPES.SMT,
    CALENDAR_OBJECT_TYPES.CHART_NOTE,
    CALENDAR_OBJECT_TYPES.PDA,
    CALENDAR_OBJECT_TYPES.SEGMENT,
    CALENDAR_OBJECT_TYPES.COMPOSITE,
    CALENDAR_OBJECT_TYPES.KILLZONE,
  ].includes(type);
}

function renderGroupVisibilityControl(group, activeDate) {
  if (!isVisibilityControlGroup(group.type)) return '<span class="calendar-object-visibility-spacer"></span>';
  const summary = getCalendarVisibilitySummaryForItems(group.rows);
  const checked = summary.state === 'checked';
  const disabled = summary.state === 'disabled';
  const title = disabled
    ? 'No chart objects for this day'
    : `Visible ${summary.visible}/${summary.total}`;
  return `
    <input
      class="calendar-object-visibility-toggle"
      data-inspector-action="calendar-day-group-toggle-hidden"
      data-calendar-visibility-toggle
      data-visibility-state="${escapeHtml(summary.state)}"
      data-calendar-group-type="${escapeHtml(group.type)}"
      data-calendar-date="${escapeHtml(activeDate)}"
      type="checkbox"
      title="${escapeHtml(title)}"
      ${checked ? 'checked' : ''}
      ${disabled ? 'disabled' : ''}
    />
  `;
}

export function hydrateCalendarVisibilityControls(root = document) {
  root.querySelectorAll('[data-calendar-visibility-toggle]').forEach((input) => {
    input.indeterminate = input.dataset.visibilityState === 'mixed';
  });
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

function renderDailyRegimeSummary(dateKey) {
  const regime = getDailyRegimeByDate(dateKey);
  const vixText = getDailyRegimeSummary(regime);
  return `
    <div class="calendar-daily-regime" title="${escapeHtml(vixText)}">
      <span class="calendar-daily-regime-label">${escapeHtml(vixText)}</span>
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

  const resolvedDate = resolveInspectorCalendarDate({ selectedDate, fallbackDate: range.start });
  const activeDate = clampDateKey(resolvedDate, range);
  const activeViewDate = viewDate || activeDate;
  const parsed = parseDateKey(activeViewDate);
  const cells = getMonthCells(activeViewDate, range);
  const title = parsed ? `${MONTHS[parsed.monthIndex]} ${parsed.year}` : 'Calendar';
  const calendarIndex = getCalendarReviewIndex();
  const review = getDailyTimeReviewByDate(activeDate);
  const objectGroups = addChartNotesGroup(
    addTimeReactionGroup(getCalendarDayGroups(activeDate, calendarIndex), activeDate, { includeEmpty: true }),
    activeDate,
    { includeEmpty: true }
  );
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
      ${renderDailyRegimeSummary(activeDate)}
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
        ${objectGroups.map((group) => renderObjectGroup(group, { activeDate, openGroups })).join('')}
      </div>
    </div>
  `;

  return section('Calendar', calendarHtml);
}

export function getNextCalendarViewDate(currentViewDate, direction) {
  return shiftDateKey(currentViewDate, direction === 'prev' ? -1 : 1);
}
