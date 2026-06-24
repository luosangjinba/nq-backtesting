import * as bus from '../event-bus.js';
import { createLocalPersistence } from '../storage/local-persistence.js';
import {
  getWorkspaceDocument,
  putWorkspaceDocument,
} from '../storage/server-workspace-client.js';

const STORAGE_KEY = 'v4:import-batches';
const STORAGE_VERSION = 1;
const WORKSPACE_DOMAIN = 'import-batches';
const MAX_BATCHES = 100;

const persistence = createLocalPersistence({
  key: STORAGE_KEY,
  fallback: null,
  onError: (error, action) => console.warn(`[import-batch-audit] ${action} failed`, error),
});

let batches = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

function makeImportBatchId(nowMs = Date.now()) {
  return `import_batch_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCounts(input = {}) {
  return Object.fromEntries(
    Object.entries(input || {}).map(([key, value]) => [key, normalizeCount(value)])
  );
}

export function normalizeImportBatch(input = {}) {
  const nowMs = Number.isFinite(Number(input.createdAt)) ? Number(input.createdAt) : Date.now();
  return {
    id: normalizeString(input.id, makeImportBatchId(nowMs)),
    sourceType: normalizeString(input.sourceType, 'unknown'),
    sourceFileName: normalizeString(input.sourceFileName),
    instrument: normalizeString(input.instrument).toUpperCase(),
    userId: normalizeString(input.userId, 'default'),
    workspaceId: normalizeString(input.workspaceId, 'default'),
    importedAt: normalizeString(input.importedAt, new Date(nowMs).toISOString()),
    createdAt: nowMs,
    counts: normalizeCounts(input.counts),
    skipped: normalizeCounts(input.skipped),
    metadata: input.metadata && typeof input.metadata === 'object' ? clone(input.metadata) : {},
  };
}

function normalizeImportBatches(input = []) {
  const seen = new Set();
  return (Array.isArray(input) ? input : [])
    .map(normalizeImportBatch)
    .filter((batch) => {
      if (!batch.id || seen.has(batch.id)) return false;
      seen.add(batch.id);
      return true;
    })
    .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))
    .slice(0, MAX_BATCHES);
}

function buildPayload() {
  return {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    batches: getImportBatches(),
  };
}

function saveBatches() {
  if (persistence.isRestoring()) return false;
  const saved = persistence.write(buildPayload());
  saveImportBatchesToServer();
  return saved;
}

function canUseServerWorkspace() {
  return Boolean(globalThis.window?.location && typeof globalThis.fetch === 'function');
}

export function getImportBatchAuditWorkspaceDomain() {
  return WORKSPACE_DOMAIN;
}

export function getImportBatches() {
  return batches.map(clone);
}

export function loadImportBatches(nextBatches = []) {
  batches = normalizeImportBatches(nextBatches);
  saveBatches();
  bus.emit('import-batches:changed', { batches: getImportBatches() });
  return getImportBatches();
}

export function recordImportBatch(input = {}) {
  const batch = normalizeImportBatch(input);
  batches = normalizeImportBatches([batch, ...batches]);
  saveBatches();
  bus.emit('import-batches:changed', { batches: getImportBatches(), batch });
  return clone(batch);
}

export async function saveImportBatchesToServer(payload = null, options = {}) {
  if (persistence.isRestoring()) return { ok: false, skipped: true };
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  const nextPayload = payload || buildPayload();
  try {
    return await putWorkspaceDocument({
      domain: WORKSPACE_DOMAIN,
      version: STORAGE_VERSION,
      payload: {
        ...nextPayload,
        batches: normalizeImportBatches(nextPayload.batches),
      },
      fetchImpl: options.fetchImpl,
    });
  } catch (error) {
    console.warn('[import-batch-audit] server save failed', error);
    return { ok: false, error };
  }
}

export async function syncImportBatchesFromServer(options = {}) {
  if (!canUseServerWorkspace() && !options.fetchImpl) return { ok: false, skipped: true };
  try {
    const document = await getWorkspaceDocument({ domain: WORKSPACE_DOMAIN, fetchImpl: options.fetchImpl });
    if (document?.found && Array.isArray(document.payload?.batches)) {
      const payload = {
        version: Number(document.payload.version) || STORAGE_VERSION,
        savedAt: document.payload.savedAt || document.savedAt || Date.now(),
        batches: normalizeImportBatches(document.payload.batches),
      };
      persistence.runRestoring(() => {
        batches = payload.batches;
        persistence.write(payload);
      });
      bus.emit('import-batches:changed', { batches: getImportBatches() });
      return { ok: true, source: 'server', document };
    }
    const localPayload = persistence.read();
    if (Array.isArray(localPayload?.batches) && localPayload.batches.length) {
      const saved = await saveImportBatchesToServer(localPayload, options);
      return { ok: Boolean(saved?.ok), source: 'local-migration', document: saved };
    }
    return { ok: true, source: 'empty' };
  } catch (error) {
    console.warn('[import-batch-audit] server sync failed', error);
    return { ok: false, error };
  }
}

export function initImportBatchAudit() {
  const saved = persistence.read();
  batches = normalizeImportBatches(saved?.batches || []);
  syncImportBatchesFromServer();
  return getImportBatches();
}
