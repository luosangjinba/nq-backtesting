import { getWorkspaceDocument, putWorkspaceDocument } from '../../storage/server-workspace-client.js';
import { WORKSPACE_DOMAINS } from '../../storage/workspace-domain-registry.js';
import { formatTimeInput } from '../../utils.js';

const RANGE_HISTORY_STORAGE_KEY = 'v4.dateRangeHistory';
const RANGE_HISTORY_WORKSPACE_DOMAIN_CONFIG = WORKSPACE_DOMAINS.DATE_RANGE_HISTORY;
const RANGE_HISTORY_STORAGE_VERSION = RANGE_HISTORY_WORKSPACE_DOMAIN_CONFIG.version;
const RANGE_HISTORY_WORKSPACE_DOMAIN = RANGE_HISTORY_WORKSPACE_DOMAIN_CONFIG.name;
const RANGE_HISTORY_LIMIT = 8;

let rangeHistoryMutationVersion = 0;
let applyingServerRangeHistory = false;
let onHistoryChanged = () => {};

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

function hasDateTimeInput(value) {
  return /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.test(String(value || ''));
}

export function setRangeHistoryChangeHandler(handler) {
  onHistoryChanged = typeof handler === 'function' ? handler : () => {};
}

export function normalizeRangeHistoryItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => hasDateTimeInput(item?.start) && hasDateTimeInput(item?.end))
    .map((item) => ({
      start: formatTimeInput(String(item.start || '')),
      end: formatTimeInput(String(item.end || '')),
      timeframe: Number(item.timeframe) || 0,
      loadedAt: Number(item.loadedAt) || 0,
    }))
    .filter((item) => item.start && item.end)
    .slice(0, RANGE_HISTORY_LIMIT);
}

export function getRangeHistoryPayload(items = getRangeHistory()) {
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

export function saveRangeHistory(items, options = {}) {
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
  onHistoryChanged();
}

export function recordRangeHistory(start, end, timeframe) {
  const normalizedStart = formatTimeInput(String(start || '').trim());
  const normalizedEnd = formatTimeInput(String(end || '').trim());
  if (!normalizedStart || !normalizedEnd) return;

  const normalizedTimeframe = Number(timeframe) || 0;
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

export function removeRangeHistoryItem(index) {
  const history = getRangeHistory();
  if (index < 0 || index >= history.length) return;
  history.splice(index, 1);
  saveRangeHistory(history);
}

export function clearRangeHistory() {
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
