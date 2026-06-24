import * as bus from '../event-bus.js';
import {
  ORDER_ENTRY_PATTERN_DEFINITIONS,
  ORDER_ENTRY_SESSION_DEFINITIONS,
} from '../order/order-review-types.js';
import { createLocalPersistence } from '../storage/local-persistence.js';
import {
  getWorkspaceDocument,
  putWorkspaceDocument,
} from '../storage/server-workspace-client.js';

export const ENTRY_CONTEXT_CATALOG_GROUPS = Object.freeze(['patterns', 'sessions', 'lessons']);
export const ENTRY_CONTEXT_CATALOG_CHANGED = 'entry-context-catalog:changed';
export const LESSON_ROLE_SCOPES = Object.freeze([
  { value: 'entry', label: 'Open' },
  { value: 'manualExit', label: 'Manual Exits' },
  { value: 'targetExit', label: 'Target Exits' },
  { value: 'stopLoss', label: 'Stop Loss' },
]);

const STORAGE_KEY = 'v4:entry-context-catalog';
const STORAGE_VERSION = 1;
const WORKSPACE_DOMAIN = 'entry-context-catalog';

const persistence = createLocalPersistence({
  key: STORAGE_KEY,
  fallback: null,
  onError: (error, action) => console.warn(`[entry-context-catalog] ${action} failed`, error),
});

function toDefaultItems(definitions = []) {
  return definitions.map((definition, index) => ({
    id: String(definition.value || '').trim(),
    label: String(definition.label || definition.value || '').trim(),
    active: definition.active !== false,
    sort: (index + 1) * 10,
  }));
}

export const DEFAULT_ENTRY_CONTEXT_CATALOG = Object.freeze({
  patterns: Object.freeze(toDefaultItems(ORDER_ENTRY_PATTERN_DEFINITIONS)),
  sessions: Object.freeze(toDefaultItems(ORDER_ENTRY_SESSION_DEFINITIONS)),
  lessons: Object.freeze([]),
});

let catalog = normalizeEntryContextCatalog(DEFAULT_ENTRY_CONTEXT_CATALOG);
let localMutationVersion = 0;

function cloneItem(item) {
  return { ...item };
}

function cloneCatalog(input = catalog) {
  return Object.fromEntries(
    ENTRY_CONTEXT_CATALOG_GROUPS.map((group) => [group, input[group].map(cloneItem)])
  );
}

function assertGroup(group) {
  if (!ENTRY_CONTEXT_CATALOG_GROUPS.includes(group)) {
    throw new Error(`Unknown entry context catalog group: ${group}`);
  }
}

function slugify(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `item-${Date.now()}`;
}

function uniqueId(group, desiredId) {
  const used = new Set(catalog[group].map((item) => item.id));
  const base = slugify(desiredId);
  if (!used.has(base)) return base;
  let index = 2;
  let candidate = `${base}-${index}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}`;
  }
  return candidate;
}

function normalizeBoolean(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  return value !== false;
}

