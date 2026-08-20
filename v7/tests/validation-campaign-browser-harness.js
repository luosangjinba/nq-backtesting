import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import {
  buildValidationCampaignBrowserSeed,
} from './support/validation-campaign-browser-seed.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_DIR, '../..');
const FIXTURE_ROOT = path.join(TEST_DIR, 'fixtures/validation-campaign');
const FIXTURE_URL = '/v7/tests/fixtures/validation-campaign/';
const desktopScreenshot = path.join(FIXTURE_ROOT, 'production-1280x800.png');
const narrowScreenshot = path.join(FIXTURE_ROOT, 'responsive-620x800.png');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-h121-campaign-'));
const server = createStaticServer(REPOSITORY_ROOT, {
  additionalPublicPathPrefixes: [FIXTURE_URL],
});
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
  assert.ok(bytes.length > 10_000, 'Retained Campaign screenshot must contain rendered evidence.');
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
    url: `http://127.0.0.1:${webPort}${FIXTURE_URL}#/campaigns`,
  });
  try {
    await waitFor(cdp, `document.querySelector('.validation-page h1')?.textContent === 'Campaigns'`, 20_000);
  } catch (error) {
    const state = await evaluate(cdp, `(() => ({
      appText: document.querySelector('#app')?.textContent?.slice(0, 500),
      browserErrors: globalThis.__h121BrowserErrors,
      bodyText: document.body?.textContent?.slice(0, 500),
      hash: location.hash,
      readyState: document.readyState,
    }))()`);
    throw new Error(`${error.message}; isolated Campaign boot: ${JSON.stringify(state)}`);
  }
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

  let campaignRoute = await evaluate(cdp, 'location.hash');
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitFor(cdp, `location.hash === '${campaignRoute}'
    && document.querySelector('.validation-page h1')?.textContent === 'H121 FVG + SMA Campaign'`, 20_000);
  assert.equal(await evaluate(cdp, `Object.keys(localStorage)
    .filter((key) => key.startsWith('v7.validation-campaign:')).length`), 2);
  await evaluate(cdp, `[...document.querySelectorAll('.validation-page-header button')]
    .find((button) => button.textContent === 'Archive').click()`);
  await waitFor(cdp, `document.querySelector('.validation-page-header')?.textContent
    .includes('Archived')`, 20_000);

  // Real Session/Replay remains independent and receives only DOM-only Campaign actions.
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}${FIXTURE_URL}#/sessions` });
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

  const sessionRoute = await evaluate(cdp, 'location.hash');
  await evaluate(cdp, `document.querySelector('.validation-pane-button').click()`);
  await waitFor(cdp, `document.querySelector('.validation-capture-dialog')?.open === true
    && document.querySelector('.validation-capture-dialog h2')?.textContent === 'Capture Study Case'`);
  const emptyCampaignNavigation = await evaluate(cdp, `(() => ({
    action: [...document.querySelectorAll('.validation-capture-dialog button')]
      .find((button) => button.textContent === 'Go to Validation')?.textContent,
    message: document.querySelector('.validation-capture-dialog p')?.textContent,
  }))()`);
  assert.deepEqual(emptyCampaignNavigation, {
    action: 'Go to Validation',
    message: 'Study Cases must belong to an active Validation Campaign.',
  });
  await evaluate(cdp, `[...document.querySelectorAll('.validation-capture-dialog button')]
    .find((button) => button.textContent === 'Go to Validation').click()`);
  await waitFor(cdp, `location.hash === '#/campaigns'
    && document.querySelector('.validation-page h1')?.textContent === 'Campaigns'`, 20_000);
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${webPort}${FIXTURE_URL}${sessionRoute}`,
  });
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
    && document.querySelector('.validation-pane-actions')`, 25_000);

  // Seed a deterministic, exact-Session completed Case plus one pending Outcome.
  await evaluate(cdp, `document.querySelector('[data-layout-id="layout.two-columns"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '2'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 20_000);
  await frames(cdp, 3);
  const seedContext = await evaluate(cdp, `(async () => {
    const workspace = document.querySelector('.replay-workspace');
    const panes = [...document.querySelectorAll('.workspace-pane:not([aria-hidden="true"])')]
      .map((pane) => ({
      paneId: pane.dataset.paneId,
      timeframeId: pane.dataset.timeframeId,
    }));
    const sessionKey = Object.keys(localStorage)
      .find((key) => key.startsWith('v7.session-browser:record:'));
    const record = JSON.parse(localStorage.getItem(sessionKey)).value;
    const health = await fetch('http://' + location.hostname + ':8766/v7/market-data/health')
      .then((response) => response.json());
    return {
      contextPaneId: panes[0].paneId,
      contextTimeframeId: panes[0].timeframeId,
      currentSessionRevision: record.revision,
      datasetRevision: health.datasetRevision,
      executionPaneId: panes[1].paneId,
      executionTimeframeId: panes[1].timeframeId,
      outcomeCutoffEpochMs: Number(workspace.dataset.replayCursorEpochMs),
      sessionId: decodeURIComponent(location.hash.split('/').at(-1)),
    };
  })()`);
  assert.equal(typeof seedContext.datasetRevision, 'string');
  const seed = await buildValidationCampaignBrowserSeed({
    ...seedContext,
    decisionCutoffEpochMs: seedContext.outcomeCutoffEpochMs - 120_000,
    sessionRevision: seedContext.currentSessionRevision + 1,
  });
  await evaluate(cdp, `(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('v7.validation-campaign:')) localStorage.removeItem(key);
    }
    for (const [key, value] of ${JSON.stringify(seed.entries)}) localStorage.setItem(key, value);
    localStorage.removeItem('v7.state-sync:metadata');
  })()`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
    && document.querySelector('.replay-workspace')?.dataset.paneCount === '2'
    && document.querySelectorAll('.validation-pane-actions').length === 2`, 25_000);

  // The Outcome surface exposes only this exact Session/dataset and accepts the current cutoff.
  await evaluate(cdp, `document.querySelector('.validation-pane-button-secondary').click()`);
  await waitFor(cdp, `document.querySelector('.validation-capture-dialog')?.open === true
    && document.querySelector('.validation-capture-dialog h2')?.textContent === 'Pending Outcomes'`);
  assert.equal(await evaluate(cdp,
    `document.querySelectorAll('.validation-outcome-list .validation-case-row').length`), 1);
  await evaluate(cdp, `[...document.querySelectorAll('.validation-outcome-list button')]
    .find((button) => button.textContent.includes('Record Outcome')).click()`);
  try {
    await waitFor(cdp, `document.querySelector('.validation-outcome-list')?.textContent
      .includes('No observed Case from this exact Session')`, 20_000);
  } catch (error) {
    const state = await evaluate(cdp, `(() => ({
      dialogError: document.querySelector(
        '.validation-capture-dialog .validation-dialog-error')?.textContent,
      outcomeText: document.querySelector('.validation-outcome-list')?.textContent,
      replay: { ...document.querySelector('.replay-workspace')?.dataset },
      pageErrors: globalThis.__h121BrowserErrors,
    }))()`);
    throw new Error(`${error.message}; Outcome state: ${JSON.stringify(state)}`);
  }
  await evaluate(cdp, `[...document.querySelectorAll('.validation-capture-dialog button')]
    .find((button) => button.textContent === 'Close').click()`);
  await waitFor(cdp, `document.querySelector('.validation-capture-dialog')?.open === false`);

  const beforeDialog = await evaluate(cdp, `([...document.querySelectorAll('.lightweight-chart-host')]
    .map((host) => ({ barCount: host.dataset.barCount, revision: host.dataset.visibleRevision })))`);
  await evaluate(cdp, `document.querySelector('.validation-pane-button').click()`);
  await waitFor(cdp, `document.querySelector('.validation-capture-dialog')?.open === true`);
  const captureReview = await evaluate(cdp, `(() => ({
    heading: document.querySelector('.validation-capture-dialog h2')?.textContent,
    fvgOptions: document.querySelector('[name="fvgArtifactId"]')?.options.length ?? 0,
    smaOptions: document.querySelector('[name="smaInstanceId"]')?.options.length ?? 0,
  }))()`);
  assert.deepEqual(captureReview, { heading: 'Capture Study Case', fvgOptions: 0, smaOptions: 0 });
  await evaluate(cdp, `[...document.querySelectorAll('.validation-capture-dialog button')]
    .find((button) => button.textContent === 'Review evidence').click()`);
  await waitFor(cdp, `document.querySelectorAll('.validation-preview-card').length === 2`, 20_000);
  const incompletePreview = await evaluate(cdp, `(() => ({
    cards: document.querySelectorAll('.validation-preview-card').length,
    classification: document.querySelector('[name="qualificationClass"]').value,
    changeDisabled: [...document.querySelectorAll('.validation-capture-dialog button')]
      .find((button) => button.textContent === 'Change sources').disabled,
    selectorsLocked: [...document.querySelectorAll(
      '[name="campaignId"],[name="contextPaneId"],[name="executionPaneId"],'
      + '[name="fvgArtifactId"],[name="smaInstanceId"]')].every((control) => control.disabled),
    text: document.querySelector('.validation-preview').textContent,
  }))()`);
  assert.equal(incompletePreview.cards, 2);
  assert.equal(incompletePreview.classification, 'incomplete');
  assert.equal(incompletePreview.changeDisabled, false);
  assert.equal(incompletePreview.selectorsLocked, true);
  assert.match(incompletePreview.text, /only be retained as an incomplete draft/u);
  await evaluate(cdp, `[...document.querySelectorAll('.validation-capture-dialog button')]
    .find((button) => button.textContent === 'Close').click()`);
  await waitFor(cdp, `document.querySelector('.validation-capture-dialog')?.open === false`);
  await frames(cdp);
  const afterDialog = await evaluate(cdp, `([...document.querySelectorAll('.lightweight-chart-host')]
    .map((host) => ({ barCount: host.dataset.barCount, revision: host.dataset.visibleRevision })))`);
  assert.deepEqual(afterDialog, beforeDialog);
  assert.equal(await evaluate(cdp, `document.querySelector('.replay-next').disabled`), false);

  // The isolated retained prototype closes Case history, verification, Cohort, Analysis, and drill-down.
  campaignRoute = `#/campaigns/${seed.campaignId}`;
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}${FIXTURE_URL}${campaignRoute}` });
  await waitFor(cdp, `document.querySelectorAll('.validation-case-history').length === 2`, 20_000);
  await evaluate(cdp, `document.querySelectorAll('.validation-case-history')
    .forEach((entry) => { entry.open = true; })`);
  const seededDetail = await evaluate(cdp, `(() => ({
    citations: document.querySelectorAll('.validation-citation').length,
    histories: document.querySelectorAll('.validation-case-history').length,
    revisions: document.querySelectorAll('.validation-case-revision').length,
    verificationEntries: document.querySelectorAll('.validation-verification-history li').length,
  }))()`);
  assert.equal(seededDetail.histories, 2);
  assert.equal(seededDetail.revisions, 5);
  assert.ok(seededDetail.citations >= 4);
  assert.equal(seededDetail.verificationEntries, 1);
  await evaluate(cdp, `[...document.querySelectorAll('.validation-case-revision button')]
    .find((button) => button.textContent === 'Finalize').click()`);
  await waitFor(cdp, `[...document.querySelectorAll('.validation-case-history summary strong')]
    .filter((node) => node.textContent.includes('finalized')).length === 2`, 20_000);

  await evaluate(cdp, `[...document.querySelectorAll('.validation-section-heading button')]
    .find((button) => button.textContent === 'Freeze Cohort…').click()`);
  await waitFor(cdp, `document.querySelector('.validation-cohort-dialog')?.open === true`);
  assert.equal(await evaluate(cdp,
    `document.querySelectorAll('.validation-cohort-member').length`), 2);
  await evaluate(cdp, `(() => {
    const row = document.querySelectorAll('.validation-cohort-member')[1];
    const select = row.querySelector('select');
    select.value = 'exclude';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    row.querySelector('input').value = 'Explicit browser-Harness exclusion.';
    [...document.querySelectorAll('.validation-cohort-dialog button')]
      .find((button) => button.textContent === 'Freeze Cohort').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.validation-cohort-dialog')?.open === false
    && document.querySelector('.validation-cohort-summary')?.textContent.includes('Excluded')`, 20_000);
  await evaluate(cdp, `[...document.querySelectorAll('.validation-section-heading button')]
    .find((button) => button.textContent === 'Run analysis').click()`);
  await waitFor(cdp, `JSON.parse(localStorage.getItem(Object.keys(localStorage)
    .find((key) => key.startsWith('v7.validation-campaign:document:')))).analysisRuns.length === 2`, 20_000);
  assert.equal(await evaluate(cdp, `document.querySelectorAll('.validation-statistics tbody tr').length`), 15);
  const cohortCounts = await evaluate(cdp, `(() => {
    const values = [...document.querySelectorAll('.validation-cohort-summary dd')]
      .map((node) => node.textContent);
    return { excluded: values[1], members: values[0] };
  })()`);
  assert.deepEqual(cohortCounts, { excluded: '1', members: '1' });
  await evaluate(cdp, `(() => {
    const row = [...document.querySelectorAll('.validation-statistics tbody tr')]
      .find((entry) => entry.querySelector('th').textContent === 'Total Cases');
    row.querySelector('button').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.validation-drilldown-dialog')?.open === true`);
  const drilldown = await evaluate(cdp, `(() => ({
    heading: document.querySelector('.validation-drilldown-dialog h2').textContent,
    members: document.querySelectorAll('.validation-drilldown-member').length,
    rawActions: [...document.querySelectorAll('.validation-drilldown-member button')]
      .filter((button) => button.textContent === 'Open exact raw context').length,
  }))()`);
  assert.deepEqual(drilldown, { heading: 'count.total', members: 1, rawActions: 1 });
  await evaluate(cdp, `[...document.querySelectorAll('.validation-drilldown-dialog button')]
    .find((button) => button.textContent === 'Close').click()`);
  await waitFor(cdp, `document.querySelector('.validation-drilldown-dialog')?.open === false`);
  assert.equal(await evaluate(cdp,
    `document.activeElement?.textContent === 'Inspect exact members'`), true);

  // 620px route remains readable without horizontal document overflow.
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${webPort}${FIXTURE_URL}${campaignRoute}`,
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
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}${FIXTURE_URL}#/sessions` });
  await waitFor(cdp, `document.querySelector('.page-sessions')`, 20_000);

  const browserErrors = await evaluate(cdp, 'globalThis.__h121BrowserErrors');
  assert.deepEqual(browserErrors, []);
  evidence = Object.freeze({
    captureReview,
    cohortCounts,
    desktopBytes,
    drilldown,
    emptyCampaignNavigation,
    incompletePreview,
    narrowBytes,
    responsive,
    seededDetail,
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
