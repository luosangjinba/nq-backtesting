import * as bus from '../event-bus.js';
import { createLocalPersistence } from '../storage/local-persistence.js';
import {
  getWorkspaceDocument,
  putWorkspaceDocument,
} from '../storage/server-workspace-client.js';

export const UI_SCALE_OPTIONS = ['100', '110', '125', '140'];
export const CHART_TEXT_SCALE_OPTIONS = ['normal', 'large', 'xl'];
export const INSPECTOR_DENSITY_OPTIONS = ['compact', 'normal', 'comfortable'];

export const DEFAULT_DISPLAY_PREFERENCES = Object.freeze({
  uiScale: '100',
  chartTextScale: 'normal',
  inspectorDensity: 'compact',
});

const STORAGE_KEY = 'v4:display-preferences';
const STORAGE_VERSION = 1;
const WORKSPACE_DOMAIN = 'display-preferences';
const persistence = createLocalPersistence({
  key: STORAGE_KEY,
  fallback: null,
  onError: (error, action) => console.warn(`[display-preferences] ${action} failed`, error),
});

const UI_SCALE_FACTORS = Object.freeze({
  100: 1,
  110: 1.1,
  125: 1.25,
  140: 1.4,
});

const CHART_TEXT_FACTORS = Object.freeze({
  normal: 1,
  large: 1.18,
  xl: 1.34,
});

const DENSITY_SETTINGS = Object.freeze({
  compact: {
    controlHeight: 24,
    panelRowGap: 6,
    inspectorSectionPaddingY: 10,
  },
  normal: {
    controlHeight: 28,
    panelRowGap: 8,
    inspectorSectionPaddingY: 12,
  },
  comfortable: {
    controlHeight: 32,
    panelRowGap: 10,
    inspectorSectionPaddingY: 14,
  },
});

let preferences = { ...DEFAULT_DISPLAY_PREFERENCES };
let serverSyncStarted = false;
let applyingServerPreferences = false;
let localMutationVersion = 0;

function normalizeChoice(value, options, fallback) {
  const text = String(value ?? '').trim().toLowerCase();
  return options.includes(text) ? text : fallback;
}

function px(value) {
  return `${Math.round(value * 100) / 100}px`;
}

export function normalizeDisplayPreferences(input = {}) {
  return {
    uiScale: normalizeChoice(input.uiScale, UI_SCALE_OPTIONS, DEFAULT_DISPLAY_PREFERENCES.uiScale),
    chartTextScale: normalizeChoice(
      input.chartTextScale,
      CHART_TEXT_SCALE_OPTIONS,
      DEFAULT_DISPLAY_PREFERENCES.chartTextScale
    ),
    inspectorDensity: normalizeChoice(
      input.inspectorDensity,
      INSPECTOR_DENSITY_OPTIONS,
      DEFAULT_DISPLAY_PREFERENCES.inspectorDensity
    ),
  };
}

export function getDisplayPreferences() {
  return { ...preferences };
}

export function getDisplayPreferencesStorageKey() {
  return STORAGE_KEY;
}

export function getDisplayPreferencesWorkspaceDomain() {
  return WORKSPACE_DOMAIN;
}

export function getDisplayPreferenceFactors(current = preferences) {
  const normalized = normalizeDisplayPreferences(current);
  return {
    uiScale: UI_SCALE_FACTORS[normalized.uiScale] || 1,
    chartTextScale: CHART_TEXT_FACTORS[normalized.chartTextScale] || 1,
    density: DENSITY_SETTINGS[normalized.inspectorDensity] || DENSITY_SETTINGS.compact,
  };
}

export function getChartLabelFont(size = 11, family = 'sans-serif', style = '') {
  const { uiScale, chartTextScale } = getDisplayPreferenceFactors();
  const prefix = style ? `${style} ` : '';
  return `${prefix}${px(size * uiScale * chartTextScale)} ${family}`;
}

