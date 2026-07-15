import { createIndexedDbValidationPersistenceAdapter } from '../validation-persistence/validation-persistence-adapters.js';
import { VALIDATION_STORES } from '../validation-persistence/validation-persistence-schema.js';
import { createSimulatedExecution, createSimulatedOutcome } from './simulated-outcome-domain.js';
const clone=(v)=>v?JSON.parse(JSON.stringify(v)):null;
export function createSimulatedOutcomeRepository({adapter=createIndexedDbValidationPersistenceAdapter()}={}){
  async function record({execution:input,outcome:outcomeInput}){
    return adapter.transaction([VALIDATION_STORES.TRIALS,VALIDATION_STORES.TRADE_PLAN_REVISIONS,VALIDATION_STORES.EXECUTIONS,VALIDATION_STORES.OUTCOMES],'readwrite',async(tx)=>{
      const plan=await tx.store(VALIDATION_STORES.TRADE_PLAN_REVISIONS).get(input.planRevisionId);
      if(!plan)throw new Error(`Trade plan revision not found: ${input.planRevisionId}`);
      const trial=await tx.store(VALIDATION_STORES.TRIALS).get(plan.trialId);
      if(!trial||trial.status!=='active')throw new Error('Simulated outcome requires an active trial.');
      const execution=createSimulatedExecution({...input,trialId:plan.trialId});
      const outcome=createSimulatedOutcome({...outcomeInput,execution,plan});
      await tx.store(VALIDATION_STORES.EXECUTIONS).add(execution); await tx.store(VALIDATION_STORES.OUTCOMES).add(outcome);
      return {execution:clone(execution),outcome:clone(outcome)};
    });
  }
  const list=(store,trialId)=>adapter.transaction([store],'readonly',async(tx)=>(await tx.store(store).getAllByIndex('byTrialId',trialId)).map(clone));
  return Object.freeze({close:()=>adapter.close?.(),listExecutions:(id)=>list(VALIDATION_STORES.EXECUTIONS,id),listOutcomes:(id)=>list(VALIDATION_STORES.OUTCOMES,id),open:()=>adapter.open(),record});
}
