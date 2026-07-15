import {
  cloneValidationArtifact,
  createPlaybookVersion,
  createValidationCampaign,
  createValidationTrial,
} from '../validation-domain/validation-artifacts.js';
import {
  transitionValidationCampaign,
  transitionValidationTrial,
} from '../validation-domain/validation-lifecycle.js';
import { startValidationTrial } from '../validation-domain/blind-trial-provenance.js';
import { createIndexedDbValidationPersistenceAdapter } from './validation-persistence-adapters.js';
import { VALIDATION_STORES } from './validation-persistence-schema.js';

function cloneList(records = []) {
  return records
    .map(cloneValidationArtifact)
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
}

function requireRecord(record, label, id) {
  if (!record) throw new Error(`${label} not found: ${id}`);
  return record;
}

export function createValidationRepository({
  adapter = createIndexedDbValidationPersistenceAdapter(),
  now = () => Date.now(),
} = {}) {
  async function createPlaybook(record) {
    const artifact = createPlaybookVersion(record);
    return adapter.transaction([VALIDATION_STORES.PLAYBOOK_VERSIONS], 'readwrite', async (transaction) => {
      await transaction.store(VALIDATION_STORES.PLAYBOOK_VERSIONS).add(artifact);
      return cloneValidationArtifact(artifact);
    });
  }

  async function createCampaign(record) {
    const artifact = createValidationCampaign(record);
    return adapter.transaction([
      VALIDATION_STORES.PLAYBOOK_VERSIONS,
      VALIDATION_STORES.CAMPAIGNS,
    ], 'readwrite', async (transaction) => {
      const playbook = await transaction.store(VALIDATION_STORES.PLAYBOOK_VERSIONS)
        .get(artifact.playbookVersionId);
      requireRecord(playbook, 'Playbook version', artifact.playbookVersionId);
      await transaction.store(VALIDATION_STORES.CAMPAIGNS).add(artifact);
      return cloneValidationArtifact(artifact);
    });
  }

  async function createTrial(record) {
    const artifact = createValidationTrial(record);
    return adapter.transaction([
      VALIDATION_STORES.CAMPAIGNS,
      VALIDATION_STORES.TRIALS,
    ], 'readwrite', async (transaction) => {
      const campaign = await transaction.store(VALIDATION_STORES.CAMPAIGNS)
        .get(artifact.campaignId);
      requireRecord(campaign, 'Validation campaign', artifact.campaignId);
      await transaction.store(VALIDATION_STORES.TRIALS).add(artifact);
      return cloneValidationArtifact(artifact);
    });
  }

  async function get(storeName, id) {
    return adapter.transaction([storeName], 'readonly', async (transaction) => {
      const record = await transaction.store(storeName).get(id);
      return record ? cloneValidationArtifact(record) : null;
    });
  }

  async function list(storeName, indexName = null, indexValue = null) {
    return adapter.transaction([storeName], 'readonly', async (transaction) => {
      const store = transaction.store(storeName);
      const records = indexName
        ? await store.getAllByIndex(indexName, indexValue)
        : await store.getAll();
      return cloneList(records);
    });
  }

  async function transitionCampaign(id, targetStatus, options = {}) {
    return adapter.transaction([VALIDATION_STORES.CAMPAIGNS], 'readwrite', async (transaction) => {
      const store = transaction.store(VALIDATION_STORES.CAMPAIGNS);
      const current = requireRecord(await store.get(id), 'Validation campaign', id);
      const next = transitionValidationCampaign(current, targetStatus, {
        updatedAt: options.updatedAt ?? now(),
      });
      await store.put(next);
      return cloneValidationArtifact(next);
    });
  }

  async function transitionTrial(id, targetStatus, options = {}) {
    return adapter.transaction([VALIDATION_STORES.TRIALS], 'readwrite', async (transaction) => {
      const store = transaction.store(VALIDATION_STORES.TRIALS);
      const current = requireRecord(await store.get(id), 'Validation trial', id);
      const next = transitionValidationTrial(current, targetStatus, {
        invalidationReason: options.invalidationReason,
        updatedAt: options.updatedAt ?? now(),
      });
      await store.put(next);
      return cloneValidationArtifact(next);
    });
  }

  async function startTrial(id, provenance, options = {}) {
    return adapter.transaction([
      VALIDATION_STORES.CAMPAIGNS,
      VALIDATION_STORES.TRIALS,
    ], 'readwrite', async (transaction) => {
      const campaignStore = transaction.store(VALIDATION_STORES.CAMPAIGNS);
      const trialStore = transaction.store(VALIDATION_STORES.TRIALS);
      const current = requireRecord(await trialStore.get(id), 'Validation trial', id);
      const campaign = requireRecord(
        await campaignStore.get(current.campaignId),
        'Validation campaign',
        current.campaignId,
      );
      if (campaign.status !== 'active') {
        throw new Error(`Validation campaign must be active before trial start; received ${campaign.status}.`);
      }
      const next = startValidationTrial(current, provenance, {
        startedAt: options.startedAt ?? now(),
      });
      await trialStore.put(next);
      return cloneValidationArtifact(next);
    });
  }

  return Object.freeze({
    close: () => adapter.close?.(),
    createCampaign,
    createPlaybookVersion: createPlaybook,
    createTrial,
    getCampaign: (id) => get(VALIDATION_STORES.CAMPAIGNS, id),
    getPlaybookVersion: (id) => get(VALIDATION_STORES.PLAYBOOK_VERSIONS, id),
    getTrial: (id) => get(VALIDATION_STORES.TRIALS, id),
    listCampaigns: (playbookVersionId = null) => list(
      VALIDATION_STORES.CAMPAIGNS,
      playbookVersionId ? 'byPlaybookVersionId' : null,
      playbookVersionId,
    ),
    listPlaybookVersions: (playbookId = null) => list(
      VALIDATION_STORES.PLAYBOOK_VERSIONS,
      playbookId ? 'byPlaybookId' : null,
      playbookId,
    ),
    listTrials: (campaignId = null) => list(
      VALIDATION_STORES.TRIALS,
      campaignId ? 'byCampaignId' : null,
      campaignId,
    ),
    open: () => adapter.open(),
    startTrial,
    transitionCampaign,
    transitionTrial,
  });
}
