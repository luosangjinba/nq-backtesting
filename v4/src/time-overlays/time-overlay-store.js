// Session-scoped visual time overlay state.
// This store owns only visual helper settings and never mutates review objects.

import * as bus from '../event-bus.js';
import {
  DEFAULT_DAY_BOUNDARY_COLOR,
  DEFAULT_EVENT_TIME_COLOR,
  DEFAULT_EVENT_TIMES,
  DEFAULT_KILLZONE,
  DEFAULT_KILLZONE_FILL_COLOR,
  DEFAULT_KILLZONE_LINE_COLOR,
} from './time-overlay-types.js';

let eventIdSequence = 0;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emitChanged(reason) {
  bus.emit('time-overlays:changed', {
    reason,
    settings: getTimeOverlaySettings(),
  });
}

function normalizeDate(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

export function normalizeEventTimeValue(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  const compactMatch = text.match(/^(\d{1,2})(\d{2})$/);
  const colonMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  const match = colonMatch || compactMatch;
  if (!match) return fallback;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return fallback;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function buildEventTimeLabel(time) {
  const normalized = normalizeEventTimeValue(time, '');
  return normalized ? normalized.replace(':', '').replace(/^0/, '') : '';
}

function nextEventId() {
  eventIdSequence += 1;
  return `event_time_${Date.now()}_${eventIdSequence}`;
}

export function normalizeEventTime(input = {}) {
  const time = normalizeEventTimeValue(input.time, '');
  if (!time) return null;
  const label = String(input.label || buildEventTimeLabel(time)).trim() || buildEventTimeLabel(time);
  return {
    id: String(input.id || nextEventId()),
    date: normalizeDate(input.date, ''),
    time,
    label,
    color: String(input.color || DEFAULT_EVENT_TIME_COLOR),
    enabled: input.enabled !== false,
  };
}

function normalizeEventTimes(input = DEFAULT_EVENT_TIMES) {
  const source = Array.isArray(input) ? input : DEFAULT_EVENT_TIMES;
  return source.map(normalizeEventTime).filter(Boolean);
}

function normalizeKillzone(input = {}) {
  return {
    ...DEFAULT_KILLZONE,
    ...input,
    enabled: input.enabled === true,
    label: String(input.label || DEFAULT_KILLZONE.label),
    startTime: normalizeEventTimeValue(input.startTime, DEFAULT_KILLZONE.startTime),
    endTime: normalizeEventTimeValue(input.endTime, DEFAULT_KILLZONE.endTime),
    fillColor: String(input.fillColor || DEFAULT_KILLZONE_FILL_COLOR),
    lineColor: String(input.lineColor || DEFAULT_KILLZONE_LINE_COLOR),
  };
}

function createDefaultSettings() {
  return {
    enabled: true,
    selectedDate: '',
    showDayBoundary: true,
    dayBoundaryColor: DEFAULT_DAY_BOUNDARY_COLOR,
    eventTimes: normalizeEventTimes(DEFAULT_EVENT_TIMES),
    killzone: normalizeKillzone(DEFAULT_KILLZONE),
  };
}

let settings = createDefaultSettings();

export function getTimeOverlaySettings() {
  return clone(settings);
}

export function updateTimeOverlaySettings(patch = {}) {
  settings = {
    ...settings,
    ...patch,
    enabled: patch.enabled === undefined ? settings.enabled : patch.enabled !== false,
    selectedDate: patch.selectedDate === undefined ? settings.selectedDate : normalizeDate(patch.selectedDate, ''),
    showDayBoundary:
      patch.showDayBoundary === undefined ? settings.showDayBoundary : patch.showDayBoundary !== false,
    dayBoundaryColor: String(patch.dayBoundaryColor || settings.dayBoundaryColor || DEFAULT_DAY_BOUNDARY_COLOR),
    eventTimes: patch.eventTimes === undefined ? settings.eventTimes : normalizeEventTimes(patch.eventTimes),
    killzone: patch.killzone === undefined ? settings.killzone : normalizeKillzone(patch.killzone),
  };
  emitChanged('update');
  return getTimeOverlaySettings();
}

export function addEventTime(input = {}) {
  const eventTime = normalizeEventTime(input);
  if (!eventTime) return null;
  settings = {
    ...settings,
    eventTimes: [...settings.eventTimes, eventTime],
  };
  emitChanged('event-time:add');
  return clone(eventTime);
}

export function updateEventTime(id, patch = {}) {
  let updated = null;
  settings = {
    ...settings,
    eventTimes: settings.eventTimes.map((eventTime) => {
      if (eventTime.id !== id) return eventTime;
      updated = normalizeEventTime({ ...eventTime, ...patch, id: eventTime.id });
      return updated || eventTime;
    }),
  };
  if (updated) emitChanged('event-time:update');
  return clone(updated);
}

export function deleteEventTime(id) {
  const before = settings.eventTimes.length;
  settings = {
    ...settings,
    eventTimes: settings.eventTimes.filter((eventTime) => eventTime.id !== id),
  };
  const deleted = settings.eventTimes.length !== before;
  if (deleted) emitChanged('event-time:delete');
  return deleted;
}

export function clearEventTimes() {
  const before = settings.eventTimes.length;
  settings = {
    ...settings,
    eventTimes: [],
  };
  const cleared = before > 0;
  if (cleared) emitChanged('event-time:clear');
  return cleared;
}

export function updateKillzone(patch = {}) {
  settings = {
    ...settings,
    selectedDate: patch.selectedDate === undefined ? settings.selectedDate : normalizeDate(patch.selectedDate, ''),
    killzone: normalizeKillzone({ ...settings.killzone, ...patch }),
  };
  emitChanged('killzone:update');
  return getTimeOverlaySettings().killzone;
}

export function clearKillzone() {
  settings = {
    ...settings,
    killzone: normalizeKillzone({ ...DEFAULT_KILLZONE, enabled: false }),
  };
  emitChanged('killzone:clear');
  return getTimeOverlaySettings().killzone;
}

export function resetTimeOverlaySettings() {
  settings = createDefaultSettings();
  emitChanged('reset');
  return getTimeOverlaySettings();
}
