import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import * as store from '../data/bar-store.js';
import { locateTimestampRange } from '../chart/viewport-controller.js';
import { formatTimeInput } from '../utils.js';

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
const TARGET_TIME = '09:30';
const LOAD_PADDING_DAYS = 3;

let popover = null;
let anchorButton = null;
let viewDateKey = '';
let rangeStartDate = '';
let rangeEndDate = '';
let activeDateKey = '';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dateKeyFromParts(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function dateKeyFromTimestamp(timestamp) {
  const date = new Date(Number(timestamp) * 1000);
  if (!Number.isFinite(date.getTime())) return '';
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

function getTodayDateKey() {
  const now = new Date();
  return dateKeyFromParts(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function getCurrentInputRange() {
  return {
    start: document.getElementById('startInput')?.value || '',
    end: document.getElementById('endInput')?.value || '',
  };
}

function getLoadedDateRange() {
  const inputRange = getCurrentInputRange();
  const inputStart = dateKeyFromInput(inputRange.start);
  const inputEnd = dateKeyFromInput(inputRange.end);
  if (inputStart || inputEnd) return { start: inputStart, end: inputEnd };

  const range = store.getCurrentRange();
  const rangeStart = dateKeyFromInput(range.start);
  const rangeEnd = dateKeyFromInput(range.end);
  if (rangeStart || rangeEnd) return { start: rangeStart, end: rangeEnd };

  const bars = store.getDisplayBars();
  if (bars.length) {
    return {
      start: dateKeyFromTimestamp(bars[0].timestamp),
      end: dateKeyFromTimestamp(bars[bars.length - 1].timestamp),
    };
  }

  return { start: '', end: '' };
}

function getInitialDateKey() {
  const range = getLoadedDateRange();
  return range.start || range.end || getTodayDateKey();
}

function getCalendarDateTimestamp(dateKey, timeText = TARGET_TIME) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  const [hour, minute] = String(timeText).split(':').map(Number);
  if (![hour, minute].every(Number.isFinite)) return null;
  return Math.floor(Date.UTC(parsed.year, parsed.monthIndex, parsed.day, hour, minute, 0) / 1000);
}

function shiftDate(dateKey, dayOffset) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;
  const date = new Date(Date.UTC(parsed.year, parsed.monthIndex, parsed.day + dayOffset));
  return dateKeyFromParts(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function shiftMonth(dateKey, monthOffset) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;
  const date = new Date(Date.UTC(parsed.year, parsed.monthIndex + monthOffset, 1));
  return dateKeyFromParts(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function formatDateTime(dateKey, timeText) {
  return `${dateKey} ${timeText}`;
}

function formatRangeLabel(startDate, endDate) {
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  if (startDate) return `${startDate} - ...`;
  if (endDate) return `... - ${endDate}`;
  return 'Date Range';
}

function normalizeRangeDates(startDate, endDate) {
  if (startDate && endDate && startDate > endDate) {
    return { startDate: endDate, endDate: startDate };
  }
  return { startDate, endDate };
}

function getMonthCells(dateKey) {
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
      dateKey: dateKeyFromParts(parsed.year, parsed.monthIndex, day),
    });
  }
  while (cells.length % 7 !== 0) cells.push({ empty: true });
  return cells;
}

function isTimestampLoaded(timestamp) {
  const bars = store.getDisplayBars();
  if (!bars.length || !Number.isFinite(timestamp)) return false;
  const first = Number(bars[0].timestamp);
  const last = Number(bars[bars.length - 1].timestamp);
  return timestamp >= first && timestamp <= last;
}

function setToolbarRange(start, end) {
  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');
  if (startInput) startInput.value = start;
  if (endInput) endInput.value = end;
  updateDateRangeButton();
}

function getManualStartInput() {
  return document.getElementById('dateRangeManualStart');
}

function getManualEndInput() {
  return document.getElementById('dateRangeManualEnd');
}

function syncManualFields() {
  const manualStart = getManualStartInput();
  const manualEnd = getManualEndInput();
  const range = getCurrentInputRange();
  if (manualStart) manualStart.value = range.start;
  if (manualEnd) manualEnd.value = range.end;
}

function syncRangeFromInputs() {
  const range = getLoadedDateRange();
  rangeStartDate = range.start || '';
  rangeEndDate = range.end || '';
  activeDateKey = rangeStartDate || rangeEndDate || getTodayDateKey();
}

function updateDateRangeButton() {
  if (!anchorButton) return;
  const range = getLoadedDateRange();
  anchorButton.textContent = formatRangeLabel(range.start, range.end);
  anchorButton.title = range.start || range.end ? `Date Range: ${formatRangeLabel(range.start, range.end)}` : 'Date Range';
}

function positionPopover() {
  if (!popover || !anchorButton) return;
  const rect = anchorButton.getBoundingClientRect();
  const width = popover.offsetWidth || 560;
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
  popover.style.left = `${left}px`;
  popover.style.top = `${rect.bottom + 6}px`;
}

function getCellClasses(dateKey) {
  const classes = ['toolbar-calendar-day'];
  const normalized = normalizeRangeDates(rangeStartDate, rangeEndDate);
  if (dateKey === getTodayDateKey()) classes.push('today');
  if (dateKey === activeDateKey) classes.push('active');
  if (dateKey === normalized.startDate) classes.push('range-start');
  if (dateKey === normalized.endDate) classes.push('range-end');
  if (normalized.startDate && normalized.endDate && dateKey > normalized.startDate && dateKey < normalized.endDate) {
    classes.push('in-range');
  }
  return classes;
}

function renderMonth(dateKey) {
  const parsed = parseDateKey(dateKey);
  const title = parsed ? `${MONTHS[parsed.monthIndex]} ${parsed.year}` : 'Calendar';
  const cells = getMonthCells(dateKey);
  return `
    <div class="toolbar-calendar-month">
      <div class="toolbar-calendar-title">${title}</div>
      <div class="toolbar-calendar-weekdays">
        ${WEEKDAYS.map((day) => `<div>${day}</div>`).join('')}
      </div>
      <div class="toolbar-calendar-grid">
        ${cells
          .map((cell) => {
            if (cell.empty) return '<div class="toolbar-calendar-day empty"></div>';
            return `
              <button class="${getCellClasses(cell.dateKey).join(' ')}" data-calendar-action="select" data-date="${cell.dateKey}" type="button">
                ${cell.day}
              </button>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderPopover() {
  if (!popover) return;
  const nextMonth = shiftMonth(viewDateKey, 1);
  const selectedLabel = formatRangeLabel(rangeStartDate, rangeEndDate);

  popover.innerHTML = `
    <div class="toolbar-calendar-header range-header">
      <button class="toolbar-calendar-nav" data-calendar-action="prev" type="button" title="Previous month">&lt;</button>
      <div class="toolbar-calendar-heading">
        <div class="toolbar-calendar-heading-title">Date Range</div>
        <div class="toolbar-calendar-heading-subtitle">${selectedLabel}</div>
      </div>
      <button class="toolbar-calendar-nav" data-calendar-action="next" type="button" title="Next month">&gt;</button>
    </div>
    <div class="toolbar-calendar-months">
      ${renderMonth(viewDateKey)}
      ${renderMonth(nextMonth)}
    </div>
    <div class="toolbar-calendar-actions">
      <button class="toolbar-calendar-action" data-calendar-action="load-range" type="button" ${rangeStartDate && rangeEndDate ? '' : 'disabled'}>Load Range</button>
      <button class="toolbar-calendar-action" data-calendar-action="load-week" type="button">Load Week</button>
      <button class="toolbar-calendar-action" data-calendar-action="jump-day" type="button">Jump 09:30</button>
      <button class="toolbar-calendar-action secondary" data-calendar-action="clear-range" type="button">Clear</button>
    </div>
    <details class="toolbar-calendar-manual">
      <summary>Manual time range</summary>
      <div class="toolbar-calendar-manual-grid">
        <label>
          <span>Start</span>
          <input id="dateRangeManualStart" class="toolbar-input toolbar-calendar-input" type="text" placeholder="YYYY-MM-DD HH:mm" />
        </label>
        <label>
          <span>End</span>
          <input id="dateRangeManualEnd" class="toolbar-input toolbar-calendar-input" type="text" placeholder="YYYY-MM-DD HH:mm" />
        </label>
        <button class="toolbar-calendar-action" data-calendar-action="load-manual" type="button">Load Manual</button>
      </div>
    </details>
  `;
  syncManualFields();
  positionPopover();
}

function ensurePopover() {
  if (popover) return popover;
  popover = document.createElement('div');
  popover.className = 'toolbar-calendar-popover toolbar-date-range-popover';
  popover.hidden = true;
  document.body.appendChild(popover);
  popover.addEventListener('click', handlePopoverClick);
  popover.addEventListener('keydown', handlePopoverKeydown);
  return popover;
}

function closePopover() {
  if (!popover) return;
  popover.hidden = true;
  anchorButton?.classList.remove('active');
}

function openPopover(button) {
  anchorButton = button;
  syncRangeFromInputs();
  const initialDate = activeDateKey || getInitialDateKey();
  const parsed = parseDateKey(initialDate) || parseDateKey(getTodayDateKey());
  viewDateKey = dateKeyFromParts(parsed.year, parsed.monthIndex, 1);
  ensurePopover();
  renderPopover();
  popover.hidden = false;
  anchorButton.classList.add('active');
  positionPopover();
}

async function loadRange(start, end, successText) {
  const tf = parseInt(document.getElementById('tfSelect')?.value || store.getCurrentTimeframe(), 10);
  setToolbarRange(start, end);
  bus.emit('status:update', { text: '加载中...', isError: false });
  const result = await fetchBars(start, end, tf);
  store.setBars(result.bars, start, end, tf, result.requestedRange);
  bus.emit('status:update', { text: successText || `已加载 ${result.bars.length} 根K线`, isError: false });
  closePopover();
}

async function loadSelectedRange() {
  const normalized = normalizeRangeDates(rangeStartDate, rangeEndDate);
  if (!normalized.startDate || !normalized.endDate) {
    bus.emit('status:update', { text: '请选择开始和结束日期', isError: true });
    return;
  }
  try {
    await loadRange(
      formatDateTime(normalized.startDate, '00:00'),
      formatDateTime(normalized.endDate, '23:59'),
      `Date Range: ${normalized.startDate} - ${normalized.endDate}`
    );
  } catch (err) {
    bus.emit('status:update', { text: `加载失败: ${err.message}`, isError: true });
  }
}

async function loadWeekAroundActiveDate() {
  const dateKey = activeDateKey || rangeStartDate || getInitialDateKey();
  try {
    const startDate = shiftDate(dateKey, -LOAD_PADDING_DAYS);
    const endDate = shiftDate(dateKey, LOAD_PADDING_DAYS);
    rangeStartDate = startDate;
    rangeEndDate = endDate;
    renderPopover();
    await loadRange(
      formatDateTime(startDate, '00:00'),
      formatDateTime(endDate, '23:59'),
      `Loaded week around ${dateKey}`
    );
    const timestamp = getCalendarDateTimestamp(dateKey, TARGET_TIME);
    requestAnimationFrame(() => locateTimestampRange(timestamp, timestamp));
  } catch (err) {
    bus.emit('status:update', { text: `加载失败: ${err.message}`, isError: true });
  }
}

async function jumpToActiveDate() {
  const dateKey = activeDateKey || rangeStartDate || getInitialDateKey();
  const targetTimestamp = getCalendarDateTimestamp(dateKey, TARGET_TIME);
  if (!Number.isFinite(targetTimestamp)) {
    bus.emit('status:update', { text: 'Calendar date is invalid', isError: true });
    return;
  }

  try {
    if (!isTimestampLoaded(targetTimestamp)) {
      const startDate = shiftDate(dateKey, -LOAD_PADDING_DAYS);
      const endDate = shiftDate(dateKey, LOAD_PADDING_DAYS);
      await loadRange(
        formatDateTime(startDate, '00:00'),
        formatDateTime(endDate, '23:59'),
        `Loaded week around ${dateKey}`
      );
    } else {
      closePopover();
    }
    requestAnimationFrame(() => {
      locateTimestampRange(targetTimestamp, targetTimestamp);
      bus.emit('status:update', { text: `Calendar: ${dateKey} ${TARGET_TIME}`, isError: false });
    });
  } catch (err) {
    bus.emit('status:update', { text: `Calendar load failed: ${err.message}`, isError: true });
  }
}

async function loadManualRange() {
  const manualStart = formatTimeInput(getManualStartInput()?.value.trim() || '');
  const manualEnd = formatTimeInput(getManualEndInput()?.value.trim() || '');
  if (!manualStart || !manualEnd) {
    bus.emit('status:update', { text: '请输入开始和结束时间', isError: true });
    return;
  }
  try {
    await loadRange(manualStart, manualEnd);
  } catch (err) {
    bus.emit('status:update', { text: `加载失败: ${err.message}`, isError: true });
  }
}

function selectDate(dateKey) {
  activeDateKey = dateKey;
  if (!rangeStartDate || (rangeStartDate && rangeEndDate)) {
    rangeStartDate = dateKey;
    rangeEndDate = '';
  } else if (dateKey < rangeStartDate) {
    rangeEndDate = rangeStartDate;
    rangeStartDate = dateKey;
  } else {
    rangeEndDate = dateKey;
  }
  renderPopover();
}

function clearRangeSelection() {
  rangeStartDate = '';
  rangeEndDate = '';
  activeDateKey = getInitialDateKey();
  renderPopover();
}

function handlePopoverClick(event) {
  event.stopPropagation();
  const button = event.target.closest('[data-calendar-action]');
  if (!button) return;
  const action = button.dataset.calendarAction;
  if (action === 'prev' || action === 'next') {
    viewDateKey = shiftMonth(viewDateKey, action === 'prev' ? -1 : 1);
    renderPopover();
    return;
  }
  if (action === 'select') {
    selectDate(button.dataset.date);
    return;
  }
  if (action === 'load-range') loadSelectedRange();
  if (action === 'load-week') loadWeekAroundActiveDate();
  if (action === 'jump-day') jumpToActiveDate();
  if (action === 'load-manual') loadManualRange();
  if (action === 'clear-range') clearRangeSelection();
}

function handlePopoverKeydown(event) {
  if (event.key !== 'Enter') return;
  if (event.target === getManualStartInput() || event.target === getManualEndInput()) {
    loadManualRange();
  }
}

function handleDocumentClick(event) {
  if (!popover || popover.hidden) return;
  if (popover.contains(event.target) || anchorButton?.contains(event.target)) return;
  closePopover();
}

function handleKeydown(event) {
  if (event.key === 'Escape') closePopover();
}

export function initCalendarNavigator(button) {
  anchorButton = button;
  ensurePopover();
  updateDateRangeButton();
  button.addEventListener('click', () => {
    if (popover && !popover.hidden) {
      closePopover();
      return;
    }
    openPopover(button);
  });
  bus.on('bars:loaded', updateDateRangeButton);
  document.addEventListener('click', handleDocumentClick);
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', positionPopover);
}
