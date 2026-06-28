import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { resolveWindowAroundTimestamp } from '../data/load-range-policy.js';
import { setPrimaryTimeframeCommand } from '../runtime/commands.js';
import { locateTimestampRange } from '../chart/viewport-controller.js';
import { CHART_PANE_IDS, getPaneById } from '../chart-panes/chart-pane-store.js';
import {
  dateKeyFromInput,
  dateKeyFromTimestamp,
  dateKeyFromUtcParts,
  formatTimeInput,
} from '../utils.js';
import {
  clearRangeHistory,
  getDateRangeHistoryWorkspaceDomain,
  getRangeHistory,
  removeRangeHistoryItem,
  setRangeHistoryChangeHandler,
  syncRangeHistoryFromServer,
} from './calendar/calendar-date-range-history.js';
import {
  clearRangeSelection as clearStoredRangeSelection,
  getDateRangeState,
  normalizeRangeDates,
  selectRangeDate,
  setDateRangeState,
} from './calendar/calendar-date-range-store.js';
import {
  LOAD_PADDING_DAYS,
  TARGET_TIME,
  formatDateTime,
  formatHistoryItemLabel,
  formatLoadedRangeLabel,
  formatRangeLabel,
  getCalendarDateTimestamp,
  getMonthCells,
  getTodayDateKey,
  parseDateKey,
  shiftDate,
  shiftMonth,
} from './calendar/calendar-date-utils.js';
import {
  loadCalendarRange,
  loadResolvedCalendarWindow,
} from './calendar/calendar-range-loader.js';
import { renderCalendarPopover } from './calendar/calendar-navigator-view.js';

let popover = null;
let anchorButton = null;
export { getDateRangeHistoryWorkspaceDomain, getRangeHistory, syncRangeHistoryFromServer };

function getPrimaryPaneTimeframe() {
  return Number(getPaneById(CHART_PANE_IDS.PRIMARY)?.timeframe) || store.getCurrentTimeframe();
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
  if (inputStart || inputEnd) {
    return {
      start: inputStart,
      end: inputEnd,
      rawStart: inputRange.start,
      rawEnd: inputRange.end,
    };
  }

  const range = store.getCurrentRange();
  const rangeStart = dateKeyFromInput(range.start);
  const rangeEnd = dateKeyFromInput(range.end);
  if (rangeStart || rangeEnd) {
    return {
      start: rangeStart,
      end: rangeEnd,
      rawStart: range.start,
      rawEnd: range.end,
    };
  }

  const bars = store.getDisplayBars();
  if (bars.length) {
    return {
      start: dateKeyFromTimestamp(bars[0].timestamp),
      end: dateKeyFromTimestamp(bars[bars.length - 1].timestamp),
      rawStart: '',
      rawEnd: '',
    };
  }

  return { start: '', end: '', rawStart: '', rawEnd: '' };
}

function getInitialDateKey() {
  const range = getLoadedDateRange();
  return range.start || range.end || getTodayDateKey();
}

function isTimestampLoaded(timestamp) {
  const bars = store.getDisplayBars();
  if (!bars.length || !Number.isFinite(timestamp)) return false;
  const first = Number(bars[0].timestamp);
  const last = Number(bars[bars.length - 1].timestamp);
  return timestamp >= first && timestamp <= last;
}

function setToolbarRange(start, end, shouldUpdateButton = true) {
  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');
  if (startInput) startInput.value = start;
  if (endInput) endInput.value = end;
  if (shouldUpdateButton) updateDateRangeButton();
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
  setDateRangeState({
    rangeStartDate: range.start || '',
    rangeEndDate: range.end || '',
    activeDateKey: range.start || range.end || getTodayDateKey(),
  });
}

function updateDateRangeButton() {
  if (!anchorButton) return;
  const range = getLoadedDateRange();
  const label = formatLoadedRangeLabel(range);
  anchorButton.textContent = label;
  anchorButton.title = range.start || range.end ? `Date Range: ${label}` : 'Date Range';
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
  const state = getDateRangeState();
  const classes = ['toolbar-calendar-day'];
  const normalized = normalizeRangeDates(state.rangeStartDate, state.rangeEndDate);
  if (dateKey === getTodayDateKey()) classes.push('today');
  if (dateKey === state.activeDateKey) classes.push('active');
  if (dateKey === normalized.startDate) classes.push('range-start');
  if (dateKey === normalized.endDate) classes.push('range-end');
  if (normalized.startDate && normalized.endDate && dateKey > normalized.startDate && dateKey < normalized.endDate) {
    classes.push('in-range');
  }
  return classes;
}

function renderPopover() {
  if (!popover) return;
  const state = getDateRangeState();
  const nextMonth = shiftMonth(state.viewDateKey, 1);
  const selectedLabel = formatRangeLabel(state.rangeStartDate, state.rangeEndDate);

  popover.innerHTML = renderCalendarPopover({
    viewDateKey: state.viewDateKey,
    nextMonth,
    selectedLabel,
    canLoadRange: Boolean(state.rangeStartDate && state.rangeEndDate),
    history: getRangeHistory(),
    formatHistoryItemLabel,
    parseDateKey,
    getMonthCells,
    getCellClasses,
  });
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
  const initialDate = getDateRangeState().activeDateKey || getInitialDateKey();
  const parsed = parseDateKey(initialDate) || parseDateKey(getTodayDateKey());
  setDateRangeState({ viewDateKey: dateKeyFromUtcParts(parsed.year, parsed.monthIndex, 1) });
  ensurePopover();
  renderPopover();
  popover.hidden = false;
  anchorButton.classList.add('active');
  positionPopover();
}

