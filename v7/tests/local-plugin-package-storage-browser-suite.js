import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';

const TEST_ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_ROOT, '../..');

export async function runLocalPluginPackageStorageBrowserSuite() {
  const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-h117-package-storage-'));
  const server = createStaticServer(REPOSITORY_ROOT, {
    additionalPublicPathPrefixes: ['/v7/tests/fixtures/local-plugin-package/storage-browser/'],
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
    '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${userDataDirectory}`, 'about:blank',
  ], { stdio: 'ignore' });

  async function devtoolsPort() {
    const target = path.join(userDataDirectory, 'DevToolsActivePort');
    const deadline = Date.now() + 8_000;
    while (Date.now() < deadline) {
      if (fs.existsSync(target)) return fs.readFileSync(target, 'utf8').split(/\r?\n/u)[0];
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error('Chrome DevTools endpoint did not start.');
  }

  async function stopChrome() {
    if (chrome.exitCode !== null || chrome.signalCode !== null) return;
    const exited = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill('SIGTERM');
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2_000))]);
    if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGKILL');
  }

  let cdp;
  try {
    const port = await devtoolsPort();
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    cdp = await connectCdp(targets.find(({ type }) => type === 'page').webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', {
      url: `http://127.0.0.1:${server.address().port}/v7/tests/fixtures/local-plugin-package/storage-browser/?token=${process.pid}`,
    });
    await waitFor(cdp, `['ready', 'error'].includes(document.body?.dataset.status)`, 10_000);
    const browserError = await evaluate(cdp, 'globalThis.__h117PackageStorageError ?? null');
    assert.equal(browserError, null, JSON.stringify(browserError));
    const evidence = await evaluate(cdp, 'globalThis.__h117PackageStorageEvidence');
    assert.deepEqual(evidence.atomicCloneFailure, {
      code: 'PLUGIN_PACKAGE_STORAGE_WRITE_FAILED',
      generationCount: 0,
      revision: 0,
    });
    assert.deepEqual(evidence.durable, {
      generationCount: 1,
      journalCount: 1,
      receiptCount: 1,
      revision: 1,
      settingsCount: 1,
    });
    assert.equal(evidence.staleCode, 'PLUGIN_PACKAGE_STORAGE_CAS_STALE');
    assert.deepEqual(evidence.reset, {
      generationCount: 0,
      revision: 0,
      settingsCount: 0,
    });
    return Object.freeze(evidence);
  } finally {
    cdp?.close();
    await stopChrome();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await fs.promises.rm(userDataDirectory, {
      force: true, maxRetries: 10, recursive: true, retryDelay: 50,
    });
  }
}
