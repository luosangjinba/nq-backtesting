import {
  assertEvidenceCampaignClosure,
  failValidation,
  readDefinitionRef,
  readEvidenceCandidate,
  strictPortableValue,
  VALIDATION_LIMITS,
} from '../validation-study-domain/public.js';
import {
  campaignDocument,
  expectedDocument,
  providerFor,
} from './runtime-state.js';

const ROLE_CONFIG = Object.freeze([
  Object.freeze({
    evidenceRole: 'context-sma',
    paneField: 'contextPaneId',
    predicateField: 'smaPredicate',
    sourceField: 'smaInstanceId',
  }),
  Object.freeze({
    evidenceRole: 'execution-fvg',
    paneField: 'executionPaneId',
    predicateField: 'fvgPredicate',
    sourceField: 'fvgArtifactId',
  }),
]);

function requestShape(value) {
  const fields = [
    'campaignId', 'contextPaneId', 'executionPaneId', 'expectedDocumentRevision',
    'fvgArtifactId', 'outcomeDefinitionRef', 'setupDefinitionRef', 'smaInstanceId',
  ];
  if (!value || typeof value.campaignId !== 'string'
    || !Number.isSafeInteger(value.expectedDocumentRevision)
    || Object.keys(value).sort().join(',') !== fields.sort().join(',')
    || ROLE_CONFIG.some(({ paneField, sourceField }) => (
      typeof value[paneField] !== 'string' || typeof value[sourceField] !== 'string'
    ))) throw new TypeError('Case observation preparation request is invalid.');
  readDefinitionRef(value.setupDefinitionRef);
  readDefinitionRef(value.outcomeDefinitionRef);
  return value;
}

function providerRequest(document, setupDefinition, request, config) {
  return Object.freeze({
    campaign: document.campaign,
    paneId: request[config.paneField],
    setupDefinition,
    sourceRecordId: request[config.sourceField],
  });
}

function unavailable(config, predicate, reasonCode) {
  return Object.freeze({
    availability: Object.freeze({
      detail: null,
      evidenceRole: config.evidenceRole,
      providerId: predicate.providerId,
      providerVersion: predicate.providerVersion,
      reasonCode,
      status: 'unavailable',
    }),
    candidate: null,
    predicateResult: Object.freeze({
      evidenceRole: config.evidenceRole,
      passed: null,
      reasonCode,
      status: 'source-unavailable',
    }),
    request: null,
  });
}

function invalidateExisting(state) {
  for (const preview of state.previews.values()) preview.controller.abort('superseded');
  state.previews.clear();
}

function requireCandidateClosure(candidate, document, request, config, provider) {
  assertEvidenceCampaignClosure(candidate, document.campaign, document.setupDefinitions[0]);
  const context = candidate.observationContext;
  const providerIdentity = candidate.providerIdentity;
  if (candidate.evidenceRole !== config.evidenceRole
    || candidate.predicateId !== document.setupDefinitions[0].setupDefinitionId
    || candidate.predicateVersion !== document.setupDefinitions[0].setupDefinitionVersion
    || providerIdentity.providerId !== provider.providerId
    || providerIdentity.providerVersion !== provider.providerVersion
    || context.paneId !== request[config.paneField]
    || candidate.sourceReference.sourceRecordId !== request[config.sourceField]) {
    failValidation(
      'VALIDATION_CAMPAIGN_SOURCE_MISMATCH',
      'Evidence provider output does not close to the exact Campaign request.',
      { operation: 'prepare-case-observation', sourceId: provider.providerId },
    );
  }
  return candidate;
}

