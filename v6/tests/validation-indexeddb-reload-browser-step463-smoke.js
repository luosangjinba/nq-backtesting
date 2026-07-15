import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page();

try {
  const result = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const { createIndexedDbValidationPersistenceAdapter } = await import(
        '/v6/src/validation-persistence/validation-persistence-adapters.js'
      );
      const { createValidationRepository } = await import(
        '/v6/src/validation-persistence/validation-repository.js'
      );
      const databaseName = 'v6.validation.step463.browser';
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('pre-test delete blocked'));
      });

      const first = createValidationRepository({
        adapter: createIndexedDbValidationPersistenceAdapter({ databaseName }),
      });
      await first.open();
      const playbook = await first.createPlaybookVersion({
        createdAt: 1000,
        id: 'pbv-browser-1',
        name: 'Browser playbook v1',
        playbookId: 'pb-browser',
        rules: [{ id: 'rule-1', statement: 'Commit before reveal.' }],
        version: 1,
      });
      const campaign = await first.createCampaign({
        createdAt: 2000,
        hypothesis: 'Prospective commitments improve review integrity.',
        id: 'campaign-browser-1',
        name: 'Browser campaign',
        playbookVersionId: playbook.id,
      });
      await first.createTrial({
        campaignId: campaign.id,
        createdAt: 3000,
        id: 'trial-browser-1',
      });
      await first.close();

      const second = createValidationRepository({
        adapter: createIndexedDbValidationPersistenceAdapter({ databaseName }),
      });
      const reloaded = {
        campaigns: await second.listCampaigns(playbook.id),
        playbook: await second.getPlaybookVersion(playbook.id),
        trials: await second.listTrials(campaign.id),
      };
      await second.close();

      const schema = await new Promise((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => {
          const database = request.result;
          const stores = [...database.objectStoreNames];
          const transaction = database.transaction(stores, 'readonly');
          const indexes = Object.fromEntries(stores.map((name) => [
            name,
            [...transaction.objectStore(name).indexNames],
          ]));
          transaction.oncomplete = () => {
            database.close();
            resolve({ indexes, stores, version: database.version });
          };
          transaction.onerror = () => reject(transaction.error);
        };
        request.onerror = () => reject(request.error);
      });

      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName);
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('post-test delete blocked'));
      });
      return { reloaded, schema };
    })()))()
  `));

  assert.equal(result.reloaded.playbook.name, 'Browser playbook v1');
  assert.equal(result.reloaded.campaigns.length, 1);
  assert.equal(result.reloaded.trials.length, 1);
  assert.deepEqual(result.schema.stores.sort(), [
    'playbookVersions',
    'validationCampaigns',
    'validationEvidence',
    'validationObservations',
    'validationTradePlanRevisions',
    'validationTrials',
  ]);
  assert.equal(result.schema.version, 3);
  assert.deepEqual(result.schema.indexes.playbookVersions.sort(), ['byPlaybookId', 'byPlaybookVersion']);
  assert.deepEqual(result.schema.indexes.validationCampaigns.sort(), ['byPlaybookVersionId', 'byStatus']);
  assert.deepEqual(result.schema.indexes.validationTrials.sort(), ['byCampaignId', 'byStatus']);
  assert.deepEqual(result.schema.indexes.validationObservations.sort(), ['byEvidenceId', 'byTrialId']);
  assert.deepEqual(result.schema.indexes.validationEvidence.sort(), ['byObservationId', 'byTrialId']);
  assert.deepEqual(result.schema.indexes.validationTradePlanRevisions.sort(), ['byObservationId', 'byTradePlanRevision', 'byTrialId']);
} finally {
  await page.cleanup();
}

console.log('v6 validation IndexedDB reload browser step463 smoke passed');
