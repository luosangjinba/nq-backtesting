import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createLocalPluginPackageCandidatePlan,
  defineLocalPluginPackageManifest,
  finalizeLocalPluginPackageManifest,
  readLocalPluginPackageCandidatePlan,
  readLocalPluginPackageManifest,
} from '../src/plugin-contract/public.js';
import {
  canonicalJson,
  runDeveloperKit,
} from '../tools/plugin-developer-kit/public.js';
import { digestValue, sha256Bytes } from '../tools/plugin-developer-kit/domain/canonical-json.js';
import { DeveloperKitFailure } from '../tools/plugin-developer-kit/domain/diagnostic.js';
import { loadReleaseCatalog } from '../tools/plugin-developer-kit/adapters/release-catalog.js';
import { inspectLocalPackageBytes } from '../tools/plugin-developer-kit/adapters/local-package.js';
import { encodeTar, jsonEntry, parseTar } from '../tools/plugin-developer-kit/adapters/tar.js';

const TEST_ROOT = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_ROOT, '..');
const CLI = path.join(V7_ROOT, 'tools/plugin-developer-kit/cli/main.js');
const PROFILE = 'local-declarative-package-v1';
const PACKAGE_PATH = 'packages/community.lifecycle-proof-1.0.0.v7plugin';
const NEGATIVE_CASES = JSON.parse(fs.readFileSync(path.join(
  TEST_ROOT,
  'fixtures/local-plugin-package/negative/cases.json',
), 'utf8'));

function localRequest(operation, context, options = {}) {
  const request = {
    contractProfile: PROFILE,
    operation,
    operationVersion: ['pack', 'inspect'].includes(operation) ? 2 : 1,
    options,
    schemaVersion: 2,
  };
  if (['scaffold', 'validate', 'build', 'test', 'preview', 'pack'].includes(operation)) {
    request.workspaceRoot = context.workspace;
  }
  if (['build', 'test', 'preview', 'pack'].includes(operation)) request.outputRoot = context.output;
  return request;
}

function p1aRequest(operation, context, options = {}) {
  const request = { operation, operationVersion: 1, options, schemaVersion: 1 };
  if (['scaffold', 'validate', 'build', 'test', 'preview', 'pack'].includes(operation)) {
    request.workspaceRoot = context.workspace;
  }
  if (['build', 'test', 'preview', 'pack'].includes(operation)) request.outputRoot = context.output;
  return request;
}

function pass(request) {
  const result = runDeveloperKit(request);
  assert.equal(result.status, 'passed', `${request.operation}: ${canonicalJson(result.diagnostics)}`);
  assert.equal(result.exitCode, 0);
  return result;
}

function resultCode(request) {
  const result = runDeveloperKit(request);
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

function context(profile = 'local') {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), `v7dk-h117-${profile}-`));
  const value = { base, output: path.join(base, 'output'), workspace: path.join(base, 'workspace') };
  const request = profile === 'local'
    ? localRequest('scaffold', value, { templateId: 'local-lifecycle-v1' })
    : p1aRequest('scaffold', value, { templateId: 'trusted-fvg-v1' });
  value.scaffold = pass(request);
  return value;
}

function dispose(value) {
  fs.rmSync(value.base, { force: true, recursive: true });
}

function withContext(action, profile = 'local') {
  const value = context(profile);
  try { return action(value); } finally { dispose(value); }
}

