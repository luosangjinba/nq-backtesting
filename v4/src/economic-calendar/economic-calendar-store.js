import * as bus from '../event-bus.js';

export const ECONOMIC_IMPACTS = Object.freeze({
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
});

export const DEFAULT_ECONOMIC_CALENDAR_FILTERS = Object.freeze({
  high: true,
  medium: true,
  low: false,
  holiday: true,
});

let events = [];
let loadedRange = null;
let filters = { ...DEFAULT_ECONOMIC_CALENDAR_FILTERS };

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emitChanged(reason) {
  bus.emit('economic-calendar:changed', {
    reason,
    events: getEconomicEvents(),
    filters: getEconomicCalendarFilters(),
    loadedRange: getEconomicCalendarLoadedRange(),
  });
}

function normalizeBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function normalizeDate(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function normalizeImpact(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'high') return ECONOMIC_IMPACTS.HIGH;
  if (text === 'medium') return ECONOMIC_IMPACTS.MEDIUM;
  if (text === 'low') return ECONOMIC_IMPACTS.LOW;
  return String(value || '').trim() || ECONOMIC_IMPACTS.LOW;
}

function normalizeTimestamp(value) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

function normalizeEvent(input = {}, index = 0) {
  const eventDate = normalizeDate(input.eventDate || input.event_date);
  const title = String(input.title || '').trim();
  const currency = String(input.currency || 'USD').trim().toUpperCase() || 'USD';
  if (!eventDate || !title) return null;
  const allDay = normalizeBool(input.allDay ?? input.all_day, false);
  const impact = normalizeImpact(input.impact);
  const eventType = String(input.eventType || input.event_type || (allDay ? 'holiday' : 'economic')).trim();
  const displayTime = allDay
    ? 'All Day'
    : String(input.displayTime || input.display_time || '').trim();
  const locateTime = String(input.locateTime || input.locate_time || (allDay ? '09:30' : displayTime)).trim();
  return {
    id: String(input.id || `economic_event_${eventDate}_${currency}_${index}`),
    eventDate,
    eventTimeEt: allDay ? '' : String(input.eventTimeEt || input.event_time_et || '').trim(),
    eventTimeUtc: allDay ? '' : String(input.eventTimeUtc || input.event_time_utc || '').trim(),
    displayTime,
    locateTime,
    locateTimestamp: normalizeTimestamp(input.locateTimestamp || input.locate_timestamp),
    currency,
    title,
    impact,
    eventType,
    allDay,
    defaultVisible: normalizeBool(input.defaultVisible ?? input.default_visible, false),
  };
}

function normalizeEvents(input = []) {
  return (Array.isArray(input) ? input : [])
    .map(normalizeEvent)
    .filter(Boolean)
    .sort((a, b) => (
      a.eventDate.localeCompare(b.eventDate)
      || (a.locateTimestamp || 0) - (b.locateTimestamp || 0)
      || a.title.localeCompare(b.title)
    ));
}

function normalizeLoadedRange(input = null) {
  if (!input) return null;
  const dateFrom = normalizeDate(input.dateFrom || input.date_from || input.start || '');
  const dateTo = normalizeDate(input.dateTo || input.date_to || input.end || '');
  if (!dateFrom || !dateTo) return null;
  return { dateFrom, dateTo };
}

export function getEconomicEvents() {
  return clone(events);
}

export function getEconomicCalendarLoadedRange() {
  return loadedRange ? { ...loadedRange } : null;
}

export function getEconomicCalendarFilters() {
  return { ...filters };
}

export function setEconomicEvents(nextEvents = [], nextLoadedRange = null) {
  events = normalizeEvents(nextEvents);
  loadedRange = normalizeLoadedRange(nextLoadedRange);
  emitChanged('events:load');
  return getEconomicEvents();
}

export function clearEconomicEvents() {
  const hadEvents = events.length > 0 || loadedRange !== null;
  events = [];
  loadedRange = null;
  if (hadEvents) emitChanged('events:clear');
}

export function updateEconomicCalendarFilters(patch = {}) {
  filters = {
    ...filters,
    high: patch.high === undefined ? filters.high : normalizeBool(patch.high, filters.high),
    medium: patch.medium === undefined ? filters.medium : normalizeBool(patch.medium, filters.medium),
    low: patch.low === undefined ? filters.low : normalizeBool(patch.low, filters.low),
    holiday: patch.holiday === undefined ? filters.holiday : normalizeBool(patch.holiday, filters.holiday),
  };
  emitChanged('filters:update');
  return getEconomicCalendarFilters();
}

export function isEconomicEventVisible(event, currentFilters = filters) {
  const normalized = normalizeEvent(event);
  if (!normalized) return false;
  if (normalized.allDay || normalized.eventType === 'holiday') return currentFilters.holiday !== false;
  if (normalized.impact === ECONOMIC_IMPACTS.HIGH) return currentFilters.high !== false;
  if (normalized.impact === ECONOMIC_IMPACTS.MEDIUM) return currentFilters.medium !== false;
  if (normalized.impact === ECONOMIC_IMPACTS.LOW) return currentFilters.low !== false;
  return true;
}

export function getVisibleEconomicEvents() {
  return events.filter((event) => isEconomicEventVisible(event, filters)).map((event) => ({ ...event }));
}
