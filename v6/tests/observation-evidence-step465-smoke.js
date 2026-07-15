import assert from 'node:assert/strict';
import { createMemoryValidationDatabase, createMemoryValidationPersistenceAdapter } from '../src/validation-persistence/validation-persistence-adapters.js';
import { createValidationRepository } from '../src/validation-persistence/validation-repository.js';
import { createObservationEvidenceRepository } from '../src/validation-observation/observation-evidence-repository.js';

const database = createMemoryValidationDatabase();
const validation = createValidationRepository({ adapter: createMemoryValidationPersistenceAdapter({ database }) });
const evidenceRepository = createObservationEvidenceRepository({ adapter: createMemoryValidationPersistenceAdapter({ database }) });
await validation.createPlaybookVersion({ createdAt: 1, id: 'pv', name: 'v1', playbookId: 'p', rules: [{ id: 'r', statement: 'Rule' }], version: 1 });
await validation.createCampaign({ createdAt: 2, hypothesis: 'Hypothesis', id: 'c', name: 'Campaign', playbookVersionId: 'pv' });
await validation.transitionCampaign('c', 'active', { updatedAt: 3 });
await validation.createTrial({ campaignId: 'c', createdAt: 4, id: 't' });
await validation.startTrial('t', { cursorIndex: 0, cursorTime: '2026-01-01T10:00:00Z', revealedCount: 1, sessionId: 's' }, { startedAt: 5 });

const created = await evidenceRepository.create({
  observation: { category: 'setup', createdAt: 6, evidenceId: 'e', id: 'o', text: 'Prospective setup', trialId: 't' },
  evidence: { createdAt: 6, id: 'e', observationId: 'o', paneId: 'primary', price: 25000, replayCursorTime: '2026-01-01T10:00:00Z', replaySessionId: 's', replayVisibleThroughTime: '2026-01-01T10:00:00Z', symbol: 'NQ', time: '2026-01-01T09:59:00Z', timeframe: '1m', trialId: 't' },
});
assert.equal(created.observation.perspective, 'prospective');
assert.equal((await evidenceRepository.listObservations('t')).length, 1);
assert.equal((await evidenceRepository.listEvidence('t'))[0].price, 25000);
await assert.rejects(() => evidenceRepository.create({
  observation: { ...created.observation, id: 'o2', evidenceId: 'e2' },
  evidence: { ...created.evidence, id: 'e2', observationId: 'o2', time: '2026-01-01T10:01:00Z' },
}), /must not exceed/);

console.log('v6 observation evidence step465 smoke passed');