async function loadRange(start, end, successText) {
  const tf = getPrimaryPaneTimeframe();
  await loadCalendarRange({
    start,
    end,
    timeframe: tf,
    successText,
    onLoaded: (loadRange) => setToolbarRange(loadRange.start, loadRange.end, false),
    closePopover,
  });
}

async function loadResolvedWindow(loadRange, successText) {
  const tf = Number(loadRange.outerRange?.timeframe || store.getCurrentTimeframe());
  await loadResolvedCalendarWindow({
    loadRange,
    timeframe: tf,
    successText,
    onLoaded: (nextRange) => setToolbarRange(nextRange.start, nextRange.end, false),
    closePopover,
  });
}

async function loadHistoryRange(index) {
  const item = getRangeHistory()[index];
  if (!item) {
    bus.emit('status:update', { text: 'History range not found', isError: true });
    return;
  }

  const tfSelect = document.getElementById('tfSelect');
  if (tfSelect && item.timeframe) {
    tfSelect.value = String(item.timeframe);
  }
  if (item.timeframe) {
    setPrimaryTimeframeCommand({ timeframe: item.timeframe });
  }

  try {
    await loadRange(item.start, item.end, `History Range: ${formatHistoryItemLabel(item)}`);
  } catch (err) {
    bus.emit('status:update', { text: `Load failed: ${err.message}`, isError: true });
  }
}

async function loadSelectedRange() {
  const normalized = normalizeRangeDates(getDateRangeState().rangeStartDate, getDateRangeState().rangeEndDate);
  if (!normalized.startDate || !normalized.endDate) {
    bus.emit('status:update', { text: 'Choose start and end dates', isError: true });
    return;
  }
  try {
    await loadRange(
      formatDateTime(normalized.startDate, '00:00'),
      formatDateTime(normalized.endDate, '23:59'),
      `Date Range: ${normalized.startDate} - ${normalized.endDate}`
    );
  } catch (err) {
    bus.emit('status:update', { text: `Load failed: ${err.message}`, isError: true });
  }
}

async function loadWeekAroundActiveDate() {
  const dateKey = getDateRangeState().activeDateKey || getDateRangeState().rangeStartDate || getInitialDateKey();
  try {
    const startDate = shiftDate(dateKey, -LOAD_PADDING_DAYS);
    const endDate = shiftDate(dateKey, LOAD_PADDING_DAYS);
    setDateRangeState({ rangeStartDate: startDate, rangeEndDate: endDate });
    renderPopover();
    await loadRange(
      formatDateTime(startDate, '00:00'),
      formatDateTime(endDate, '23:59'),
      `Loaded week around ${dateKey}`
    );
    const timestamp = getCalendarDateTimestamp(dateKey, TARGET_TIME);
    requestAnimationFrame(() => locateTimestampRange(timestamp, timestamp));
  } catch (err) {
    bus.emit('status:update', { text: `Load failed: ${err.message}`, isError: true });
  }
}

async function jumpToActiveDate() {
  const dateKey = getDateRangeState().activeDateKey || getDateRangeState().rangeStartDate || getInitialDateKey();
  const targetTimestamp = getCalendarDateTimestamp(dateKey, TARGET_TIME);
  if (!Number.isFinite(targetTimestamp)) {
    bus.emit('status:update', { text: 'Calendar date is invalid', isError: true });
    return;
  }

  try {
    if (!isTimestampLoaded(targetTimestamp)) {
      const outerRange = store.getRequestedOuterRange();
      const windowRange = resolveWindowAroundTimestamp(outerRange, targetTimestamp);
      if (windowRange.ok) {
        await loadResolvedWindow(windowRange);
      } else {
        const startDate = shiftDate(dateKey, -LOAD_PADDING_DAYS);
        const endDate = shiftDate(dateKey, LOAD_PADDING_DAYS);
        await loadRange(
          formatDateTime(startDate, '00:00'),
          formatDateTime(endDate, '23:59'),
          `Loaded week around ${dateKey}`
        );
      }
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
    bus.emit('status:update', { text: 'Enter start and end times', isError: true });
    return;
  }
  try {
    await loadRange(manualStart, manualEnd);
  } catch (err) {
    bus.emit('status:update', { text: `Load failed: ${err.message}`, isError: true });
  }
}

function selectDate(dateKey) {
  selectRangeDate(dateKey);
  renderPopover();
}

function clearRangeSelection() {
  clearStoredRangeSelection(getInitialDateKey());
  renderPopover();
}

function handlePopoverClick(event) {
  event.stopPropagation();
  const button = event.target.closest('[data-calendar-action]');
  if (!button) return;
  const action = button.dataset.calendarAction;
  if (action === 'prev' || action === 'next' || action === 'prev-year' || action === 'next-year') {
    const monthOffset = {
      prev: -1,
      next: 1,
      'prev-year': -12,
      'next-year': 12,
    }[action];
    setDateRangeState({ viewDateKey: shiftMonth(getDateRangeState().viewDateKey, monthOffset) });
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
  if (action === 'load-history') loadHistoryRange(Number(button.dataset.historyIndex));
  if (action === 'remove-history') {
    removeRangeHistoryItem(Number(button.dataset.historyIndex));
    renderPopover();
  }
  if (action === 'clear-history') {
    clearRangeHistory();
    renderPopover();
  }
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
  setRangeHistoryChangeHandler(() => {
    if (popover && !popover.hidden) renderPopover();
  });
  syncRangeHistoryFromServer();
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