function normalizeSort(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeIdList(values = []) {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function inferLessonRoles(input = {}) {
  const key = slugify(input.id ?? input.value ?? input.label ?? '');
  if (key === 'tight-stop-loss') return ['stopLoss'];
  if (key === 'early-cut') return ['manualExit'];
  if (key === 'late-entry-bad-stop') return ['entry', 'stopLoss'];
  if (key === 'revenge-trade' || key === 'ravenge-trade') return ['entry'];
  return null;
}

function normalizeCatalogItem(input = {}, index = 0, group = '') {
  const rawId = input.id ?? input.value ?? input.label ?? '';
  const id = slugify(rawId);
  const item = {
    id,
    label: String(input.label ?? input.name ?? rawId ?? id).trim() || id,
    active: normalizeBoolean(input.active, true),
    sort: normalizeSort(input.sort, (index + 1) * 10),
  };
  if (group === 'lessons') {
    const hasLessonRoles = Object.prototype.hasOwnProperty.call(input, 'lessonRoles');
    const lessonRoles = hasLessonRoles ? normalizeIdList(input.lessonRoles) : inferLessonRoles(input);
    if (lessonRoles) item.lessonRoles = lessonRoles;
  }
  return item;
}

function normalizeCatalogGroup(items = [], group = '') {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item, index) => normalizeCatalogItem(item, index, group))
    .filter((item) => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort(compareCatalogItems);
}

export function normalizeEntryContextCatalog(input = {}) {
  return Object.fromEntries(
    ENTRY_CONTEXT_CATALOG_GROUPS.map((group) => [
      group,
      normalizeCatalogGroup(input[group] ?? DEFAULT_ENTRY_CONTEXT_CATALOG[group], group),
    ])
  );
}

function compareCatalogItems(left, right) {
  const sortDiff = Number(left.sort || 0) - Number(right.sort || 0);
  if (sortDiff !== 0) return sortDiff;
  return String(left.label || left.id).localeCompare(String(right.label || right.id));
}

function saveCatalog() {
  if (!persistence.isRestoring()) localMutationVersion += 1;
  const payload = {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    catalog,
  };
  const saved = persistence.write(payload);
  saveEntryContextCatalogToServer(payload);
  return saved;
}

function emitChanged(reason, detail = {}) {
  bus.emit(ENTRY_CONTEXT_CATALOG_CHANGED, {
    reason,
    catalog: getEntryContextCatalog(),
    ...detail,
  });
}

function mutateCatalog(reason, mutator) {
  const result = mutator();
  catalog = normalizeEntryContextCatalog(catalog);
  saveCatalog();
  emitChanged(reason, result && typeof result === 'object' ? result : {});
  return result;
}

export function getEntryContextCatalogStorageKey() {
  return STORAGE_KEY;
}

export function getEntryContextCatalogWorkspaceDomain() {
  return WORKSPACE_DOMAIN;
}

export function getEntryContextCatalog() {
  return cloneCatalog();
}

export function getCatalogItems(group, options = {}) {
  assertGroup(group);
  const includeInactive = options.includeInactive === true;
  return catalog[group]
    .filter((item) => includeInactive || item.active !== false)
    .map(cloneItem);
}

export function getActiveCatalogItems(group) {
  return getCatalogItems(group);
}

export function resolveCatalogLabel(group, id, fallback = '') {
  assertGroup(group);
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return fallback;
  const item = catalog[group].find((candidate) => candidate.id === normalizedId);
  return item?.label || fallback || normalizedId;
}

export function addCatalogItem(group, label, options = {}) {
  assertGroup(group);
  const text = String(label || '').trim();
  if (!text) return null;
  return mutateCatalog('add', () => {
    const maxSort = catalog[group].reduce((max, item) => Math.max(max, Number(item.sort) || 0), 0);
    const item = {
      id: uniqueId(group, options.id || text),
      label: text,
      active: options.active !== false,
      sort: normalizeSort(options.sort, maxSort + 10),
    };
    if (group === 'lessons') {
      const roles = Object.prototype.hasOwnProperty.call(options, 'lessonRoles')
        ? normalizeIdList(options.lessonRoles)
        : inferLessonRoles(item);
      if (roles) item.lessonRoles = roles;
    }
    catalog[group] = [...catalog[group], item];
    return { group, item: cloneItem(item) };
  })?.item || null;
}

export function renameCatalogItem(group, id, label) {
  assertGroup(group);
  const normalizedId = String(id || '').trim();
  const text = String(label || '').trim();
  if (!normalizedId || !text) return null;
  return mutateCatalog('rename', () => {
    let updated = null;
    catalog[group] = catalog[group].map((item) => {
      if (item.id !== normalizedId) return item;
      updated = { ...item, label: text };
      return updated;
    });
    return updated ? { group, item: cloneItem(updated) } : null;
  })?.item || null;
}

export function deactivateCatalogItem(group, id) {
  assertGroup(group);
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return null;
  return mutateCatalog('deactivate', () => {
    let updated = null;
    catalog[group] = catalog[group].map((item) => {
      if (item.id !== normalizedId) return item;
      updated = { ...item, active: false };
      return updated;
    });
    return updated ? { group, item: cloneItem(updated) } : null;
  })?.item || null;
}

export function activateCatalogItem(group, id) {
  assertGroup(group);
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return null;
  return mutateCatalog('activate', () => {
    let updated = null;
    catalog[group] = catalog[group].map((item) => {
      if (item.id !== normalizedId) return item;
      updated = { ...item, active: true };
      return updated;
    });
    return updated ? { group, item: cloneItem(updated) } : null;
  })?.item || null;
}

export function setCatalogItemSort(group, id, sort) {
  assertGroup(group);
  const normalizedId = String(id || '').trim();
  const parsedSort = Number(sort);
  if (!normalizedId || !Number.isFinite(parsedSort)) return null;
  return mutateCatalog('sort', () => {
    let updated = null;
    catalog[group] = catalog[group].map((item) => {
      if (item.id !== normalizedId) return item;
      updated = { ...item, sort: parsedSort };
      return updated;
    });
    return updated ? { group, item: cloneItem(updated) } : null;
  })?.item || null;
}

export function setCatalogItemLessonRoles(group, id, lessonRoles = []) {
  assertGroup(group);
  if (group !== 'lessons') return null;
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return null;
  return mutateCatalog('lesson-roles', () => {
    let updated = null;
    catalog[group] = catalog[group].map((item) => {
      if (item.id !== normalizedId) return item;
      updated = { ...item, lessonRoles: normalizeIdList(lessonRoles) };
      return updated;
    });
    return updated ? { group, item: cloneItem(updated) } : null;
  })?.item || null;
}

export function loadEntryContextCatalog(input = DEFAULT_ENTRY_CONTEXT_CATALOG) {
  catalog = normalizeEntryContextCatalog(input);
  saveCatalog();
  emitChanged('load');
  return getEntryContextCatalog();
}

export function resetEntryContextCatalog() {
  persistence.remove();
  catalog = normalizeEntryContextCatalog(DEFAULT_ENTRY_CONTEXT_CATALOG);
  emitChanged('reset');
  return getEntryContextCatalog();
}

export function initEntryContextCatalogStore() {
  const saved = persistence.read();
  if (saved?.catalog) {
    persistence.runRestoring(() => {
      catalog = normalizeEntryContextCatalog(saved.catalog);
    });
    syncEntryContextCatalogFromServer();
    return getEntryContextCatalog();
  }
  catalog = normalizeEntryContextCatalog(DEFAULT_ENTRY_CONTEXT_CATALOG);
  syncEntryContextCatalogFromServer();
  return getEntryContextCatalog();
}

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

export async function saveEntryContextCatalogToServer(payload = null, options = {}) {
  if (persistence.isRestoring()) return { ok: false, skipped: true };
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const nextPayload = payload || {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    catalog: getEntryContextCatalog(),
  };
  try {
    return await putWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      version: STORAGE_VERSION,
      payload: {
        ...nextPayload,
        catalog: normalizeEntryContextCatalog(nextPayload.catalog || {}),
      },
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    console.warn('[entry-context-catalog] server save failed', error);
    return { ok: false, error };
  }
}

export async function syncEntryContextCatalogFromServer(options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const syncToken = localMutationVersion;
  try {
    const document = await getWorkspaceDocument({ domain: WORKSPACE_DOMAIN, fetchImpl: options.fetchImpl });
    if (document?.found && document.payload?.catalog) {
      if (localMutationVersion !== syncToken) return { ok: false, skipped: true, stale: true };
      const serverPayload = {
        version: Number(document.payload.version) || STORAGE_VERSION,
        savedAt: document.payload.savedAt || document.savedAt || Date.now(),
        catalog: normalizeEntryContextCatalog(document.payload.catalog),
      };
      catalog = serverPayload.catalog;
      persistence.write(serverPayload);
      emitChanged('server-sync');
      return { ok: true, source: 'server', document };
    }
    const localPayload = persistence.read();
    if (localPayload?.catalog) {
      const saved = await saveEntryContextCatalogToServer(localPayload, options);
      return { ok: Boolean(saved?.ok), source: 'local-migration', document: saved };
    }
    return { ok: true, source: 'empty' };
  } catch (error) {
    console.warn('[entry-context-catalog] server sync failed', error);
    return { ok: false, error };
  }
}
