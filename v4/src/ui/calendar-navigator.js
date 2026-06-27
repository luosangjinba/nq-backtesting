import * as bus from '../event-bus.js';
import * as store from '../data/bar-store.js';
import { loadBarsWindow } from '../data/load-bars-window.js';
import { getPrimaryInstrument } from '../data/primary-instrument-store.js';
import { resolveChartLoadRange, resolveWindowAroundTimestamp } from '../data/load-range-policy.js';
import { locateTimestampRange } from '../chart/viewport-controller.js';
import { timeframeToString } from '../config.js';
import { CHART_PANE_IDS, getPaneById, updatePaneDescriptor } from '../chart-panes/chart-pane-store.js';
import { getWorkspaceDocument, putWorkspaceDocument } from '../storage/server-workspace-client.js';
import { hasActiveReplaySession } from './replay/replay-session-state.js';
import { openReplaySessionFromRange } from './replay/replay-session-loader.js';
import {
  dateKeyFromInput,
  dateKeyFromTimestamp,
  dateKeyFromUtcParts,
  formatTimeInput,
} from '../utils.js';

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
const FULL_DAY_START_TIME = '00:00';
const FULL_DAY_END_TIME = '23:59';
const LOAD_PADDING_DAYS = 3;
const RANGE_HISTORY_STORAGE_KEY = 'v4.dateRangeHistory';
const RANGE_HISTORY_STORAGE_VERSION = 1;
const RANGE_HISTORY_WORKSPACE_DOMAIN = 'date-range-history';
const RANGE_HISTORY_LIMIT = 8;

let popover = null;
let anchorButton = null;
let viewDateKey = '';
let rangeStartDate = '';
let rangeEndDate = '';
let activeDateKey = '';
let rangeHistoryMutationVersion = 0;
let applyingServerRangeHistory = false;

function getPrimaryPaneTimeframe() {
  return Number(getPaneById(CHART_PANE_IDS.PRIMARY)?.timeframe) || store.getCurrentTimeframe();
}

