import * as bus from '../event-bus.js';
import {
  DEFAULT_DAILY_REGIME_INSTRUMENT,
  getDailyRegimeIdentity,
  normalizeDailyRegime,
} from './daily-regime-types.js';

let dailyRegimes = [];
let loadedRange = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeDate(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function normalizeInstrument(value) {
  return String(value || DEFAULT_DAILY_REGIME_INSTRUMENT).trim().toUpperCase() || DEFAULT_DAILY_REGIME_INSTRUMENT;
}

function normalizeLoadedRange(input = null) {
  if (!input) return null;
  const dateFrom = normalizeDate(input.dateFrom || input.date_from || input.start || '');
  const dateTo = normalizeDate(input.dateTo || input.date_to || input.end || '');
  if (!dateFrom || !dateTo) return null;
  return { dateFrom, dateTo };
}

function emitChanged(reason) {
  bus.emit('daily-regime:changed', {
    reason,
    dailyRegimes: getDailyRegimes(),
    loadedRange: getDailyRegimeLoadedRange(),
  });
}

export function getDailyRegimes() {
  return dailyRegimes.map(clone);
}

export function getDailyRegimeLoadedRange() {
  return loadedRange ? { ...loadedRange } : null;
}

export function loadDailyRegimes(nextRegimes = [], nextLoadedRange = null, options = {}) {
  const byIdentity = new Map();
  (Array.isArray(nextRegimes) ? nextRegimes : [])
    .map(normalizeDailyRegime)
    .filter((regime) => regime.date)
    .forEach((regime) => {
      byIdentity.set(getDailyRegimeIdentity(regime), regime);
    });

  dailyRegimes = Array.from(byIdentity.values())
    .sort((a, b) => a.date.localeCompare(b.date) || a.instrument.localeCompare(b.instrument));
  loadedRange = normalizeLoadedRange(nextLoadedRange);

  if (options.emit !== false) emitChanged(options.reason || 'regimes:load');
  return getDailyRegimes();
}

export function clearDailyRegimes(options = {}) {
  const hadData = dailyRegimes.length > 0 || loadedRange !== null;
  dailyRegimes = [];
  loadedRange = null;
  if (hadData && options.emit !== false) emitChanged(options.reason || 'regimes:clear');
}

export function getDailyRegimeByDate(date, instrument = DEFAULT_DAILY_REGIME_INSTRUMENT) {
  const dateKey = normalizeDate(date);
  const normalizedInstrument = normalizeInstrument(instrument);
  const identity = `${dateKey}|${normalizedInstrument}`;
  return clone(
    dailyRegimes.find((regime) => getDailyRegimeIdentity(regime) === identity)
      || normalizeDailyRegime({ date: dateKey, instrument: normalizedInstrument })
  );
}
