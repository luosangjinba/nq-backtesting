import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as activationGeneration from '../src/activation-generation/public.js';
import * as sessionIdentity from '../src/session-identity/public.js';
import * as transactionIdentity from '../src/transaction-identity/public.js';
import * as workspaceTransactionContract from '../src/workspace-transaction-contract/public.js';
import {
  createModuleHost,
  ModuleHostError,
  normalizeModuleDescriptor,
} from '../src/module-host/public.js';
import { verifyProductionModuleAssembly } from './support/production-module-assembly.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/module-host/negative/cases.json'),
  'utf8',
));
normalizeModuleDescriptor(readDescriptor('module-host'));

function readDescriptor(directory) {
  return JSON.parse(fs.readFileSync(path.join(V7_ROOT, `src/${directory}/module.json`), 'utf8'));
}

function descriptor(id, { requiredPorts = [], optionalPorts = [], lifecycle = [], kind = 'core' } = {}) {
  return {
    id,
    version: '1.0.0',
    kind,
    owner: 'module-lifecycle',
    publicEntry: `src/${id}/public.js`,
    requiredPorts,
    optionalPorts,
    lifecycle,
    independentHarness: 'tests/module-host-harness.js',
    removable: kind === 'optional',
  };
}

function staticDefinition(id, options = {}) {
  return { descriptor: descriptor(id, options), publicApi: Object.freeze({ id }) };
}

async function failureCode(action) {
  try {
    await action();
    return null;
  } catch (error) {
    assert.ok(error instanceof ModuleHostError);
    return error.code === 'MODULE_HOST_START_FAILED' && error.cause?.code
      ? error.cause.code
      : error.code;
  }
}

const minimalCore = createModuleHost([
  { descriptor: readDescriptor('session-identity'), publicApi: sessionIdentity },
  { descriptor: readDescriptor('activation-generation'), publicApi: activationGeneration },
  { descriptor: readDescriptor('transaction-identity'), publicApi: transactionIdentity },
  { descriptor: readDescriptor('workspace-transaction-contract'), publicApi: workspaceTransactionContract },
]);
assert.equal(minimalCore.snapshot().status, 'idle');
await minimalCore.start();
const sessionApi = minimalCore.getPublicApi('core.session-identity');
const generationApi = minimalCore.getPublicApi('core.activation-generation');
const transactionApi = minimalCore.getPublicApi('core.transaction-identity');
const contractApi = minimalCore.getPublicApi('core.workspace-transaction-contract');
const identity = contractApi.createWorkspaceTransactionIdentity({
  sessionId: sessionApi.createSessionId('module-host-session'),
  activationGeneration: generationApi.createActivationGeneration(1),
  transactionId: transactionApi.createTransactionId('module-host-transaction'),
});
assert.equal(contractApi.workspaceTransactionIdentitiesEqual(identity, identity), true);
await minimalCore.stop();
await minimalCore.stop();
assert.equal(minimalCore.snapshot().status, 'stopped', 'stop must be idempotent');

let optionalWasAbsent = false;
const optionalConsumer = {
  descriptor: descriptor('core.optional-consumer', {
    optionalPorts: ['optional.telemetry'],
    lifecycle: ['dispose'],
  }),
  instantiate({ optionalPorts, requiredPorts }) {
    optionalWasAbsent = !Object.hasOwn(optionalPorts, 'optional.telemetry');
    assert.deepEqual(Object.keys(requiredPorts), []);
    return { publicApi: {}, dispose() {} };
  },
};
const withoutOptional = createModuleHost([optionalConsumer]);
await withoutOptional.start();
assert.equal(optionalWasAbsent, true);
assert.equal(withoutOptional.snapshot().moduleIds.includes('optional.telemetry'), false);
await withoutOptional.stop();

const lifecycleLog = [];
let liveResources = 0;
function dynamicDefinition(id, options = {}) {
  const moduleDescriptor = descriptor(id, {
    ...options,
    lifecycle: options.lifecycle ?? ['start', 'stop', 'dispose'],
  });
  return {
    descriptor: moduleDescriptor,
    instantiate(ports) {
      lifecycleLog.push(`create:${id}`);
      options.inspectPorts?.(ports);
      return {
        publicApi: Object.freeze({ hostToken: options.hostToken, id }),
        async start() {
          lifecycleLog.push(`start:${id}`);
          liveResources += 1;
          if (options.failStart) throw new Error('intentional start failure');
        },
        async stop() {
          lifecycleLog.push(`stop:${id}`);
          liveResources -= 1;
          if (options.failStop) throw new Error('intentional stop failure');
        },
        async dispose() { lifecycleLog.push(`dispose:${id}`); },
      };
    },
  };
}

