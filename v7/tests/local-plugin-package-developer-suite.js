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
} from '../src/plugin-contract/public.js';
import { createLocalPluginPackageBrowserAdapter } from '../src/plugin-center-ui/public.js';
import { PLUGIN_PACKAGE_BROWSER_RELEASE } from '../src/plugin-center-ui/plugin-package-release-identity.js';
import { createLocalPluginPackageFixture } from './support/local-plugin-package-fixture.js';

const TEST_ROOT = path.dirname(fileURLToPath(import.meta.url));
const CASES = JSON.parse(fs.readFileSync(path.join(
  TEST_ROOT,
  'fixtures/local-plugin-package/developer-negative/cases.json',
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

function memoryStorage() {
  const values = new Map();
  return Object.freeze({
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  });
}

function deferred() {
  let resolve;
  const promise = new Promise((accept) => { resolve = accept; });
  return { promise, resolve };
}

function adapter({ archives = [], directories = [], saveArchive = async () => true } = {}) {
  return createLocalPluginPackageBrowserAdapter({
    deviceStorage: memoryStorage(),
    pickArchive: async () => archives.shift() ?? null,
    pickDirectory: async () => directories.shift() ?? null,
    release: PLUGIN_PACKAGE_BROWSER_RELEASE,
    saveArchive,
  });
}

async function failure(action) {
  try { await action(); } catch (error) { return error?.code ?? null; }
  assert.fail('Expected Developer Mode operation to fail.');
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

export async function runLocalPluginPackageDeveloperSuite() {
  assert.equal(CASES.length, 18);
  const primary = createLocalPluginPackageFixture();
  const changed = createLocalPluginPackageFixture({
    sourceSuffix: 'export const changedFixtureMarker = "p1b3";',
  });
  const other = createLocalPluginPackageFixture({
    packageId: 'community.lifecycle-other',
    mutateManifest(manifest) {
      manifest.display.name = 'Local Lifecycle Other';
    },
  });
  try {
    const validDirectory = () => directoryFromEntries(primary.entries);
    const controls = {};

    controls['wrong-archive-suffix'] = async () => {
      const browser = adapter({ archives: [fileHandle('package.v7dk.tar', primary.archiveBytes)] });
      return failure(() => browser.inspectArchiveSelection());
    };
    controls['oversized-archive'] = async () => {
      const bytes = new Uint8Array(MAX_LOCAL_PLUGIN_ARCHIVE_BYTES + 1);
      const browser = adapter({ archives: [fileHandle('package.v7plugin', bytes)] });
      return failure(() => browser.inspectArchiveSelection());
    };
    controls['developer-mode-disabled'] = async () => {
      const browser = adapter({ directories: [validDirectory()] });
      return failure(() => browser.loadUnpacked());
    };
    controls['invalid-directory-root'] = async () => {
      const browser = adapter({ directories: [fileHandle('not-a-directory', new Uint8Array())] });
      browser.setEnabled(true);
      return failure(() => browser.loadUnpacked());
    };
    controls['source-workspace-layout'] = async () => {
      const entries = [
        { bytes: new TextEncoder().encode('{}\n'), path: 'v7-package.json' },
        { bytes: new TextEncoder().encode('export {};\n'), path: 'src/index.ts' },
      ];
      const browser = adapter({ directories: [directoryFromEntries(entries)] });
      browser.setEnabled(true);
      return failure(() => browser.loadUnpacked());
    };
    controls['symlink-directory-root'] = async () => {
      const root = { ...validDirectory(), isSymbolicLink: true };
      const browser = adapter({ directories: [root] });
      browser.setEnabled(true);
      return failure(() => browser.loadUnpacked());
    };
    controls['symlink-candidate-entry'] = async () => {
      const browser = adapter({ directories: [directoryFromEntries(primary.entries, {
        symlinkPath: primary.entries[0].path,
      })] });
      browser.setEnabled(true);
      return failure(() => browser.loadUnpacked());
    };
    controls['special-candidate-entry'] = async () => {
      const browser = adapter({ directories: [directoryFromEntries(primary.entries, {
        specialPath: primary.entries[0].path,
      })] });
      browser.setEnabled(true);
      return failure(() => browser.loadUnpacked());
    };
    controls['unsafe-candidate-path'] = async () => {
      const directCode = await failure(() => inspectLocalPluginPackageEntries([{
        bytes: new Uint8Array(), path: '../candidate.json',
      }], { release: PLUGIN_PACKAGE_BROWSER_RELEASE }));
      assert.equal(directCode, 'V7DK_BUNDLE_INVALID');
      const collisionCode = await failure(() => inspectLocalPluginPackageEntries([
        { bytes: new Uint8Array(), path: 'payload' },
        { bytes: new Uint8Array(), path: 'payload/build/index.js' },
      ], { release: PLUGIN_PACKAGE_BROWSER_RELEASE }));
      assert.equal(collisionCode, 'V7DK_BUNDLE_INVALID');
      const root = Object.freeze({
        kind: 'directory', name: 'candidate',
        async *values() { yield fileHandle('..', new Uint8Array()); },
      });
      const browser = adapter({ directories: [root] });
      browser.setEnabled(true);
      return failure(() => browser.loadUnpacked());
    };
    controls['directory-resource-limit'] = async () => {
      const entries = Array.from({ length: 513 }, (_, index) => ({
        bytes: new Uint8Array(), path: `payload/build/file-${String(index).padStart(3, '0')}.js`,
      }));
      const browser = adapter({ directories: [directoryFromEntries(entries)] });
      browser.setEnabled(true);
      return failure(() => browser.loadUnpacked());
    };
    controls['changing-directory-snapshot'] = async () => {
      const browser = adapter({ directories: [sequenceDirectory([
        validDirectory(), directoryFromEntries(changed.entries),
      ])] });
      browser.setEnabled(true);
      return failure(() => browser.loadUnpacked());
    };
    controls['stale-candidate-receipt'] = async () => {
      const entries = await staleReceiptEntries(primary.entries);
      const browser = adapter({ directories: [directoryFromEntries(entries)] });
      browser.setEnabled(true);
      return failure(() => browser.loadUnpacked());
    };
    controls['concurrent-directory-read'] = async () => {
      const gate = deferred();
      const browser = createLocalPluginPackageBrowserAdapter({
        deviceStorage: memoryStorage(),
        pickDirectory: () => gate.promise,
        release: PLUGIN_PACKAGE_BROWSER_RELEASE,
      });
      browser.setEnabled(true);
      const first = browser.loadUnpacked();
      const code = await failure(() => browser.loadUnpacked());
      assert.equal(
        await failure(() => browser.unload('community.lifecycle-proof')),
        'V7DK_TRANSACTION_CONCURRENT',
      );
      gate.resolve(null);
      await first;
      return code;
    };
    controls['reload-failure-retains-prior'] = async () => {
      const invalid = directoryFromEntries([{ bytes: new Uint8Array(), path: 'unexpected.txt' }]);
      const root = sequenceDirectory([validDirectory(), validDirectory(), invalid, invalid]);
      const browser = adapter({ directories: [root] });
      browser.setEnabled(true);
      await browser.loadUnpacked();
      const before = browser.snapshot().generations[0].snapshotDigest;
      const code = await failure(() => browser.reload('community.lifecycle-proof'));
      assert.equal(browser.snapshot().generations[0].snapshotDigest, before);
      return code;
    };
    controls['reload-identity-change'] = async () => {
      const root = sequenceDirectory([
        validDirectory(), validDirectory(),
        directoryFromEntries(other.entries), directoryFromEntries(other.entries),
      ]);
      const browser = adapter({ directories: [root] });
      browser.setEnabled(true);
      await browser.loadUnpacked();
      return failure(() => browser.reload('community.lifecycle-proof'));
    };
    controls['validate-pack-stale-generation'] = async () => {
      const root = sequenceDirectory([
        validDirectory(), validDirectory(),
        directoryFromEntries(changed.entries), directoryFromEntries(changed.entries),
      ]);
      const browser = adapter({ directories: [root] });
      browser.setEnabled(true);
      await browser.loadUnpacked();
      return failure(() => browser.validatePack('community.lifecycle-proof'));
    };
    controls['disable-cancels-read'] = async () => {
      const gate = deferred();
      const browser = createLocalPluginPackageBrowserAdapter({
        deviceStorage: memoryStorage(),
        pickDirectory: () => gate.promise,
        release: PLUGIN_PACKAGE_BROWSER_RELEASE,
      });
      browser.setEnabled(true);
      const unsettled = browser.loadUnpacked();
      browser.setEnabled(false);
      gate.resolve(validDirectory());
      const code = await failure(() => unsettled);
      assert.equal(browser.snapshot().generations.length, 0);
      return code;
    };
    controls['disposed-developer-adapter'] = async () => {
      const browser = adapter();
      browser.dispose();
      return failure(() => browser.loadUnpacked());
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

    const saved = [];
    const deviceStorage = memoryStorage();
    const browser = createLocalPluginPackageBrowserAdapter({
      deviceStorage,
      pickDirectory: async () => validDirectory(),
      release: PLUGIN_PACKAGE_BROWSER_RELEASE,
      saveArchive: async (candidate) => { saved.push(candidate); return true; },
    });
    assert.equal(browser.snapshot().enabled, false);
    browser.setEnabled(true);
    const loaded = await browser.loadUnpacked();
    assert.equal(loaded.state, 'developer-inactive');
    assert.equal(loaded.productionExecutionAuthorized, false);
    assert.equal(browser.snapshot().watched, false);
    const reloaded = await browser.reload(loaded.packageId);
    assert.equal(reloaded.snapshotDigest, loaded.snapshotDigest);
    const packed = await browser.validatePack(loaded.packageId);
    assert.equal(packed.saved, true);
    assert.deepEqual(saved[0].bytes, primary.archiveBytes);
    browser.unload(loaded.packageId);
    assert.equal(browser.snapshot().generations.length, 0);
    browser.setEnabled(false);
    assert.equal(deviceStorage.getItem('v7.plugin-center:developer-mode'), null);

    return Object.freeze({
      negativeEvidence: Object.freeze(negativeEvidence),
      positive: Object.freeze({
        exactArchivePack: true,
        explicitReload: true,
        inactiveState: loaded.state,
        noAutomaticInstall: true,
        noExecution: loaded.productionExecutionAuthorized === false,
        noWatcher: browser.snapshot().watched === false,
      }),
    });
  } finally {
    primary.dispose(); changed.dispose(); other.dispose();
  }
}
