import assert from 'node:assert/strict'; import { calculateRMultiple,createSimulatedExecution,createSimulatedOutcome } from '../src/validation-outcome/simulated-outcome-domain.js';
assert.equal(calculateRMultiple({direction:'long',entryFill:101,exitPrice:119,plannedEntry:100,plannedStop:90}),1.8);
assert.equal(calculateRMultiple({direction:'short',entryFill:99,exitPrice:81,plannedEntry:100,plannedStop:110}),1.8);
const execution=createSimulatedExecution({filledAt:'2026-01-01T10:00:00Z',id:'x',planRevisionId:'p',price:101,trialId:'t'});
const outcome=createSimulatedOutcome({execution,exitedAt:'2026-01-01T10:05:00Z',exitPrice:89,exitReason:'stop',id:'o',orderingAmbiguity:'within-minute-unknown',plan:{direction:'long',entry:100,stop:90}});
assert.equal(outcome.rMultiple,-1.2); assert.equal(outcome.dataResolution,'1m');
assert.throws(()=>createSimulatedOutcome({execution,exitedAt:'2026-01-01T09:00:00Z',exitPrice:89,exitReason:'stop',id:'o',orderingAmbiguity:'unambiguous',plan:{direction:'long',entry:100,stop:90}}),/precede/);
console.log('v6 simulated outcome step467 smoke passed');
