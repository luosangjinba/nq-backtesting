const MAX_EVENTS = 1000;
const STORAGE_KEY = 'v4.replayPerfDiagnostics';

let forcedEnabled = null;

function getWindow() {
  return typeof window === 'undefined' ? null : window;
}

function hasQueryFlag(win) {
  try {
    return new URLSearchParams(win.location?.search || '').get('replayPerf') === '1';
  } catch (err) {
    return false;
  }
}

function hasStorageFlag(win) {
  try {
    return win.localStorage?.getItem(STORAGE_KEY) === '1';
  } catch (err) {
    return false;
  }
}

export function isReplayPerformanceDiagnosticsEnabled() {
  if (forcedEnabled !== null) return forcedEnabled;
  const win = getWindow();
  if (!win) return false;
  return hasQueryFlag(win) || hasStorageFlag(win);
}

function ensureState(win) {
  if (!win.__v4ReplayPerfDiagnostics) {
    win.__v4ReplayPerfDiagnostics = {
      enabledAt: Date.now(),
      events: [],
      counters: {},
      lastEvent: null,
    };
  }
  if (!win.v4ReplayPerfDiagnostics) {
    win.v4ReplayPerfDiagnostics = {
      enable: () => setReplayPerformanceDiagnosticsEnabled(true),
      disable: () => setReplayPerformanceDiagnosticsEnabled(false),
      reset: resetReplayPerformanceDiagnostics,
      snapshot: getReplayPerformanceDiagnosticsSnapshot,
    };
  }
  return win.__v4ReplayPerfDiagnostics;
}

export function setReplayPerformanceDiagnosticsEnabled(enabled) {
  forcedEnabled = Boolean(enabled);
  const win = getWindow();
  if (!win) return forcedEnabled;
  try {
    if (forcedEnabled) win.localStorage?.setItem(STORAGE_KEY, '1');
    else win.localStorage?.removeItem(STORAGE_KEY);
  } catch (err) {
    // localStorage can be unavailable in some browser modes.
  }
  ensureState(win);
  return forcedEnabled;
}

export function resetReplayPerformanceDiagnostics() {
  const win = getWindow();
  if (!win) return;
  win.__v4ReplayPerfDiagnostics = {
    enabledAt: Date.now(),
    events: [],
    counters: {},
    lastEvent: null,
  };
  ensureState(win);
}

export function recordReplayPerformanceEvent(type, payload = {}) {
  if (!isReplayPerformanceDiagnosticsEnabled()) return null;
  const win = getWindow();
  if (!win) return null;
  const state = ensureState(win);
  const event = {
    type,
    at: Math.round(performance.now()),
    ...payload,
  };
  state.events.push(event);
  if (state.events.length > MAX_EVENTS) {
    state.events.splice(0, state.events.length - MAX_EVENTS);
  }
  state.counters[type] = (state.counters[type] || 0) + 1;
  state.lastEvent = event;
  return event;
}

export function getReplayPerformanceDiagnosticsSnapshot() {
  const win = getWindow();
  const state = win?.__v4ReplayPerfDiagnostics;
  if (!state) return { enabled: isReplayPerformanceDiagnosticsEnabled(), events: [], counters: {} };
  return {
    enabled: isReplayPerformanceDiagnosticsEnabled(),
    enabledAt: state.enabledAt,
    counters: { ...state.counters },
    lastEvent: state.lastEvent ? { ...state.lastEvent } : null,
    events: state.events.map((event) => ({ ...event })),
  };
}

const initialWindow = getWindow();
if (initialWindow) {
  ensureState(initialWindow);
}