function mutateJson(file, mutate) {
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(value);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function prepareLocal(value) {
  const results = {};
  for (const operation of ['validate', 'build', 'test', 'preview']) {
    results[operation] = pass(localRequest(operation, value));
  }
  return results;
}

function fullLocal(value, outputKind = 'local-install-archive') {
  const results = prepareLocal(value);
  results.pack = pass(localRequest('pack', value, { outputKind, profile: PROFILE }));
  if (outputKind === 'local-install-archive') {
    results.inspect = pass({
      contractProfile: PROFILE,
      operation: 'inspect',
      operationVersion: 2,
      options: { path: PACKAGE_PATH, target: 'local-package' },
      schemaVersion: 2,
      workspaceRoot: value.output,
    });
  }
  return results;
}

function fullP1a(value) {
  pass(p1aRequest('validate', value));
  for (const operation of ['build', 'test', 'preview', 'pack']) pass(p1aRequest(operation, value));
  return path.join(value.output, 'bundles/first-party.fair-value-gap-1.0.0.v7dk.tar');
}

function manifestPath(value) {
  return path.join(value.workspace, 'v7-package.json');
}

function appendLocalSource(value, source) {
  fs.appendFileSync(path.join(value.workspace, 'src/index.ts'), `\n${source}\n`);
}

function workspaceVariant(mutate) {
  return withContext((value) => {
    pass(localRequest('validate', value));
    mutate(value);
    return resultCode(localRequest('validate', value));
  });
}

function packageBytes(value) {
  return fs.readFileSync(path.join(value.output, ...PACKAGE_PATH.split('/')));
}

function writePackage(value, logicalPath, bytes) {
  const target = path.join(value.output, ...logicalPath.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}

function packageCode(bytes, release) {
  return thrownCode(() => inspectLocalPackageBytes(bytes, release));
}

function entryMap(bytes) {
  return parseTar(bytes).map(({ bytes: entryBytes, path: logicalPath }) => ({
    bytes: Buffer.from(entryBytes), path: logicalPath,
  }));
}

function mutateCanonicalJsonEntry(entries, logicalPath, mutate) {
  const entry = entries.find(({ path: candidate }) => candidate === logicalPath);
  assert.ok(entry, `${logicalPath} must exist`);
  const value = JSON.parse(entry.bytes.toString('utf8'));
  mutate(value);
  entry.bytes = Buffer.from(`${canonicalJson(value)}\n`);
}

function recalculateHeaderChecksum(bytes, offset = 0) {
  bytes.fill(0x20, offset + 148, offset + 156);
  let sum = 0;
  for (let index = offset; index < offset + 512; index += 1) sum += bytes[index];
  bytes.write(`${sum.toString(8).padStart(6, '0')}\0 `, offset + 148, 8, 'ascii');
}

function rewriteFirstHeader(bytes, mutate) {
  const copy = Buffer.from(bytes);
  mutate(copy);
  recalculateHeaderChecksum(copy);
  return copy;
}

function writeHeaderText(bytes, offset, length, value) {
  bytes.fill(0, offset, offset + length);
  bytes.write(value, offset, length, 'utf8');
}

function indexFor(entries, manifest) {
  const files = entries.sort((left, right) => left.path.localeCompare(right.path)).map(({ bytes, path: logicalPath }) => ({
    path: logicalPath, sha256: sha256Bytes(bytes), size: bytes.length,
  }));
  return {
    archiveFormatVersion: 1,
    contentDigest: digestValue(files),
    files,
    packageId: manifest.packageId,
    packageVersion: manifest.packageVersion,
    payloadDigest: digestValue(files.filter(({ path: logicalPath }) => logicalPath.startsWith('payload/'))),
    schemaVersion: 1,
  };
}

const release = loadReleaseCatalog({ refresh: true });
const discovery = pass({ operation: 'discover', operationVersion: 1, options: {}, schemaVersion: 1 });
const discovered = discovery.artifacts[0].value;
const rules = JSON.parse(fs.readFileSync(path.join(V7_ROOT, 'docs/v7-harness-rules.json'), 'utf8'));
const h116 = rules.rules.find(({ id }) => id === 'H116');
const h117 = rules.rules.find(({ id }) => id === 'H117');
assert.equal(rules.currentStep, 'P1b.3');
assert.equal(h116.state, 'accepted');
assert.equal(h117.state, 'executable');
assert.equal(h117.humanReviewRequired, true);
assert.equal(h117.acceptanceEvidence, null);
assert.deepEqual(discovered.contractProfiles, ['trusted-built-in-core-v1', PROFILE]);
assert.equal(discovered.schemas.length, 22);
assert.equal(discovered.catalogs.length, 10);
const localPackageCatalog = discovered.catalogs.find(({ path: logicalPath }) => logicalPath === 'catalogs/local-packages.json').value;
assert.deepEqual(localPackageCatalog.archive.limits, {
  maxEntries: 512,
  maxEntryBytes: 2 * 1024 * 1024,
  maxUnpackedBytes: 8 * 1024 * 1024,
});
const operations = discovered.catalogs.find(({ path: logicalPath }) => logicalPath === 'catalogs/operations.json').value.operations;
assert.equal(operations.filter(({ id, version }) => id === 'pack' && version === 2).length, 1);
assert.equal(operations.filter(({ id, version }) => id === 'inspect' && version === 2).length, 1);
assert.equal(discovered.toolchain.archive.suffix, '.v7dk.tar');
assert.equal(discovered.toolchain.hostApiVersion, '1.0.0');
assert.equal(discovered.toolchain.localArchive.suffix, '.v7plugin');
assert.equal(discovered.toolchain.localArchive.productionExecutionAuthorized, false);

const authoringWire = JSON.parse(fs.readFileSync(path.join(
  V7_ROOT, 'sdk/plugin/examples/local-lifecycle-v1/v7-package.json',
), 'utf8'));
const authoringManifest = defineLocalPluginPackageManifest(authoringWire);
assert.equal(readLocalPluginPackageManifest(authoringManifest).conformance.requiredReceiptDigests.length, 0);
const receipts = [1, 2, 3].map((value) => `sha256:${String(value).repeat(64)}`);
const finalManifest = finalizeLocalPluginPackageManifest(authoringManifest, receipts);
const plan = readLocalPluginPackageCandidatePlan(createLocalPluginPackageCandidatePlan(finalManifest, {
  candidateDigest: `sha256:${'4'.repeat(64)}`,
  contentDigest: `sha256:${'5'.repeat(64)}`,
  hostApiVersion: '1.0.0',
  manifestDigest: `sha256:${'6'.repeat(64)}`,
  source: { digest: `sha256:${'7'.repeat(64)}`, kind: 'developer-unpacked' },
}));
assert.equal(plan.installCandidateEligible, true);
assert.equal(plan.installed, false);
assert.equal(plan.activated, false);
assert.equal(plan.publisherTrusted, false);
assert.equal(plan.productionExecutionAuthorized, false);
assert.equal('module' in plan || 'entrypoint' in plan || 'descriptor' in plan, false);

const first = context();
const second = context();
const unpacked = context();
let firstFlow;
try {
  firstFlow = fullLocal(first);
  const secondFlow = fullLocal(second);
  const unpackedFlow = fullLocal(unpacked, 'unpacked-local-candidate');
  for (const operation of ['validate', 'build', 'test', 'preview', 'pack', 'inspect']) {
    assert.equal(canonicalJson(firstFlow[operation]), canonicalJson(secondFlow[operation]), `${operation} must be root-independent`);
  }
  assert.deepEqual(packageBytes(first), packageBytes(second), 'clean roots must emit byte-identical .v7plugin archives');
  const archiveEntries = parseTar(packageBytes(first));
  const unpackedRoot = path.join(unpacked.output, unpackedFlow.pack.artifacts[0].logicalPath);
  for (const entry of archiveEntries) {
    assert.deepEqual(fs.readFileSync(path.join(unpackedRoot, ...entry.path.split('/'))), entry.bytes);
  }
  const unpackedPaths = [];
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const logicalPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(path.join(directory, entry.name), logicalPath);
      else unpackedPaths.push(logicalPath);
    }
  }
  visit(unpackedRoot);
  assert.deepEqual(unpackedPaths.sort(), archiveEntries.map(({ path: logicalPath }) => logicalPath).sort());
  assert.equal(unpackedFlow.pack.artifacts[0].packageCandidate.state, 'candidate');
  assert.equal(unpackedFlow.pack.artifacts[0].packageCandidate.source.kind, 'developer-unpacked');
  assert.equal(unpackedFlow.pack.artifacts[0].packageCandidate.source.trust, 'developer-local');
  const inspection = firstFlow.inspect.artifacts[0];
  assert.equal(inspection.installCandidateEligible, true);
  assert.equal(inspection.packageCandidate.state, 'candidate');
  assert.equal(inspection.packageCandidate.source.trust, 'unverified-local');
  assert.equal(canonicalJson(inspection).includes(first.base), false);
  assert.equal(canonicalJson(inspection).includes(os.hostname()), false);
} finally {
  dispose(second);
  dispose(unpacked);
}

