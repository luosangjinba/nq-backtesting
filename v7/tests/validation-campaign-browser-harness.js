import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_DIR, '../..');
const FIXTURE_ROOT = path.join(TEST_DIR, 'fixtures/validation-campaign');
const desktopScreenshot = path.join(FIXTURE_ROOT, 'production-1280x800.png');
const narrowScreenshot = path.join(FIXTURE_ROOT, 'responsive-620x800.png');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-h121-campaign-'));
const server = createStaticServer(REPOSITORY_ROOT);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const webPort = server.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--window-size=1280,800',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const file = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').split(/\r?\n/u)[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function stopChrome() {
  if (chrome.exitCode !== null) return;
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ]);
  if (!stopped) { chrome.kill('SIGKILL'); await exited; }
}

async function frames(cdp, count = 2) {
  await evaluate(cdp, `(async () => {
    for (let index = 0; index < ${count}; index += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  })()`);
}

async function screenshot(cdp, target) {
  const capture = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const bytes = Buffer.from(capture.data, 'base64');
  assert.ok(bytes.length > 10_000, 'Campaign production screenshot must contain rendered evidence.');
  if (process.env.V7_UPDATE_VISUALS === '1') {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  } else {
    assert.ok(fs.existsSync(target), `Missing H121 visual fixture ${path.basename(target)}.`);
    assert.ok(fs.statSync(target).size > 10_000, `H121 visual fixture ${path.basename(target)} is empty.`);
  }
  return bytes.length;
}

