import assert from 'node:assert/strict';
import {
  createPlaybookVersion,
  createValidationCampaign,
  createValidationTrial,
} from '../src/validation-domain/validation-artifacts.js';
import {
  transitionValidationCampaign,
  transitionValidationTrial,
} from '../src/validation-domain/validation-lifecycle.js';

const playbookVersion = createPlaybookVersion({
  createdAt: 1000,
  id: 'playbook-version-1',
  name: 'NQ AM model v1',
  playbookId: 'playbook-nq-am',
  rules: [
    { id: 'bias', statement: 'Trade only with the declared daily bias.' },
    { id: 'risk', statement: 'Risk no more than one planned R.' },
  ],
  version: 1,
});
assert.equal(Object.isFrozen(playbookVersion), true);
assert.equal(Object.isFrozen(playbookVersion.rules), true);
assert.throws(() => { playbookVersion.name = 'mutated'; }, TypeError);

const campaign = createValidationCampaign({
  createdAt: 2000,
  hypothesis: 'A sweep plus displacement produces positive median R.',
  id: 'campaign-1',
  name: 'NQ AM sweep validation',
  playbookVersionId: playbookVersion.id,
});
const activeCampaign = transitionValidationCampaign(campaign, 'active', { updatedAt: 2100 });
const completedCampaign = transitionValidationCampaign(activeCampaign, 'completed', { updatedAt: 2200 });
assert.equal(completedCampaign.status, 'completed');
assert.throws(
  () => transitionValidationCampaign(campaign, 'completed', { updatedAt: 2200 }),
  /Invalid validationCampaign transition/,
);

const trial = createValidationTrial({
  campaignId: campaign.id,
  createdAt: 3000,
  id: 'trial-1',
});
const activeTrial = transitionValidationTrial(trial, 'active', { updatedAt: 3100 });
const invalidatedTrial = transitionValidationTrial(activeTrial, 'invalidated', {
  invalidationReason: 'Replay sample contains missing source bars.',
  updatedAt: 3200,
});
assert.equal(invalidatedTrial.invalidationReason, 'Replay sample contains missing source bars.');
assert.throws(
  () => transitionValidationTrial(trial, 'invalidated', { updatedAt: 3200 }),
  /requires an invalidation reason/,
);

assert.throws(() => createPlaybookVersion({
  ...playbookVersion,
  rules: [],
}), /non-empty array/);
assert.throws(() => createValidationCampaign({
  ...campaign,
  hypothesis: ' ',
}), /hypothesis/);
assert.throws(() => createValidationTrial({
  ...trial,
  campaignId: '',
}), /campaignId/);

console.log('v6 validation domain contract step463 smoke passed');
