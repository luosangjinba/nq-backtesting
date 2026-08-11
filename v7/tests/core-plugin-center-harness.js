import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { runCorePluginCenterHeadlessHarness } from './core-plugin-center-headless-harness.js';

const headless = await runCorePluginCenterHeadlessHarness();
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_DIR, '../..');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-core-plugin-center-'));
const server = createStaticServer(REPOSITORY_ROOT, {
  additionalPublicPathPrefixes: ['/v7/tests/fixtures/core-plugin-center/'],
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const webPort = server.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--remote-debugging-port=0', '--window-size=1440,920',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const activePortFile = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(activePortFile)) {
      return fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0];
    }
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

async function pageEvidence(cdp) {
  return evaluate(cdp, `({
    artifactRaw: globalThis.__corePluginCenterEvidence.artifactRaw,
    generationSource: globalThis.__corePluginCenterEvidence.generationSource,
    impact: globalThis.__corePluginCenterEvidence.impact,
    loadId: globalThis.__corePluginCenterEvidence.loadId,
    restartRequested: globalThis.__corePluginCenterEvidence.restartRequested,
    snapshot: globalThis.__corePluginCenterEvidence.snapshot,
    status: globalThis.__corePluginCenterEvidence.status,
  })`);
}

async function click(cdp, selector) {
  await evaluate(cdp, `document.querySelector(${JSON.stringify(selector)}).click()`);
}

let cdp;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${webPort}/v7/tests/fixtures/core-plugin-center/`,
  });
  await waitFor(cdp, `document.body.dataset.status === 'ready'`, 15_000);
  let evidence = await pageEvidence(cdp);
  const originalArtifact = evidence.artifactRaw;
  assert.equal(evidence.snapshot.packages.length, 1);
  assert.equal(evidence.snapshot.packages[0].name, 'Fair Value Gap');
  assert.equal(evidence.snapshot.packages[0].runtimeState, 'active');
  assert.equal(evidence.snapshot.packages[0].hasSettings, false);
  assert.equal(await evaluate(cdp, `document.querySelectorAll('.core-plugin-row').length`), 1);
  assert.equal(await evaluate(cdp, `document.querySelector('.core-plugin-no-settings').textContent.includes('no package or profile settings')`), true);
  assert.equal(await evaluate(cdp, `document.querySelector('.workstation-settings-dialog').dataset.settingsDestination`), 'core-plugins');
  assert.equal(await evaluate(cdp, `document.querySelector('.workstation-settings-footer').hidden`), true);
  assert.equal(await evaluate(cdp, `getComputedStyle(document.querySelector('.workstation-settings-footer')).display`), 'none');

  await click(cdp, '.core-plugin-toggle input');
  await waitFor(cdp, `globalThis.__corePluginCenterEvidence.snapshot.restartRequired === true`, 5_000);
  evidence = await pageEvidence(cdp);
  assert.equal(evidence.snapshot.packages[0].runtimeState, 'active');
  assert.equal(evidence.snapshot.packages[0].changeState, 'pending-disable');
  assert.equal(evidence.artifactRaw, originalArtifact);
  const beforeLaterLoadId = evidence.loadId;
  await click(cdp, '.core-plugin-banner-actions button:nth-child(2)');
  assert.equal((await pageEvidence(cdp)).loadId, beforeLaterLoadId);

  await click(cdp, '.core-plugin-banner-actions button:first-child');
  await waitFor(cdp, `document.body.dataset.status === 'ready'
    && globalThis.__corePluginCenterEvidence.loadId !== ${JSON.stringify(beforeLaterLoadId)}`, 15_000);
  evidence = await pageEvidence(cdp);
  assert.equal(evidence.snapshot.packages[0].runtimeState, 'disabled');
  assert.equal(evidence.snapshot.restartRequired, false);
  assert.ok(evidence.impact.omittedModuleIds.includes('optional.semantic-fair-value-gap'));
  assert.ok(evidence.impact.omittedModuleIds.includes('optional.annotation-manual-workflow'));
  assert.equal(evidence.artifactRaw, originalArtifact);

  await click(cdp, '.core-plugin-toggle input');
  await waitFor(cdp, `globalThis.__corePluginCenterEvidence.snapshot.restartRequired === true`, 5_000);
  let reloadId = (await pageEvidence(cdp)).loadId;
  await click(cdp, '.core-plugin-banner-actions button:first-child');
  await waitFor(cdp, `document.body.dataset.status === 'ready'
    && globalThis.__corePluginCenterEvidence.loadId !== ${JSON.stringify(reloadId)}`, 15_000);
  evidence = await pageEvidence(cdp);
  assert.equal(evidence.snapshot.packages[0].runtimeState, 'active');
  assert.equal(evidence.artifactRaw, originalArtifact);

  await click(cdp, '.core-plugin-toggle input');
  await waitFor(cdp, `globalThis.__corePluginCenterEvidence.snapshot.restartRequired === true`, 5_000);
  await evaluate(cdp, `globalThis.__failNextCorePluginRestart()`);
  reloadId = (await pageEvidence(cdp)).loadId;
  await click(cdp, '.core-plugin-banner-actions button:first-child');
  await waitFor(cdp, `document.body.dataset.status === 'ready'
    && globalThis.__corePluginCenterEvidence.loadId !== ${JSON.stringify(reloadId)}`, 15_000);
  evidence = await pageEvidence(cdp);
  assert.equal(evidence.generationSource, 'active');
  assert.equal(evidence.snapshot.packages[0].runtimeState, 'failed');
  assert.equal(evidence.snapshot.lastFailure.moduleId, 'optional.semantic-fair-value-gap');
  assert.equal(evidence.snapshot.lastFailure.phase, 'start');
  assert.equal(evidence.snapshot.restartRequired, true);
  assert.equal(evidence.artifactRaw, originalArtifact);
  await click(cdp, '.core-plugin-banner-actions button:last-child');
  await waitFor(cdp, `globalThis.__corePluginCenterEvidence.snapshot.restartRequired === false`, 5_000);
  assert.equal((await pageEvidence(cdp)).snapshot.packages[0].runtimeState, 'active');

  await evaluate(cdp, `{
    const input = document.querySelector('.core-plugin-search');
    input.value = 'does-not-exist';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }`);
  assert.equal(await evaluate(cdp, `document.querySelector('.core-plugin-empty').textContent`), 'No Core plugins match this filter.');
  await evaluate(cdp, `{
    const input = document.querySelector('.core-plugin-search');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }`);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 1, height: 760, mobile: false, width: 760,
  });
  const layout = await evaluate(cdp, `(() => {
    const dialog = document.querySelector('.workstation-settings-dialog').getBoundingClientRect();
    const center = document.querySelector('.core-plugin-center').getBoundingClientRect();
    return { centerRight: center.right, dialogRight: dialog.right, viewport: innerWidth };
  })()`);
  assert.ok(layout.dialogRight <= layout.viewport + 1);
  assert.ok(layout.centerRight <= layout.dialogRight + 1);
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  assert.ok(screenshot.data.length > 10_000, 'real browser must paint the Core Plugin Center');
} finally {
  cdp?.close();
  await stopChrome();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await fs.promises.rm(userDataDirectory, {
    force: true, maxRetries: 10, recursive: true, retryDelay: 50,
  });
}

console.log(
  `v7 Core Plugin Center harness passed (${headless.negativeCount} negative controls, `
  + 'real Settings UI, disable/re-enable reload, fallback recovery, retained Artifact bytes, narrow layout)',
);
