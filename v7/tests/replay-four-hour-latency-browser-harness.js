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
const PANE_COUNT = Number(process.env.V7_REPLAY_PANE_COUNT ?? 1);
const SAMPLE_COUNT = Number(process.env.V7_REPLAY_SAMPLE_COUNT ?? 128);
assert.ok([1, 2, 4].includes(PANE_COUNT), 'V7_REPLAY_PANE_COUNT must be 1, 2, or 4');
assert.ok(Number.isSafeInteger(SAMPLE_COUNT) && SAMPLE_COUNT > 0);
const FOUR_HOUR_STEP_ID = 'replay-step.fixed-240-minute';
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-replay-4h-latency-'));
const server = createStaticServer(REPOSITORY_ROOT);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const webPort = server.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--window-size=1440,900',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const activePortFile = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(activePortFile)) return fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function waitForPageTarget(debugPort) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page');
      if (page) return page;
    } catch { /* DevTools may expose its port before the target endpoint settles. */ }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome page target did not start.');
}

function percentile(samples, ratio) {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * ratio) - 1];
}

function summarize(samples) {
  return Object.freeze({
    maxMs: Math.max(...samples),
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    p99Ms: percentile(samples, 0.99),
    samples: samples.length,
  });
}

let cdp;
let result;
try {
  const debugPort = await waitForDevtools();
  const pageTarget = await waitForPageTarget(debugPort);
  cdp = await connectCdp(pageTarget.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `{
      globalThis.__browserErrors = [];
      globalThis.__fetchUrls = [];
      const nativeFetch = globalThis.fetch.bind(globalThis);
      globalThis.fetch = (input, init) => {
        globalThis.__fetchUrls.push(typeof input === 'string' ? input : input.url);
        return nativeFetch(input, init);
      };
      addEventListener('error', (event) => globalThis.__browserErrors.push(event.message));
      addEventListener('unhandledrejection', (event) => globalThis.__browserErrors.push(String(event.reason)));
      const NativeDate = Date;
      globalThis.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [1780693200000])); }
        static now() { return 1780693200000; }
      };
    }`,
  });
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/v7/app/` });
  await waitFor(cdp, `document.querySelector('#app')?.dataset.viewState === 'empty'`);
  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.dataset.dateAvailabilityState === 'ready'`);
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'NQ Four Hour Replay Latency';
    form.querySelectorAll('[name="instrument"]')[0].checked = true;
    form.elements.start.value = '2026-05-01T12:40';
    form.elements.end.value = '2026-06-15T12:40';
    form.requestSubmit();
  })()`);
  try {
    await waitFor(cdp,
      `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`, 10_000);
  } catch (error) {
    const entryFailure = await evaluate(cdp, `(() => ({
      browserErrors: globalThis.__browserErrors,
      state: document.querySelector('.replay-workspace')?.dataset.viewState,
      status: document.querySelector('.workspace-inline-status')?.textContent,
      overlay: document.querySelector('.chart-state-overlay')?.textContent,
    }))()`);
    throw new Error(`${error.message}; entry failure: ${JSON.stringify(entryFailure)}`);
  }
  if (PANE_COUNT > 1) {
    const layoutId = PANE_COUNT === 2 ? 'layout.two-columns' : 'layout.four-grid';
    await evaluate(cdp, `document.querySelector('[data-layout-id="${layoutId}"]').click()`);
    await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '${PANE_COUNT}'
      && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  }
  await evaluate(cdp, `(() => {
    const select = document.querySelector('.replay-step-select');
    select.value = '${FOUR_HOUR_STEP_ID}';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor(cdp,
    `document.querySelector('.replay-workspace')?.dataset.replayStepId === '${FOUR_HOUR_STEP_ID}'`);
  assert.deepEqual(await evaluate(cdp, `[...document.querySelector('.replay-step-select').options]
    .map(({ textContent }) => textContent)`), [
    '1m', '2m', '3m', '4m', '5m', '10m', '15m', '30m', '1h', '2h', '4h',
  ]);

  const visibleSamples = [];
  const cacheHitVisibleSamples = [];
  const cacheMissVisibleSamples = [];
  const mutationSamples = [];
  const paintSamples = [];
  const applySamples = [];
  const mutationModes = new Set();
  let providerMisses = 0;
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    await waitFor(cdp, `document.querySelector('.replay-next')?.disabled === false`);
    const before = await evaluate(cdp, `(() => ({
      fetchCount: globalThis.__fetchUrls.filter((url) => url.includes('/v4/bars?')).length,
      revision: Number(document.querySelector('.replay-workspace').dataset.workspaceRevision),
    }))()`);
    const startedAt = performance.now();
    await evaluate(cdp, `document.querySelector('.replay-next').click()`);
    await waitFor(cdp,
      `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) === ${before.revision + 1}`,
      10_000);
    visibleSamples.push(performance.now() - startedAt);
    const after = await evaluate(cdp, `(() => {
      const hosts = [...document.querySelectorAll('.lightweight-chart-host')];
      return {
        applyMs: Math.max(...hosts.map((host) => Number(host.dataset.lastApplyMs))),
        barCounts: hosts.map((host) => Number(host.dataset.barCount)),
        fetchCount: globalThis.__fetchUrls.filter((url) => url.includes('/v4/bars?')).length,
        mutationModes: [...new Set(hosts.map((host) => host.dataset.lastMutationMode))],
        mutationMs: Math.max(...hosts.map((host) => Number(host.dataset.lastMutationMs))),
        paintMs: Math.max(...hosts.map((host) => Number(host.dataset.lastPaintMs))),
      };
    })()`);
    const visibleMs = visibleSamples.at(-1);
    if (after.fetchCount > before.fetchCount) {
      providerMisses += 1;
      cacheMissVisibleSamples.push(visibleMs);
    } else {
      cacheHitVisibleSamples.push(visibleMs);
    }
    applySamples.push(after.applyMs);
    mutationSamples.push(after.mutationMs);
    paintSamples.push(after.paintMs);
    for (const mode of after.mutationModes) mutationModes.add(mode);
  }
  result = Object.freeze({
    adapterApply: summarize(applySamples),
    adapterMutation: summarize(mutationSamples),
    adapterPaint: summarize(paintSamples),
    browserErrors: await evaluate(cdp, `globalThis.__browserErrors`),
    finalBarCounts: await evaluate(cdp,
      `[...document.querySelectorAll('.lightweight-chart-host')]
        .map((host) => Number(host.dataset.barCount))`),
    cacheHitVisible: summarize(cacheHitVisibleSamples),
    cacheMissVisible: summarize(cacheMissVisibleSamples),
    mutationModes: [...mutationModes],
    providerMisses,
    paneCount: PANE_COUNT,
    visible: summarize(visibleSamples),
  });
  assert.deepEqual(result.browserErrors, []);
  assert.equal(result.visible.samples, SAMPLE_COUNT);
  if (SAMPLE_COUNT >= 128) {
    assert.ok(result.cacheHitVisible.samples >= 100,
      `4h Replay requires at least 100 warm-cache samples: ${JSON.stringify(result)}`);
    assert.ok(result.cacheHitVisible.p95Ms < 250,
      `4h Replay warm-cache p95 exceeded 250ms: ${JSON.stringify(result)}`);
    assert.ok(result.cacheHitVisible.p99Ms < 350,
      `4h Replay warm-cache p99 exceeded 350ms: ${JSON.stringify(result)}`);
    assert.ok(result.cacheHitVisible.maxMs < 500,
      `4h Replay warm-cache max exceeded 500ms: ${JSON.stringify(result)}`);
    assert.ok(result.adapterApply.p95Ms < 100 && result.adapterApply.p99Ms < 150
      && result.adapterApply.maxMs < 250,
    `4h Replay chart commit exceeded the binding adapter budget: ${JSON.stringify(result)}`);
    assert.ok(result.providerMisses <= 5,
      `4h Replay issued too many bounded forward provider requests: ${JSON.stringify(result)}`);
    assert.deepEqual(result.mutationModes, ['append-replace']);
  }
} finally {
  cdp?.close();
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ]);
  if (!stopped) {
    chrome.kill('SIGKILL');
    await exited;
  }
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}

console.log(JSON.stringify({ result, status: SAMPLE_COUNT >= 128 ? 'passed' : 'measured',
  suite: 'v7 Replay 4h latency browser' }));
