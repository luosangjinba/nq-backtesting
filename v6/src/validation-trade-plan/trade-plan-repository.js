import { createIndexedDbValidationPersistenceAdapter } from '../validation-persistence/validation-persistence-adapters.js';
import { VALIDATION_STORES } from '../validation-persistence/validation-persistence-schema.js';
import { createProspectiveTradePlanRevision } from './trade-plan-domain.js';

const clone = (value) => value ? JSON.parse(JSON.stringify(value)) : null;

export function createTradePlanRepository({ adapter = createIndexedDbValidationPersistenceAdapter() } = {}) {
  async function create(record) {
    const plan = createProspectiveTradePlanRevision(record);
    return adapter.transaction([
      VALIDATION_STORES.TRIALS, VALIDATION_STORES.OBSERVATIONS,
      VALIDATION_STORES.EVIDENCE, VALIDATION_STORES.TRADE_PLAN_REVISIONS,
    ], 'readwrite', async (transaction) => {
      const trial = await transaction.store(VALIDATION_STORES.TRIALS).get(plan.trialId);
      const observation = await transaction.store(VALIDATION_STORES.OBSERVATIONS).get(plan.observationId);
      const evidence = await transaction.store(VALIDATION_STORES.EVIDENCE).get(plan.evidenceId);
      if (!trial || trial.status !== 'active') throw new Error('Trade plan requires an active trial.');
      if (!observation || observation.trialId !== plan.trialId) throw new Error('Trade plan observation does not belong to trial.');
      if (!evidence || evidence.trialId !== plan.trialId || evidence.observationId !== plan.observationId) {
        throw new Error('Trade plan evidence does not match observation/trial.');
      }
      await transaction.store(VALIDATION_STORES.TRADE_PLAN_REVISIONS).add(plan);
      return clone(plan);
    });
  }
  return Object.freeze({
    close: () => adapter.close?.(), create,
    get: (id) => adapter.transaction([VALIDATION_STORES.TRADE_PLAN_REVISIONS], 'readonly', async (tx) => clone(await tx.store(VALIDATION_STORES.TRADE_PLAN_REVISIONS).get(id))),
    list: (trialId) => adapter.transaction([VALIDATION_STORES.TRADE_PLAN_REVISIONS], 'readonly', async (tx) => (await tx.store(VALIDATION_STORES.TRADE_PLAN_REVISIONS).getAllByIndex('byTrialId', trialId)).map(clone)),
    open: () => adapter.open(),
  });
}