function dateTimePartsFromInput(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  return {
    dateKey: `${match[1]}-${match[2]}-${match[3]}`,
    time: match[4] && match[5] ? `${match[4]}:${match[5]}` : '',
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  return dateKeyFromUtcParts(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
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
  return dateKeyFromUtcParts(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function shiftMonth(dateKey, monthOffset) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;
  const date = new Date(Date.UTC(parsed.year, parsed.monthIndex + monthOffset, 1));
  return dateKeyFromUtcParts(date.getUTCFullYear(), date.getUTCMonth(), 1);
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

function formatLoadedRangeLabel(range) {
  const startParts = dateTimePartsFromInput(range.rawStart);
  const endParts = dateTimePartsFromInput(range.rawEnd);
  const hasPreciseStart = startParts?.time && startParts.time !== FULL_DAY_START_TIME;
  const hasPreciseEnd = endParts?.time && endParts.time !== FULL_DAY_END_TIME;
  if (hasPreciseStart || hasPreciseEnd) {
    return formatRangeLabel(range.rawStart || range.start, range.rawEnd || range.end);
  }
  return formatRangeLabel(range.start, range.end);
}

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

function normalizeRangeHistoryItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => dateTimePartsFromInput(item?.start) && dateTimePartsFromInput(item?.end))
    .map((item) => ({
      start: formatTimeInput(String(item.start || '')),
      end: formatTimeInput(String(item.end || '')),
      timeframe: Number(item.timeframe) || 0,
      loadedAt: Number(item.loadedAt) || 0,
    }))
    .filter((item) => item.start && item.end)
    .slice(0, RANGE_HISTORY_LIMIT);
}

function getRangeHistoryPayload(items = getRangeHistory()) {
  return {
    version: RANGE_HISTORY_STORAGE_VERSION,
    savedAt: Date.now(),
    ranges: normalizeRangeHistoryItems(items),
  };
}

export function getRangeHistory() {
  try {
    const storage = globalThis.window?.localStorage || globalThis.localStorage;
    const raw = storage?.getItem(RANGE_HISTORY_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return normalizeRangeHistoryItems(Array.isArray(parsed) ? parsed : parsed?.ranges);
  } catch {
    return [];
  }
}

function saveRangeHistory(items, options = {}) {
  const normalized = normalizeRangeHistoryItems(items);
  try {
    const storage = globalThis.window?.localStorage || globalThis.localStorage;
    storage?.setItem(RANGE_HISTORY_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // localStorage may be unavailable in restricted browser contexts
  }
  if (options.syncServer !== false && !applyingServerRangeHistory) {
    rangeHistoryMutationVersion += 1;
    saveRangeHistoryToServer(getRangeHistoryPayload(normalized));
  }
}

function recordRangeHistory(start, end, timeframe) {
  const normalizedStart = formatTimeInput(String(start || '').trim());
  const normalizedEnd = formatTimeInput(String(end || '').trim());
  if (!normalizedStart || !normalizedEnd) return;

  const normalizedTimeframe = Number(timeframe) || store.getCurrentTimeframe();
  const nextItem = {
    start: normalizedStart,
    end: normalizedEnd,
    timeframe: normalizedTimeframe,
    loadedAt: Date.now(),
  };
  const history = getRangeHistory().filter(
    (item) =>
      item.start !== nextItem.start ||
      item.end !== nextItem.end ||
      Number(item.timeframe) !== normalizedTimeframe
  );
  saveRangeHistory([nextItem, ...history]);
}

function removeRangeHistoryItem(index) {
  const history = getRangeHistory();
  if (index < 0 || index >= history.length) return;
  history.splice(index, 1);
  saveRangeHistory(history);
}

function clearRangeHistory() {
  saveRangeHistory([]);
}

export function getDateRangeHistoryWorkspaceDomain() {
  return RANGE_HISTORY_WORKSPACE_DOMAIN;
}

export async function saveRangeHistoryToServer(payload = null, options = {}) {
  if (applyingServerRangeHistory) return { ok: false, skipped: true };
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const nextPayload = payload || getRangeHistoryPayload();
  try {
    return await putWorkspaceDocument({
      domain: RANGE_HISTORY_WORKSPACE_DOMAIN,
      version: RANGE_HISTORY_STORAGE_VERSION,
      payload: {
        version: Number(nextPayload.version) || RANGE_HISTORY_STORAGE_VERSION,
        savedAt: nextPayload.savedAt || Date.now(),
        ranges: normalizeRangeHistoryItems(nextPayload.ranges),
      },
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    console.warn('[calendar-navigator] date range history server save failed', error);
    return { ok: false, error };
  }
}

export async function syncRangeHistoryFromServer(options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const syncToken = rangeHistoryMutationVersion;
  try {
    const document = await getWorkspaceDocument({
      domain: RANGE_HISTORY_WORKSPACE_DOMAIN,
      fetchImpl: options.fetchImpl,
    });
    if (document?.found && Array.isArray(document.payload?.ranges)) {
      if (rangeHistoryMutationVersion !== syncToken) return { ok: false, skipped: true, stale: true };
      applyingServerRangeHistory = true;
      try {
        saveRangeHistory(document.payload.ranges, { syncServer: false });
        if (popover && !popover.hidden) renderPopover();
      } finally {
        applyingServerRangeHistory = false;
      }
      return { ok: true, source: 'server', document };
    }

    const localHistory = getRangeHistory();
    if (localHistory.length) {
      const saved = await saveRangeHistoryToServer(getRangeHistoryPayload(localHistory), options);
      return { ok: Boolean(saved?.ok), source: 'local-migration', document: saved };
    }
    return { ok: true, source: 'empty' };
  } catch (error) {
    console.warn('[calendar-navigator] date range history server sync failed', error);
    return { ok: false, error };
  }
}

function formatHistoryItemLabel(item) {
  const range = {
    start: dateKeyFromInput(item.start),
    end: dateKeyFromInput(item.end),
    rawStart: item.start,
    rawEnd: item.end,
  };
  return formatLoadedRangeLabel(range);
}

function renderRangeHistory() {
  const history = getRangeHistory();
  const content = history.length
    ? history
        .map((item, index) => {
          const label = formatHistoryItemLabel(item);
          const tfLabel = item.timeframe ? timeframeToString(item.timeframe) : 'TF';
          return `
            <div class="toolbar-calendar-history-row">
              <button
                class="toolbar-calendar-history-load"
                data-calendar-action="load-history"
                data-history-index="${index}"
                type="button"
                title="Load ${escapeHtml(tfLabel)} ${escapeHtml(label)}"
              >
                <span class="toolbar-calendar-history-range">${escapeHtml(label)}</span>
                <span class="toolbar-calendar-history-tf">${escapeHtml(tfLabel)}</span>
              </button>
              <button
                class="toolbar-calendar-history-remove"
                data-calendar-action="remove-history"
                data-history-index="${index}"
                type="button"
                title="Remove history range"
              >X</button>
            </div>
          `;
        })
        .join('')
    : '<div class="toolbar-calendar-history-empty">No history ranges</div>';

  return `
    <details class="toolbar-calendar-history" open>
      <summary>History ranges</summary>
      <div class="toolbar-calendar-history-list">
        ${content}
      </div>
      ${
        history.length
          ? '<button class="toolbar-calendar-history-clear" data-calendar-action="clear-history" type="button">Clear history</button>'
          : ''
      }
    </details>
  `;
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
      dateKey: dateKeyFromUtcParts(parsed.year, parsed.monthIndex, day),
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
  rangeStartDate = range.start || '';
  rangeEndDate = range.end || '';
  activeDateKey = rangeStartDate || rangeEndDate || getTodayDateKey();
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
      <button class="toolbar-calendar-nav" data-calendar-action="prev-year" type="button" title="Previous year">&lt;&lt;</button>
      <button class="toolbar-calendar-nav" data-calendar-action="prev" type="button" title="Previous month">&lt;</button>
      <div class="toolbar-calendar-heading">
        <div class="toolbar-calendar-heading-title">Date Range</div>
        <div class="toolbar-calendar-heading-subtitle">${selectedLabel}</div>
      </div>
      <button class="toolbar-calendar-nav" data-calendar-action="next" type="button" title="Next month">&gt;</button>
      <button class="toolbar-calendar-nav" data-calendar-action="next-year" type="button" title="Next year">&gt;&gt;</button>
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
    ${renderRangeHistory()}
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
  viewDateKey = dateKeyFromUtcParts(parsed.year, parsed.monthIndex, 1);
  ensurePopover();
  renderPopover();
  popover.hidden = false;
  anchorButton.classList.add('active');
  positionPopover();
}

async function loadRange(start, end, successText) {
  const tf = getPrimaryPaneTimeframe();
  bus.emit('status:update', { text: 'Opening replay session...', isError: false });
  const { bars, request, cacheHit } = await openReplaySessionFromRange({
    instrument: getPrimaryInstrument(),
    timeframe: tf,
    sessionStart: start,
    sessionEnd: end,
  });
  setToolbarRange(start, end, false);
  updatePaneDescriptor(CHART_PANE_IDS.PRIMARY, { timeframe: tf });
  recordRangeHistory(start, end, tf);
  bus.emit('status:update', {
    text: `${successText || 'Replay session'}: ${bars.length} prefix bars ending ${request.end}${cacheHit ? ' (cache)' : ''}`,
    isError: false,
  });
  closePopover();
}

async function loadResolvedWindow(loadRange, successText) {
  if (hasActiveReplaySession()) {
    throw new Error('Replay session active: legacy Calendar window loading is disabled');
  }

  const tf = Number(loadRange.outerRange?.timeframe || store.getCurrentTimeframe());
  bus.emit('status:update', { text: 'Loading...', isError: false });
  const { result, cacheHit } = await loadBarsWindow(loadRange.start, loadRange.end, tf, getPrimaryInstrument());
  setToolbarRange(loadRange.start, loadRange.end, false);
  updatePaneDescriptor(CHART_PANE_IDS.PRIMARY, { timeframe: tf });
  store.setBars(result.bars, loadRange.start, loadRange.end, tf, result.requestedRange, {
    outerRange: loadRange.outerRange,
  });
  bus.emit('status:update', {
    text: `${successText || loadRange.message}${cacheHit ? ' (cache)' : ''}`,
    isError: false,
  });
  closePopover();
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
    updatePaneDescriptor(CHART_PANE_IDS.PRIMARY, { timeframe: item.timeframe });
  }

  try {
    await loadRange(item.start, item.end, `History Range: ${formatHistoryItemLabel(item)}`);
  } catch (err) {
    bus.emit('status:update', { text: `Load failed: ${err.message}`, isError: true });
  }
}

async function loadSelectedRange() {
  const normalized = normalizeRangeDates(rangeStartDate, rangeEndDate);
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
    bus.emit('status:update', { text: `Load failed: ${err.message}`, isError: true });
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
  if (action === 'prev' || action === 'next' || action === 'prev-year' || action === 'next-year') {
    const monthOffset = {
      prev: -1,
      next: 1,
      'prev-year': -12,
      'next-year': 12,
    }[action];
    viewDateKey = shiftMonth(viewDateKey, monthOffset);
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
