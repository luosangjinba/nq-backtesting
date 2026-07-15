const required=(v,f)=>{const n=String(v||'').trim();if(!n)throw new Error(`${f} is required.`);return n;};
const finite=(v,f)=>{const n=Number(v);if(!Number.isFinite(n))throw new Error(`${f} must be finite.`);return n;};
const iso=(v,f)=>{const n=Date.parse(required(v,f));if(!Number.isFinite(n))throw new Error(`${f} must be valid.`);return new Date(n).toISOString();};
const freeze=(v)=>Object.freeze(JSON.parse(JSON.stringify(v)));

export function calculateRMultiple({ direction, entryFill, exitPrice, plannedEntry, plannedStop } = {}) {
  const risk=Math.abs(finite(plannedEntry,'Planned entry')-finite(plannedStop,'Planned stop'));
  if(risk<=0)throw new Error('Planned risk must be greater than zero.');
  const pnl=(required(direction,'Direction')==='long'?1:-1)*(finite(exitPrice,'Exit price')-finite(entryFill,'Entry fill'));
  const result=Math.round((pnl/risk)*10000)/10000;
  if(Math.abs(result)>100)throw new Error('R multiple exceeds the supported ±100R bound.');
  return result;
}

export function createSimulatedExecution({filledAt,id,planRevisionId,price,trialId}={}){
  return freeze({artifactType:'simulatedExecution',dataResolution:'1m',filledAt:iso(filledAt,'Execution filledAt'),id:required(id,'Execution id'),planRevisionId:required(planRevisionId,'Execution planRevisionId'),price:finite(price,'Execution price'),schemaVersion:1,trialId:required(trialId,'Execution trialId')});
}

export function createSimulatedOutcome({execution,exitedAt,exitPrice,exitReason,id,orderingAmbiguity,plan}={}){
  const exitTime=iso(exitedAt,'Outcome exitedAt');
  if(Date.parse(exitTime)<Date.parse(execution.filledAt))throw new Error('Outcome cannot precede execution.');
  const ordering=required(orderingAmbiguity,'Outcome orderingAmbiguity');
  if(!['unambiguous','within-minute-unknown'].includes(ordering))throw new Error('Outcome orderingAmbiguity is invalid.');
  return freeze({artifactType:'simulatedOutcome',dataResolution:'1m',executionId:execution.id,exitedAt:exitTime,exitPrice:finite(exitPrice,'Outcome exitPrice'),exitReason:required(exitReason,'Outcome exitReason'),id:required(id,'Outcome id'),orderingAmbiguity:ordering,rMultiple:calculateRMultiple({direction:plan.direction,entryFill:execution.price,exitPrice,plannedEntry:plan.entry,plannedStop:plan.stop}),schemaVersion:1,trialId:execution.trialId});
}
