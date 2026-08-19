import {
  requireDigest,
} from '../validation-study-domain/public.js';
import { normalizeSmaEvidenceObservation } from './sma-evidence-normalization.js';

const PROVIDER_ID = 'validation.evidence.sma-close';
const PROVIDER_VERSION = '1.0.0';
const EVIDENCE_ROLE = 'context-sma';

function requireRequest(value) {
  if (!value?.campaign || !value?.setupDefinition || typeof value.sourceRecordId !== 'string'
    || typeof value.paneId !== 'string') throw new TypeError('SMA evidence request is invalid.');
  return value;
}

function availability(status, reasonCode) {
  return Object.freeze({
    detail: null,
    evidenceRole: EVIDENCE_ROLE,
    providerId: PROVIDER_ID,
    providerVersion: PROVIDER_VERSION,
    reasonCode,
    status,
  });
}

/** Adapt the public calculated-series facade to ValidationEvidenceProviderV1. */
export function createValidationSmaEvidenceProvider({
  crypto = globalThis.crypto,
  readObservation,
} = {}) {
  if (typeof readObservation !== 'function') {
    throw new TypeError('SMA evidence provider requires a readObservation port.');
  }
  async function prepareCitation(rawRequest, signal = new AbortController().signal) {
    const request = requireRequest(rawRequest);
    if (signal.aborted) throw Object.assign(new Error('SMA evidence preparation was cancelled.'), {
      code: 'VALIDATION_CAMPAIGN_PREPARATION_STALE',
    });
    const observation = await readObservation({
      instanceId: request.sourceRecordId,
      workspacePaneId: request.paneId,
    });
    return normalizeSmaEvidenceObservation({
      crypto,
      evidenceRole: EVIDENCE_ROLE,
      observation,
      providerId: PROVIDER_ID,
      providerVersion: PROVIDER_VERSION,
      request,
    });
  }
  return Object.freeze({
    evidenceRole: EVIDENCE_ROLE,
    async getAvailability(request) {
      try {
        const candidate = await prepareCitation(request);
        return candidate.boundedClaim.comparisonPassed
          ? availability('available', 'ready') : availability('unavailable', 'predicate-mismatch');
      } catch (error) {
        return availability('unavailable', error?.code ?? 'source-unavailable');
      }
    },
    prepareCitation,
    providerId: PROVIDER_ID,
    providerVersion: PROVIDER_VERSION,
    async verifyCitation({ candidate, request }, signal) {
      try {
        const current = await prepareCitation(request, signal);
        const match = current.receiptDigest === requireDigest(candidate.receiptDigest)
          && JSON.stringify(current.currencyFence) === JSON.stringify(candidate.currencyFence);
        return Object.freeze({
          candidate: current,
          reasonCode: match ? 'source-match' : 'source-changed',
          result: match ? 'match' : 'mismatch',
        });
      } catch (error) {
        return Object.freeze({ candidate: null, reasonCode: error?.code ?? 'record-missing', result: 'record-missing' });
      }
    },
  });
}
