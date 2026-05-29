import * as store from '../../data/bar-store.js';
import { getOrderReviews } from '../../order/order-review-store.js';
import { getAnnotations } from '../../pda/pda-store.js';
import { getSegments, getSegmentById } from '../../segment/segment-store.js';
import { getSegmentGroups } from '../../segment/segment-group-store.js';
import { getSmtRecords } from '../../smt/smt-store.js';
import { getTimeOverlaySettings } from '../../time-overlays/time-overlay-store.js';
import { escapeHtml, formatNumber, formatTime, section } from './render-utils.js';

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

function toTimestamp(value) {
  if (value === undefined || value === null || value === '') return null;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function collectTimestamps(values = []) {
  return values.map(toTimestamp).filter((value) => value !== null);
}

function dateKeyFromTimestamp(timestamp) {
  const value = toTimestamp(timestamp);
  if (value === null) return '';
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

function getOrderSetupDateKeys() {
  return new Set(
    getOrderReviews()
      .map((order) => dateKeyFromTimestamp(getTimestampForOrder(order)))
      .filter(Boolean)
  );
}

function getTimestampForOrder(order) {
  return toTimestamp(
    order.entryPlan?.entryTimestamp ??
    order.setupThesis?.primaryEventTimestamp ??
    order.resultReview?.exitTimestamp ??
    null
  );
}

function getOrderTimestampRange(order) {
  const timestamps = collectTimestamps([
    order.setupThesis?.primaryEventTimestamp,
    order.entryPlan?.entryTimestamp,
    order.resultReview?.exitTimestamp,
  ]);
  if (!timestamps.length) return null;
  return { start: Math.min(...timestamps), end: Math.max(...timestamps) };
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
  const timestamps = collectTimestamps([
    annotation.canonicalTimestamp,
    annotation.timestamp,
    annotation.anchorTime,
    annotation.start?.timestamp,
    annotation.end?.timestamp,
    annotation.startTime,
    annotation.endTime,
  ]);
  if (!timestamps.length) return null;
  return { start: Math.min(...timestamps), end: Math.max(...timestamps) };
}

function getSegmentTimestamp(segment) {
  return segment.start?.timestamp ?? segment.start?.time ?? null;
}

function getSegmentTimestampRange(segment) {
  const timestamps = collectTimestamps([
    segment?.start?.timestamp ?? segment?.start?.time,
    segment?.end?.timestamp ?? segment?.end?.time,
  ]);
  if (!timestamps.length) return null;
  return { start: Math.min(...timestamps), end: Math.max(...timestamps) };
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

function getSmtTimestamp(record) {
  return record.leftTimestamp ?? record.timestamp ?? record.fvgStartTimestamp ?? null;
}

function getSmtTimestampRange(record) {
  const timestamps = collectTimestamps([
    record.leftTimestamp,
    record.rightTimestamp,
    record.timestamp,
    record.fvgStartTimestamp,
    record.fvgEndTimestamp,
  ]);
  if (!timestamps.length) return null;
  return { start: Math.min(...timestamps), end: Math.max(...timestamps) };
}

function getKillzoneTimestampRange(killzone) {
  const start = getCalendarDateTimestamp(killzone.date, killzone.startTime);
  const end = getCalendarDateTimestamp(killzone.date, killzone.endTime);
  if (![start, end].every(Number.isFinite)) return null;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

function getEventTimeTimestampRange(eventTime) {
  const timestamp = getCalendarDateTimestamp(eventTime.date, eventTime.time);
  if (!Number.isFinite(timestamp)) return null;
  return { start: timestamp, end: timestamp };
}

function row(label, range, ref = {}) {
  return { label, range, ref };
}

function compactTime(value) {
  const formatted = formatTime(value);
  if (formatted === '—') return formatted;
  return formatted.includes(' ') ? formatted.split(' ')[1] : formatted;
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

function summarizeOrder(order) {
  const entry = order.entryPlan || {};
  const result = order.resultReview || {};
  return joinSummary([
    titleCase(entry.direction || order.direction, 'Setup'),
    compactTime(entry.entryTimestamp || getTimestampForOrder(order)),
    compactPrice(entry.entryPrice),
    titleCase(result.result, ''),
  ]);
}

function summarizePda(annotation) {
  const context = Array.isArray(annotation.contexts) && annotation.contexts.length
    ? annotation.contexts[0]
    : annotation.timeframe || annotation.sourceTimeframe || '';
  const price = annotation.price ?? annotation.topPrice ?? annotation.priceHigh;
  const bottom = annotation.bottomPrice ?? annotation.priceLow;
  const priceText = bottom !== undefined && bottom !== null
    ? `${formatNumber(price)}-${formatNumber(bottom)}`
    : compactPrice(price);
  return joinSummary([titleCase(annotation.type, 'PDA'), context, priceText]);
}

function summarizeSegment(segment) {
  return joinSummary([
    segment.timeframe || '1H',
    titleCase(segment.direction, 'Segment'),
    `${compactTime(segment.start?.timestamp ?? segment.start?.time)} -> ${compactTime(segment.end?.timestamp ?? segment.end?.time)}`,
  ]);
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

function summarizeSmt(record) {
  return joinSummary([
    titleCase(record.direction, ''),
    titleCase(record.type, 'SMT'),
    record.timeframe,
  ]);
}

function buildDayItems(dateKey) {
  const settings = getTimeOverlaySettings();
  return [
    {
      label: 'Order Setups',
      rows: getOrderReviews()
        .filter((order) => dateKeyFromTimestamp(getTimestampForOrder(order)) === dateKey)
        .map((order) =>
          row(
            summarizeOrder(order),
            getOrderTimestampRange(order),
            { type: 'order-setup', id: order.id }
          )
        ),
    },
    {
      label: 'SMT',
      rows: getSmtRecords()
        .filter((record) => dateKeyFromTimestamp(getSmtTimestamp(record)) === dateKey)
        .map((record) =>
          row(summarizeSmt(record), getSmtTimestampRange(record), {
            type: 'smt',
            id: record.id,
          })
        ),
    },
    {
      label: 'PDA',
      rows: getAnnotations()
        .filter((annotation) => !annotation.draft && dateKeyFromTimestamp(getPdaTimestamp(annotation)) === dateKey)
        .map((annotation) =>
          row(summarizePda(annotation), getPdaTimestampRange(annotation), {
            type: 'pda',
            id: annotation.id,
          })
        ),
    },
    {
      label: 'Segments',
      rows: getSegments()
        .filter((segment) => dateKeyFromTimestamp(getSegmentTimestamp(segment)) === dateKey)
        .map((segment) =>
          row(
            summarizeSegment(segment),
            getSegmentTimestampRange(segment),
            { type: 'segment', id: segment.id }
          )
        ),
    },
    {
      label: 'Composite',
      rows: getSegmentGroups()
        .filter((group) => dateKeyFromTimestamp(getCompositeTimestamp(group)) === dateKey)
        .map((group) =>
          row(
            summarizeComposite(group),
            getCompositeTimestampRange(group),
            { type: 'composite', id: group.id }
          )
        ),
    },
    {
      label: 'Killzones / Time Lines',
      rows: [
        ...(settings.killzones || [])
          .filter((killzone) => killzone.date === dateKey)
          .map((killzone) =>
            row(
              `${killzone.label || 'Killzone'} · ${killzone.startTime}-${killzone.endTime}`,
              getKillzoneTimestampRange(killzone),
              { type: 'killzone', id: killzone.id }
            )
          ),
        ...(settings.eventTimes || [])
          .filter((eventTime) => eventTime.date === dateKey)
          .map((eventTime) =>
            row(`Time Line · ${eventTime.label || eventTime.time}`, getEventTimeTimestampRange(eventTime), {
              type: 'time-line',
              id: eventTime.id,
            })
          ),
      ],
    },
  ];
}

function renderObjectGroup(group) {
  const rows = group.rows.length
    ? group.rows
        .map((item) => {
          const canLocate = Number.isFinite(item.range?.start) && Number.isFinite(item.range?.end);
          const canOpen = ['pda', 'segment', 'composite'].includes(item.ref?.type);
          return `
            <div class="calendar-object-row">
              <span>${escapeHtml(item.label)}</span>
              <div class="calendar-object-actions">
                <button
                  class="inspector-mini-btn calendar-object-locate"
                  data-inspector-action="calendar-object-locate"
                  data-locate-start="${canLocate ? item.range.start : ''}"
                  data-locate-end="${canLocate ? item.range.end : ''}"
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
              </div>
            </div>
          `;
        })
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
  const orderSetupDateKeys = getOrderSetupDateKeys();

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
            const hasOrderSetup = orderSetupDateKeys.has(cell.dateKey);
            if (hasOrderSetup) classes.push('has-order-setup');
            return `
              <button class="${classes.join(' ')}" data-inspector-action="calendar-select-date" data-calendar-date="${cell.dateKey}" type="button" ${cell.inRange ? '' : 'disabled'}>
                <span>${cell.day}</span>
                ${hasOrderSetup ? '<span class="calendar-order-badge" aria-label="Order Setup"></span>' : ''}
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
