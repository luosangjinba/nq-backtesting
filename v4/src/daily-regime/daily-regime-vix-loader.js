import * as bus from '../event-bus.js';
import { getEconomicEvents } from '../economic-calendar/economic-calendar-store.js';
import { dateKeyFromInput, dateKeyFromTimestamp } from '../utils.js';
import { DEFAULT_DAILY_REGIME_INSTRUMENT, normalizeDailyRegime } from './daily-regime-types.js';
import {
  clearDailyRegimes,
  getDailyRegimeLoadedRange,
  getDailyRegimes,
  loadDailyRegimes,
} from './daily-regime-store.js';
import { applyEconomicEventRegimes, applyEventRegimes } from './daily-regime-events.js';

const VIX_DAILY_CSV_PATH = 'data/vix-daily.csv';
const DAILY_REGIME_CSV_PATH_BY_INSTRUMENT = Object.freeze({
  NQ: 'data/daily-regime-nq.csv',
  ES: 'data/daily-regime-es.csv',
});

let requestSeq = 0;
let vixDailyCache = null;
let trendRangeCacheByInstrument = new Map();

function normalizeDate(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
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

export function parseDailyTrendRangeCsv(text) {
  const rows = String(text || '').trim().split(/\r?\n/);
  if (rows.length <= 1) return new Map();
  const header = parseCsvLine(rows[0]);
  const indexes = Object.fromEntries(header.map((name, index) => [name, index]));
  if (indexes.date === undefined) return new Map();

  const byDate = new Map();
  rows.slice(1).forEach((line) => {
    const cells = parseCsvLine(line);
    const date = normalizeDate(cells[indexes.date]);
    if (!date) return;
    byDate.set(date, {
      trendClose: cells[indexes.trendClose],
      trendEma20: cells[indexes.trendEma20],
      trendEma50: cells[indexes.trendEma50],
      trendRegime: cells[indexes.trendRegime],
      dayRange: cells[indexes.dayRange],
      atr20: cells[indexes.atr20],
      rangeAtrRatio: cells[indexes.rangeAtrRatio],
      rangeRegime: cells[indexes.rangeRegime],
    });
  });
  return byDate;
}

async function getVixDailyData() {
  if (vixDailyCache) return vixDailyCache;
  const response = await fetch(VIX_DAILY_CSV_PATH);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  vixDailyCache = parseVixDailyCsv(text);
  return vixDailyCache;
}

async function getDailyTrendRangeData(instrument = DEFAULT_DAILY_REGIME_INSTRUMENT) {
  const normalizedInstrument = String(instrument || DEFAULT_DAILY_REGIME_INSTRUMENT).trim().toUpperCase();
  if (trendRangeCacheByInstrument.has(normalizedInstrument)) {
    return trendRangeCacheByInstrument.get(normalizedInstrument);
  }

  const path = DAILY_REGIME_CSV_PATH_BY_INSTRUMENT[normalizedInstrument];
  if (!path) {
    const empty = new Map();
    trendRangeCacheByInstrument.set(normalizedInstrument, empty);
    return empty;
  }

  const response = await fetch(path);
  if (!response.ok) {
    const empty = new Map();
    trendRangeCacheByInstrument.set(normalizedInstrument, empty);
    bus.emit('status:update', {
      text: `Daily regime trend/range unavailable for ${normalizedInstrument}`,
      isError: false,
    });
    return empty;
  }
  const parsed = parseDailyTrendRangeCsv(await response.text());
  trendRangeCacheByInstrument.set(normalizedInstrument, parsed);
  return parsed;
}

function applyStaticTrendRangeRegimes(regimes = [], trendRangeByDate = new Map()) {
  return (Array.isArray(regimes) ? regimes : []).map((regime) => normalizeDailyRegime({
    ...regime,
    ...(trendRangeByDate.get(regime.date) || {}),
  }));
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
    const instrument = payload.instrument || DEFAULT_DAILY_REGIME_INSTRUMENT;
    const [vixByDate, trendRangeByDate] = await Promise.all([
      getVixDailyData(),
      getDailyTrendRangeData(instrument),
    ]);
    if (seq !== requestSeq) return;
    const regimes = applyEconomicEventRegimes(
      applyEventRegimes(
        applyStaticTrendRangeRegimes(buildVixDailyRegimes(vixByDate, range, instrument), trendRangeByDate)
      ),
      getEconomicEvents()
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

function refreshDailyRegimeEventTags() {
  const range = getDailyRegimeLoadedRange();
  const regimes = getDailyRegimes();
  if (!range || !regimes.length) return;
  loadDailyRegimes(
    applyEconomicEventRegimes(applyEventRegimes(regimes), getEconomicEvents()),
    range,
    { reason: 'events:update' }
  );
}

export function initDailyRegimeVixLoader() {
  bus.on('bars:loaded', loadDailyRegimesForBars);
  bus.on('economic-calendar:changed', refreshDailyRegimeEventTags);
  bus.on('primary-instrument:changed', () => {
    requestSeq += 1;
    clearDailyRegimes();
  });
  bus.on('bars:cleared', () => {
    requestSeq += 1;
    clearDailyRegimes();
  });
}