export function applyDisplayPreferences(nextPreferences = preferences) {
  preferences = normalizeDisplayPreferences(nextPreferences);
  const { uiScale, chartTextScale, density } = getDisplayPreferenceFactors(preferences);
  const root = globalThis.document?.documentElement;
  if (!root) return preferences;

  root.dataset.uiScale = preferences.uiScale;
  root.dataset.chartTextScale = preferences.chartTextScale;
  root.dataset.inspectorDensity = preferences.inspectorDensity;
  root.style.setProperty('--ui-font-size', px(13 * uiScale));
  root.style.setProperty('--compact-font-size', px(11 * uiScale));
  root.style.setProperty('--toolbar-font-size', px(12 * uiScale));
  root.style.setProperty('--inspector-font-size', px(12 * uiScale));
  root.style.setProperty('--chart-label-font-size', px(11 * uiScale * chartTextScale));
  root.style.setProperty('--chart-legend-font-size', px(12 * uiScale * chartTextScale));
  root.style.setProperty('--inspector-width', px(Math.min(460, 320 * uiScale)));
  root.style.setProperty('--control-height', px(density.controlHeight * uiScale));
  root.style.setProperty('--panel-row-gap', px(density.panelRowGap * uiScale));
  root.style.setProperty('--inspector-section-padding-y', px(density.inspectorSectionPaddingY * uiScale));
  return preferences;
}

export function setDisplayPreferences(nextPreferences = {}) {
  const normalized = applyDisplayPreferences({ ...preferences, ...nextPreferences });
  if (!applyingServerPreferences) localMutationVersion += 1;
  const payload = {
    version: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    preferences: normalized,
  };
  persistence.write(payload);
  if (!applyingServerPreferences) {
    saveDisplayPreferencesToServer(payload);
  }
  bus.emit('display-preferences:changed', { preferences: getDisplayPreferences() });
  return normalized;
}

export function resetDisplayPreferences() {
  persistence.remove();
  localMutationVersion += 1;
  const normalized = applyDisplayPreferences(DEFAULT_DISPLAY_PREFERENCES);
  saveDisplayPreferencesToServer({
    version: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    preferences: normalized,
  });
  bus.emit('display-preferences:changed', { preferences: getDisplayPreferences() });
  return normalized;
}

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

function getStoredDisplayPreferencePayload() {
  const saved = persistence.read();
  if (!saved?.preferences) return null;
  return {
    version: Number(saved.version) || STORAGE_VERSION,
    savedAt: saved.savedAt || null,
    preferences: normalizeDisplayPreferences(saved.preferences),
  };
}

function writeLocalDisplayPreferencePayload(payload) {
  persistence.write({
    version: Number(payload?.version) || STORAGE_VERSION,
    savedAt: payload?.savedAt || new Date().toISOString(),
    preferences: normalizeDisplayPreferences(payload?.preferences || {}),
  });
}

export async function saveDisplayPreferencesToServer(payload = null, options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const normalizedPayload = payload || {
    version: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    preferences: getDisplayPreferences(),
  };
  try {
    return await putWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      version: STORAGE_VERSION,
      payload: normalizedPayload,
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    console.warn('[display-preferences] server save failed', error);
    return { ok: false, error };
  }
}

export async function syncDisplayPreferencesFromServer(options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const syncToken = localMutationVersion;
  try {
    const document = await getWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      fetchImpl: options.fetchImpl,
    });
    if (document?.found && document.payload?.preferences) {
      if (localMutationVersion !== syncToken) return { ok: false, skipped: true, stale: true };
      applyingServerPreferences = true;
      try {
        const serverPayload = {
          version: Number(document.payload.version) || STORAGE_VERSION,
          savedAt: document.payload.savedAt || document.savedAt || new Date().toISOString(),
          preferences: normalizeDisplayPreferences(document.payload.preferences),
        };
        applyDisplayPreferences(serverPayload.preferences);
        writeLocalDisplayPreferencePayload(serverPayload);
        bus.emit('display-preferences:changed', {
          preferences: getDisplayPreferences(),
          source: 'server',
        });
      } finally {
        applyingServerPreferences = false;
      }
      return { ok: true, source: 'server', document };
    }

    const localPayload = getStoredDisplayPreferencePayload();
    if (localPayload?.preferences) {
      const saved = await saveDisplayPreferencesToServer(localPayload, options);
      return { ok: Boolean(saved?.ok), source: 'local-migration', document: saved };
    }
    return { ok: true, source: 'empty' };
  } catch (error) {
    console.warn('[display-preferences] server sync failed', error);
    return { ok: false, error };
  }
}

export function initDisplayPreferences({ syncServer = true } = {}) {
  const saved = persistence.read();
  if (saved?.preferences) {
    persistence.runRestoring(() => {
      applyDisplayPreferences(saved.preferences);
    });
  } else {
    applyDisplayPreferences(preferences);
  }
  if (syncServer && !serverSyncStarted && canUseServerWorkspace()) {
    serverSyncStarted = true;
    syncDisplayPreferencesFromServer();
  }
}
