import assert from 'node:assert/strict';
import { createMemoryValidationPersistenceAdapter } from '../src/validation-persistence/validation-persistence-adapters.js';
import { createValidationRepository } from '../src/validation-persistence/validation-repository.js';

const repository = createValidationRepository({
  adapter: createMemoryValidationPersistenceAdapter(),
  now: () => 200,
});
await repository.open();
await repository.createPlaybookVersion({
  createdAt: 100,
  id: 'playbook-v1',
  name: 'Model v1',
  playbookId: 'playbook',
  rules: [{ id: 'rule-1', statement: 'Wait for displacement.' }],
  version: 1,
});
await repository.createCampaign({
  createdAt: 110,
  hypothesis: 'The setup has positive expectancy.',
  id: 'campaign-1',
  name: 'Campaign 1',
  playbookVersionId: 'playbook-v1',
});
await repository.createTrial({ campaignId: 'campaign-1', createdAt: 120, id: 'trial-1' });

const snapshot = {
  cursorIndex: 2,
  cursorTime: '2026-07-15T13:32:00Z',
  revealedCount: 3,
  sessionId: 'replay-1',
  visibleThroughTime: '2026-07-15T13:32:00Z',
};
await assert.rejects(() => repository.startTrial('trial-1', snapshot), /campaign must be active/);
await repository.transitionCampaign('campaign-1', 'active', { updatedAt: 130 });
const active = await repository.startTrial('trial-1', snapshot, { startedAt: 140 });
assert.equal(active.status, 'active');
assert.equal(active.replaySessionId, 'replay-1');
assert.equal(active.replayVisibleThroughTime, '2026-07-15T13:32:00.000Z');
assert.deepEqual(await repository.getTrial('trial-1'), active);
await assert.rejects(() => repository.startTrial('trial-1', snapshot), /must be pending/);

await repository.close();
console.log('v6 blind trial repository step464 smoke passed');
