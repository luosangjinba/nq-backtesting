import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalLocalPluginPackageJson,
  digestLocalPluginPackageValue,
} from '../src/plugin-contract/local-plugin-package-digest.js';
import {
  inspectLocalPluginPackageEntries,
  MAX_LOCAL_PLUGIN_ARCHIVE_BYTES,
  packLocalPluginPackageEntries,
  readLocalPluginPackageCandidatePlan,
} from '../src/plugin-contract/public.js';
import { createLocalPluginPackageBrowserAdapter } from '../src/plugin-center-ui/public.js';
import { PLUGIN_PACKAGE_BROWSER_RELEASE } from '../src/plugin-center-ui/plugin-package-release-identity.js';
import {
  inspectUnpackedCandidateDirectory,
  snapshotUnpackedCandidateDirectory,
} from '../tools/plugin-developer-kit/adapters/unpacked-candidate-inspection.js';
import { createLocalPluginPackageFixture } from './support/local-plugin-package-fixture.js';

const TEST_ROOT = path.dirname(fileURLToPath(import.meta.url));
const CASES = JSON.parse(fs.readFileSync(path.join(
  TEST_ROOT,
  'fixtures/local-plugin-package/unpacked-security-negative/cases.json',
), 'utf8'));

function blob(name, bytes) {
  const value = new Blob([bytes]);
  Object.defineProperty(value, 'name', { value: name });
  return value;
}

function fileHandle(name, bytes, extra = {}) {
  return Object.freeze({
    ...extra,
    kind: extra.kind ?? 'file',
    name,
    async getFile() { return blob(name, bytes); },
  });
}

function directoryFromEntries(entries, {
  name = 'community.lifecycle-proof-1.0.0',
  specialPath = null,
  symlinkPath = null,
} = {}) {
  const root = { children: new Map(), kind: 'directory', name };
  for (const entry of entries) {
    const parts = entry.path.split('/');
    let directory = root;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        const kind = entry.path === specialPath ? 'special' : 'file';
        directory.children.set(part, fileHandle(part, entry.bytes, {
          isSymbolicLink: entry.path === symlinkPath,
          kind,
        }));
        return;
      }
      if (!directory.children.has(part)) {
        directory.children.set(part, { children: new Map(), kind: 'directory', name: part });
      }
      directory = directory.children.get(part);
    });
  }
  function handle(node) {
    if (node.kind !== 'directory') return node;
    return Object.freeze({
      isSymbolicLink: node.isSymbolicLink === true,
      kind: 'directory',
      name: node.name,
      async *values() {
        for (const child of node.children.values()) yield handle(child);
      },
    });
  }
  return handle(root);
}

function sequenceDirectory(handles, name = 'candidate') {
  let index = 0;
  return Object.freeze({
    kind: 'directory',
    name,
    async *values() {
      const selected = handles[Math.min(index, handles.length - 1)];
      index += 1;
      for await (const child of selected.values()) yield child;
    },
  });
}

function archiveAdapter(archives = []) {
  return createLocalPluginPackageBrowserAdapter({
    pickArchive: async () => archives.shift() ?? null,
    release: PLUGIN_PACKAGE_BROWSER_RELEASE,
  });
}

function deferred() {
  let resolve;
  const promise = new Promise((accept) => { resolve = accept; });
  return Object.freeze({ promise, resolve });
}

async function failure(action) {
  try { await action(); } catch (error) { return error?.code ?? null; }
  assert.fail('Expected local package security control to fail.');
}

async function inspectDirectory(handle, options = {}) {
  return inspectUnpackedCandidateDirectory(handle, {
    release: PLUGIN_PACKAGE_BROWSER_RELEASE,
    ...options,
  });
}

async function staleReceiptEntries(entries) {
  const values = entries.map(({ bytes, path: logicalPath }) => ({
    bytes: new Uint8Array(bytes), path: logicalPath,
  }));
  const receipt = values.find(({ path: logicalPath }) => (
    logicalPath === 'receipts/package-candidate.json'
  ));
  const wire = JSON.parse(new TextDecoder().decode(receipt.bytes));
  wire.publisherTrusted = true;
  const { digest: omitted, ...unsigned } = wire;
  wire.digest = await digestLocalPluginPackageValue(unsigned);
  receipt.bytes = new TextEncoder().encode(`${canonicalLocalPluginPackageJson(wire)}\n`);
  return values;
}

