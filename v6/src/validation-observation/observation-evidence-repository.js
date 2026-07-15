import { createIndexedDbValidationPersistenceAdapter } from '../validation-persistence/validation-persistence-adapters.js';
import { VALIDATION_STORES } from '../validation-persistence/validation-persistence-schema.js';
import { createEvidenceSnapshot, createProspectiveObservation } from './observation-evidence-domain.js';

const clone = (value) => value ? JSON.parse(JSON.stringify(value)) : null;

export function createObservationEvidenceRepository({
  adapter = createIndexedDbValidationPersistenceAdapter(),
} = {}) {
  async function create({ evidence, observation }) {
    const observationRecord = createProspectiveObservation(observation);
    const evidenceRecord = createEvidenceSnapshot(evidence);
    if (observationRecord.trialId !== evidenceRecord.trialId
      || observationRecord.id !== evidenceRecord.observationId
      || observationRecord.evidenceId !== evidenceRecord.id) {
      throw new Error('Observation and evidence references must be reciprocal.');
    }
    return adapter.transaction([
      VALIDATION_STORES.TRIALS,
      VALIDATION_STORES.OBSERVATIONS,
      VALIDATION_STORES.EVIDENCE,
    ], 'readwrite', async (transaction) => {
      const trial = await transaction.store(VALIDATION_STORES.TRIALS).get(observationRecord.trialId);
      if (!trial) throw new Error(`Validation trial not found: ${observationRecord.trialId}`);
      if (trial.status !== 'active') throw new Error('Observation requires an active trial.');
      if (trial.replaySessionId !== evidenceRecord.replaySessionId) {
        throw new Error('Evidence Replay session must match the active trial.');
      }
      await transaction.store(VALIDATION_STORES.OBSERVATIONS).add(observationRecord);
      await transaction.store(VALIDATION_STORES.EVIDENCE).add(evidenceRecord);
      return { evidence: clone(evidenceRecord), observation: clone(observationRecord) };
    });
  }

  const get = (store, id) => adapter.transaction([store], 'readonly', async (transaction) => (
    clone(await transaction.store(store).get(id))
  ));
  const list = (store, trialId) => adapter.transaction([store], 'readonly', async (transaction) => (
    (await transaction.store(store).getAllByIndex('byTrialId', trialId)).map(clone)
  ));

  return Object.freeze({
    close: () => adapter.close?.(),
    create,
    getEvidence: (id) => get(VALIDATION_STORES.EVIDENCE, id),
    getObservation: (id) => get(VALIDATION_STORES.OBSERVATIONS, id),
    listEvidence: (trialId) => list(VALIDATION_STORES.EVIDENCE, trialId),
    listObservations: (trialId) => list(VALIDATION_STORES.OBSERVATIONS, trialId),
    open: () => adapter.open(),
  });
}
