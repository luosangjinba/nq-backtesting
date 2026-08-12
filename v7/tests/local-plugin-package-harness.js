import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pluginPackageStorage from '../src/plugin-package-storage/public.js';
import * as pluginPackageStore from '../src/plugin-package-store/public.js';
import * as pluginCenterUi from '../src/plugin-center-ui/public.js';
import { runLocalPluginPackageDeveloperSuite } from './local-plugin-package-developer-suite.js';
import { runLocalPluginPackageProductBrowserSuite } from './local-plugin-package-product-browser-suite.js';
import { runLocalPluginPackageStorageBrowserSuite } from './local-plugin-package-storage-browser-suite.js';
import { runLocalPluginPackageTransactionSuite } from './local-plugin-package-transaction-suite.js';

const TEST_ROOT = path.dirname(fileURLToPath(import.meta.url));
const contractRun = spawnSync(process.execPath, [
  path.join(TEST_ROOT, 'local-plugin-package-contract-suite.js'),
], { encoding: 'utf8' });
assert.equal(contractRun.status, 0, contractRun.stderr || contractRun.stdout);
const contractLines = contractRun.stdout.trim().split(/\r?\n/u);
const contractEvidence = JSON.parse(contractLines.at(-1));
assert.equal(contractEvidence.harness, 'H117');
assert.equal(contractEvidence.negativeControls.length, 18);
assert.equal(typeof pluginPackageStore.createPluginPackageStoreRuntime, 'function');
assert.equal(typeof pluginPackageStorage.createIndexedDbPluginPackageStorage, 'function');
assert.equal(typeof pluginCenterUi.createPluginCenterWorkspaceControl, 'function');

const transactionEvidence = await runLocalPluginPackageTransactionSuite();
assert.equal(transactionEvidence.negativeEvidence.length, 18);
const browserStorageEvidence = await runLocalPluginPackageStorageBrowserSuite();
const developerEvidence = await runLocalPluginPackageDeveloperSuite();
assert.equal(developerEvidence.negativeEvidence.length, 18);
const productBrowserEvidence = await runLocalPluginPackageProductBrowserSuite();

console.log(JSON.stringify({
  harness: 'H117',
  negativeControls: [
    ...contractEvidence.negativeControls,
    ...transactionEvidence.negativeEvidence,
    ...developerEvidence.negativeEvidence,
  ],
  packageContract: Object.freeze({
    archiveDigest: contractEvidence.archiveDigest,
    negativeGroupCount: contractEvidence.negativeControls.length,
    status: 'passed',
  }),
  profile: 'local-declarative-package-v1',
  productBrowser: Object.freeze({ ...productBrowserEvidence, status: 'passed' }),
  storageAdapter: Object.freeze({ ...browserStorageEvidence, status: 'passed' }),
  scope: 'P1b.1-contract-archive-plus-P1b.2-transactions-recovery-plus-P1b.3-product-developer-mode',
  status: 'passed',
  transactions: Object.freeze({
    ...transactionEvidence.positive,
    negativeGroupCount: transactionEvidence.negativeEvidence.length,
    status: 'passed',
  }),
  developerMode: Object.freeze({
    ...developerEvidence.positive,
    negativeGroupCount: developerEvidence.negativeEvidence.length,
    status: 'passed',
  }),
  visibleReviewRequired: true,
}));
