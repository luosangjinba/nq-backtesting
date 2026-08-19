import {
  assertCampaignDocumentCeilings,
  createCampaignIndex,
  failValidation,
  readAnalysisRun,
  readCampaignDocument,
  readCampaignIndex,
  readSourceVerification,
  readStudyCase,
  readStudyCohort,
  strictPortableValue,
  ValidationCampaignError,
} from '../validation-study-domain/public.js';
import { validationCampaignDocumentStorageKey } from '../validation-campaign-persistence/public.js';
import { validateCampaignDocumentHistory } from './runtime-history-validation.js';
import { refreshAllCampaignSourceResolution } from './source-availability.js';

function requireMethod(value, method, label) {
  if (typeof value?.[method] !== 'function') throw new TypeError(`${label} requires ${method}().`);
}
function providerKey(value) {
  return `${value.providerId}@${value.providerVersion}:${value.evidenceRole}`;
}

function providers(values) {
  if (!Array.isArray(values)) throw new TypeError('Evidence providers must be an array.');
  const normalized = values.map((provider) => {
    for (const method of ['getAvailability', 'prepareCitation', 'verifyCitation']) {
      requireMethod(provider, method, 'Validation evidence provider');
    }
    if (typeof provider.providerId !== 'string' || typeof provider.providerVersion !== 'string'
      || !['context-sma', 'execution-fvg'].includes(provider.evidenceRole)) {
      throw new TypeError('Validation evidence provider identity is invalid.');
    }
    return provider;
  }).sort((left, right) => providerKey(left).localeCompare(providerKey(right)));
  if (new Set(normalized.map(providerKey)).size !== normalized.length) {
    throw new TypeError('Validation evidence provider tuples are duplicated.');
  }
  return Object.freeze(normalized);
}

export function createValidationCampaignRuntimeState(options) {
  requireMethod(options?.persistence, 'restore', 'Campaign persistence');
  for (const method of ['prepare', 'apply', 'finalize', 'rollback']) {
    requireMethod(options.persistence, method, 'Campaign persistence');
  }
  requireMethod(options?.outcomeAdapter, 'observeOutcome', 'Outcome adapter');
  requireMethod(options?.auditExporter, 'prepare', 'Audit exporter');
  if (typeof options?.idFactory !== 'function' || typeof options?.nowEpochMs !== 'function') {
    throw new TypeError('Validation Campaign runtime identity/clock ports are invalid.');
  }
  return {
    auditExporter: options.auditExporter,
    busy: false,
    commandSequence: 0,
    crypto: options.crypto ?? globalThis.crypto,
    diagnostic: null,
    disposed: false,
    documents: new Map(),
    idFactory: options.idFactory,
    index: null,
    indexRaw: null,
    listeners: new Set(),
    outcomeAdapter: options.outcomeAdapter,
    persistence: options.persistence,
    poisoned: false,
    previews: new Map(),
    providers: providers(options.evidenceProviders ?? []),
    raws: new Map(),
    sourceResolution: new Map(),
    status: 'initializing',
    nowEpochMs: options.nowEpochMs,
  };
}

async function validateDocument(state, value) {
  const document = await readCampaignDocument(value, state.crypto, {
    readAnalysisRun,
    readCase: readStudyCase,
    readCohort: readStudyCohort,
    readVerification: readSourceVerification,
  });
  assertCampaignDocumentCeilings(document);
  await validateCampaignDocumentHistory(document, state.crypto);
  return document;
}

export async function hydrateValidationCampaignRuntime(state) {
  const restored = state.persistence.restore();
  if (restored.status === 'corrupt') {
    state.poisoned = true;
    state.status = 'poisoned';
    state.diagnostic = restored.diagnostic;
    return publishValidationCampaignState(state);
  }
  if (restored.status === 'empty') {
    state.status = 'ready';
    return publishValidationCampaignState(state);
  }
  try {
    state.index = await readCampaignIndex(restored.index, state.crypto);
    state.indexRaw = restored.indexRaw;
    for (const entry of restored.documents) {
      const document = await validateDocument(state, entry.payload);
      if (state.documents.has(document.campaign.campaignId)) {
        throw new TypeError('Campaign document identity is duplicated.');
      }
      state.documents.set(document.campaign.campaignId, document);
      state.raws.set(entry.key, entry.raw);
    }
    if (state.documents.size !== state.index.campaignIds.length
      || state.index.campaignIds.some((id) => !state.documents.has(id))) {
      throw new TypeError('Campaign index and documents do not close exactly.');
    }
    await refreshAllCampaignSourceResolution(state);
    state.status = 'ready';
  } catch (error) {
    state.documents.clear();
    state.raws.clear();
    state.sourceResolution.clear();
    state.poisoned = true;
    state.status = 'poisoned';
    state.diagnostic = Object.freeze({
      code: error?.code ?? 'VALIDATION_CAMPAIGN_PERSISTENCE_CORRUPT',
      message: error?.message?.slice(0, 320) ?? 'Campaign hydration failed.',
    });
  }
  return publishValidationCampaignState(state);
}

