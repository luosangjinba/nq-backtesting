import assert from 'node:assert/strict';
import { selectExhaustiveGateScripts } from './exhaustive-test-runner-domain.js';

const catalog = Object.freeze([
  Object.freeze({ environment: 'node', path: 'node-gate.js', role: 'gate' }),
  Object.freeze({ environment: 'node-service', path: 'service-gate.js', role: 'gate' }),
  Object.freeze({ environment: 'browser-local', path: 'browser-gate.js', role: 'gate' }),
  Object.freeze({ environment: 'browser-service', path: 'browser-service-gate.js', role: 'gate' }),
  Object.freeze({ environment: 'node', path: 'runner.js', role: 'runner' }),
  Object.freeze({ environment: 'node', path: 'support.js', role: 'support' }),
  Object.freeze({ environment: 'node', path: 'quarantine.js', role: 'quarantine' }),
]);

assert.deepEqual(selectExhaustiveGateScripts(catalog), [
  { environment: 'node', script: 'node-gate.js' },
]);
assert.deepEqual(selectExhaustiveGateScripts(catalog, { environment: 'node-service' }), [
  { environment: 'node-service', script: 'service-gate.js' },
]);
assert.equal(selectExhaustiveGateScripts(catalog, { environment: 'all' }).length, 4);
assert.throws(
  () => selectExhaustiveGateScripts(catalog, { environment: 'unknown' }),
  /Unsupported exhaustive test environment/,
);

console.log('v6 exhaustive test runner domain smoke passed');
