import { caseRef } from '../validation-study-domain/public.js';

function exactProvider(state, citation) {
  return state.providers.find((provider) => (
    provider.evidenceRole === citation.evidenceRole
      && provider.providerId === citation.providerIdentity.providerId
      && provider.providerVersion === citation.providerIdentity.providerVersion
  )) ?? null;
}

function incompatibleProvider(state, citation) {
  return state.providers.some((provider) => (
    provider.evidenceRole === citation.evidenceRole
      && provider.providerId === citation.providerIdentity.providerId
  ));
}

function providerRequest(document, citation) {
  return Object.freeze({
    campaign: document.campaign,
    paneId: citation.observationContext.paneId,
    setupDefinition: document.setupDefinitions[0],
    sourceRecordId: citation.sourceReference.sourceRecordId,
  });
}

/** Sample current source availability without mutating any evidence owner. */
export async function sampleCitationAvailability(
  state, document, record, citation, signal = new AbortController().signal,
) {
  const provider = exactProvider(state, citation);
  let status = 'unavailable';
  if (provider === null) {
    status = incompatibleProvider(state, citation) ? 'incompatible' : 'unavailable';
  } else {
    try {
      const availability = await provider.getAvailability(providerRequest(document, citation), signal);
      status = availability?.status === 'available' ? 'available' : 'unavailable';
    } catch {
      status = 'unavailable';
    }
  }
  return Object.freeze({
    caseRef: caseRef(record),
    citationId: citation.citationId,
    evidenceRole: citation.evidenceRole,
    providerId: citation.providerIdentity.providerId,
    providerVersion: citation.providerIdentity.providerVersion,
    status,
  });
}

export async function sampleCasesAvailability(state, document, cases, signal) {
  const entries = [];
  for (const record of cases) {
    for (const citation of record.evidenceCitations) {
      entries.push(await sampleCitationAvailability(
        state, document, record, citation, signal,
      ));
    }
  }
  return Object.freeze(entries.sort((left, right) => (
    left.caseRef.caseId.localeCompare(right.caseRef.caseId)
      || left.caseRef.caseRevision - right.caseRef.caseRevision
      || left.citationId.localeCompare(right.citationId)
  )));
}

function hasRequiredProviders(state, document) {
  const setup = document.setupDefinitions[0];
  return [
    ['context-sma', setup.smaPredicate],
    ['execution-fvg', setup.fvgPredicate],
  ].every(([evidenceRole, predicate]) => state.providers.some((provider) => (
    provider.evidenceRole === evidenceRole
      && provider.providerId === predicate.providerId
      && provider.providerVersion === predicate.providerVersion
  )));
}

export async function refreshCampaignSourceResolution(state, document, signal) {
  const latest = new Map();
  for (const record of document.caseRevisions) {
    if ((latest.get(record.caseId)?.caseRevision ?? 0) < record.caseRevision) {
      latest.set(record.caseId, record);
    }
  }
  const cases = [...latest.values()].filter(({ evidenceCitations }) => evidenceCitations.length > 0);
  let status;
  if (!hasRequiredProviders(state, document)) status = 'source-unavailable';
  else if (cases.length === 0) status = 'available';
  else {
    const entries = await sampleCasesAvailability(state, document, cases, signal);
    status = entries.every((entry) => entry.status === 'available')
      ? 'available' : 'source-unavailable';
  }
  state.sourceResolution.set(document.campaign.campaignId, status);
  return status;
}

export async function refreshAllCampaignSourceResolution(state, signal) {
  for (const document of state.documents.values()) {
    await refreshCampaignSourceResolution(state, document, signal);
  }
}