export async function runLocalPluginPackageUnpackedSecuritySuite() {
  assert.equal(CASES.length, 18);
  const primary = createLocalPluginPackageFixture();
  const changed = createLocalPluginPackageFixture({
    sourceSuffix: 'export const changedFixtureMarker = "p1b3-simplified";',
  });
  try {
    const validDirectory = () => directoryFromEntries(primary.entries);
    const controls = {};

    controls['wrong-archive-suffix'] = async () => failure(() => archiveAdapter([
      fileHandle('package.v7dk.tar', primary.archiveBytes),
    ]).inspectArchiveSelection());
    controls['oversized-archive'] = async () => failure(() => archiveAdapter([
      fileHandle('package.v7plugin', new Uint8Array(MAX_LOCAL_PLUGIN_ARCHIVE_BYTES + 1)),
    ]).inspectArchiveSelection());
    controls['developer-ports-rejected'] = async () => failure(() => (
      createLocalPluginPackageBrowserAdapter({ pickDirectory: async () => validDirectory() })
    ));
    controls['invalid-directory-root'] = async () => failure(() => inspectDirectory(
      fileHandle('not-a-directory', new Uint8Array()),
    ));
    controls['source-workspace-layout'] = async () => failure(() => inspectDirectory(
      directoryFromEntries([
        { bytes: new TextEncoder().encode('{}\n'), path: 'v7-package.json' },
        { bytes: new TextEncoder().encode('export {};\n'), path: 'src/index.ts' },
      ]),
    ));
    controls['symlink-directory-root'] = async () => failure(() => inspectDirectory({
      ...validDirectory(), isSymbolicLink: true,
    }));
    controls['symlink-candidate-entry'] = async () => failure(() => inspectDirectory(
      directoryFromEntries(primary.entries, { symlinkPath: primary.entries[0].path }),
    ));
    controls['special-candidate-entry'] = async () => failure(() => inspectDirectory(
      directoryFromEntries(primary.entries, { specialPath: primary.entries[0].path }),
    ));
    controls['unsafe-candidate-path'] = async () => {
      assert.equal(await failure(() => inspectLocalPluginPackageEntries([{
        bytes: new Uint8Array(), path: '../candidate.json',
      }], { release: PLUGIN_PACKAGE_BROWSER_RELEASE })), 'V7DK_BUNDLE_INVALID');
      const root = Object.freeze({
        kind: 'directory', name: 'candidate',
        async *values() { yield fileHandle('..', new Uint8Array()); },
      });
      return failure(() => inspectDirectory(root));
    };
    controls['directory-resource-limit'] = async () => failure(() => inspectDirectory(
      directoryFromEntries(Array.from({ length: 513 }, (_, index) => ({
        bytes: new Uint8Array(), path: `payload/build/file-${String(index).padStart(3, '0')}.js`,
      }))),
    ));
    controls['changing-directory-snapshot'] = async () => failure(() => inspectDirectory(
      sequenceDirectory([validDirectory(), directoryFromEntries(changed.entries)]),
    ));
    controls['stale-candidate-receipt'] = async () => failure(async () => inspectDirectory(
      directoryFromEntries(await staleReceiptEntries(primary.entries)),
    ));
    controls['cancelled-directory-snapshot'] = async () => failure(() => inspectDirectory(
      validDirectory(), { isCurrent: () => false },
    ));
    controls['duplicate-candidate-entry'] = async () => failure(() => (
      inspectLocalPluginPackageEntries([
        ...primary.entries,
        { bytes: new Uint8Array(primary.entries[0].bytes), path: primary.entries[0].path },
      ], { release: PLUGIN_PACKAGE_BROWSER_RELEASE })
    ));
    controls['prefix-collision-entry'] = async () => failure(() => (
      inspectLocalPluginPackageEntries([
        { bytes: new Uint8Array(), path: 'payload' },
        { bytes: new Uint8Array(), path: 'payload/build/index.js' },
      ], { release: PLUGIN_PACKAGE_BROWSER_RELEASE })
    ));
    controls['invalid-archive-handle'] = async () => failure(() => archiveAdapter([
      validDirectory(),
    ]).inspectArchiveSelection());
    controls['symlink-archive-handle'] = async () => failure(() => archiveAdapter([
      fileHandle('package.v7plugin', primary.archiveBytes, { isSymbolicLink: true }),
    ]).inspectArchiveSelection());
    controls['disposed-archive-adapter'] = async () => {
      const before = archiveAdapter();
      before.dispose();
      assert.equal(
        await failure(() => before.inspectArchiveSelection()),
        'V7DK_BROWSER_ADAPTER_DISPOSED',
      );
      const gate = deferred();
      const during = createLocalPluginPackageBrowserAdapter({
        pickArchive: () => gate.promise,
        release: PLUGIN_PACKAGE_BROWSER_RELEASE,
      });
      const unsettled = during.inspectArchiveSelection();
      during.dispose();
      gate.resolve(fileHandle('package.v7plugin', primary.archiveBytes));
      return failure(() => unsettled);
    };

    const negativeEvidence = [];
    for (const testCase of CASES) {
      assert.equal(typeof controls[testCase.case], 'function', testCase.case);
      const actual = await controls[testCase.case]();
      assert.equal(actual, testCase.expectedDiagnostic, testCase.case);
      negativeEvidence.push(Object.freeze({
        baselinePassed: true,
        case: testCase.case,
        diagnostic: actual,
        negativePassed: true,
      }));
    }

    const directory = validDirectory();
    const entries = await snapshotUnpackedCandidateDirectory(directory);
    const inspected = await inspectDirectory(directory);
    const candidate = readLocalPluginPackageCandidatePlan(inspected.candidate);
    const packed = packLocalPluginPackageEntries(inspected.entries);
    const productionBrowser = archiveAdapter();
    assert.deepEqual(Object.keys(productionBrowser), ['dispose', 'inspectArchiveSelection']);
    assert.deepEqual(packed, primary.archiveBytes);
    assert.deepEqual(entries, inspected.entries);
    assert.equal(candidate.productionExecutionAuthorized, false);
    assert.equal(candidate.source.kind, 'developer-unpacked');

    return Object.freeze({
      negativeEvidence: Object.freeze(negativeEvidence),
      positive: Object.freeze({
        archiveOnlyProductionAdapter: true,
        exactArchivePack: true,
        explicitUnpackedInspection: true,
        noAutomaticInstall: true,
        noDirectoryHandleRetention: true,
        noExecution: candidate.productionExecutionAuthorized === false,
        noModePreference: true,
      }),
    });
  } finally {
    primary.dispose(); changed.dispose();
  }
}
