import {
  archiveCampaignRecord,
  createCampaignDocument,
  createCampaignRecord,
  createSeedDefinitions,
  failValidation,
  replaceCampaignDocument,
} from '../validation-study-domain/public.js';
import {
  campaignDocument,
  commitCampaignDocument,
  expectedDocument,
  nextIndex,
} from './runtime-state.js';
import { expectedCampaign } from './command-contract.js';

export async function createCampaign(state, command, signal) {
  const currentRevision = state.index?.revision ?? 0;
  if (command.expectedIndexRevision !== currentRevision) {
    failValidation('VALIDATION_CAMPAIGN_REVISION_STALE', 'Campaign index changed; reload and retry.', {
      operation: command.kind,
    });
  }
  const nowEpochMs = state.nowEpochMs();
  const definitions = await createSeedDefinitions(state.crypto);
  const campaign = await createCampaignRecord({
    ...command,
    campaignId: state.idFactory(),
    crypto: state.crypto,
    nowEpochMs,
    outcomeDefinitionRef: definitions.outcomeDefinitionRef,
    setupDefinitionRef: definitions.setupDefinitionRef,
  });
  const document = await createCampaignDocument({
    campaign,
    crypto: state.crypto,
    nowEpochMs,
    outcomeDefinitions: [definitions.outcomeDefinition],
    setupDefinitions: [definitions.setupDefinition],
  });
  const index = await nextIndex(state, campaign.campaignId, nowEpochMs);
  await commitCampaignDocument(state, {
    document, index, operation: command.kind, previous: null, signal,
  });
  return Object.freeze({
    campaignId: campaign.campaignId,
    documentRevision: 1,
    indexRevision: index.revision,
    kind: command.kind,
  });
}

export async function archiveCampaign(state, command, signal) {
  const document = campaignDocument(state, command.campaignId);
  expectedDocument(document, command.expectedDocumentRevision, command.kind);
  expectedCampaign(document, command.expectedCampaignRevision, command.kind);
  const campaign = await archiveCampaignRecord(document.campaign, state.nowEpochMs(), state.crypto);
  const candidate = await replaceCampaignDocument(
    document, { campaign }, state.nowEpochMs(), state.crypto,
  );
  await commitCampaignDocument(state, {
    document: candidate, operation: command.kind, previous: document, signal,
  });
  return Object.freeze({
    campaignId: command.campaignId,
    campaignRevision: campaign.revision,
    documentRevision: candidate.documentRevision,
    kind: command.kind,
  });
}
