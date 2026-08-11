import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as evidenceContract from '../src/annotation-evidence-resolver/public.js';
import * as geometryContract from '../src/annotation-geometry-domain/public.js';
import {
  createSemanticPackageRegistry,
  readSemanticPackageManifest,
} from '../src/annotation-semantic-registry/public.js';
import * as moduleHostContract from '../src/module-host/public.js';
import { createModuleHost } from '../src/module-host/public.js';
import * as pluginContract from '../src/plugin-contract/public.js';
import {
  createBuiltInPluginPlan,
  defineBuiltInPluginManifest,
  definePluginParameterSchema,
  listBuiltInPluginStatuses,
  PluginContractError,
  readBuiltInPluginManifest,
  readBuiltInPluginPlan,
  readPluginParameterSchema,
  resolvePluginSettings,
} from '../src/plugin-contract/public.js';
import * as fairValueGap from '../src/semantic-fair-value-gap/public.js';
import {
  createFairValueGapSemanticPackage,
  FAIR_VALUE_GAP_PACKAGE_ID,
  FAIR_VALUE_GAP_PLUGIN_MANIFEST,
  FAIR_VALUE_GAP_TOOL_ID,
  FAIR_VALUE_GAP_TYPE_ID,
  FAIR_VALUE_GAP_VERSION,
} from '../src/semantic-fair-value-gap/public.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/plugin-contract-substrate/negative/cases.json',
), 'utf8'));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(V7_ROOT, relativePath), 'utf8'));
}

function descriptor(id, { lifecycle = [], requiredPorts = [], version = '1.0.0' } = {}) {
  const kind = id.split('.')[0];
  return {
    id,
    version,
    kind,
    owner: 'plugin-contract-harness',
    publicEntry: `src/${id}/public.js`,
    requiredPorts,
    optionalPorts: [],
    lifecycle,
    independentHarness: 'tests/plugin-contract-substrate-harness.js',
    removable: kind === 'optional',
  };
}

function pluginModuleDescriptor(id, options = {}) {
  return descriptor(id, {
    ...options,
    requiredPorts: ['core.plugin-contract', ...(options.requiredPorts ?? [])],
  });
}

function parameterWire() {
  return {
    schemaVersion: 1,
    tabs: [
      {
        id: 'style',
        source: {
          kind: 'settings',
          fields: [
            {
              id: 'lineColor',
              label: 'Line color',
              control: { kind: 'color' },
              defaultValue: '#10b981',
              scopes: ['package', 'profile', 'instance'],
            },
            {
              id: 'lineWidth',
              label: 'Line width',
              control: { kind: 'number', min: 1, max: 5, step: 1 },
              defaultValue: 2,
              scopes: ['profile', 'instance'],
            },
          ],
        },
      },
      {
        id: 'visibility',
        source: {
          kind: 'settings',
          fields: [
            {
              id: 'visible',
              label: 'Visible',
              control: { kind: 'boolean' },
              defaultValue: true,
              scopes: ['instance'],
            },
          ],
        },
      },
    ],
  };
}

function manifestWire({
  contributionId = 'test.plugin-alpha.feature',
  extendsCapabilities = [],
  hostApiRange = '^1.0.0',
  moduleId = 'optional.plugin-alpha',
  packageId = 'test.plugin-alpha',
  provides = null,
  requires = [],
} = {}) {
  return {
    capabilities: {
      extends: extendsCapabilities,
      provides: provides ?? [{ id: contributionId, version: '1.0.0' }],
      requires,
    },
    conformance: { harness: 'tests/plugin-contract-substrate-harness.js' },
    contributions: [{
      displayName: 'Test contribution',
      id: contributionId,
      kind: 'indicator',
      parameters: parameterWire(),
      version: '1.0.0',
    }],
    display: { description: 'Synthetic P0a package.', name: 'Test package' },
    distribution: {
      publisherId: 'first-party.replay-lab',
      source: 'built-in',
      tier: 'core',
      trust: 'first-party',
    },
    hostApiRange,
    manifestVersion: 1,
    module: { id: moduleId, version: '1.0.0' },
    packageId,
    packageVersion: '1.0.0',
    permissions: [],
  };
}

