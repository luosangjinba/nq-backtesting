import {
  requireDigest,
} from '../validation-study-domain/public.js';
import { normalizeFvgEvidenceObservation } from './fvg-evidence-normalization.js';

const PROVIDER_ID = 'validation.evidence.manual-fvg';
const PROVIDER_VERSION = '1.0.0';
const EVIDENCE_ROLE = 'execution-fvg';

function requireReader(value) {
  if (typeof value !== 'function') throw new TypeError('FVG evidence provider requires a readObservation port.');
  return value;
}

function safeAvailability(status, reasonCode, detail = null) {
  return Object.freeze({
    detail,
    evidenceRole: EVIDENCE_ROLE,
    providerId: PROVIDER_ID,
    providerVersion: PROVIDER_VERSION,
    reasonCode,
    status,
  });
}

function requireRequest(value) {
  if (!value?.campaign || !value?.setupDefinition || typeof value.sourceRecordId !== 'string'
    || typeof value.paneId !== 'string') throw new TypeError('FVG evidence request is invalid.');
  return value;
}

/** Adapt the public Manual Annotation facade to ValidationEvidenceProviderV1. */
export function createValidationFvgEvidenceProvider({
  crypto = globalThis.crypto,
  readObservation,
} = {}) {
  const read = requireReader(readObservation);

  async function prepareCitation(rawRequest, signal = new AbortController().signal) {
    const request = requireRequest(rawRequest);
    if (signal.aborted) throw Object.assign(new Error('FVG evidence preparation was cancelled.'), {
      code: 'VALIDATION_CAMPAIGN_PREPARATION_STALE',
    });
    const observation = await read({ artifactId: request.sourceRecordId, paneId: request.paneId });
    return normalizeFvgEvidenceObservation({
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
        return candidate.boundedClaim.predicatePassed
          ? safeAvailability('available', 'ready')
          : safeAvailability('unavailable', 'predicate-mismatch');
      } catch (error) {
        return safeAvailability('unavailable', error?.code ?? 'source-unavailable');
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
        return Object.freeze({
          candidate: null,
          reasonCode: error?.code ?? 'record-missing',
          result: 'record-missing',
        });
      }
    },
  });
}
