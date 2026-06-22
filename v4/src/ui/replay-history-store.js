const STORAGE_KEY = 'v4.replayHistory';
const MAX_HISTORY_ITEMS = 10;

let memoryHistory = [];

function getStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch (e) {
    return null;
  }
}

function normalizeString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function normalizeNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value) {
  return Boolean(value);
}

function normalizeOuterRange(input = null) {
  if (!input) return null;
  const start = normalizeString(input.start);
  const end = normalizeString(input.end);
  const timeframe = normalizeNumber(input.timeframe);
  if (!start || !end || timeframe === null) return null;
  return { start, end, timeframe };
}

function normalizePrimary(input = {}) {
  return {
    instrument: normalizeString(input.instrument, 'NQ').toUpperCase(),
    timeframe: normalizeNumber(input.timeframe, 1),
    start: normalizeString(input.start),
    end: normalizeString(input.end),
    outerRange: normalizeOuterRange(input.outerRange),
  };
}

function normalizeReplay(input = {}) {
  return {
    enabled: normalizeBoolean(input.enabled),
    cursorTimestamp: normalizeNumber(input.cursorTimestamp),
    cursorIndex: normalizeNumber(input.cursorIndex, -1),
    speedIndex: normalizeNumber(input.speedIndex, 2),
  };
}

function normalizeComparison(input = {}) {
  return {
    enabled: normalizeBoolean(input.enabled),
    viewId: normalizeString(input.viewId, 'comparison-window-1'),
    instrument: normalizeString(input.instrument, 'ES').toUpperCase(),
    timeframe: normalizeNumber(input.timeframe, 60),
    syncMode: normalizeString(input.syncMode, 'primary-time'),
    layoutMode: normalizeString(input.layoutMode, 'sliding'),
  };
}

function formatTimestamp(timestamp) {
  const parsed = normalizeNumber(timestamp);
  if (parsed === null) return '';
  const date = new Date(parsed * 1000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

function createLabel(primary, replay) {
  const tfLabel = primary.timeframe === 1440 ? '1D' : `${primary.timeframe}M`;
  const timeLabel = formatTimestamp(replay.cursorTimestamp);
  return [primary.instrument, tfLabel, timeLabel].filter(Boolean).join(' ');
}

function createReplayHistoryId(updatedAt) {
  return `replay_${updatedAt}_${Math.random().toString(36).slice(2, 8)}`;
}

function createReplayHistoryKey(item) {
  return JSON.stringify({
    primary: item.primary,
    replay: {
      cursorTimestamp: item.replay.cursorTimestamp,
    },
    comparison: item.comparison,
  });
}

function isValidHistoryItem(item) {
  return (
    item.primary.start &&
    item.primary.end &&
    item.primary.timeframe !== null &&
    item.replay.enabled &&
    item.replay.cursorTimestamp !== null
  );
}

export function normalizeReplayHistoryItem(input = {}, options = {}) {
  const now = normalizeNumber(options.now, Date.now());
  const primary = normalizePrimary(input.primary);
  const replay = normalizeReplay(input.replay);
  const comparison = normalizeComparison(input.comparison);
  const updatedAt = normalizeNumber(input.updatedAt, now);
  const createdAt = normalizeNumber(input.createdAt, updatedAt);
  const normalized = {
    id: normalizeString(input.id, createReplayHistoryId(updatedAt)),
    label: normalizeString(input.label, createLabel(primary, replay)),
    createdAt,
    updatedAt,
    primary,
    replay,
    comparison,
  };
  normalized.key = createReplayHistoryKey(normalized);
  return normalized;
}

function readRawHistory() {
  const storage = getStorage();
  if (!storage) return memoryHistory;
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeRawHistory(items) {
  const nextItems = Array.isArray(items) ? items : [];
  const storage = getStorage();
  if (!storage) {
    memoryHistory = nextItems;
    return;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
}

export function getReplayHistory(instrument = null) {
  const normalizedInstrument = instrument ? normalizeString(instrument).toUpperCase() : '';
  return readRawHistory()
    .map((item) => normalizeReplayHistoryItem(item, { now: item?.updatedAt }))
    .filter(isValidHistoryItem)
    .filter((item) => !normalizedInstrument || item.primary.instrument === normalizedInstrument)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_HISTORY_ITEMS);
}

export function saveReplayHistoryItem(input = {}, options = {}) {
  const item = normalizeReplayHistoryItem(input, options);
  if (!isValidHistoryItem(item)) return null;

  const existing = getReplayHistory();
  const matched = existing.find((historyItem) => historyItem.key === item.key);
  const nextItem = matched
    ? {
        ...item,
        id: matched.id,
        createdAt: matched.createdAt,
        updatedAt: normalizeNumber(options.now, Date.now()),
      }
    : item;
  nextItem.key = createReplayHistoryKey(nextItem);

  const nextItems = [
    nextItem,
    ...existing.filter((historyItem) => historyItem.id !== nextItem.id && historyItem.key !== nextItem.key),
  ]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_HISTORY_ITEMS);

  writeRawHistory(nextItems);
  return nextItem;
}

export function deleteReplayHistoryItem(id) {
  const normalizedId = normalizeString(id);
  if (!normalizedId) return false;
  const existing = getReplayHistory();
  const nextItems = existing.filter((item) => item.id !== normalizedId);
  if (nextItems.length === existing.length) return false;
  writeRawHistory(nextItems);
  return true;
}

export function clearReplayHistory(instrument = null) {
  const normalizedInstrument = instrument ? normalizeString(instrument).toUpperCase() : '';
  if (!normalizedInstrument) {
    writeRawHistory([]);
    return;
  }
  writeRawHistory(getReplayHistory().filter((item) => item.primary.instrument !== normalizedInstrument));
}

export function getReplayHistoryStorageKey() {
  return STORAGE_KEY;
}

export function getReplayHistoryLimit() {
  return MAX_HISTORY_ITEMS;
}