function dependencyManifests() {
  return {
    alpha: defineBuiltInPluginManifest(manifestWire({
      contributionId: 'test.capability-alpha',
      moduleId: 'optional.plugin-alpha',
      packageId: 'test.plugin-alpha',
      requires: [{ id: 'test.capability-beta', range: '^1.0.0' }],
    })),
    beta: defineBuiltInPluginManifest(manifestWire({
      contributionId: 'test.capability-beta',
      moduleId: 'optional.plugin-beta',
      packageId: 'test.plugin-beta',
    })),
  };
}

function planInput(manifests, moduleDescriptors, overrides = {}) {
  return {
    hostApiVersion: overrides.hostApiVersion ?? '1.0.0',
    hostCapabilities: overrides.hostCapabilities ?? [],
    manifests,
    moduleDescriptors: [readJson('src/plugin-contract/module.json'), ...moduleDescriptors],
  };
}

async function failureCode(action) {
  try { await action(); } catch (error) {
    assert.ok(error instanceof PluginContractError, `unexpected error ${error?.stack ?? error}`);
    return error.code;
  }
  assert.fail('Expected plugin contract operation to fail.');
}

const parameterSchema = definePluginParameterSchema(parameterWire());
const parameterValue = readPluginParameterSchema(parameterSchema);
assert.equal(Object.isFrozen(parameterValue), true);
assert.deepEqual(parameterValue.tabs.map(({ id }) => id), ['style', 'visibility']);
assert.deepEqual(resolvePluginSettings(parameterSchema, {
  packageValues: { lineColor: '#f43f5e' },
  profileValues: { lineWidth: 3 },
  instanceValues: { lineWidth: 4, visible: false },
}), {
  schemaVersion: 1,
  values: [
    { fieldId: 'lineColor', source: 'package', value: '#f43f5e' },
    { fieldId: 'lineWidth', source: 'instance', value: 4 },
    { fieldId: 'visible', source: 'instance', value: false },
  ],
});
assert.deepEqual(resolvePluginSettings(parameterSchema), {
  schemaVersion: 1,
  values: [
    { fieldId: 'lineColor', source: 'definition-default', value: '#10b981' },
    { fieldId: 'lineWidth', source: 'definition-default', value: 2 },
    { fieldId: 'visible', source: 'definition-default', value: true },
  ],
});

const fvgManifest = readBuiltInPluginManifest(FAIR_VALUE_GAP_PLUGIN_MANIFEST);
assert.deepEqual(JSON.parse(JSON.stringify(fvgManifest)), fvgManifest);
assert.equal(fvgManifest.packageId, FAIR_VALUE_GAP_PACKAGE_ID);
assert.equal(fvgManifest.packageVersion, FAIR_VALUE_GAP_VERSION);
assert.equal(fvgManifest.module.id, 'optional.semantic-fair-value-gap');
assert.deepEqual(fvgManifest.permissions, []);
assert.deepEqual(fvgManifest.contributions.map(({ id, kind }) => ({ id, kind })), [
  { id: FAIR_VALUE_GAP_TOOL_ID, kind: 'tool' },
  { id: `semantic.${FAIR_VALUE_GAP_TYPE_ID}`, kind: 'semantic-type' },
]);
const fvgParameters = fvgManifest.contributions
  .find(({ kind }) => kind === 'semantic-type').parameters;
assert.deepEqual(fvgParameters.tabs.map(({ id, source }) => ({
  groupIds: source.groupIds,
  id,
})), [
  { groupIds: ['semantic'], id: 'inputs' },
  { groupIds: ['evidence'], id: 'evidence' },
  { groupIds: ['history'], id: 'history' },
]);
assert.equal(fvgParameters.tabs.some(({ id }) => id === 'style' || id === 'visibility'), false);

const semanticManifest = readSemanticPackageManifest(createFairValueGapSemanticPackage({
  evidenceContract,
  geometryContract,
}));
assert.equal(semanticManifest.packageId, fvgManifest.packageId);
assert.equal(semanticManifest.packageVersion, fvgManifest.packageVersion);
assert.deepEqual(semanticManifest.semanticTypes.map(({ typeId, version }) => ({ typeId, version })), [
  { typeId: FAIR_VALUE_GAP_TYPE_ID, version: FAIR_VALUE_GAP_VERSION },
]);
assert.deepEqual(semanticManifest.toolDescriptors.map(({ id }) => id), [FAIR_VALUE_GAP_TOOL_ID]);

