import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { createLocalPluginPackageFixture } from './support/local-plugin-package-fixture.js';

const TEST_ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_ROOT, '../..');

async function click(cdp, selector) {
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).click()`);
}

export async function runLocalPluginPackageProductBrowserSuite() {
  const fixture = createLocalPluginPackageFixture();
  const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-h117-plugin-center-'));
  const server = createStaticServer(REPOSITORY_ROOT, {
    additionalPublicPathPrefixes: ['/v7/tests/fixtures/local-plugin-package/product-browser/'],
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const chrome = spawn('/usr/bin/google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
    '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--remote-debugging-port=0', '--window-size=1440,920',
    `--user-data-dir=${userDataDirectory}`, 'about:blank',
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
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `globalThis.__h117PackageArchiveBase64 = ${JSON.stringify(
        Buffer.from(fixture.archiveBytes).toString('base64'),
      )};`,
    });
    await cdp.send('Page.navigate', {
      url: `http://127.0.0.1:${server.address().port}/v7/tests/fixtures/local-plugin-package/product-browser/?token=${process.pid}`,
    });
    await waitFor(cdp, `['ready', 'error'].includes(document.body?.dataset.status)`, 15_000);
    const startup = await evaluate(cdp, `globalThis.__h117PluginCenterEvidence ?? ({
      error: globalThis.__h117PluginCenterStartupError, status: 'error'
    })`);
    assert.equal(startup.status, 'ready', startup.error);
    assert.equal(await evaluate(cdp, `document.querySelector('.plugin-center-workspace').dataset.pluginCenterSurface`), 'core');

    await click(cdp, '.plugin-center-surface-tab:nth-child(2)');
    assert.equal(await evaluate(cdp, `document.querySelector('.plugin-center-workspace').dataset.pluginCenterSurface`), 'installed');
    assert.equal(await evaluate(cdp, `globalThis.__h117StoreSnapshot().revision`), 0);

    await evaluate(cdp, 'globalThis.__h117QueueArchive()');
    await click(cdp, '.local-plugin-installed > .core-plugin-center-header > button');
    await waitFor(cdp, `document.querySelector('.local-plugin-review').hidden === false`, 8_000);
    const reviewCopy = await evaluate(cdp, `document.querySelector('.local-plugin-review').textContent`);
    for (const required of [
      'Unverified local source', 'self-asserted', 'signature not applicable',
      'Integrity was checked', 'Installed does not mean active',
    ]) assert.ok(reviewCopy.includes(required), required);
    assert.equal(await evaluate(cdp, `document.activeElement.textContent.includes('Install inactive package')`), true);
    await click(cdp, '.local-plugin-review-actions button:first-child');
    assert.equal(await evaluate(cdp, `globalThis.__h117StoreSnapshot().revision`), 0);
    assert.equal(await evaluate(cdp, `document.activeElement.textContent`), 'Install from file');

    await evaluate(cdp, 'globalThis.__h117QueueArchive()');
    await click(cdp, '.local-plugin-installed > .core-plugin-center-header > button');
    await waitFor(cdp, `document.querySelector('.local-plugin-review').hidden === false`, 8_000);
    await evaluate(cdp, 'globalThis.__h117FailNextCommit()');
    await click(cdp, '.local-plugin-review-actions button:last-child');
    await waitFor(cdp, `document.querySelector('.local-plugin-feedback').textContent.includes('V7DK_STORAGE_COMMIT_FAILED')`, 5_000);
    assert.equal(await evaluate(cdp, `globalThis.__h117StoreSnapshot().revision`), 0);
    assert.equal(await evaluate(cdp, `document.querySelector('.local-plugin-review').hidden`), false);
    await click(cdp, '.local-plugin-review-actions button:last-child');
    await waitFor(cdp, `globalThis.__h117StoreSnapshot().revision === 1
      && document.querySelector('.local-plugin-review').hidden === true`, 8_000);
    assert.equal(await evaluate(cdp, `document.querySelector('.local-plugin-row').dataset.packageState`), 'installed-inactive');
    const detailCopy = await evaluate(cdp, `document.querySelector('.local-plugin-detail').textContent`);
    for (const required of [
      'Local Lifecycle Proof', 'self-asserted', 'unverified-local', 'signature not-applicable',
      'Execution', 'Unavailable', 'preserve-on-uninstall', 'Host-rendered settings',
    ]) assert.ok(detailCopy.includes(required), required);
    assert.equal(await evaluate(cdp, `globalThis.__h117StoreSnapshot().installed[0].productionExecutionAuthorized`), false);
    assert.equal(await evaluate(cdp, `document.querySelector('.core-plugin-setting-actions button').disabled`), true);
    await evaluate(cdp, `{
      const input = document.querySelector('[aria-label="Lifecycle label · package"]');
      input.value = 'ui-package';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }`);
    assert.equal(await evaluate(cdp, `document.querySelector('.core-plugin-setting-actions button').disabled`), false);
    await click(cdp, '.core-plugin-setting-actions button');
    await waitFor(cdp, `globalThis.__h117StoreSnapshot().revision === 2`, 5_000);
    await waitFor(cdp, `document.activeElement.classList.contains('core-plugin-row-main')`, 5_000);
    assert.deepEqual(await evaluate(cdp, `({
      packageValues: globalThis.__h117StoreSnapshot().installed[0].settings.packageValues,
      profileValues: globalThis.__h117StoreSnapshot().installed[0].settings.profileValues,
    })`), { packageValues: { lifecycleLabel: 'ui-package' }, profileValues: {} });
    await evaluate(cdp, `[...document.querySelectorAll('.local-plugin-setting-control button')]
      .find((button) => button.textContent === 'Reset package').click()`);
    await waitFor(cdp, `globalThis.__h117StoreSnapshot().revision === 3`, 5_000);
    await waitFor(cdp, `document.activeElement.classList.contains('core-plugin-row-main')`, 5_000);
    assert.deepEqual(await evaluate(cdp, `globalThis.__h117StoreSnapshot()
      .installed[0].settings.packageValues`), {});

    await click(cdp, '.local-plugin-installed > .core-plugin-center-header > button');
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(await evaluate(cdp, `globalThis.__h117StoreSnapshot().revision`), 3,
      'picker cancellation must be a no-op');

    await evaluate(cdp, 'globalThis.__h117ForceRestricted()');
    await waitFor(cdp, `document.querySelector('.local-plugin-recovery').hidden === false`, 5_000);
    const restrictedCopy = await evaluate(cdp, `document.querySelector('.local-plugin-recovery').textContent`);
    assert.ok(restrictedCopy.includes('Restricted Mode'));
    assert.ok(restrictedCopy.includes('V7DK_INTEGRITY_MISMATCH'));
    assert.equal(restrictedCopy.includes('community.lifecycle-proof-1.0.0.v7plugin'), false);
    await click(cdp, '.local-plugin-recovery button:first-of-type');
    await waitFor(cdp, `document.querySelector('.local-plugin-recovery').hidden === true`, 5_000);
    await waitFor(cdp, `document.activeElement.classList.contains('core-plugin-row-main')`, 5_000);

    await evaluate(cdp, `{
      const tab = document.querySelector('.plugin-center-surface-tab:nth-child(2)');
      tab.focus();
      tab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    }`);
    assert.equal(await evaluate(cdp, `document.querySelector('.plugin-center-workspace').dataset.pluginCenterSurface`), 'developer');
    assert.equal(await evaluate(cdp, `document.activeElement.textContent`), 'Developer Mode');
    assert.equal(await evaluate(cdp, `document.querySelector('.local-plugin-developer-mode').dataset.developerMode`), 'disabled');
    await click(cdp, '.local-plugin-developer-toggle input');
    await waitFor(cdp, `document.querySelector('.local-plugin-developer-mode').dataset.developerMode === 'enabled'`, 5_000);
    assert.equal(await evaluate(cdp, `document.querySelector('.local-plugin-developer-marker').textContent.includes('DEVELOPER MODE · ON')`), true);

    await evaluate(cdp, 'globalThis.__h117QueueDirectory()');
    await click(cdp, '.local-plugin-developer-actions button');
    await waitFor(cdp, `document.querySelectorAll('.local-plugin-developer-card').length === 1`, 8_000);
    await waitFor(cdp, `document.activeElement.textContent === 'Load unpacked'`, 5_000);
    const developerCopy = await evaluate(cdp, `document.querySelector('.local-plugin-developer-card').textContent`);
    assert.ok(developerCopy.includes('developer inactive'));
    assert.ok(developerCopy.includes('no watcher'));
    const readCount = await evaluate(cdp, 'globalThis.__h117PluginCenterEvidence.directoryRootReads');
    await click(cdp, '.local-plugin-developer-card .local-plugin-detail-actions button:first-child');
    await waitFor(cdp, `globalThis.__h117PluginCenterEvidence.directoryRootReads > ${readCount}
      && document.querySelector('.local-plugin-developer-card .local-plugin-detail-actions button:nth-child(2)').disabled === false`, 8_000);
    assert.equal(await evaluate(cdp, `document.activeElement.textContent`), 'Reload');
    await click(cdp, '.local-plugin-developer-card .local-plugin-detail-actions button:nth-child(2)');
    await waitFor(cdp, `globalThis.__h117PluginCenterEvidence.packCount === 1
      || document.querySelector('.local-plugin-developer-mode .local-plugin-feedback').dataset.kind === 'error'`, 8_000);
    const packEvidence = await evaluate(cdp, `({
      count: globalThis.__h117PluginCenterEvidence.packCount,
      error: document.querySelector('.local-plugin-developer-mode .local-plugin-feedback').textContent,
      matches: globalThis.__h117PluginCenterEvidence.packedMatchesArchive,
    })`);
    assert.equal(packEvidence.count, 1, packEvidence.error);
    assert.equal(packEvidence.matches, true);
    assert.equal(await evaluate(cdp, `document.activeElement.textContent`), 'Validate / Pack');
    await evaluate(cdp, 'globalThis.__h117CancelNextSave()');
    await click(cdp, '.local-plugin-developer-card .local-plugin-detail-actions button:nth-child(2)');
    await waitFor(cdp, `document.querySelector('.local-plugin-developer-mode .local-plugin-feedback')
      .textContent.includes('Save cancelled')`, 8_000);
    assert.equal(await evaluate(cdp, `globalThis.__h117PluginCenterEvidence.packCount`), 1);
    assert.equal(await evaluate(cdp, `document.activeElement.textContent`), 'Validate / Pack');
    await click(cdp, '.local-plugin-developer-card .local-plugin-detail-actions button:last-child');
    assert.equal(await evaluate(cdp, `document.querySelectorAll('.local-plugin-developer-card').length`), 0);
    assert.equal(await evaluate(cdp, `document.activeElement.textContent`), 'Load unpacked');

    await evaluate(cdp, 'globalThis.__h117QueueDirectory()');
    await click(cdp, '.local-plugin-developer-actions button');
    await waitFor(cdp, `document.querySelectorAll('.local-plugin-developer-card').length === 1`, 8_000);
    await click(cdp, '.local-plugin-developer-toggle input');
    await waitFor(cdp, `document.querySelector('.local-plugin-developer-mode').dataset.developerMode === 'disabled'`, 5_000);
    assert.equal(await evaluate(cdp, `document.querySelectorAll('.local-plugin-developer-card').length`), 0);

    const accessibility = await evaluate(cdp, `(() => ({
      blankButtons: [...document.querySelectorAll('button')].filter((button) =>
        !(button.textContent.trim() || button.getAttribute('aria-label'))).length,
      duplicateIds: [...document.querySelectorAll('[id]')].filter((node, index, nodes) =>
        nodes.findIndex((candidate) => candidate.id === node.id) !== index).length,
      liveRegion: document.querySelector('.local-plugin-feedback').getAttribute('aria-live'),
      reviewLabel: document.querySelector('.local-plugin-review').getAttribute('aria-label'),
      tabList: document.querySelector('.plugin-center-surface-tabs').getAttribute('role'),
      tabPanels: [...document.querySelectorAll('.plugin-center-surface-panel > [role="tabpanel"]')]
        .filter((node) => node.getAttribute('aria-label')).length,
    }))()`);
    assert.deepEqual(accessibility, {
      blankButtons: 0, duplicateIds: 0, liveRegion: 'polite',
      reviewLabel: 'Local package install review', tabList: 'tablist', tabPanels: 3,
    });
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      deviceScaleFactor: 1, height: 760, mobile: false, width: 620,
    });
    const narrow = await evaluate(cdp, `(() => {
      const root = document.querySelector('.plugin-center-workspace').getBoundingClientRect();
      return { documentWidth: document.documentElement.scrollWidth, right: root.right, viewport: innerWidth };
    })()`);
    assert.ok(narrow.right <= narrow.viewport + 1);
    assert.ok(narrow.documentWidth <= narrow.viewport + 1);
    const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    assert.ok(screenshot.data.length > 10_000, 'real browser must paint P1b.3 Plugin Center');

    return Object.freeze({
      accessibility,
      archiveReviewCancelCommitFailure: true,
      developerLoadReloadPackUnload: true,
      focusReturn: true,
      indexedDbRevision: 3,
      narrow,
      restrictedRecovery: true,
      saveCancellationNoWrite: true,
      settingsApplyReset: true,
      screenshotBytes: Buffer.from(screenshot.data, 'base64').length,
    });
  } finally {
    fixture.dispose();
    cdp?.close();
    await stopChrome();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await fs.promises.rm(userDataDirectory, {
      force: true, maxRetries: 10, recursive: true, retryDelay: 50,
    });
  }
}