function summaries(state) {
  return Object.freeze([...state.documents.values()].map((document) => Object.freeze({
    campaignId: document.campaign.campaignId,
    caseCount: new Set(document.caseRevisions.map(({ caseId }) => caseId)).size,
    direction: document.campaign.direction,
    documentRevision: document.documentRevision,
    instrumentId: document.campaign.instrumentId,
    sourceResolutionState: state.sourceResolution.get(document.campaign.campaignId)
      ?? (state.providers.length === 2 ? 'available' : 'source-unavailable'),
    status: document.campaign.status,
    title: document.campaign.title,
    updatedAtEpochMs: document.updatedAtEpochMs,
  })).sort((left, right) => left.title.localeCompare(right.title)
    || left.campaignId.localeCompare(right.campaignId)));
}

export function snapshotValidationCampaignState(state) {
  return Object.freeze({
    busy: state.busy,
    campaignCount: state.documents.size,
    campaigns: summaries(state),
    diagnostic: state.diagnostic,
    indexRevision: state.index?.revision ?? 0,
    providerAvailability: Object.freeze(state.providers.map((provider) => Object.freeze({
      evidenceRole: provider.evidenceRole,
      providerId: provider.providerId,
      providerVersion: provider.providerVersion,
    }))),
    status: state.disposed ? 'disposed' : state.status,
  });
}

export function publishValidationCampaignState(state) {
  const snapshot = snapshotValidationCampaignState(state);
  for (const listener of state.listeners) {
    try { listener(snapshot); } catch { /* Subscriber failure cannot change command success. */ }
  }
  return snapshot;
}

export function requireRuntimeReady(state, operation) {
  if (state.disposed) {
    failValidation('VALIDATION_CAMPAIGN_DISPOSED', 'Validation Campaign runtime is disposed.', { operation });
  }
  if (state.poisoned) {
    failValidation('VALIDATION_CAMPAIGN_POISONED', 'Validation Campaign storage requires recovery.', { operation });
  }
  if (state.busy) {
    failValidation('VALIDATION_CAMPAIGN_BUSY', 'Another Validation Campaign command is active.', { operation });
  }
}

export function campaignDocument(state, campaignId) {
  const document = state.documents.get(campaignId);
  if (!document) throw new TypeError(`Validation Campaign ${campaignId} does not exist.`);
  return document;
}

export function expectedDocument(document, expectedRevision, operation) {
  if (document.documentRevision !== expectedRevision) {
    failValidation(
      'VALIDATION_CAMPAIGN_REVISION_STALE',
      'Validation Campaign document changed; reload and retry.',
      { campaignId: document.campaign.campaignId, operation },
    );
  }
}

export function requireCommandActive(signal, operation) {
  if (signal?.aborted) {
    failValidation('VALIDATION_CAMPAIGN_PREPARATION_STALE', 'Campaign command was cancelled.', {
      operation,
    });
  }
}

function poisonRollback(state, error) {
  if (error?.code === 'VALIDATION_CAMPAIGN_ROLLBACK_UNPROVEN') {
    state.poisoned = true;
    state.status = 'poisoned';
    state.diagnostic = Object.freeze({ code: error.code, message: error.message });
    publishValidationCampaignState(state);
  }
}

export async function commitCampaignDocument(state, {
  beforeApply = null,
  document,
  index = null,
  operation = 'commit-campaign-document',
  previous,
  signal,
}) {
  assertCampaignDocumentCeilings(document);
  const campaignId = document.campaign.campaignId;
  const key = validationCampaignDocumentStorageKey(campaignId);
  const writes = [{
    expectedRaw: previous === null ? null : state.raws.get(key) ?? null,
    key,
    payload: document,
  }];
  if (index !== null) writes.push({
    expectedRaw: state.indexRaw,
    key: 'v7.validation-campaign:index',
    payload: index,
  });
  const prepared = state.persistence.prepare({ writes });
  try {
    requireCommandActive(signal, operation);
    if (beforeApply !== null) await beforeApply();
    requireCommandActive(signal, operation);
    const receipt = state.persistence.apply(prepared);
    state.persistence.finalize(prepared);
    for (const entry of receipt.raws) {
      if (entry.key === 'v7.validation-campaign:index') state.indexRaw = entry.raw;
      else state.raws.set(entry.key, entry.raw);
    }
  } catch (error) {
    try { state.persistence.rollback(prepared); } catch (rollbackError) {
      poisonRollback(state, rollbackError);
      throw rollbackError;
    }
    poisonRollback(state, error);
    throw error;
  }
  state.documents.set(campaignId, document);
  if (index !== null) state.index = index;
  state.status = 'ready';
  state.diagnostic = null;
  return publishValidationCampaignState(state);
}

export async function nextIndex(state, campaignId, nowEpochMs) {
  const campaignIds = [...(state.index?.campaignIds ?? []), campaignId];
  return createCampaignIndex({
    campaignIds,
    crypto: state.crypto,
    nowEpochMs,
    revision: (state.index?.revision ?? 0) + 1,
  });
}

export function providerFor(state, { evidenceRole, providerId, providerVersion }) {
  return state.providers.find((provider) => provider.evidenceRole === evidenceRole
    && provider.providerId === providerId && provider.providerVersion === providerVersion) ?? null;
}

export function normalizeRuntimeError(error, operation) {
  if (error instanceof ValidationCampaignError) return error;
  return new ValidationCampaignError(
    error?.code?.startsWith?.('VALIDATION_CAMPAIGN_')
      ? error.code : 'VALIDATION_CAMPAIGN_PERSISTENCE_CORRUPT',
    error?.message ?? 'Validation Campaign command failed.',
    { operation },
  );
}
