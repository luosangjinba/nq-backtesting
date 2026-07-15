import assert from 'node:assert/strict'; import { readFile } from 'node:fs/promises';
const source=await readFile('v6/src/validation-trade-plan/trade-plan-runtime.js','utf8');
for(const forbidden of ['replay-runtime','chart-engine','validation-observation/observation-evidence-domain']) assert.equal(source.includes(forbidden),false);
console.log('v6 trade plan boundary step466 static smoke passed');
