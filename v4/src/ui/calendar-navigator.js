import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import * as store from '../data/bar-store.js';
import { locateTimestampRange } from '../chart/viewport-controller.js';

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
let selectedDateKey = '';

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

function getInitialDateKey() {
  const range = store.getCurrentRange();
  const rangeStart = dateKeyFromInput(range.start);
  if (rangeStart) return rangeStart;

  const bars = store.getDisplayBars();
  if (bars.length) return dateKeyFromTimestamp(bars[0].timestamp);

  const startInputDate = dateKeyFromInput(document.getElementById('startInput')?.value);
  return startInputDate || getTodayDateKey();
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
}

function positionPopover() {
  if (!popover || !anchorButton) return;
  const rect = anchorButton.getBoundingClientRect();
  const width = popover.offsetWidth || 280;
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
  popover.style.left = `${left}px`;
  popover.style.top = `${rect.bottom + 6}px`;
}

function renderPopover() {
  if (!popover) return;
  const parsed = parseDateKey(viewDateKey);
  const title = parsed ? `${MONTHS[parsed.monthIndex]} ${parsed.year}` : 'Calendar';
  const today = getTodayDateKey();
  const cells = getMonthCells(viewDateKey);

  popover.innerHTML = `
    <div class="toolbar-calendar-header">
      <button class="toolbar-calendar-nav" data-calendar-action="prev" type="button" title="Previous month">&lt;</button>
      <div class="toolbar-calendar-title">${title}</div>
      <button class="toolbar-calendar-nav" data-calendar-action="next" type="button" title="Next month">&gt;</button>
    </div>
    <div class="toolbar-calendar-weekdays">
      ${WEEKDAYS.map((day) => `<div>${day}</div>`).join('')}
    </div>
    <div class="toolbar-calendar-grid">
      ${cells
        .map((cell) => {
          if (cell.empty) return '<div class="toolbar-calendar-day empty"></div>';
          const classes = ['toolbar-calendar-day'];
          if (cell.dateKey === selectedDateKey) classes.push('selected');
          if (cell.dateKey === today) classes.push('today');
          return `
            <button class="${classes.join(' ')}" data-calendar-action="select" data-date="${cell.dateKey}" type="button">
              ${cell.day}
            </button>
          `;
        })
        .join('')}
    </div>
    <div class="toolbar-calendar-footer">
      <span>${selectedDateKey || viewDateKey} ${TARGET_TIME}</span>
    </div>
  `;
  positionPopover();
}

function ensurePopover() {
  if (popover) return popover;
  popover = document.createElement('div');
  popover.className = 'toolbar-calendar-popover';
  popover.hidden = true;
  document.body.appendChild(popover);
  popover.addEventListener('click', handlePopoverClick);
  return popover;
}

function closePopover() {
  if (!popover) return;
  popover.hidden = true;
  anchorButton?.classList.remove('active');
}

function openPopover(button) {
  anchorButton = button;
  const initialDate = selectedDateKey || getInitialDateKey();
  const parsed = parseDateKey(initialDate) || parseDateKey(getTodayDateKey());
  selectedDateKey = parseDateKey(initialDate) ? initialDate : getTodayDateKey();
  viewDateKey = dateKeyFromParts(parsed.year, parsed.monthIndex, 1);
  ensurePopover();
  renderPopover();
  popover.hidden = false;
  anchorButton.classList.add('active');
  positionPopover();
}

async function loadAroundDate(dateKey) {
  const tf = parseInt(document.getElementById('tfSelect')?.value || store.getCurrentTimeframe(), 10);
  const start = formatDateTime(shiftDate(dateKey, -LOAD_PADDING_DAYS), '00:00');
  const end = formatDateTime(shiftDate(dateKey, LOAD_PADDING_DAYS), '23:59');
  setToolbarRange(start, end);
  bus.emit('status:update', { text: `加载 ${dateKey} 附近数据...`, isError: false });
  const result = await fetchBars(start, end, tf);
  store.setBars(result.bars, start, end, tf, result.requestedRange);
  bus.emit('status:update', { text: `已加载 ${result.bars.length} 根K线，定位到 ${dateKey} ${TARGET_TIME}`, isError: false });
}

async function selectDate(dateKey) {
  selectedDateKey = dateKey;
  const targetTimestamp = getCalendarDateTimestamp(dateKey, TARGET_TIME);
  if (!Number.isFinite(targetTimestamp)) {
    bus.emit('status:update', { text: 'Calendar date is invalid', isError: true });
    return;
  }

  try {
    if (!isTimestampLoaded(targetTimestamp)) {
      await loadAroundDate(dateKey);
    }
    requestAnimationFrame(() => {
      locateTimestampRange(targetTimestamp, targetTimestamp);
      bus.emit('status:update', { text: `Calendar: ${dateKey} ${TARGET_TIME}`, isError: false });
    });
    closePopover();
  } catch (err) {
    bus.emit('status:update', { text: `Calendar load failed: ${err.message}`, isError: true });
  }
}

function handlePopoverClick(event) {
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
  button.addEventListener('click', () => {
    if (popover && !popover.hidden) {
      closePopover();
      return;
    }
    openPopover(button);
  });
  document.addEventListener('click', handleDocumentClick);
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', positionPopover);
}