async function prepareRole(state, document, setupDefinition, request, config, signal) {
  const predicate = setupDefinition[config.predicateField];
  const provider = providerFor(state, {
    evidenceRole: config.evidenceRole,
    providerId: predicate.providerId,
    providerVersion: predicate.providerVersion,
  });
  if (provider === null) return unavailable(config, predicate, 'provider-absent');
  const sourceRequest = providerRequest(document, setupDefinition, request, config);
  try {
    const candidate = await provider.prepareCitation(sourceRequest, signal);
    const normalized = requireCandidateClosure(
      await readEvidenceCandidate(candidate, state.crypto), document, request, config, provider,
    );
    const claimPassed = normalized.boundedClaim.predicatePassed
      ?? normalized.boundedClaim.comparisonPassed;
    return Object.freeze({
      availability: Object.freeze({
        detail: null,
        evidenceRole: config.evidenceRole,
        providerId: provider.providerId,
        providerVersion: provider.providerVersion,
        reasonCode: claimPassed ? 'ready' : 'predicate-mismatch',
        status: 'available',
      }),
      candidate: normalized,
      predicateResult: Object.freeze({
        evidenceRole: config.evidenceRole,
        passed: claimPassed,
        reasonCode: claimPassed ? 'predicate-passed' : 'predicate-failed',
        status: 'ready',
      }),
      request: sourceRequest,
    });
  } catch (error) {
    if (signal.aborted) {
      failValidation(
        'VALIDATION_CAMPAIGN_PREPARATION_STALE',
        'Case observation preparation was superseded or cancelled.',
        { operation: 'prepare-case-observation' },
      );
    }
    return unavailable(config, predicate, error?.code ?? 'source-unavailable');
  }
}

function closeSharedContext(results) {
  const candidates = results.map(({ candidate }) => candidate).filter(Boolean);
  if (candidates.length !== 2) return null;
  const contexts = candidates.map(({ observationContext }) => observationContext);
  const sharedFields = [
    'datasetId', 'datasetRevision', 'exclusiveReplayCutoffEpochMs', 'instrumentId',
    'sessionHoursId', 'sessionId', 'sessionRevision', 'workspaceDigest', 'workspaceRevision',
  ];
  if (sharedFields.some((field) => contexts[0][field] !== contexts[1][field])) {
    failValidation(
      'VALIDATION_CAMPAIGN_SOURCE_MISMATCH',
      'SMA and FVG evidence do not share one accepted Workspace/dataset/Replay cutoff.',
      { operation: 'prepare-case-observation' },
    );
  }
  if (contexts.some(({ latestEligibleBarStartEpochMs, exclusiveReplayCutoffEpochMs }) => (
    latestEligibleBarStartEpochMs >= exclusiveReplayCutoffEpochMs
  ))) {
    failValidation(
      'VALIDATION_CAMPAIGN_REPLAY_CUTOFF_CHANGED',
      'Evidence includes a Bar at or after the exclusive Replay cutoff.',
      { operation: 'prepare-case-observation' },
    );
  }
  return strictPortableValue({
    exclusiveReplayCutoffEpochMs: contexts[0].exclusiveReplayCutoffEpochMs,
    sessionId: contexts[0].sessionId,
    workspaceDigest: contexts[0].workspaceDigest,
    workspaceRevision: contexts[0].workspaceRevision,
  });
}