const contractDescriptor = readJson('src/plugin-contract/module.json');
const fvgDescriptor = readJson('src/semantic-fair-value-gap/module.json');
assert.equal(fvgDescriptor.requiredPorts.includes('core.plugin-contract'), true);
const hostCapabilities = [
  { id: 'annotation.evidence.bundle', version: '1.0.0' },
  { id: 'annotation.geometry.rectangle', version: '1.0.0' },
  { id: 'annotation.geometry.segment', version: '1.0.0' },
];
const fvgPlan = createBuiltInPluginPlan({
  hostApiVersion: '1.0.0',
  hostCapabilities,
  manifests: [FAIR_VALUE_GAP_PLUGIN_MANIFEST],
  moduleDescriptors: [contractDescriptor, fvgDescriptor],
});
assert.deepEqual(readBuiltInPluginPlan(fvgPlan).moduleIds, ['optional.semantic-fair-value-gap']);

const lifecycle = [];
const definitions = [
  { descriptor: readJson('src/module-host/module.json'), publicApi: moduleHostContract },
  { descriptor: contractDescriptor, publicApi: pluginContract },
  ...fvgDescriptor.requiredPorts
    .filter((id) => id !== 'core.plugin-contract')
    .map((id) => ({ descriptor: descriptor(id), publicApi: Object.freeze({ id }) })),
  {
    descriptor: fvgDescriptor,
    instantiate({ requiredPorts }) {
      assert.equal(requiredPorts['core.plugin-contract'], pluginContract);
      return {
        publicApi: fairValueGap,
        async dispose() { lifecycle.push('dispose:fvg'); },
      };
    },
  },
];
const host = createModuleHost(definitions);
assert.deepEqual(listBuiltInPluginStatuses(fvgPlan, host.snapshot()).map(({ state }) => state), [
  'disabled',
]);
await host.start();
assert.equal(host.getPublicApi(fvgDescriptor.id), fairValueGap);
assert.deepEqual(listBuiltInPluginStatuses(fvgPlan, host.snapshot()).map(({ state }) => state), [
  'active',
]);
await host.stop();
assert.deepEqual(lifecycle, ['dispose:fvg']);
assert.deepEqual(listBuiltInPluginStatuses(fvgPlan, host.snapshot()).map(({ state }) => state), [
  'disabled',
]);
assert.deepEqual(
  Object.keys(pluginContract).filter((name) => /enable|disable|install|start|stop|dispose|update/i.test(name)),
  [],
  'the contract public API must expose no lifecycle or installation command',
);

const dependencyPackages = dependencyManifests();
const betaDescriptor = pluginModuleDescriptor('optional.plugin-beta', { lifecycle: ['dispose'] });
const alphaDescriptor = pluginModuleDescriptor('optional.plugin-alpha', {
  lifecycle: ['dispose'],
  requiredPorts: ['optional.plugin-beta'],
});
const dependencyPlan = createBuiltInPluginPlan(planInput(
  [dependencyPackages.alpha, dependencyPackages.beta],
  [alphaDescriptor, betaDescriptor],
));
assert.deepEqual(readBuiltInPluginPlan(dependencyPlan).moduleIds, [
  'optional.plugin-beta',
  'optional.plugin-alpha',
]);
const dependencyLifecycle = [];
const betaApi = Object.freeze({ packageId: 'test.plugin-beta' });
const alphaApi = Object.freeze({ packageId: 'test.plugin-alpha' });
const dependencyHost = createModuleHost([
  { descriptor: readJson('src/module-host/module.json'), publicApi: moduleHostContract },
  { descriptor: contractDescriptor, publicApi: pluginContract },
  {
    descriptor: betaDescriptor,
    instantiate({ requiredPorts }) {
      assert.equal(requiredPorts['core.plugin-contract'], pluginContract);
      dependencyLifecycle.push('instantiate:beta');
      return {
        publicApi: betaApi,
        async dispose() { dependencyLifecycle.push('dispose:beta'); },
      };
    },
  },
  {
    descriptor: alphaDescriptor,
    instantiate({ requiredPorts }) {
      assert.equal(requiredPorts['core.plugin-contract'], pluginContract);
      assert.equal(requiredPorts['optional.plugin-beta'], betaApi);
      dependencyLifecycle.push('instantiate:alpha');
      return {
        publicApi: alphaApi,
        async dispose() { dependencyLifecycle.push('dispose:alpha'); },
      };
    },
  },
]);
await dependencyHost.start();
await dependencyHost.stop();
assert.deepEqual(dependencyLifecycle, [
  'instantiate:beta',
  'instantiate:alpha',
  'dispose:alpha',
  'dispose:beta',
]);

