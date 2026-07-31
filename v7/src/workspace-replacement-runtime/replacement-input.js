import { createRawBarRequest } from '../bar-data-contract/public.js';
import { failReplacement } from './replacement-error.js';
import { exactRecord } from './validation.js';

/** Resolve one immutable complete replacement input before transaction execution. */
export function createWorkspaceReplacementInput(value) {
  exactRecord(value, ['catalog', 'request', 'target'], 'replacement input');
  const { catalog, request, target } = value;
  if (!catalog || typeof catalog.get !== 'function') {
    failReplacement('WORKSPACE_REPLACEMENT_CATALOG_INVALID', 'A replacement catalog is required.');
  }
  const selection = catalog.get(target);
  const acceptedRequest = createRawBarRequest(request);
  if (acceptedRequest.instrumentId !== selection.instrument.id
    || !selection.instrument.providerIds.includes(acceptedRequest.providerId)
    || !selection.displayTimeframe.sourceResolutionIds.includes(acceptedRequest.sourceResolutionId)) {
    failReplacement('WORKSPACE_REPLACEMENT_REQUEST_INCOMPATIBLE', 'Raw request does not match replacement selection.');
  }
  return Object.freeze({ request: acceptedRequest, selection });
}

export function requireReplacementExecution(value) {
  exactRecord(value, ['intent', 'request', 'semanticCandidate', 'target'], 'replacement execution');
  return value;
}
