import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  definePluginParameterSchema,
  readPluginParameterSchema,
  resolvePluginSettings,
} from '../src/plugin-contract/public.js';
import {
  canonicalJson,
  resolveCapabilityGraph,
  runDeveloperKit,
} from '../tools/plugin-developer-kit/public.js';
import { digestValue } from '../tools/plugin-developer-kit/domain/canonical-json.js';
import { DeveloperKitFailure, diagnostic } from '../tools/plugin-developer-kit/domain/diagnostic.js';
import { loadReleaseCatalog } from '../tools/plugin-developer-kit/adapters/release-catalog.js';
import {
  bundleIndex,
  encodeTar,
  jsonEntry,
  parseTar,
} from '../tools/plugin-developer-kit/adapters/tar.js';

const TEST_ROOT = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_ROOT, '..');
const CLI = path.join(V7_ROOT, 'tools/plugin-developer-kit/cli/main.js');
const NEGATIVE_CASES = JSON.parse(fs.readFileSync(path.join(
  TEST_ROOT,
  'fixtures/plugin-developer-kit/negative/cases.json',
), 'utf8'));
const BUNDLE_LOGICAL_PATH = 'bundles/first-party.fair-value-gap-1.0.0.v7dk.tar';

function operationRequest(operation, context, options = {}) {
  const request = { operation, operationVersion: 1, options, schemaVersion: 1 };
  if (['scaffold', 'validate', 'build', 'test', 'preview', 'pack'].includes(operation)) {
    request.workspaceRoot = context.workspace;
  }
  if (['build', 'test', 'preview', 'pack'].includes(operation)) request.outputRoot = context.output;
  return request;
}

function pass(request, overrides) {
  const result = runDeveloperKit(request, overrides);
  assert.equal(result.status, 'passed', `${request.operation}: ${canonicalJson(result.diagnostics)}`);
  assert.equal(result.exitCode, 0);
  return result;
}

function resultCode(request, overrides) {
  const result = runDeveloperKit(request, overrides);
  assert.notEqual(result.status, 'passed', `${request.operation} must fail closed`);
  assert.ok(result.diagnostics.length > 0);
  return result.diagnostics[0].code;
}

function thrownCode(action) {
  try { action(); } catch (error) {
    assert.ok(error instanceof DeveloperKitFailure, error?.stack ?? String(error));
    return error.diagnostics[0].code;
  }
  assert.fail('Expected a DeveloperKitFailure.');
}

function context({ scaffold = true } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'v7dk-h116-'));
  const value = {
    base,
    output: path.join(base, 'output'),
    workspace: path.join(base, 'workspace'),
  };
  if (scaffold) {
    value.scaffoldResult = pass(operationRequest('scaffold', value, { templateId: 'trusted-fvg-v1' }));
  }
  return value;
}

function dispose(value) {
  fs.rmSync(value.base, { force: true, recursive: true });
}

function withContext(action, options) {
  const value = context(options);
  try { return action(value); } finally { dispose(value); }
}