const manifestSchema = readJson('src/plugin-contract/plugin-manifest.schema.json');
const parametersSchema = readJson('src/plugin-contract/plugin-parameters.schema.json');
assert.equal(manifestSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(parametersSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(
  manifestSchema.$defs.contribution.properties.parameters.oneOf[1].$ref,
  parametersSchema.$id,
);
assert.equal(manifestSchema.additionalProperties, false);
assert.equal(parametersSchema.additionalProperties, false);

const pluginSources = fs.readdirSync(path.join(V7_ROOT, 'src/plugin-contract'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(V7_ROOT, 'src/plugin-contract', file), 'utf8'))
  .join('\n');
for (const forbidden of [
  /from ['"]lightweight-charts/,
  /\bdocument\s*\./,
  /\bwindow\s*\./,
  /\bfetch\s*\(/,
  /\blocalStorage\b/,
  /\bWorker\s*\(/,
]) assert.doesNotMatch(pluginSources, forbidden);

const syntheticSchema = () => definePluginParameterSchema(parameterWire());
const validManifest = () => defineBuiltInPluginManifest(manifestWire());
const negativeActions = {
  'unbranded-manifest': () => readBuiltInPluginManifest({}),
  'community-distribution': () => {
    const wire = manifestWire(); wire.distribution.tier = 'community';
    return defineBuiltInPluginManifest(wire);
  },
  'nonempty-permissions': () => {
    const wire = manifestWire(); wire.permissions = ['network'];
    return defineBuiltInPluginManifest(wire);
  },
  'contribution-without-capability': () => defineBuiltInPluginManifest(manifestWire({ provides: [] })),
  'invalid-tab-source': () => {
    const wire = parameterWire(); wire.tabs[1].source.kind = 'inspector-groups';
    wire.tabs[1].source.groupIds = ['visibility']; delete wire.tabs[1].source.fields;
    return definePluginParameterSchema(wire);
  },
  'duplicate-field-id': () => {
    const wire = parameterWire(); wire.tabs[1].source.fields[0].id = 'lineWidth';
    return definePluginParameterSchema(wire);
  },
  'invalid-default': () => {
    const wire = parameterWire(); wire.tabs[0].source.fields[1].defaultValue = 10;
    return definePluginParameterSchema(wire);
  },
  'nonportable-default': () => {
    const wire = parameterWire(); wire.tabs[0].source.fields[0].defaultValue = () => {};
    return definePluginParameterSchema(wire);
  },
  'unknown-setting': () => resolvePluginSettings(syntheticSchema(), { instanceValues: { unknown: 1 } }),
  'disallowed-scope': () => resolvePluginSettings(syntheticSchema(), { packageValues: { lineWidth: 2 } }),
  'invalid-setting-value': () => resolvePluginSettings(syntheticSchema(), { instanceValues: { lineWidth: 9 } }),
  'missing-contract-module': () => createBuiltInPluginPlan({
    ...planInput([validManifest()], [pluginModuleDescriptor('optional.plugin-alpha')]),
    moduleDescriptors: [pluginModuleDescriptor('optional.plugin-alpha')],
  }),
  'module-mismatch': () => createBuiltInPluginPlan(planInput(
    [validManifest()],
    [pluginModuleDescriptor('optional.plugin-alpha', { version: '2.0.0' })],
  )),
  'host-api-incompatible': () => createBuiltInPluginPlan(planInput(
    [defineBuiltInPluginManifest(manifestWire({ hostApiRange: '^2.0.0' }))],
    [pluginModuleDescriptor('optional.plugin-alpha')],
  )),
  'missing-capability': () => createBuiltInPluginPlan(planInput(
    [defineBuiltInPluginManifest(manifestWire({ requires: [{ id: 'host.missing', range: '^1.0.0' }] }))],
    [pluginModuleDescriptor('optional.plugin-alpha')],
  )),
  'incompatible-capability': () => createBuiltInPluginPlan(planInput(
    [defineBuiltInPluginManifest(manifestWire({ requires: [{ id: 'host.alpha', range: '^2.0.0' }] }))],
    [pluginModuleDescriptor('optional.plugin-alpha')],
    { hostCapabilities: [{ id: 'host.alpha', version: '1.0.0' }] },
  )),
  'capability-collision': () => createBuiltInPluginPlan(planInput(
    [validManifest()],
    [pluginModuleDescriptor('optional.plugin-alpha')],
    { hostCapabilities: [{ id: 'test.plugin-alpha.feature', version: '1.0.0' }] },
  )),
  'duplicate-package': () => createBuiltInPluginPlan(planInput(
    [validManifest(), validManifest()],
    [pluginModuleDescriptor('optional.plugin-alpha')],
  )),
  'missing-extension': () => createBuiltInPluginPlan(planInput(
    [defineBuiltInPluginManifest(manifestWire({
      extendsCapabilities: [{ id: 'missing.contribution', range: '^1.0.0' }],
    }))],
    [pluginModuleDescriptor('optional.plugin-alpha')],
  )),
  'module-dependency-missing': () => {
    const { alpha, beta } = dependencyManifests();
    return createBuiltInPluginPlan(planInput(
      [alpha, beta],
      [pluginModuleDescriptor('optional.plugin-alpha'), pluginModuleDescriptor('optional.plugin-beta')],
    ));
  },
  'module-dependency-undeclared': () => {
    const { beta } = dependencyManifests();
    return createBuiltInPluginPlan(planInput(
      [validManifest(), beta],
      [
        pluginModuleDescriptor('optional.plugin-alpha', {
          requiredPorts: ['optional.plugin-beta'],
        }),
        pluginModuleDescriptor('optional.plugin-beta'),
      ],
    ));
  },
  'dependency-cycle': () => {
    const alpha = defineBuiltInPluginManifest(manifestWire({
      contributionId: 'test.capability-alpha',
      moduleId: 'optional.plugin-alpha',
      packageId: 'test.plugin-alpha',
      requires: [{ id: 'test.capability-beta', range: '^1.0.0' }],
    }));
    const beta = defineBuiltInPluginManifest(manifestWire({
      contributionId: 'test.capability-beta',
      moduleId: 'optional.plugin-beta',
      packageId: 'test.plugin-beta',
      requires: [{ id: 'test.capability-alpha', range: '^1.0.0' }],
    }));
    return createBuiltInPluginPlan(planInput(
      [alpha, beta],
      [pluginModuleDescriptor('optional.plugin-alpha'), pluginModuleDescriptor('optional.plugin-beta')],
    ));
  },
  'unbranded-plan': () => readBuiltInPluginPlan({}),
  'invalid-host-snapshot': () => listBuiltInPluginStatuses(fvgPlan, { status: 'running' }),
  'mismatched-host-snapshot': () => listBuiltInPluginStatuses(fvgPlan, {
    moduleIds: ['core.plugin-contract'],
    status: 'running',
  }),
};

for (const testCase of negativeCases) {
  assert.equal(
    await failureCode(negativeActions[testCase.case]),
    testCase.expectedFailureCode,
    `${testCase.case} must fail with ${testCase.expectedFailureCode}`,
  );
}

const semanticOwner = createSemanticPackageRegistry({
  availableCapabilities: hostCapabilities.map(({ id }) => id),
  packages: [createFairValueGapSemanticPackage({
    evidenceContract,
    geometryContract,
  })],
});
await semanticOwner.enablePackage(FAIR_VALUE_GAP_PACKAGE_ID);
assert.deepEqual(semanticOwner.listTools().map(({ id }) => id), [FAIR_VALUE_GAP_TOOL_ID]);
await semanticOwner.dispose();

console.log(`v7 plugin contract substrate harness passed (${negativeCases.length} negative controls)`);
