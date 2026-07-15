import assert from 'node:assert/strict';
import { createTradePlanRuntime } from '../src/validation-trade-plan/trade-plan-runtime.js';
import { VALIDATION_TRADE_PLAN_COMMANDS } from '../src/contracts/app-contracts.js';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js'; import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';
clearCommandsForTest(); let saved; const repo = { async open(){}, async close(){}, async create(v){saved=v;return v;}, async get(){}, async list(){return [];} };
const registry=createRuntimeRegistry(); registry.registerRuntime(createTradePlanRuntime({now:()=>9,repository:repo})); await registry.start();
const result=await dispatchCommand(VALIDATION_TRADE_PLAN_COMMANDS.CREATE,{direction:'long'}); assert.equal(result.status,'created'); assert.equal(saved.createdAt,9);
await registry.stop(); clearCommandsForTest(); console.log('v6 trade plan runtime step466 smoke passed');