function mutateJson(file, mutate) {
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(value);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function appendSource(value, text) {
  fs.appendFileSync(path.join(value.workspace, 'src/index.ts'), `\n${text}\n`);
}

function validate(value) {
  return pass(operationRequest('validate', value));
}

function fullFlow(value) {
  const results = {
    build: pass(operationRequest('build', value)),
    test: pass(operationRequest('test', value)),
    preview: pass(operationRequest('preview', value)),
    pack: pass(operationRequest('pack', value)),
  };
  results.inspect = pass({
    operation: 'inspect',
    operationVersion: 1,
    options: { path: BUNDLE_LOGICAL_PATH, target: 'bundle' },
    schemaVersion: 1,
    workspaceRoot: value.output,
  });
  return results;
}

function workspaceVariant(mutate, operation = 'validate', prepare) {
  return withContext((value) => {
    validate(value);
    mutate(value);
    if (prepare) prepare(value);
    return resultCode(operationRequest(operation, value));
  });
}

function graphPackage(packageId, provides, requires = [], extensions = []) {
  return {
    capabilities: { extends: extensions, provides, requires },
    packageId,
  };
}

function validGraph() {
  return resolveCapabilityGraph({
    hostCapabilities: [{ id: 'host.base', version: '1.0.0' }],
    manifests: [
      graphPackage('test.alpha', [{ id: 'test.alpha.value', version: '1.0.0' }]),
      graphPackage(
        'test.beta',
        [{ id: 'test.beta.value', version: '1.0.0' }],
        [{ id: 'test.alpha.value', range: '^1.0.0' }],
      ),
      graphPackage(
        'test.gamma',
        [{ id: 'test.gamma.value', version: '1.0.0' }],
        [],
        [{ id: 'test.beta.value', range: '^1.0.0' }],
      ),
    ],
  });
}

function recalculateHeaderChecksum(bytes, offset = 0) {
  bytes.fill(0x20, offset + 148, offset + 156);
  let sum = 0;
  for (let index = offset; index < offset + 512; index += 1) sum += bytes[index];
  const encoded = `${sum.toString(8).padStart(6, '0')}\0 `;
  bytes.write(encoded, offset + 148, 8, 'ascii');
}

function rewriteHeader(bytes, mutate, offset = 0) {
  const copy = Buffer.from(bytes);
  mutate(copy, offset);
  recalculateHeaderChecksum(copy, offset);
  return copy;
}

function writeHeaderText(bytes, offset, length, value) {
  bytes.fill(0, offset, offset + length);
  bytes.write(value, offset, length, 'utf8');
}

function writeHeaderOctal(bytes, offset, length, value) {
  writeHeaderText(bytes, offset, length, `${value.toString(8).padStart(length - 1, '0')}\0`);
}

function headerOffsets(bytes) {
  const offsets = [];
  let offset = 0;
  while (offset + 512 <= bytes.length && !bytes.subarray(offset, offset + 512).every((byte) => byte === 0)) {
    offsets.push(offset);
    const sizeText = bytes.subarray(offset + 124, offset + 136).toString('ascii').replace(/[\0 ]+$/u, '');
    const size = Number.parseInt(sizeText, 8);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return offsets;
}

function writeBundle(value, logicalPath, bytes) {
  const target = path.join(value.output, ...logicalPath.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}

function inspectCode(value, logicalPath) {
  return resultCode({
    operation: 'inspect',
    operationVersion: 1,
    options: { path: logicalPath, target: 'bundle' },
    schemaVersion: 1,
    workspaceRoot: value.output,
  });
}

// Complete discovery and machine-readable toolchain identity.
const discovery = pass({ operation: 'discover', operationVersion: 1, options: {}, schemaVersion: 1 });
const discovered = discovery.artifacts[0].value;
const harnessRules = JSON.parse(fs.readFileSync(path.join(V7_ROOT, 'docs/v7-harness-rules.json'), 'utf8'));
const h116 = harnessRules.rules.find(({ id }) => id === 'H116');
assert.ok(harnessRules.stepOrder.indexOf(harnessRules.currentStep)
  >= harnessRules.stepOrder.indexOf('P1b.3'));
assert.equal(h116.state, 'accepted');
assert.equal(h116.harness, 'tests/plugin-developer-kit-harness.js');
assert.equal(h116.humanReviewRequired, false);
assert.equal(discovered.schemas.length, 22);
assert.equal(discovered.catalogs.length, 10);
const discoveredOperations = discovered.catalogs.find(({ path: logicalPath }) => logicalPath === 'catalogs/operations.json')
  .value.operations;
assert.deepEqual(discoveredOperations.filter(({ version }) => version === 1).map(({ id }) => id), [
  'discover', 'scaffold', 'validate', 'build', 'test', 'preview', 'pack', 'inspect',
]);
assert.deepEqual(discoveredOperations.filter(({ version }) => version === 2).map(({ id }) => id), ['pack', 'inspect']);
assert.equal(discovered.toolchain.compiler.version, '7.0.2');
assert.equal(discovered.toolchain.compiler.license, 'Apache-2.0');
assert.match(discovered.toolchain.compiler.integrity, /^sha512-/u);
assert.equal(discovered.toolchain.compiler.dependencies.length, 20);
assert.equal(discovered.toolchain.compiler.dependencies.every(({ integrity, license, optional, version }) => (
  integrity.startsWith('sha512-') && license === 'Apache-2.0' && optional === true && version === '7.0.2'
)), true);
assert.equal(discovered.toolchain.archive.installable, false);

// Two independent end-to-end runs must produce identical results and archive bytes.
const first = context();
const second = context();
let firstFlow;
let secondFlow;
try {
  const firstValidate = validate(first);
  const secondValidate = validate(second);
  assert.equal(canonicalJson(first.scaffoldResult), canonicalJson(second.scaffoldResult));
  assert.equal(canonicalJson(firstValidate), canonicalJson(secondValidate));
  firstFlow = fullFlow(first);
  secondFlow = fullFlow(second);
  for (const operation of ['build', 'test', 'preview', 'pack', 'inspect']) {
    assert.equal(canonicalJson(firstFlow[operation]), canonicalJson(secondFlow[operation]), `${operation} must be root-independent`);
  }
  assert.deepEqual(
    fs.readFileSync(path.join(first.output, BUNDLE_LOGICAL_PATH)),
    fs.readFileSync(path.join(second.output, BUNDLE_LOGICAL_PATH)),
  );
  const forbiddenAmbient = [first.base, second.base, os.hostname(), 'H116_AMBIENT_SECRET'];
  process.env.V7DK_H116_SECRET = 'H116_AMBIENT_SECRET';
  const canonicalResults = canonicalJson({ discovery, firstFlow, secondFlow });
  for (const value of forbiddenAmbient) assert.equal(canonicalResults.includes(value), false);
} finally {
  delete process.env.V7DK_H116_SECRET;
  dispose(first);
  dispose(second);
}

// CLI transport is byte-equivalent to the Library for the same request.
withContext((value) => {
  const request = operationRequest('validate', value);
  const requestFile = path.join(value.base, 'request.json');
  fs.writeFileSync(requestFile, canonicalJson(request));
  const library = runDeveloperKit(request);
  const cli = spawnSync(process.execPath, [CLI, '--request', requestFile], {
    cwd: V7_ROOT,
    encoding: 'utf8',
    env: { LANG: 'C', LC_ALL: 'C', PATH: process.env.PATH, TZ: 'Pacific/Auckland' },
  });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(cli.stdout, `${canonicalJson(library)}\n`);
});

// Schema/catalog/compiler/source byte changes are content-addressed without affecting unrelated identities.
const release = loadReleaseCatalog({ refresh: true });
for (const [label, identity] of [
  ['source', { source: release.exampleFiles }],
  ['schema', { schemas: release.schemas.map(({ id, sha256 }) => ({ id, sha256 })) }],
  ['compiler', { compiler: release.compiler }],
  ['catalog', { catalogs: release.catalogs.map(({ path: logicalPath, sha256 }) => ({ path: logicalPath, sha256 })) }],
]) {
  assert.notEqual(digestValue(identity), digestValue({ ...identity, changedByte: label }));
}

// Generic host-rendered parameter controls round-trip through the existing P0a contract.
const hostSchemaWire = JSON.parse(fs.readFileSync(path.join(
  V7_ROOT,
  'sdk/plugin/examples/host-schema-v1/parameters.json',
), 'utf8'));
const hostSchema = definePluginParameterSchema(hostSchemaWire);
const hostSchemaValue = readPluginParameterSchema(hostSchema);
assert.deepEqual(
  [...new Set(hostSchemaValue.tabs.flatMap(({ source }) => source.kind === 'settings'
    ? source.fields.map(({ control }) => control.kind) : []))].sort(),
  ['boolean', 'color', 'number', 'select', 'text'],
);
assert.equal(resolvePluginSettings(hostSchema).values.length, 6);
assert.equal(firstFlow.preview.receipt.installable, false);
assert.equal(firstFlow.preview.receipt.productionExecutionAuthorized, false);

// Synthetic dependency reference proves stable order before its negative variants.
assert.deepEqual(validGraph().packageOrder, ['test.alpha', 'test.beta', 'test.gamma']);

const controls = {
  'request-closure': () => {
    pass({ operation: 'discover', operationVersion: 1, options: {}, schemaVersion: 1 });
    const primary = resultCode({
      operation: 'discover', operationVersion: 1, options: {}, schemaVersion: 1, unknown: true,
    });
    assert.equal(resultCode({ operation: 'discover', operationVersion: 2, options: {}, schemaVersion: 1 }), 'V7DK_REQUEST_INVALID');
    return primary;
  },

  'unsupported-profile-sdk': () => {
    pass({ operation: 'discover', operationVersion: 1, options: {}, schemaVersion: 1 });
    const primary = resultCode({
      operation: 'discover', operationVersion: 1, options: {}, schemaVersion: 1, sdkVersion: '2.0.0',
    });
    assert.equal(resultCode({
      contractProfile: 'community-worker-v1',
      operation: 'discover',
      operationVersion: 1,
      options: {},
      schemaVersion: 1,
    }), 'V7DK_PROFILE_UNSUPPORTED');
    return primary;
  },

  'unauthorized-community-worker-subpane': () => {
    const primary = workspaceVariant((value) => mutateJson(path.join(value.workspace, 'v7-plugin-kit.json'), (wire) => {
      wire.contractProfile = 'community-worker-v1';
    }));
    const indicator = workspaceVariant((value) => mutateJson(path.join(value.workspace, 'plugin.manifest.json'), (wire) => {
      wire.contributions.find(({ kind }) => kind === 'semantic-type').kind = 'indicator';
    }));
    assert.equal(indicator, 'V7DK_CONTRIBUTION_UNAVAILABLE');
    return primary;
  },

  'forged-first-party': () => workspaceVariant((value) => mutateJson(
    path.join(value.workspace, 'plugin.manifest.json'),
    (wire) => { wire.packageId = 'first-party.forged-gap'; },
  )),

  'manifest-field-permission': () => {
    const primary = workspaceVariant((value) => mutateJson(
      path.join(value.workspace, 'plugin.manifest.json'),
      (wire) => { wire.unknownClaim = true; },
    ));
    const permission = workspaceVariant((value) => mutateJson(
      path.join(value.workspace, 'plugin.manifest.json'),
      (wire) => { wire.permissions = ['network']; },
    ));
    assert.equal(permission, 'V7DK_PERMISSION_UNSUPPORTED');
    return primary;
  },

  'capability-graph': () => {
    assert.deepEqual(validGraph().packageOrder, ['test.alpha', 'test.beta', 'test.gamma']);
    const host = [{ id: 'host.base', version: '1.0.0' }];
    const missing = thrownCode(() => resolveCapabilityGraph({
      hostCapabilities: host,
      manifests: [graphPackage(
        'test.alpha',
        [{ id: 'test.alpha.value', version: '1.0.0' }],
        [{ id: 'missing.value', range: '^1.0.0' }],
      )],
    }));
    assert.equal(thrownCode(() => resolveCapabilityGraph({
      hostCapabilities: [{ id: 'host.base', version: '2.0.0' }],
      manifests: [graphPackage(
        'test.alpha',
        [{ id: 'test.alpha.value', version: '1.0.0' }],
        [{ id: 'host.base', range: '^1.0.0' }],
      )],
    })), 'V7DK_CAPABILITY_INCOMPATIBLE');
    assert.equal(thrownCode(() => resolveCapabilityGraph({
      hostCapabilities: [{ id: 'test.alpha.value', version: '1.0.0' }],
      manifests: [graphPackage('test.alpha', [{ id: 'test.alpha.value', version: '1.0.0' }])],
    })), 'V7DK_CAPABILITY_COLLISION');
    assert.equal(thrownCode(() => resolveCapabilityGraph({
      hostCapabilities: host,
      manifests: [graphPackage('test.alpha', [
        { id: 'test.alpha.value', version: '1.0.0' },
        { id: 'test.alpha.value', version: '1.0.0' },
      ])],
    })), 'V7DK_CAPABILITY_DUPLICATE');
    assert.equal(thrownCode(() => resolveCapabilityGraph({
      hostCapabilities: host,
      manifests: [graphPackage(
        'test.alpha',
        [{ id: 'test.alpha.value', version: '1.0.0' }],
        [{ id: 'test.alpha.value', range: '^1.0.0' }],
      )],
    })), 'V7DK_CAPABILITY_SELF_REFERENCE');
    assert.equal(thrownCode(() => resolveCapabilityGraph({
      hostCapabilities: host,
      manifests: [
        graphPackage(
          'test.alpha',
          [{ id: 'test.alpha.value', version: '1.0.0' }],
          [{ id: 'test.beta.value', range: '^1.0.0' }],
        ),
        graphPackage(
          'test.beta',
          [{ id: 'test.beta.value', version: '1.0.0' }],
          [{ id: 'test.alpha.value', range: '^1.0.0' }],
        ),
      ],
    })), 'V7DK_CAPABILITY_CYCLE');
    return missing;
  },

  'custom-ui-owner-handle': () => {
    const primary = workspaceVariant((value) => appendSource(value, 'const forbiddenDom = document.body;'));
    assert.equal(workspaceVariant((value) => appendSource(value, 'const forbiddenCss = new CSSStyleSheet();')), 'V7DK_CUSTOM_UI_FORBIDDEN');
    assert.equal(workspaceVariant((value) => appendSource(value, 'type ForbiddenChart = IChartApi;')), 'V7DK_API_FORBIDDEN');
    return primary;
  },

  'forbidden-imports': () => {
    const primary = workspaceVariant((value) => appendSource(value, "import fs from 'node:fs';"));
    for (const source of [
      "import net from 'node:net';",
      "import child from 'node:child_process';",
      "import remote from 'https://example.invalid/plugin.js';",
      "const dynamicModule = import('./dynamic.js');",
    ]) {
      assert.equal(workspaceVariant((value) => appendSource(value, source)), 'V7DK_IMPORT_FORBIDDEN');
    }
    return primary;
  },

  'dynamic-code-lifecycle': () => {
    const primary = workspaceVariant((value) => appendSource(value, "const forbiddenEval = eval('1');"));
    assert.equal(workspaceVariant((value) => appendSource(value, "const forbiddenFunction = Function('return 1');")), 'V7DK_API_FORBIDDEN');
    assert.equal(workspaceVariant((value) => appendSource(value, 'const forbiddenWasm = WebAssembly;')), 'V7DK_API_FORBIDDEN');
    assert.equal(workspaceVariant((value) => appendSource(
      value,
      "const forbiddenEscape = Math.abs.constructor('return process')();",
    )), 'V7DK_API_FORBIDDEN');
    assert.equal(workspaceVariant((value) => appendSource(
      value,
      "const forbiddenReflect = Reflect.get(Math.abs, 'constructor');",
    )), 'V7DK_API_FORBIDDEN');
    const lifecycle = workspaceVariant((value) => fs.writeFileSync(path.join(value.workspace, 'package.json'), JSON.stringify({
      scripts: { postinstall: 'node install.js' },
    })));
    assert.equal(lifecycle, 'V7DK_COMPILER_CONFIGURATION_FORBIDDEN');
    return primary;
  },

  'weakened-typescript': () => workspaceVariant((value) => fs.writeFileSync(
    path.join(value.workspace, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { strict: false, target: 'ES5' }, plugins: [{}] }),
  )),
};

Object.assign(controls, {
  'workspace-path-surface': () => {
    const primary = workspaceVariant((value) => mutateJson(path.join(value.workspace, 'v7-plugin-kit.json'), (wire) => {
      wire.manifestPath = '/absolute/plugin.manifest.json';
    }));
    assert.equal(workspaceVariant((value) => mutateJson(path.join(value.workspace, 'v7-plugin-kit.json'), (wire) => {
      wire.manifestPath = '../plugin.manifest.json';
    })), 'V7DK_WORKSPACE_PATH_ESCAPE');
    assert.equal(workspaceVariant((value) => mutateJson(path.join(value.workspace, 'v7-plugin-kit.json'), (wire) => {
      wire.fixtureSuites.push({ ...wire.fixtureSuites[0] });
    })), 'V7DK_WORKSPACE_INVALID');
    assert.equal(workspaceVariant((value) => {
      const manifest = path.join(value.workspace, 'plugin.manifest.json');
      fs.renameSync(manifest, path.join(value.workspace, 'plugin.real.json'));
      fs.symlinkSync('plugin.real.json', manifest);
    }), 'V7DK_WORKSPACE_PATH_ESCAPE');
    assert.equal(workspaceVariant((value) => {
      const readme = path.join(value.workspace, 'README.md');
      fs.unlinkSync(readme);
      const created = spawnSync('/usr/bin/mkfifo', [readme]);
      assert.equal(created.status, 0, created.stderr?.toString());
    }), 'V7DK_WORKSPACE_SPECIAL_FILE');
    return primary;
  },

  'scaffold-overwrite': () => withContext((value) => {
    const emptyTarget = path.join(value.base, 'empty');
    pass({
      operation: 'scaffold',
      operationVersion: 1,
      options: { templateId: 'trusted-fvg-v1' },
      schemaVersion: 1,
      workspaceRoot: emptyTarget,
    });
    const occupied = path.join(value.base, 'occupied');
    fs.mkdirSync(occupied);
    fs.writeFileSync(path.join(occupied, 'keep.txt'), 'keep');
    return resultCode({
      operation: 'scaffold',
      operationVersion: 1,
      options: { templateId: 'trusted-fvg-v1' },
      schemaVersion: 1,
      workspaceRoot: occupied,
    });
  }, { scaffold: false }),

  'ambient-input': () => {
    const primary = workspaceVariant((value) => appendSource(value, 'const ambientClock = Date.now();'));
    assert.equal(workspaceVariant((value) => appendSource(value, 'const ambientRandom = Math.random();')), 'V7DK_API_FORBIDDEN');
    assert.equal(workspaceVariant((value) => appendSource(value, "const ambientLocale = new Intl.NumberFormat('en');")), 'V7DK_API_FORBIDDEN');
    assert.equal(workspaceVariant((value) => appendSource(value, 'const ambientEnvironment = process.env.VALUE;')), 'V7DK_API_FORBIDDEN');
    return primary;
  },

  'replay-future-repaint': () => {
    const primary = workspaceVariant((value) => mutateJson(
      path.join(value.workspace, 'fixtures/strict-fvg-vectors.json'),
      (wire) => { wire.cases[0].input.evidence.bars[2].endEpochMs = 180001; },
    ));
    assert.equal(workspaceVariant((value) => mutateJson(
      path.join(value.workspace, 'fixtures/strict-fvg-vectors.json'),
      (wire) => { wire.cases[0].input.replay.repainting = true; },
    )), 'V7DK_WORKSPACE_INVALID');
    return primary;
  },

  'expected-output-mismatch': () => withContext((value) => {
    validate(value);
    mutateJson(path.join(value.workspace, 'expected/strict-fvg-vectors.json'), (wire) => {
      const output = wire.cases[0].output;
      output.artifact.lowerPrice = 100;
      output.artifact.midpointPrice = 101.5;
      output.projections[0].lowerPrice = 100;
      output.projections[1].price = 101.5;
    });
    pass(operationRequest('build', value));
    return resultCode(operationRequest('test', value));
  }),

  'isolation-resource-leak': () => withContext((value) => {
    validate(value);
    pass(operationRequest('build', value));
    pass(operationRequest('test', value));
    const blocked = resultCode(operationRequest('test', value), {
      adapters: {
        runIsolatedFixtures() {
          throw new DeveloperKitFailure('blocked', diagnostic(
            'V7DK_ISOLATION_UNAVAILABLE',
            'isolation',
            'H116 disabled the isolation capability.',
          ));
        },
      },
    });
    const timeout = withContext((timeoutContext) => {
      validate(timeoutContext);
      const sourcePath = path.join(timeoutContext.workspace, 'src/index.ts');
      const source = fs.readFileSync(sourcePath, 'utf8').replace(
        'run: construct,',
        'run: () => { while (true) { /* bounded by isolated host */ } },',
      );
      fs.writeFileSync(sourcePath, source);
      pass(operationRequest('build', timeoutContext));
      return resultCode(operationRequest('test', timeoutContext));
    });
    assert.equal(timeout, 'V7DK_RESOURCE_LIMIT');
    assert.equal(workspaceVariant((candidate) => appendSource(candidate, "import child from 'node:child_process';")), 'V7DK_IMPORT_FORBIDDEN');
    return blocked;
  }),

  'stale-build': () => withContext((value) => {
    validate(value);
    pass(operationRequest('build', value));
    const fixturePath = path.join(value.workspace, 'fixtures/strict-fvg-vectors.json');
    fs.appendFileSync(fixturePath, '\n');
    const primary = resultCode(operationRequest('test', value));
    const statePath = path.join(value.output, 'state/build-state.json');
    mutateJson(statePath, (state) => { state.toolchainDigest = 'sha256:changed-toolchain'; });
    assert.equal(resultCode(operationRequest('test', value)), 'V7DK_STALE_OUTPUT');
    return primary;
  }),

  'tampered-bundle-receipt': () => withContext((value) => {
    validate(value);
    fullFlow(value);
    const originalPath = path.join(value.output, BUNDLE_LOGICAL_PATH);
    const original = fs.readFileSync(originalPath);
    pass({
      operation: 'inspect', operationVersion: 1,
      options: { path: BUNDLE_LOGICAL_PATH, target: 'bundle' },
      schemaVersion: 1, workspaceRoot: value.output,
    });
    const changed = Buffer.from(original);
    const payload = changed.indexOf(Buffer.from('Trusted FVG P1a reference'));
    assert.ok(payload > 0);
    changed[payload] ^= 1;
    writeBundle(value, 'bundles/tampered.v7dk.tar', changed);
    const primary = inspectCode(value, 'bundles/tampered.v7dk.tar');

    const baseEntries = parseTar(original).filter(({ path: logicalPath }) => logicalPath !== 'v7dk.index.json')
      .map(({ bytes, path: logicalPath }) => ({ bytes, path: logicalPath }));
    const receiptEntry = baseEntries.find(({ path: logicalPath }) => logicalPath === 'receipts/build.json');
    const forgedReceipt = JSON.parse(receiptEntry.bytes.toString('utf8'));
    forgedReceipt.installable = true;
    receiptEntry.bytes = Buffer.from(`${canonicalJson(forgedReceipt)}\n`);
    const forged = encodeTar([...baseEntries, jsonEntry('v7dk.index.json', bundleIndex(baseEntries))]);
    writeBundle(value, 'bundles/forged-receipt.v7dk.tar', forged);
    assert.equal(inspectCode(value, 'bundles/forged-receipt.v7dk.tar'), 'V7DK_INTEGRITY_MISMATCH');

    const indexedEntries = parseTar(original).map(({ bytes, path: logicalPath }) => ({ bytes, path: logicalPath }));
    const indexEntry = indexedEntries.find(({ path: logicalPath }) => logicalPath === 'v7dk.index.json');
    const index = JSON.parse(indexEntry.bytes.toString('utf8'));
    index.files[0].sha256 = '0'.repeat(64);
    indexEntry.bytes = Buffer.from(`${canonicalJson(index)}\n`);
    writeBundle(value, 'bundles/tampered-index.v7dk.tar', encodeTar(indexedEntries));
    assert.equal(inspectCode(value, 'bundles/tampered-index.v7dk.tar'), 'V7DK_INTEGRITY_MISMATCH');
    return primary;
  }),

  'malicious-bundle-entry': () => withContext((value) => {
    validate(value);
    fullFlow(value);
    const original = fs.readFileSync(path.join(value.output, BUNDLE_LOGICAL_PATH));
    const traversal = rewriteHeader(original, (bytes, offset) => writeHeaderText(bytes, offset, 100, '../evil'));
    writeBundle(value, 'bundles/traversal.v7dk.tar', traversal);
    const primary = inspectCode(value, 'bundles/traversal.v7dk.tar');

    const linked = rewriteHeader(original, (bytes, offset) => { bytes[offset + 156] = '2'.charCodeAt(0); });
    writeBundle(value, 'bundles/link.v7dk.tar', linked);
    assert.equal(inspectCode(value, 'bundles/link.v7dk.tar'), 'V7DK_BUNDLE_INVALID');

    const device = rewriteHeader(original, (bytes, offset) => { bytes[offset + 156] = '3'.charCodeAt(0); });
    writeBundle(value, 'bundles/device.v7dk.tar', device);
    assert.equal(inspectCode(value, 'bundles/device.v7dk.tar'), 'V7DK_BUNDLE_INVALID');

    const oversized = rewriteHeader(original, (bytes, offset) => {
      writeHeaderOctal(bytes, offset + 124, 12, (2 * 1024 * 1024) + 1);
    });
    writeBundle(value, 'bundles/oversized.v7dk.tar', oversized);
    assert.equal(inspectCode(value, 'bundles/oversized.v7dk.tar'), 'V7DK_RESOURCE_LIMIT');

    const offsets = headerOffsets(original);
    const firstName = original.subarray(offsets[0], offsets[0] + 100).toString('utf8').replace(/\0.*$/u, '');
    const duplicate = rewriteHeader(original, (bytes, offset) => writeHeaderText(bytes, offset, 100, firstName), offsets[1]);
    writeBundle(value, 'bundles/duplicate.v7dk.tar', duplicate);
    assert.equal(inspectCode(value, 'bundles/duplicate.v7dk.tar'), 'V7DK_BUNDLE_INVALID');

    const base = parseTar(original).filter(({ path: logicalPath }) => logicalPath !== 'v7dk.index.json')
      .map(({ bytes, path: logicalPath }) => ({ bytes, path: logicalPath }));
    base.push({ bytes: Buffer.from('undeclared'), path: 'undeclared.txt' });
    const undeclared = encodeTar([...base, jsonEntry('v7dk.index.json', bundleIndex(base))]);
    writeBundle(value, 'bundles/undeclared.v7dk.tar', undeclared);
    assert.equal(inspectCode(value, 'bundles/undeclared.v7dk.tar'), 'V7DK_BUNDLE_INVALID');
    return primary;
  }),

  'lifecycle-operation': () => {
    pass({ operation: 'discover', operationVersion: 1, options: {}, schemaVersion: 1 });
    let primary;
    for (const operation of ['install', 'activate', 'publish', 'registry-contact', 'module-host-control']) {
      const code = resultCode({ operation, operationVersion: 1, options: {}, schemaVersion: 1 });
      primary ??= code;
      assert.equal(code, 'V7DK_OPERATION_UNSUPPORTED');
    }
    return primary;
  },
});

assert.deepEqual(Object.keys(controls).sort(), NEGATIVE_CASES.map(({ case: id }) => id).sort());
const negativeEvidence = [];
for (const testCase of NEGATIVE_CASES) {
  const actual = controls[testCase.case]();
  assert.equal(actual, testCase.expectedDiagnostic, `${testCase.case} diagnostic mismatch`);
  negativeEvidence.push(Object.freeze({
    baselinePassed: true,
    case: testCase.case,
    diagnostic: actual,
    negativePassed: true,
  }));
}

// Every emitted diagnostic identifier is cataloged and append-only under V7DK_.
const diagnosticCatalog = JSON.parse(fs.readFileSync(path.join(
  V7_ROOT,
  'sdk/plugin/catalogs/diagnostics.json',
), 'utf8'));
const catalogCodes = new Set(diagnosticCatalog.codes);
for (const file of [
  ...release.operationFiles.map(({ path: logicalPath }) => logicalPath.replace(/^tools\//u, '')),
  'engine.js',
]) {
  const absolute = path.join(V7_ROOT, 'tools/plugin-developer-kit', file);
  if (!fs.existsSync(absolute)) continue;
  const source = fs.readFileSync(absolute, 'utf8');
  for (const match of source.matchAll(/['"](V7DK_[A-Z0-9_]+)['"]/gu)) {
    assert.equal(catalogCodes.has(match[1]), true, `${match[1]} must be cataloged`);
  }
}
assert.equal(diagnosticCatalog.codes.every((code) => code.startsWith('V7DK_')), true);

// Candidate tooling stays outside the production graph and no production file imports it.
function productionFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile() && /\.(?:js|json)$/u.test(entry.name)) files.push(target);
    }
  }
  visit(root);
  return files;
}
for (const root of [path.join(V7_ROOT, 'src'), path.join(V7_ROOT, 'app')]) {
  for (const file of productionFiles(root)) {
    const source = fs.readFileSync(file, 'utf8');
    const importSpecifiers = [...source.matchAll(
      /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/gu,
    )].map((match) => match[1]);
    assert.equal(importSpecifiers.some((specifier) => (
      /plugin-developer-kit|sdk\/plugin|plugin-developer-kit-harness/u.test(specifier)
    )), false, file);
  }
}

// The registered real FVG contract and semantic package Harnesses remain green.
const trustedHarnesses = [];
for (const harness of [
  'tests/plugin-contract-substrate-harness.js',
  'tests/fair-value-gap-semantic-package-harness.js',
]) {
  const run = spawnSync(process.execPath, [harness], {
    cwd: V7_ROOT,
    encoding: 'utf8',
    env: { ...process.env, LANG: 'C', LC_ALL: 'C', TZ: 'UTC' },
    maxBuffer: 10 * 1024 * 1024,
    timeout: 60_000,
  });
  assert.equal(run.status, 0, `${harness}\n${run.stdout}\n${run.stderr}`);
  trustedHarnesses.push(Object.freeze({ harness, status: 'passed' }));
}

assert.equal(firstFlow.pack.receipt.installable, false);
assert.equal(firstFlow.pack.receipt.activated, false);
assert.equal(firstFlow.pack.receipt.publisherTrusted, false);
assert.equal(firstFlow.pack.receipt.productionExecutionAuthorized, false);
assert.equal(firstFlow.inspect.artifacts[0].installable, false);
assert.equal(firstFlow.inspect.artifacts[0].productionExecutionAuthorized, false);

console.log(canonicalJson({
  compiler: release.compiler,
  harness: 'H116',
  negativeControls: negativeEvidence,
  operations: ['discover', 'scaffold', 'validate', 'build', 'test', 'preview', 'pack', 'inspect'],
  status: 'passed',
  trustedHarnesses,
  visibleReviewRequired: false,
}));
