import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProductionBuiltInPluginPlan } from '../app/core-plugin-catalog.js';
import { createCorePluginProfileRuntime } from '../src/core-plugin-profile/public.js';
import { createModuleHost } from '../src/module-host/public.js';
import {
  CORE_PLUGIN_PROFILE_RECORD_SCHEMA,
  CORE_PLUGIN_PROFILE_RECORD_VERSION,
  createBuiltInPluginPlan,
  createCorePluginBootSelection,
  createCorePluginCatalogSnapshot,
  createCorePluginProfileRecord,
  createKernelSafeCorePluginProfile,
  defineBuiltInPluginManifest,
  normalizeCorePluginProfile,
  planCorePluginApplicationImpact,
  readBuiltInPluginPlan,
  readCorePluginProfileRecord,
} from '../src/plugin-contract/public.js';
import { isReplicatedStateKey } from '../src/server-state-sync/snapshot.js';
import { createMemoryWebStorage } from './support/memory-web-storage.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');

function descriptor(id, { kind = 'optional', removable = kind === 'optional', requiredPorts = [] } = {}) {
  return Object.freeze({
    id,
    independentHarness: 'tests/core-plugin-center-harness.js',
    kind,
    lifecycle: [],
    optionalPorts: [],
    owner: 'plugin-test',
    publicEntry: 'src/plugin-contract/public.js',
    removable,
    requiredPorts,
    version: '1.0.0',
  });
}

function manifest({ dependency = null, id, moduleId, setting = false }) {
  const contributionId = `indicator.${id}`;
  return defineBuiltInPluginManifest({
    capabilities: {
      extends: [],
      provides: [{ id: contributionId, version: '1.0.0' }],
      requires: dependency === null ? [] : [{ id: dependency, range: '^1.0.0' }],
    },
    conformance: { harness: 'tests/core-plugin-center-harness.js' },
    contributions: [{
      displayName: `${id} indicator`,
      id: contributionId,
      kind: 'indicator',
      parameters: setting ? {
        schemaVersion: 1,
        tabs: [{
          id: 'inputs',
          source: {
            fields: [{
              control: { kind: 'number', max: 100, min: 1, step: 1 },
              defaultValue: 14,
              id: 'length',
              label: 'Length',
              scopes: ['package', 'profile', 'instance'],
            }],
            kind: 'settings',
          },
        }],
      } : null,
      version: '1.0.0',
    }],
    display: { description: `${id} synthetic dependency fixture.`, name: `${id} plugin` },
    distribution: {
      publisherId: 'first-party.replay-lab', source: 'built-in', tier: 'core', trust: 'first-party',
    },
    hostApiRange: '^1.0.0',
    manifestVersion: 1,
    module: { id: moduleId, version: '1.0.0' },
    packageId: `first-party.${id}`,
    packageVersion: '1.0.0',
    permissions: [],
  });
}

function fixturePlan() {
  const pluginContract = JSON.parse(fs.readFileSync(
    path.join(V7_ROOT, 'src/plugin-contract/module.json'), 'utf8',
  ));
  const base = manifest({ id: 'base-zone', moduleId: 'optional.base-zone', setting: true });
  const derived = manifest({
    dependency: 'indicator.base-zone', id: 'derived-zone', moduleId: 'optional.derived-zone',
  });
  const descriptors = Object.freeze([
    pluginContract,
    descriptor('optional.base-zone', { requiredPorts: ['core.plugin-contract'] }),
    descriptor('optional.derived-zone', {
      requiredPorts: ['core.plugin-contract', 'optional.base-zone'],
    }),
    descriptor('optional.derived-workflow', { requiredPorts: ['optional.derived-zone'] }),
  ]);
  return Object.freeze({
    descriptors,
    plan: createBuiltInPluginPlan({
      hostApiVersion: '1.0.0', hostCapabilities: [], manifests: [base, derived], moduleDescriptors: descriptors,
    }),
  });
}

function adapter(storage) {
  return Object.freeze({
    read: (key) => storage.getItem(key),
    remove: (key) => storage.removeItem(key),
    write: (key, value) => storage.setItem(key, value),
  });
}

