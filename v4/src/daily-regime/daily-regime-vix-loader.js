import * as bus from '../event-bus.js';
import { fetchBars } from '../api.js';
import { DEFAULT_DAILY_REGIME_INSTRUMENT, normalizeDailyRegime } from './daily-regime-types.js';
import { clearDailyRegimes, loadDailyRegimes } from './daily-regime-store.js';
import { applyTrendRegimes } from './daily-regime-trend.js';
import { applyRangeRegimes } from './daily-regime-range.js';
import { applyEventRegimes } from './daily-regime-events.js';

const VIX_DAILY_CSV_PATH = 'data/vix-daily.csv';
const DAILY_TF = 1440;
const DAILY_HISTORY_LOOKBACK_DAYS = 140;

let requestSeq = 0;
let vixDailyCache = null;

function normalizeDate(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function dateKeyFromInput(value) {
  const match = String(value || '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function dateKeyFromTimestamp(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return '';
  const date = new Date(value * 1000);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function shiftDateKey(dateKey, dayOffset) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + dayOffset));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function resolveLoadedDateRange(payload = {}) {
  const requestedRange = payload.requestedRange || {};
  const dateFrom = dateKeyFromTimestamp(requestedRange.startTs) || dateKeyFromInput(payload.start);
  const dateTo = dateKeyFromTimestamp(requestedRange.endTs) || dateKeyFromInput(payload.end);
  if (!dateFrom || !dateTo) return null;
  return { dateFrom, dateTo };
}

function parseCsvLine(line) {
  return String(line || '').split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

export function parseVixDailyCsv(text) {
  const rows = String(text || '').trim().split(/\r?\n/);
  if (rows.length <= 1) return new Map();
  const header = parseCsvLine(rows[0]).map((cell) => cell.toUpperCase());
  const dateIndex = header.indexOf('DATE');
  const closeIndex = header.indexOf('CLOSE');
  if (dateIndex < 0 || closeIndex < 0) return new Map();

  const byDate = new Map();
  rows.slice(1).forEach((line) => {
    const cells = parseCsvLine(line);
    const date = normalizeDate(cells[dateIndex]);
    const close = Number(cells[closeIndex]);
    if (date && Number.isFinite(close)) byDate.set(date, close);
  });
  return byDate;
}

export function buildVixDailyRegimes(vixByDate, range, instrument = DEFAULT_DAILY_REGIME_INSTRUMENT) {
  if (!range?.dateFrom || !range?.dateTo) return [];
  return Array.from(vixByDate.entries())
    .filter(([date]) => date >= range.dateFrom && date <= range.dateTo)
    .map(([date, vixClose]) => normalizeDailyRegime({ date, instrument, vixClose }));
}

async function getVixDailyData() {
  if (vixDailyCache) return vixDailyCache;
  const response = await fetch(VIX_DAILY_CSV_PATH);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  vixDailyCache = parseVixDailyCsv(text);
  return vixDailyCache;
}

async function fetchDailyHistoryBars(range, instrument = DEFAULT_DAILY_REGIME_INSTRUMENT) {
  if (!range?.dateFrom || !range?.dateTo) return [];
  const startDate = shiftDateKey(range.dateFrom, -DAILY_HISTORY_LOOKBACK_DAYS) || range.dateFrom;
  const response = await fetchBars(`${startDate} 00:00`, `${range.dateTo} 23:59`, DAILY_TF, instrument);
  return Array.isArray(response?.bars) ? response.bars : [];
}

async function loadDailyRegimesForBars(payload = {}) {
  const range = resolveLoadedDateRange(payload);
  requestSeq += 1;
  const seq = requestSeq;
  if (!range) {
    clearDailyRegimes();
    return;
  }

  try {
    const [vixByDate, dailyHistoryBars] = await Promise.all([
      getVixDailyData(),
      fetchDailyHistoryBars(range, payload.instrument || DEFAULT_DAILY_REGIME_INSTRUMENT),
    ]);
    if (seq !== requestSeq) return;
    const regimes = applyEventRegimes(
      applyRangeRegimes(
        applyTrendRegimes(buildVixDailyRegimes(vixByDate, range), dailyHistoryBars),
        dailyHistoryBars
      )
    );
    loadDailyRegimes(regimes, range);
  } catch (error) {
    if (seq !== requestSeq) return;
    clearDailyRegimes();
    bus.emit('status:update', {
      text: `Daily regime load failed: ${error.message}`,
      isError: true,
    });
  }
}

export function initDailyRegimeVixLoader() {
  bus.on('bars:loaded', loadDailyRegimesForBars);
  bus.on('bars:cleared', () => {
    requestSeq += 1;
    clearDailyRegimes();
  });
}
