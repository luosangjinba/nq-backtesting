import { LAYOUT_SYNC_KEYS } from './layout-model.js';

export const CHART_ONLY_SYNC_KEYS = Object.freeze(['crosshair', 'time', 'dateRange']);

function normalizeSyncKey(key = '') {
  const normalized = String(key || '').trim();
  if (!LAYOUT_SYNC_KEYS.includes(normalized)) {
    throw new Error(`Unsupported layout sync effect key: ${key}`);
  }
  return normalized;
}

export function canApplyChartOnlySyncEffect(key = '', snapshot = {}) {
  const normalized = normalizeSyncKey(key);
  return CHART_ONLY_SYNC_KEYS.includes(normalized) && Boolean(snapshot.sync?.[normalized]);
}

export function getEnabledChartOnlySyncKeys(snapshot = {}) {
  return CHART_ONLY_SYNC_KEYS.filter((key) => canApplyChartOnlySyncEffect(key, snapshot));
}

export function createLayoutSyncEffectRecord(key = '', payload = {}, snapshot = {}) {
  const normalized = normalizeSyncKey(key);
  return Object.freeze({
    enabled: canApplyChartOnlySyncEffect(normalized, snapshot),
    key: normalized,
    payload: Object.freeze({ ...payload }),
    requiresBarDataReload: !CHART_ONLY_SYNC_KEYS.includes(normalized),
  });
}