let cdp;
let evidence;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find(({ type }) => type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 1, height: 800, mobile: false, width: 1280,
  });
  await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'America/Los_Angeles' });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `{
      globalThis.__h121BrowserErrors = [];
      addEventListener('error', (event) => globalThis.__h121BrowserErrors.push(event.message));
      addEventListener('unhandledrejection', (event) => {
        globalThis.__h121BrowserErrors.push(String(event.reason?.stack ?? event.reason));
      });
      const NativeDate = Date;
      globalThis.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [1787126400000])); }
        static now() { return 1787126400000; }
      };
    }`,
  });
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${webPort}/v7/app/#/campaigns`,
  });
  await waitFor(cdp, `document.querySelector('.validation-page h1')?.textContent === 'Campaigns'`, 20_000);
  assert.equal(await evaluate(cdp, `document.querySelectorAll('.validation-card').length`), 0);
  await evaluate(cdp, `[...document.querySelectorAll('.validation-page-header button')]
    .find((button) => button.textContent === 'New Campaign').click()`);
  await waitFor(cdp, `document.querySelector('.validation-dialog')?.open === true`);
  const dialogFocus = await evaluate(cdp, `(() => ({
    heading: document.querySelector('.validation-dialog h2')?.textContent,
    modal: document.querySelector('.validation-dialog')?.matches(':modal'),
  }))()`);
  assert.deepEqual(dialogFocus, { heading: 'New Validation Campaign', modal: true });
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.validation-dialog form');
    form.elements.title.value = 'H121 FVG + SMA Campaign';
    form.elements.authorLabel.value = 'H121 reviewer';
    [...form.querySelectorAll('button')]
      .find((button) => button.textContent === 'Create Campaign').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.validation-dialog')?.open === false
    && document.querySelectorAll('.validation-card-grid .validation-card').length === 1`);
  const storedKeys = await evaluate(cdp, `Object.keys(localStorage)
    .filter((key) => key.startsWith('v7.validation-campaign:')).sort()`);
  assert.equal(storedKeys.length, 2);
  assert.equal(storedKeys[0].startsWith('v7.validation-campaign:document:'), true);
  assert.equal(storedKeys[1], 'v7.validation-campaign:index');

  await evaluate(cdp, `document.querySelector('.validation-card a').click()`);
  await waitFor(cdp, `location.hash.startsWith('#/campaigns/')
    && document.querySelector('.validation-page h1')?.textContent === 'H121 FVG + SMA Campaign'`);
  const detail = await evaluate(cdp, `(() => ({
    definitions: document.querySelectorAll('.validation-definition-grid .validation-card').length,
    emptyCases: document.querySelector('.validation-empty-inline')?.textContent,
    headings: [...document.querySelectorAll('.validation-section h2')].map((node) => node.textContent),
    rail: [...document.querySelectorAll('.rail-link')].map((node) => node.textContent.trim()),
  }))()`);
  assert.equal(detail.definitions, 2);
  assert.match(detail.emptyCases, /Capture Study Case/u);
  assert.deepEqual(detail.headings, ['Study Cases', 'Frozen Cohort & descriptives']);
  assert.deepEqual(detail.rail, ['Sessions', 'Validation', 'Data acquisition']);
  const desktopBytes = await screenshot(cdp, desktopScreenshot);

  const campaignRoute = await evaluate(cdp, 'location.hash');
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitFor(cdp, `location.hash === '${campaignRoute}'
    && document.querySelector('.validation-page h1')?.textContent === 'H121 FVG + SMA Campaign'`, 20_000);
  assert.equal(await evaluate(cdp, `Object.keys(localStorage)
    .filter((key) => key.startsWith('v7.validation-campaign:')).length`), 2);

  // Real Session/Replay remains independent and receives only DOM-only Campaign actions.
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/v7/app/#/sessions` });
  await waitFor(cdp, `document.querySelector('#app')?.dataset.viewState === 'empty'`, 20_000);
  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.dataset.dateAvailabilityState === 'ready'`, 20_000);
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'H121 Replay Context';
    form.querySelectorAll('[name="instrument"]')[0].checked = true;
    form.elements.start.value = '2026-05-01T12:40';
    form.elements.end.value = '2026-05-11T12:40';
    form.requestSubmit();
  })()`);
  try {
    await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
      && document.querySelector('.validation-pane-actions')`, 25_000);
  } catch (error) {
    const state = await evaluate(cdp, `(() => ({
      appState: document.querySelector('#app')?.dataset.viewState,
      browserErrors: globalThis.__h121BrowserErrors,
      campaignActions: document.querySelectorAll('.validation-pane-actions').length,
      hash: location.hash,
      overlay: document.querySelector('.chart-state-overlay')?.textContent,
      status: document.querySelector('.workspace-inline-status')?.textContent,
      workspaceState: document.querySelector('.replay-workspace')?.dataset.viewState,
    }))()`);
    throw new Error(`${error.message}; Replay Campaign state: ${JSON.stringify(state)}`);
  }
  const beforeDialog = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return { barCount: host.dataset.barCount, revision: host.dataset.visibleRevision };
  })()`);
  await evaluate(cdp, `document.querySelector('.validation-pane-button').click()`);
  await waitFor(cdp, `document.querySelector('.validation-capture-dialog')?.open === true`);
  const captureReview = await evaluate(cdp, `(() => ({
    heading: document.querySelector('.validation-capture-dialog h2')?.textContent,
    fvgOptions: document.querySelector('[name="fvgArtifactId"]')?.options.length ?? 0,
    smaOptions: document.querySelector('[name="smaInstanceId"]')?.options.length ?? 0,
  }))()`);
  assert.deepEqual(captureReview, { heading: 'Capture Study Case', fvgOptions: 0, smaOptions: 0 });
  await evaluate(cdp, `[...document.querySelectorAll('.validation-capture-dialog button')]
    .find((button) => button.textContent === 'Close').click()`);
  await waitFor(cdp, `document.querySelector('.validation-capture-dialog')?.open === false`);
  await frames(cdp);
  const afterDialog = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return { barCount: host.dataset.barCount, revision: host.dataset.visibleRevision };
  })()`);
  assert.deepEqual(afterDialog, beforeDialog);
  assert.equal(await evaluate(cdp, `document.querySelector('.replay-next').disabled`), false);

  // 620px route remains readable without horizontal document overflow.
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${webPort}/v7/app/${campaignRoute}`,
  });
  await waitFor(cdp, `document.querySelector('.validation-page h1')?.textContent === 'H121 FVG + SMA Campaign'`, 20_000);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 1, height: 800, mobile: false, width: 620,
  });
  await frames(cdp, 3);
  const responsive = await evaluate(cdp, `(() => ({
    bodyOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    cardsOneColumn: [...document.querySelectorAll('.validation-definition-grid .validation-card')]
      .every((card) => card.getBoundingClientRect().width > innerWidth * .65),
    headingVisible: document.querySelector('.validation-page h1')?.getBoundingClientRect().left >= 0,
  }))()`);
  assert.deepEqual(responsive, {
    bodyOverflow: false, cardsOneColumn: true, headingVisible: true,
  });
  const narrowBytes = await screenshot(cdp, narrowScreenshot);

  // Corrupt Campaign bytes poison only Campaign; Session route still opens.
  await evaluate(cdp, `(() => {
    const key = Object.keys(localStorage).find((entry) => entry.startsWith('v7.validation-campaign:document:'));
    localStorage.setItem(key, '{corrupt');
    localStorage.setItem('v7.validation-campaign:index', '{corrupt');
    localStorage.removeItem('v7.state-sync:metadata');
  })()`);
  await cdp.send('Page.reload', { ignoreCache: true });
  try {
    await waitFor(cdp, `document.querySelector('.validation-state-panel h2')
      ?.textContent === 'Campaign storage needs recovery'`, 20_000);
  } catch (error) {
    const state = await evaluate(cdp, `(() => ({
      appText: document.querySelector('#app')?.textContent?.slice(0, 500),
      browserErrors: globalThis.__h121BrowserErrors,
      campaignKeys: Object.keys(localStorage).filter((key) => key.startsWith('v7.validation-campaign:'))
        .map((key) => [key, localStorage.getItem(key)?.slice(0, 40)]),
      hash: location.hash,
      heading: document.querySelector('h1,h2')?.textContent,
    }))()`);
    throw new Error(`${error.message}; corrupt state: ${JSON.stringify(state)}`);
  }
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/v7/app/#/sessions` });
  await waitFor(cdp, `document.querySelector('.page-sessions')`, 20_000);

  const browserErrors = await evaluate(cdp, 'globalThis.__h121BrowserErrors');
  assert.deepEqual(browserErrors, []);
  evidence = Object.freeze({
    captureReview,
    desktopBytes,
    narrowBytes,
    responsive,
    storedKeys: storedKeys.length,
  });
} finally {
  cdp?.close();
  await stopChrome();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await fs.promises.rm(userDataDirectory, {
    force: true, maxRetries: 10, recursive: true, retryDelay: 50,
  });
}

console.log(JSON.stringify({
  evidence,
  harness: 'H121-browser',
  status: 'passed-automated-human-review-required',
}));
