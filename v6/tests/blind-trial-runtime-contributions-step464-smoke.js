import assert from 'node:assert/strict';
import { createValidationRuntimeContributions } from '../src/runtime/validation-runtime-contributions.js';

assert.deepEqual(createValidationRuntimeContributions(), []);
const repository = {};
const contributions = createValidationRuntimeContributions({
  dispatchCommand: async () => null,
  validationRepository: repository,
});

assert.equal(Object.isFrozen(contributions), true);
assert.equal(contributions.length, 1);
assert.equal(contributions[0].id, 'runtime.blind-trial-coordinator');

console.log('v6 blind trial runtime contributions step464 smoke passed');