try {
  const cliRequest = localRequest('pack', first, {
    outputKind: 'local-install-archive',
    profile: PROFILE,
  });
  const requestFile = path.join(first.base, 'request.json');
  fs.writeFileSync(requestFile, canonicalJson(cliRequest));
  const library = runDeveloperKit(cliRequest);
  const cli = spawnSync(process.execPath, [CLI, '--request', requestFile], {
    cwd: V7_ROOT,
    encoding: 'utf8',
    env: { LANG: 'C', LC_ALL: 'C', PATH: process.env.PATH, TZ: 'Pacific/Auckland' },
  });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(cli.stdout, `${canonicalJson(library)}\n`);

  const baselineBytes = packageBytes(first);
  const controls = {
    'request-v2-closure': () => {
      pass(localRequest('validate', first));
      const invalidRequest = {
        contractProfile: PROFILE,
        operation: 'pack',
        operationVersion: 2,
        options: { profile: PROFILE },
        outputRoot: first.output,
        schemaVersion: 2,
        workspaceRoot: first.workspace,
      };
      const invalidResult = runDeveloperKit(invalidRequest);
      assert.equal(invalidResult.schemaVersion, 2);
      assert.equal(invalidResult.contractProfile, PROFILE);
      const primary = invalidResult.diagnostics[0].code;
      assert.equal(resultCode({ ...localRequest('pack', first, { outputKind: 'local-install-archive', profile: PROFILE }), operationVersion: 1 }), 'V7DK_REQUEST_INVALID');
      assert.equal(workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => {
        wire.conformance.sdkVersion = '2.0.0';
      })), 'V7DK_SDK_UNSUPPORTED');
      assert.equal(withContext((value) => {
        mutateJson(manifestPath(value), (wire) => { wire.hostApiRange = '^2.0.0'; });
        prepareLocal(value);
        return resultCode(localRequest('pack', value, { outputKind: 'unpacked-local-candidate', profile: PROFILE }));
      }), 'V7DK_HOST_INCOMPATIBLE');
      return primary;
    },
    'manifest-unknown-field': () => {
      const primary = workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => { wire.signed = true; }));
      assert.equal(workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => {
        wire.packageVersion = `${'9'.repeat(32)}.0.0`;
      })), 'V7DK_MANIFEST_INVALID');
      return primary;
    },
    'forged-core-identity': () => {
      const primary = workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => { wire.packageId = 'first-party.forged'; }));
      assert.equal(workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => { wire.publisher.id = 'built-in.forged'; })), 'V7DK_DISTRIBUTION_UNAUTHORIZED');
      return primary;
    },
    'permission-request': () => workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => { wire.permissions = ['network']; })),
    'contribution-claim': () => workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => {
      wire.contributions = [{ id: 'semantic.forged', kind: 'semantic-type' }];
    })),
    'execution-entrypoint': () => {
      const primary = workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => {
        wire.execution = { entrypoint: 'payload/build/index.js', tier: 'worker' };
      }));
      assert.equal(workspaceVariant((value) => appendLocalSource(value, 'const forbiddenDom = document.body;')), 'V7DK_API_FORBIDDEN');
      assert.equal(workspaceVariant((value) => appendLocalSource(value, "import remote from 'https://example.invalid/plugin.js';")), 'V7DK_IMPORT_FORBIDDEN');
      assert.equal(workspaceVariant((value) => fs.writeFileSync(path.join(value.workspace, 'package.json'), JSON.stringify({
        scripts: { postinstall: 'node install.js' },
      }))), 'V7DK_COMPILER_CONFIGURATION_FORBIDDEN');
      return primary;
    },
    'instance-or-inspector-settings': () => {
      const primary = workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => {
        wire.settings.tabs[0].source.fields[0].scopes = ['instance'];
      }));
      assert.equal(workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => {
        wire.settings.tabs[0].source = { groupIds: ['evidence'], kind: 'inspector-groups' };
      })), 'V7DK_MANIFEST_INVALID');
      return primary;
    },
    'migration-script-or-wildcard': () => {
      const primary = workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => {
        wire.persistence.schemaVersion = 2;
        wire.persistence.migrations = [{
          expectedOutputDigest: `sha256:${'8'.repeat(64)}`,
          fromSchemaVersion: 1,
          operations: [{
            fromPointer: '/packageValues/*',
            kind: 'rename',
            precondition: 'source-present-destination-absent',
            toPointer: '/packageValues/newField',
            value: null,
          }],
          toSchemaVersion: 2,
        }];
      }));
      assert.equal(workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => {
        wire.persistence.schemaVersion = 2;
        wire.settings.tabs[0].source.fields.push(
          {
            id: 'first', label: 'First', scopes: ['package'], defaultValue: 'a',
            control: { kind: 'text', maxLength: 16 },
          },
          {
            id: 'second', label: 'Second', scopes: ['package'], defaultValue: 'b',
            control: { kind: 'text', maxLength: 16 },
          },
        );
        wire.persistence.migrations = [{
          expectedOutputDigest: `sha256:${'8'.repeat(64)}`,
          fromSchemaVersion: 1,
          operations: [],
          script: 'eval(candidate)',
          toSchemaVersion: 2,
        }];
      })), 'V7DK_MIGRATION_INVALID');
      assert.equal(workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => {
        wire.persistence.schemaVersion = 2;
        wire.persistence.migrations = [{
          expectedOutputDigest: `sha256:${'8'.repeat(64)}`,
          fromSchemaVersion: 1,
          operations: [
            {
              fromPointer: '/packageValues/first', kind: 'rename',
              precondition: 'source-present-destination-absent',
              toPointer: '/packageValues/second', value: null,
            },
            {
              fromPointer: '/packageValues/second', kind: 'rename',
              precondition: 'source-present-destination-absent',
              toPointer: '/packageValues/first', value: null,
            },
          ],
          toSchemaVersion: 2,
        }];
      })), 'V7DK_MIGRATION_INVALID');
      assert.equal(workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => {
        wire.persistence.schemaVersion = 3;
        wire.persistence.migrations = [{
          expectedOutputDigest: `sha256:${'8'.repeat(64)}`,
          fromSchemaVersion: 1,
          operations: [{
            fromPointer: '/packageValues/legacyLabel', kind: 'rename',
            precondition: 'source-present-destination-absent',
            toPointer: '/packageValues/lifecycleLabel', value: null,
          }],
          toSchemaVersion: 2,
        }];
      })), 'V7DK_MIGRATION_INVALID');
      assert.equal(workspaceVariant((value) => mutateJson(manifestPath(value), (wire) => {
        wire.persistence.schemaVersion = 2;
        wire.persistence.migrations = [{
          expectedOutputDigest: `sha256:${'8'.repeat(64)}`,
          fromSchemaVersion: 1,
          operations: [{
            fromPointer: null, kind: 'set-default-if-absent',
            precondition: 'destination-absent',
            toPointer: '/profileValues/lifecycleLabel', value: 'forged-default',
          }],
          toSchemaVersion: 2,
        }];
      })), 'V7DK_MIGRATION_INVALID');
      return primary;
    },
    'stale-developer-receipt': () => withContext((value) => {
      prepareLocal(value);
      pass(localRequest('pack', value, { outputKind: 'local-install-archive', profile: PROFILE }));
      mutateJson(path.join(value.output, 'receipts/preview.json'), (receipt) => { receipt.digest = `sha256:${'0'.repeat(64)}`; });
      return resultCode(localRequest('pack', value, { outputKind: 'local-install-archive', profile: PROFILE }));
    }),
    'renamed-evidence-bundle': () => withContext((value) => {
      const evidencePath = fullP1a(value);
      const before = fs.readFileSync(evidencePath);
      pass(p1aRequest('pack', value));
      assert.deepEqual(fs.readFileSync(evidencePath), before, 'P1a pack v1 must remain byte-deterministic');
      const renamed = 'packages/renamed-evidence.v7plugin';
      writePackage(value, renamed, fs.readFileSync(evidencePath));
      return resultCode({
        contractProfile: PROFILE,
        operation: 'inspect',
        operationVersion: 2,
        options: { path: renamed, target: 'local-package' },
        schemaVersion: 2,
        workspaceRoot: value.output,
      });
    }, 'p1a'),
    'wrong-install-suffix': () => resultCode({
      contractProfile: PROFILE,
      operation: 'inspect',
      operationVersion: 2,
      options: { path: 'packages/not-installable.v7dk.tar', target: 'local-package' },
      schemaVersion: 2,
      workspaceRoot: first.output,
    }),
    'content-index-tamper': () => {
      const entries = entryMap(baselineBytes);
      const payload = entries.find(({ path: logicalPath }) => logicalPath.endsWith('.js'));
      payload.bytes = Buffer.from(payload.bytes);
      payload.bytes[0] ^= 1;
      return packageCode(encodeTar(entries), release);
    },
    'receipt-authority-forgery': () => {
      const entries = entryMap(baselineBytes);
      mutateCanonicalJsonEntry(entries, 'receipts/package-candidate.json', (receipt) => { receipt.installed = true; });
      const primary = packageCode(encodeTar(entries), release);
      const workspaceForgery = entryMap(baselineBytes);
      mutateCanonicalJsonEntry(workspaceForgery, 'receipts/package-candidate.json', (receipt) => {
        receipt.identities.workspace.sourceDigest = `sha256:${'f'.repeat(64)}`;
        delete receipt.digest;
        receipt.digest = digestValue(receipt);
      });
      assert.equal(packageCode(encodeTar(workspaceForgery), release), 'V7DK_PACKAGE_RECEIPT_STALE');
      return primary;
    },
    'archive-path-unicode-hardening': () => {
      const primary = packageCode(rewriteFirstHeader(baselineBytes, (bytes) => {
        writeHeaderText(bytes, 0, 100, '../escape');
      }), release);
      assert.equal(packageCode(rewriteFirstHeader(baselineBytes, (bytes) => {
        writeHeaderText(bytes, 0, 100, `A${String.fromCharCode(0x030a)}`);
      }), release), 'V7DK_BUNDLE_INVALID');
      const alias = path.join(first.output, 'package-alias');
      fs.symlinkSync('packages', alias, 'dir');
      assert.equal(resultCode({
        contractProfile: PROFILE,
        operation: 'inspect',
        operationVersion: 2,
        options: { path: 'package-alias/community.lifecycle-proof-1.0.0.v7plugin', target: 'local-package' },
        schemaVersion: 2,
        workspaceRoot: first.output,
      }), 'V7DK_PACKAGE_PATH_INVALID');
      assert.equal(withContext((value) => {
        prepareLocal(value);
        const escaped = path.join(value.base, 'escaped-output');
        fs.mkdirSync(escaped);
        fs.symlinkSync(escaped, path.join(value.output, 'packages'), 'dir');
        return resultCode(localRequest('pack', value, { outputKind: 'local-install-archive', profile: PROFILE }));
      }), 'V7DK_UNSAFE_OVERWRITE');
      return primary;
    },
    'archive-metadata-hardening': () => {
      const primary = packageCode(rewriteFirstHeader(baselineBytes, (bytes) => {
        writeHeaderText(bytes, 265, 32, 'forged-user');
      }), release);
      assert.equal(packageCode(rewriteFirstHeader(baselineBytes, (bytes) => { bytes[156] = 'x'.charCodeAt(0); }), release), 'V7DK_BUNDLE_INVALID');
      assert.equal(packageCode(rewriteFirstHeader(baselineBytes, (bytes) => {
        bytes.write(`${(2 * 1024 * 1024 + 1).toString(8).padStart(11, '0')}\0`, 124, 12, 'ascii');
      }), release), 'V7DK_RESOURCE_LIMIT');
      assert.equal(withContext((value) => {
        mutateJson(path.join(value.workspace, 'provenance.json'), (provenance) => {
          provenance.source = '/home/example/private-workspace';
        });
        prepareLocal(value);
        return resultCode(localRequest('pack', value, { outputKind: 'local-install-archive', profile: PROFILE }));
      }), 'V7DK_PACKAGE_PROVENANCE_INVALID');
      return primary;
    },
    'undeclared-archive-entry': () => packageCode(encodeTar([
      ...entryMap(baselineBytes), { bytes: Buffer.from('undeclared'), path: 'undeclared.txt' },
    ]), release),
    'nested-archive-payload': () => {
      const nestedCode = (nestedPath, nestedBytes) => {
        const entries = entryMap(baselineBytes);
        const manifest = JSON.parse(entries.find(({ path: logicalPath }) => logicalPath === 'v7-package.json').bytes);
        const content = entries.filter(({ path: logicalPath }) => ![
          'content-index.json', 'receipts/package-candidate.json',
        ].includes(logicalPath));
        content.push({ bytes: nestedBytes, path: nestedPath });
        const index = indexFor(content, manifest);
        const receiptEntry = entries.find(({ path: logicalPath }) => logicalPath === 'receipts/package-candidate.json');
        const receipt = JSON.parse(receiptEntry.bytes);
        receipt.identities.contentIndex = digestValue(index);
        receipt.identities.payload = index.payloadDigest;
        delete receipt.digest;
        receipt.digest = digestValue(receipt);
        return packageCode(encodeTar([
          ...content,
          jsonEntry('content-index.json', index),
          jsonEntry('receipts/package-candidate.json', receipt),
        ]), release);
      };
      const primary = nestedCode('payload/nested.zip', Buffer.from('opaque archive bytes'));
      assert.equal(nestedCode('payload/opaque', Buffer.from([0x50, 0x4b, 0x03, 0x04])), 'V7DK_PACKAGE_LAYOUT_INVALID');
      return primary;
    },
    'lifecycle-operation': () => {
      pass(localRequest('validate', first));
      let primary;
      for (const operation of ['install', 'activate', 'trust', 'publish', 'module-host-control']) {
        const code = resultCode({
          contractProfile: PROFILE, operation, operationVersion: 2, options: {}, schemaVersion: 2,
        });
        primary ??= code;
        assert.equal(code, 'V7DK_OPERATION_UNSUPPORTED');
      }
      return primary;
    },
  };

  assert.deepEqual(Object.keys(controls).sort(), NEGATIVE_CASES.map(({ case: id }) => id).sort());
  const negativeEvidence = [];
  for (const testCase of NEGATIVE_CASES) {
    const actual = controls[testCase.case]();
    assert.equal(actual, testCase.expectedDiagnostic, `${testCase.case} diagnostic mismatch`);
    negativeEvidence.push({ baselinePassed: true, case: testCase.case, diagnostic: actual, negativePassed: true });
  }

  const diagnosticCatalog = discovered.catalogs.find(({ path: logicalPath }) => logicalPath === 'catalogs/diagnostics.json').value;
  for (const code of negativeEvidence.map(({ diagnostic }) => diagnostic)) {
    assert.equal(diagnosticCatalog.codes.includes(code), true, `${code} must be cataloged`);
  }
  assert.equal(diagnosticCatalog.codes.includes('V7DK_HOST_INCOMPATIBLE'), true);

  for (const productionRoot of ['src', 'app']) {
    const pending = [path.join(V7_ROOT, productionRoot)];
    while (pending.length > 0) {
      const directory = pending.pop();
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) pending.push(target);
        else if (entry.isFile() && entry.name.endsWith('.js')) {
          const source = fs.readFileSync(target, 'utf8');
          assert.equal(/tools\/plugin-developer-kit|sdk\/plugin\/examples/u.test(source), false, target);
        }
      }
    }
  }
  for (const logicalPath of [
    'tools/plugin-developer-kit/adapters/local-package.js',
    'tools/plugin-developer-kit/adapters/local-package-inspection.js',
  ]) {
    const inspectorSource = fs.readFileSync(path.join(V7_ROOT, logicalPath), 'utf8');
    assert.equal(/\b(?:eval|Function)\s*\(|\bimport\s*\(/u.test(inspectorSource), false, logicalPath);
  }

  console.log(canonicalJson({
    archiveDigest: firstFlow.inspect.artifacts[0].archiveDigest,
    harness: 'H117',
    negativeControls: negativeEvidence,
    profile: PROFILE,
    scope: 'P1b.1-contract-and-archive',
    status: 'passed',
    visibleReviewRequired: true,
  }));
} finally {
  dispose(first);
}
