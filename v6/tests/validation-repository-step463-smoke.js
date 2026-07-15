import assert from 'node:assert/strict';
import {
  createMemoryValidationDatabase,
  createMemoryValidationPersistenceAdapter,
} from '../src/validation-persistence/validation-persistence-adapters.js';
import { createValidationRepository } from '../src/validation-persistence/validation-repository.js';

const database = createMemoryValidationDatabase();
const adapter = createMemoryValidationPersistenceAdapter({ database });
const repository = createValidationRepository({ adapter, now: () => 9000 });
await repository.open();

assert.deepEqual(adapter.inspect(), {
  stores: ['playbookVersions', 'validationCampaigns', 'validationEvidence', 'validationObservations', 'validationTradePlanRevisions', 'validationTrials'],
  version: 3,
});

const playbook = await repository.createPlaybookVersion({
  createdAt: 1000,
  id: 'pbv-1',
  name: 'NQ model v1',
  playbookId: 'pb-1',
  rules: [{ id: 'r1', statement: 'Require displacement.' }],
  version: 1,
});
const campaign = await repository.createCampaign({
  createdAt: 2000,
  hypothesis: 'Displacement after a sweep has positive expectancy.',
  id: 'campaign-1',
  name: 'Sweep displacement',
  playbookVersionId: playbook.id,
});
const trial = await repository.createTrial({
  campaignId: campaign.id,
  createdAt: 3000,
  id: 'trial-1',
});

assert.equal((await repository.listPlaybookVersions('pb-1')).length, 1);
assert.equal((await repository.listCampaigns(playbook.id)).length, 1);
assert.equal((await repository.listTrials(campaign.id)).length, 1);
assert.equal((await repository.transitionCampaign(campaign.id, 'active')).status, 'active');
assert.equal((await repository.transitionTrial(trial.id, 'active')).status, 'active');

await assert.rejects(
  repository.createPlaybookVersion({ ...playbook }),
  /already exists/,
);
await assert.rejects(
  repository.createCampaign({
    ...campaign,
    id: 'campaign-missing-playbook',
    playbookVersionId: 'missing',
  }),
  /Playbook version not found/,
);
await assert.rejects(
  repository.createTrial({
    ...trial,
    campaignId: 'missing',
    id: 'trial-missing-campaign',
  }),
  /Validation campaign not found/,
);
assert.equal(await repository.getCampaign('campaign-missing-playbook'), null);
assert.equal(await repository.getTrial('trial-missing-campaign'), null);

const reloaded = createValidationRepository({
  adapter: createMemoryValidationPersistenceAdapter({ database }),
});
assert.equal((await reloaded.getPlaybookVersion(playbook.id)).name, 'NQ model v1');
assert.equal((await reloaded.getCampaign(campaign.id)).status, 'active');
assert.equal((await reloaded.getTrial(trial.id)).status, 'active');
assert.throws(() => {
  const stored = playbook;
  stored.name = 'mutated';
}, TypeError);

console.log('v6 validation repository step463 smoke passed');