function capture(operation) {
  try { operation(); } catch (error) { return error; }
  assert.fail('Expected operation to fail.');
}

function runtimeFixture({ candidate, descriptors, failures = [], modules, plan, selection, storage }) {
  let id = 0;
  const runtime = createCorePluginProfileRuntime({
    idFactory: () => `attempt.fixture.${++id}`,
    moduleDescriptors: descriptors,
    plan,
    readModuleHostSnapshot: () => Object.freeze({ moduleIds: Object.freeze([...modules]), status: 'running' }),
    storage: adapter(storage),
  });
  runtime.initializeBoot({ candidate, failures, plan, selection });
  runtime.acceptApplicationReady();
  return runtime;
}

function readStored(storage, key = 'v7.core-plugin-profile:device') {
  return JSON.parse(storage.getItem(key));
}

export async function runCorePluginCenterHeadlessHarness() {
  const negativeFixture = JSON.parse(fs.readFileSync(path.join(
    TEST_DIR, 'fixtures/core-plugin-center/negative/cases.json',
  ), 'utf8'));
  assert.equal(negativeFixture.schemaVersion, 1);
  const negativeErrors = new Map();
  const { descriptors, plan } = fixturePlan();
  const planned = readBuiltInPluginPlan(plan);
  assert.deepEqual(planned.packages.map(({ manifest: value }) => value.packageId), [
    'first-party.base-zone', 'first-party.derived-zone',
  ]);

  const unknownProfileError = capture(() => normalizeCorePluginProfile(plan, {
    enabledPackageIds: ['first-party.foreign'], packageValues: {}, profileValues: {},
  }));
  negativeErrors.set('unknown-profile-package', unknownProfileError);

  const storage = createMemoryWebStorage({
    'v7.annotation-document:session.fixture': '{"artifactRevision":41}',
  });
  let selection = createCorePluginBootSelection({ plan, rawRecord: null });
  let runtime = runtimeFixture({
    candidate: selection.candidates[0],
    descriptors,
    modules: ['core.plugin-contract', 'optional.base-zone', 'optional.derived-zone'],
    plan,
    selection,
    storage,
  });
  assert.equal(runtime.snapshot().packages.every(({ runtimeState }) => runtimeState === 'active'), true);

  const invalidSettingError = capture(() => runtime.prepare({
    contributionId: 'indicator.base-zone',
    expectedRevision: runtime.snapshot().revision,
    kind: 'replace-settings',
    packageId: 'first-party.base-zone',
    scope: 'profile',
    values: { length: 7.5 },
  }));
  negativeErrors.set('invalid-package-setting', invalidSettingError);

  const settingPreparation = runtime.prepare({
    contributionId: 'indicator.base-zone',
    expectedRevision: runtime.snapshot().revision,
    kind: 'replace-settings',
    packageId: 'first-party.base-zone',
    scope: 'profile',
    values: { length: 21 },
  });
  runtime.stage(settingPreparation);
  assert.equal(runtime.snapshot().packages[0].changeState, 'pending-settings');
  const stalePreparation = settingPreparation;
  runtime.dispose();

  selection = createCorePluginBootSelection({
    plan, rawRecord: storage.getItem('v7.core-plugin-profile:device'),
  });
  runtime = runtimeFixture({
    candidate: selection.candidates[0],
    descriptors,
    modules: ['core.plugin-contract', 'optional.base-zone', 'optional.derived-zone'],
    plan,
    selection,
    storage,
  });
  assert.equal(runtime.snapshot().restartRequired, false);
  assert.equal(runtime.snapshot().packages[0].settings[0].profileValues.length, 21);

  const disablePreparation = runtime.prepare({
    enabled: false,
    expectedRevision: runtime.snapshot().revision,
    kind: 'toggle-package',
    packageId: 'first-party.base-zone',
  });
  assert.deepEqual(disablePreparation.impact.dependencyCascadePackageIds, ['first-party.derived-zone']);
  assert.deepEqual(disablePreparation.impact.applicationModuleIds, ['optional.derived-workflow']);
  const unconfirmed = capture(() => runtime.stage(disablePreparation));
  negativeErrors.set('unconfirmed-dependency-cascade', unconfirmed);
  runtime.stage(disablePreparation, { confirmationId: disablePreparation.impact.confirmationId });
  assert.equal(runtime.snapshot().packages.every(({ runtimeState }) => runtimeState === 'active'), true);
  assert.equal(runtime.snapshot().packages.every(({ changeState }) => (
    changeState === 'pending-dependency-cascade'
  )), true);
  const staleError = capture(() => runtime.stage(stalePreparation));
  negativeErrors.set('stale-preparation', staleError);
  const receipt = runtime.restartReceipt({ expectedRevision: runtime.snapshot().revision });
  runtime.dispose();

  selection = createCorePluginBootSelection({
    plan, rawRecord: storage.getItem('v7.core-plugin-profile:device'),
  });
  assert.equal(selection.candidates[0].source, 'pending');
  runtime = runtimeFixture({
    candidate: selection.candidates[0], descriptors, modules: ['core.plugin-contract'], plan, selection, storage,
  });
  assert.equal(runtime.snapshot().packages.every(({ runtimeState }) => runtimeState === 'disabled'), true);
  assert.equal(readStored(storage).active.profileValues['first-party.base-zone']['indicator.base-zone'].length, 21);
  assert.equal(storage.getItem('v7.annotation-document:session.fixture'), '{"artifactRevision":41}');

  const enablePreparation = runtime.prepare({
    enabled: true,
    expectedRevision: runtime.snapshot().revision,
    kind: 'toggle-package',
    packageId: 'first-party.derived-zone',
  });
  assert.deepEqual(enablePreparation.impact.dependencyCascadePackageIds, ['first-party.base-zone']);
  runtime.stage(enablePreparation, { confirmationId: enablePreparation.impact.confirmationId });
  runtime.dispose();
  selection = createCorePluginBootSelection({
    plan, rawRecord: storage.getItem('v7.core-plugin-profile:device'),
  });
  runtime = runtimeFixture({
    candidate: selection.candidates[0],
    descriptors,
    modules: ['core.plugin-contract', 'optional.base-zone', 'optional.derived-zone'],
    plan,
    selection,
    storage,
  });
  assert.equal(runtime.snapshot().packages.every(({ runtimeState }) => runtimeState === 'active'), true);
  assert.equal(runtime.snapshot().packages[0].settings[0].profileValues.length, 21);

  const fallbackPreparation = runtime.prepare({
    enabled: false,
    expectedRevision: runtime.snapshot().revision,
    kind: 'toggle-package',
    packageId: 'first-party.base-zone',
  });
  runtime.stage(fallbackPreparation, { confirmationId: fallbackPreparation.impact.confirmationId });
  runtime.dispose();
  selection = createCorePluginBootSelection({
    plan, rawRecord: storage.getItem('v7.core-plugin-profile:device'),
  });
  const failedAttempt = Object.freeze({
    attemptId: selection.candidates[0].attemptId,
    code: 'MODULE_HOST_START_FAILED',
    moduleId: 'optional.base-zone',
    packageId: 'first-party.base-zone',
    phase: 'start',
  });
  runtime = runtimeFixture({
    candidate: selection.candidates[1],
    descriptors,
    failures: [failedAttempt],
    modules: ['core.plugin-contract', 'optional.base-zone', 'optional.derived-zone'],
    plan,
    selection,
    storage,
  });
  assert.equal(runtime.snapshot().packages[0].runtimeState, 'failed');
  assert.equal(runtime.snapshot().restartRequired, true);
  runtime.discardPending({ expectedRevision: runtime.snapshot().revision });
  const staleReceiptError = capture(() => runtime.validateRestartReceipt(receipt));
  negativeErrors.set('stale-restart-receipt', staleReceiptError);

  const recordValue = readCorePluginProfileRecord(createCorePluginProfileRecord(plan, {
    active: createKernelSafeCorePluginProfile(plan),
    lastFailure: null,
    pending: null,
    revision: 0,
    schema: CORE_PLUGIN_PROFILE_RECORD_SCHEMA,
    version: CORE_PLUGIN_PROFILE_RECORD_VERSION,
  }));
  const mismatchedHostError = capture(() => createCorePluginCatalogSnapshot({
    effectiveProfile: recordValue.active,
    generationSource: 'kernel-safe',
    moduleHostSnapshot: { moduleIds: ['optional.base-zone'], status: 'running' },
    plan,
    record: createCorePluginProfileRecord(plan, recordValue),
  }));
  negativeErrors.set('mismatched-host-generation', mismatchedHostError);

  const nonRemovableError = capture(() => planCorePluginApplicationImpact(
    plan,
    createKernelSafeCorePluginProfile(plan),
    [...descriptors, descriptor('core.non-removable-consumer', {
      kind: 'core', removable: false, requiredPorts: ['optional.base-zone'],
    })],
  ));
  negativeErrors.set('non-removable-application-impact', nonRemovableError);

  const corruptStorage = createMemoryWebStorage({
    'v7.core-plugin-profile:device': '{not-json',
  });
  const corruptSelection = createCorePluginBootSelection({ plan, rawRecord: '{not-json' });
  const corruptRuntime = runtimeFixture({
    candidate: corruptSelection.candidates[0],
    descriptors,
    modules: ['core.plugin-contract', 'optional.base-zone', 'optional.derived-zone'],
    plan,
    selection: corruptSelection,
    storage: corruptStorage,
  });
  assert.equal(corruptRuntime.snapshot().recoveryCode, 'stored-record-invalid');
  assert.equal(corruptStorage.getItem('v7.core-plugin-profile:device'), '{not-json');
  corruptRuntime.dispose();
  assert.equal(isReplicatedStateKey('v7.core-plugin-profile:device'), false);

  let live = 0;
  const trace = [];
  function dynamic(id, { failStart = false, requiredPorts = [] } = {}) {
    return {
      descriptor: Object.freeze({
        ...descriptor(id, {
          kind: id.startsWith('optional.') ? 'optional' : 'core',
          removable: id.startsWith('optional.'),
          requiredPorts,
        }),
        lifecycle: ['start', 'stop', 'dispose'],
      }),
      instantiate() {
        return {
          publicApi: {},
          async dispose() { trace.push(`dispose:${id}`); },
          async start() { trace.push(`start:${id}`); live += 1; if (failStart) throw new Error('fixture'); },
          async stop() { trace.push(`stop:${id}`); live -= 1; },
        };
      },
    };
  }
  const failedHost = createModuleHost([
    dynamic('core.profile-foundation'),
    dynamic('optional.failure-probe', { failStart: true, requiredPorts: ['core.profile-foundation'] }),
  ]);
  let hostError;
  try { await failedHost.start(); } catch (error) { hostError = error; }
  negativeErrors.set('module-start-failure', hostError);
  assert.equal(hostError.moduleId, 'optional.failure-probe');
  assert.equal(hostError.phase, 'start');
  assert.deepEqual(trace.slice(-4), [
    'stop:optional.failure-probe', 'stop:core.profile-foundation',
    'dispose:optional.failure-probe', 'dispose:core.profile-foundation',
  ]);
  assert.equal(live, 0);

  for (const testCase of negativeFixture.cases) {
    assert.equal(negativeErrors.get(testCase.name)?.code, testCase.expectedCode, testCase.name);
  }

  const architecture = JSON.parse(fs.readFileSync(
    path.join(V7_ROOT, 'docs/v7-architecture-manifest.json'), 'utf8',
  ));
  const productionDescriptors = architecture.activeProductionModules.map((relativePath) => (
    JSON.parse(fs.readFileSync(path.join(V7_ROOT, relativePath), 'utf8'))
  ));
  const productionPlan = readBuiltInPluginPlan(createProductionBuiltInPluginPlan(productionDescriptors));
  assert.deepEqual(productionPlan.packages.map(({ manifest: value }) => value.packageId), [
    'first-party.fair-value-gap',
  ]);
  const uiSource = fs.readFileSync(path.join(
    V7_ROOT, 'src/plugin-center-ui/plugin-center-control.js',
  ), 'utf8');
  assert.doesNotMatch(uiSource, /fair-value-gap|imbalance\.fvg|lowerPrice|upperPrice/i);
  runtime.dispose();
  return Object.freeze({ negativeCount: negativeFixture.cases.length });
}