const hostOne = createModuleHost([
  dynamicDefinition('core.dependency', { hostToken: 'one' }),
  dynamicDefinition('core.consumer', {
    hostToken: 'one',
    requiredPorts: ['core.dependency'],
    inspectPorts: ({ requiredPorts }) => assert.equal(requiredPorts['core.dependency'].hostToken, 'one'),
  }),
]);
await hostOne.start();
assert.equal(hostOne.getPublicApi('core.dependency').hostToken, 'one');
await hostOne.stop();
assert.deepEqual(lifecycleLog, [
  'create:core.dependency',
  'create:core.consumer',
  'start:core.dependency',
  'start:core.consumer',
  'stop:core.consumer',
  'stop:core.dependency',
  'dispose:core.consumer',
  'dispose:core.dependency',
]);
assert.equal(liveResources, 0);

lifecycleLog.length = 0;
const hostTwo = createModuleHost([dynamicDefinition('core.dependency', { hostToken: 'two' })]);
await hostTwo.start();
assert.equal(hostTwo.getPublicApi('core.dependency').hostToken, 'two');
await hostTwo.stop();
assert.equal(liveResources, 0, 'separate hosts must not share lifecycle resources');

lifecycleLog.length = 0;
const rollbackHost = createModuleHost([
  dynamicDefinition('core.dependency'),
  dynamicDefinition('core.consumer', { requiredPorts: ['core.dependency'], failStart: true }),
]);
assert.equal(await failureCode(() => rollbackHost.start()), 'MODULE_HOST_START_FAILED');
assert.deepEqual(lifecycleLog.slice(-4), [
  'stop:core.consumer',
  'stop:core.dependency',
  'dispose:core.consumer',
  'dispose:core.dependency',
]);
assert.equal(liveResources, 0, 'failed start must release every acquired resource');

const negativeActions = {
  'duplicate-module-id': async () => createModuleHost([
    staticDefinition('core.duplicate'),
    staticDefinition('core.duplicate'),
  ]),
  'missing-required-module': async () => createModuleHost([
    staticDefinition('core.consumer', { requiredPorts: ['core.missing'] }),
  ]),
  'dependency-cycle': async () => createModuleHost([
    staticDefinition('core.alpha', { requiredPorts: ['core.beta'] }),
    staticDefinition('core.beta', { requiredPorts: ['core.alpha'] }),
  ]),
  'static-module-has-lifecycle': async () => createModuleHost([{
    descriptor: descriptor('core.static', { lifecycle: ['dispose'] }),
    publicApi: {},
  }]),
  'dynamic-module-missing-dispose': async () => createModuleHost([{
    descriptor: descriptor('core.dynamic'),
    instantiate: () => ({ publicApi: {} }),
  }]),
  'invalid-public-api': async () => createModuleHost([{
    descriptor: descriptor('core.invalid-api'),
    publicApi: undefined,
  }]),
  'missing-lifecycle-method': async () => {
    const host = createModuleHost([{
      descriptor: descriptor('core.dynamic', { lifecycle: ['dispose'] }),
      instantiate: () => ({ publicApi: {} }),
    }]);
    await host.start();
  },
  'hidden-lifecycle-method': async () => {
    const host = createModuleHost([{
      descriptor: descriptor('core.dynamic', { lifecycle: ['dispose'] }),
      instantiate: () => ({ publicApi: {}, start() {}, dispose() {} }),
    }]);
    await host.start();
  },
  'rollback-cleanup-failure': async () => {
    const host = createModuleHost([
      dynamicDefinition('core.dependency', { failStop: true }),
      dynamicDefinition('core.consumer', { requiredPorts: ['core.dependency'], failStart: true }),
    ]);
    await host.start();
  },
};

for (const fixture of negativeCases) {
  assert.equal(
    await failureCode(negativeActions[fixture.case]),
    fixture.expectedFailureCode,
    `${fixture.case} must fail with its declared code`,
  );
}
assert.equal(liveResources, 0, 'negative controls must not strand resources');

const manifest = JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'docs/v7-architecture-manifest.json'),
  'utf8',
));
const productionAssembly = await verifyProductionModuleAssembly({ manifest, v7Root: V7_ROOT });
assert.equal(productionAssembly.moduleIds.length, manifest.activeProductionModules.length);
assert.equal(productionAssembly.optionalRemovalMatrix.length, 3);

console.log(
  `v7 module host harness passed (${negativeCases.length} negative controls, `
  + `${productionAssembly.moduleIds.length} production descriptors, `
  + `${productionAssembly.optionalRemovalMatrix.length} optional-removal case)`,
);