export async function prepareCaseObservation(state, rawRequest, externalSignal) {
  const request = requestShape(rawRequest);
  const document = campaignDocument(state, request.campaignId);
  expectedDocument(document, request.expectedDocumentRevision, 'prepare-case-observation');
  if (JSON.stringify(request.setupDefinitionRef) !== JSON.stringify(document.campaign.setupDefinitionRef)
    || JSON.stringify(request.outcomeDefinitionRef) !== JSON.stringify(document.campaign.outcomeDefinitionRef)) {
    failValidation('VALIDATION_CAMPAIGN_REVISION_STALE', 'Campaign Definition reference changed.', {
      campaignId: request.campaignId,
      operation: 'prepare-case-observation',
    });
  }
  if (document.campaign.status !== 'active') throw new TypeError('Archived Campaign cannot capture a Case.');
  invalidateExisting(state);
  const controller = new AbortController();
  const abort = () => controller.abort('caller-cancelled');
  externalSignal?.addEventListener('abort', abort, { once: true });
  const setupDefinition = document.setupDefinitions[0];
  try {
    const results = [];
    for (const config of [...ROLE_CONFIG].sort((left, right) => (
      setupDefinition[left.predicateField].providerId.localeCompare(
        setupDefinition[right.predicateField].providerId,
      )
    ))) {
      results.push(await prepareRole(
        state, document, setupDefinition, request, config, controller.signal,
      ));
    }
    if (controller.signal.aborted) {
      failValidation(
        'VALIDATION_CAMPAIGN_PREPARATION_STALE',
        'Case observation preparation was cancelled.',
        { operation: 'prepare-case-observation' },
      );
    }
    const sharedContext = closeSharedContext(results);
    state.sourceResolution.set(
      request.campaignId,
      results.every(({ availability }) => availability.status === 'available')
        ? 'available' : 'source-unavailable',
    );
    const previewToken = state.idFactory();
    const createdAtEpochMs = state.nowEpochMs();
    const publicPreview = strictPortableValue({
      availability: results.map(({ availability }) => availability),
      campaignId: request.campaignId,
      candidates: results.map(({ candidate }) => candidate),
      expiresAtEpochMs: createdAtEpochMs + VALIDATION_LIMITS.preparationLeaseMs,
      expectedDocumentRevision: document.documentRevision,
      predicateResults: results.map(({ predicateResult }) => predicateResult),
      previewToken,
      sharedContext,
    });
    state.previews.set(previewToken, {
      controller,
      publicPreview,
      request,
      results,
    });
    return publicPreview;
  } finally {
    externalSignal?.removeEventListener('abort', abort);
  }
}

export function requirePreview(state, previewToken, campaignId, operation) {
  const preview = state.previews.get(previewToken);
  if (!preview || preview.publicPreview.campaignId !== campaignId || preview.controller.signal.aborted) {
    failValidation(
      'VALIDATION_CAMPAIGN_PREPARATION_STALE',
      'Case observation preview is missing or superseded.',
      { campaignId, operation },
    );
  }
  if (state.nowEpochMs() > preview.publicPreview.expiresAtEpochMs) {
    preview.controller.abort('expired');
    state.previews.delete(previewToken);
    failValidation(
      'VALIDATION_CAMPAIGN_PREPARATION_EXPIRED',
      'Case observation preview expired after 60 seconds.',
      { campaignId, operation },
    );
  }
  return preview;
}

export async function verifyPreviewCurrency(state, preview, operation) {
  const document = campaignDocument(state, preview.publicPreview.campaignId);
  expectedDocument(document, preview.publicPreview.expectedDocumentRevision, operation);
  for (const result of preview.results) {
    if (result.candidate === null) continue;
    const provider = providerFor(state, {
      ...result.candidate.providerIdentity,
      evidenceRole: result.candidate.evidenceRole,
    });
    if (provider === null || result.request === null) {
      failValidation(
        'VALIDATION_CAMPAIGN_SOURCE_UNAVAILABLE',
        'An evidence provider disappeared before Case commit.',
        { operation, sourceId: result.candidate.providerIdentity.providerId },
      );
    }
    const verification = await provider.verifyCitation({
      candidate: result.candidate,
      request: result.request,
    }, preview.controller.signal);
    if (verification.result !== 'match') {
      failValidation(
        'VALIDATION_CAMPAIGN_SOURCE_CHANGED',
        'Evidence source changed before the Case commit fence.',
        { operation, sourceId: provider.providerId },
      );
    }
  }
  return preview;
}

export function consumePreview(state, previewToken) {
  const preview = state.previews.get(previewToken);
  if (!preview) return;
  preview.controller.abort('consumed');
  state.previews.delete(previewToken);
}

export function disposePreviews(state) {
  invalidateExisting(state);
}
