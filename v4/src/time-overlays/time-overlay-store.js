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
let killzoneIdSequence = 0;

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

function nextKillzoneId() {
  killzoneIdSequence += 1;
  return `killzone_${Date.now()}_${killzoneIdSequence}`;
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
  const date = normalizeDate(input.date, '');
  const startTime = normalizeEventTimeValue(input.startTime, DEFAULT_KILLZONE.startTime);
  const endTime = normalizeEventTimeValue(input.endTime, DEFAULT_KILLZONE.endTime);
  if (!date || !startTime || !endTime || startTime === endTime) return null;
  return {
    ...DEFAULT_KILLZONE,
    ...input,
    id: String(input.id || nextKillzoneId()),
    date,
    enabled: input.enabled !== false,
    label: String(input.label || DEFAULT_KILLZONE.label),
    startTime,
    endTime,
    fillColor: String(input.fillColor || DEFAULT_KILLZONE_FILL_COLOR),
    lineColor: String(input.lineColor || DEFAULT_KILLZONE_LINE_COLOR),
  };
}

function normalizeKillzones(input = []) {
  const source = Array.isArray(input) ? input : [];
  return source.map(normalizeKillzone).filter(Boolean);
}

function normalizeKillzoneDraft(input = null) {
  if (!input) return null;
  const date = normalizeDate(input.date, '');
  const startTime = normalizeEventTimeValue(input.startTime, '');
  if (!date || !startTime) return null;
  return {
    date,
    startTime,
  };
}

function createDefaultSettings() {
  return {
    enabled: true,
    selectedDate: '',
    showDayBoundary: true,
    dayBoundaryColor: DEFAULT_DAY_BOUNDARY_COLOR,
    eventTimes: normalizeEventTimes(DEFAULT_EVENT_TIMES),
    killzones: [],
    killzoneDraft: null,
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
    killzones: patch.killzones === undefined ? settings.killzones : normalizeKillzones(patch.killzones),
    killzoneDraft:
      patch.killzoneDraft === undefined ? settings.killzoneDraft : normalizeKillzoneDraft(patch.killzoneDraft),
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

export function addKillzone(input = {}) {
  const killzone = normalizeKillzone(input);
  if (!killzone) return null;
  settings = {
    ...settings,
    selectedDate: killzone.date,
    killzones: [...settings.killzones, killzone],
  };
  emitChanged('killzone:add');
  return clone(killzone);
}

export function updateKillzone(id, patch = {}) {
  let updated = null;
  settings = {
    ...settings,
    killzones: settings.killzones.map((killzone) => {
      if (killzone.id !== id) return killzone;
      updated = normalizeKillzone({ ...killzone, ...patch, id: killzone.id });
      return updated || killzone;
    }),
  };
  if (updated) emitChanged('killzone:update');
  return clone(updated);
}

export function deleteKillzone(id) {
  const before = settings.killzones.length;
  settings = {
    ...settings,
    killzones: settings.killzones.filter((killzone) => killzone.id !== id),
  };
  const deleted = settings.killzones.length !== before;
  if (deleted) emitChanged('killzone:delete');
  return deleted;
}

export function clearKillzones() {
  const before = settings.killzones.length;
  settings = {
    ...settings,
    killzones: [],
    killzoneDraft: null,
  };
  const cleared = before > 0;
  if (cleared) emitChanged('killzone:clear');
  return cleared;
}

export function setKillzoneDraft(input = {}) {
  const draft = normalizeKillzoneDraft(input);
  if (!draft) return null;
  settings = {
    ...settings,
    selectedDate: draft.date,
    killzoneDraft: draft,
  };
  emitChanged('killzone:draft');
  return clone(draft);
}

export function clearKillzoneDraft() {
  const hadDraft = Boolean(settings.killzoneDraft);
  settings = {
    ...settings,
    killzoneDraft: null,
  };
  if (hadDraft) emitChanged('killzone:draft-clear');
  return hadDraft;
}

export function resetTimeOverlaySettings() {
  settings = createDefaultSettings();
  emitChanged('reset');
  return getTimeOverlaySettings();
}
