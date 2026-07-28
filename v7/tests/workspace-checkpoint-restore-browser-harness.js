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
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-r7-1-restore-'));
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

const workspaceState = `(() => {
  const root = document.querySelector('.replay-workspace');
  return {
    activePaneId: root.dataset.activePaneId,
    crosshairSync: root.dataset.crosshairSync,
    cursorEpochMs: Number(root.dataset.cursorEpochMs),
    cursorText: root.dataset.cursorText,
    layoutId: root.dataset.layoutId,
    playback: root.dataset.replayPlayback,
    replayCursorEpochMs: Number(root.dataset.replayCursorEpochMs),
    replayRevision: Number(root.dataset.replayRevision),
    sessionHoursMode: root.dataset.sessionHoursMode,
    panes: [...document.querySelectorAll('.workspace-pane:not(.is-prepared)')].map((pane) => {
      const host = pane.querySelector('.lightweight-chart-host');
      return {
        instrumentId: pane.dataset.instrumentId,
        latestOffsetBars: Number(host.dataset.latestOffsetBars),
        paneId: pane.dataset.paneId,
        spanBars: Number(host.dataset.spanBars),
        timeframeId: pane.dataset.timeframeId,
        viewportOrigin: host.dataset.viewportOrigin,
      };
    }).sort((left, right) => left.paneId.localeCompare(right.paneId)),
  };
})()`;

const persistedWorkspace = `(() => {
  const prefix = '#/session/';
  if (!location.hash.startsWith(prefix)) return null;
  const token = decodeURIComponent(location.hash.slice(prefix.length));
  const key = 'v7.session-browser:record:' + encodeURIComponent(token);
  return JSON.parse(localStorage.getItem(key))?.value?.workspace ?? null;
})()`;

function assertRestored(actual, before, checkpoint) {
  assert.equal(actual.layoutId, 'layout.two-columns');
  assert.equal(actual.activePaneId, 'pane-secondary');
  assert.equal(actual.sessionHoursMode, 'rth');
  assert.equal(actual.crosshairSync, 'true');
  assert.equal(actual.playback, 'paused', 'transient playback must restore paused');
  assert.equal(actual.cursorText, before.cursorText, 'restore must not advance one extra Replay bar');
  assert.deepEqual(actual.panes.map(({ paneId, instrumentId, timeframeId }) => ({
    paneId, instrumentId, timeframeId,
  })), before.panes.map(({ paneId, instrumentId, timeframeId }) => ({
    paneId, instrumentId, timeframeId,
  })));
  const restoredMain = actual.panes.find(({ paneId }) => paneId === 'pane-main');
  const savedMain = checkpoint.panes.find(({ paneId }) => paneId === 'pane-main');
  assert.equal(restoredMain.viewportOrigin, 'manual');
  assert.ok(Math.abs(restoredMain.latestOffsetBars - savedMain.viewport.latestOffsetBars) < 0.001);
  assert.ok(Math.abs(restoredMain.spanBars - savedMain.viewport.spanBars) < 0.001);
}

function summarizeLatency(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  const percentile = (ratio) => sorted[Math.ceil(sorted.length * ratio) - 1];
  return Object.freeze({
    maxMs: Math.max(...samples),
    p95Ms: percentile(.95),
    p99Ms: percentile(.99),
    samples: samples.length,
  });
}

let cdp;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `{
      globalThis.__browserErrors = [];
      addEventListener('error', (event) => globalThis.__browserErrors.push(event.message));
      addEventListener('unhandledrejection', (event) => globalThis.__browserErrors.push(String(event.reason)));
    }`,
  });
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/v7/app/` });
  await waitFor(cdp, `document.querySelector('#app')?.dataset.viewState === 'empty'`);

  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.open === true`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.dataset.dateAvailabilityState === 'ready'`);
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'Earlier Session';
    form.querySelector('[name="instrument"]').checked = true;
    form.elements.start.value = '2026-05-01T12:40';
    form.elements.end.value = '2026-05-01T16:00';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`);
  await evaluate(cdp, `document.querySelector('.replay-back').click()`);
  await waitFor(cdp, `document.querySelectorAll('.session-card').length === 1`);

  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.open === true`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.dataset.dateAvailabilityState === 'ready'`);
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'R7 restore';
    for (const input of form.querySelectorAll('[name="instrument"]')) input.checked = true;
    form.elements.start.value = '2026-05-04T12:40';
    form.elements.end.value = '2026-05-06T16:00';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`);
  assert.equal((await evaluate(cdp, persistedWorkspace)).schemaVersion, 6,
    'first visible commit must lazily create schema-6 checkpoint state');

  await evaluate(cdp, `document.querySelector('[data-layout-id="layout.two-columns"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '2'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  await evaluate(cdp, `document.querySelector('[data-pane-id="pane-secondary"]')
    .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.activePaneId === 'pane-secondary'`);
  await evaluate(cdp, `(() => {
    const select = document.querySelector('.market-symbol-select');
    select.value = 'instrument.cme.es';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-secondary"]')?.dataset.instrumentId
    === 'instrument.cme.es' && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-4-hour"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-secondary"]')?.dataset.timeframeId
    === 'timeframe.display-4-hour' && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="rth"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.sessionHoursMode === 'rth'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  await evaluate(cdp, `(() => {
    document.querySelector('.pane-layout-toggle').click();
    document.querySelector('.pane-crosshair-sync input').click();
    document.querySelector('.pane-layout-toggle').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.crosshairSync === 'true'`);

  for (let count = 0; count < 3; count += 1) {
    const revision = Number(await evaluate(cdp,
      `document.querySelector('.replay-workspace').dataset.replayRevision`));
    await evaluate(cdp, `document.querySelector('.replay-next').click()`);
    await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.replayRevision) > ${revision}
      && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  }

  const autoplayRevision = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.replayRevision`));
  await evaluate(cdp, `document.querySelector('.replay-autoplay').click()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.replayRevision)
    >= ${autoplayRevision + 3}`, 12_000);
  await evaluate(cdp, `document.querySelector('.replay-pause').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.replayPlayback === 'paused'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);

  const point = await evaluate(cdp, `(() => {
    const rect = document.querySelector('[data-pane-id="pane-main"] .lightweight-chart-host')
      .getBoundingClientRect();
    return { x: rect.left + rect.width * .6, y: rect.top + rect.height * .5 };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel', x: point.x, y: point.y, deltaX: 0, deltaY: -180,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel', x: point.x, y: point.y, deltaX: 140, deltaY: 0,
  });
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-main"] .lightweight-chart-host')
    ?.dataset.viewportOrigin === 'manual'`);
  await waitFor(cdp, `${persistedWorkspace}?.checkpoint?.panes?.[0]?.viewport?.origin === 'manual'`);

  const before = await evaluate(cdp, workspaceState);
  const saved = await evaluate(cdp, persistedWorkspace);
  assert.equal(saved.schemaVersion, 6);
  assert.equal(saved.checkpoint.cursorEpochMs > 0, true);
  assert.equal(saved.checkpoint.activePaneId, 'pane-secondary');
  assert.equal(saved.checkpoint.sessionHoursMode, 'rth');
  assert.equal(saved.layoutSync.crosshair, true);
  assert.equal(saved.paneLayout.variantId, 'layout.two-columns');

  await evaluate(cdp, `document.querySelector('.replay-back').click()`);
  await waitFor(cdp, `document.querySelectorAll('.session-card').length === 2`);
  await evaluate(cdp, `[...document.querySelectorAll('.session-card')]
    .find((card) => card.textContent.includes('R7 restore'))
    .querySelector('.open-session-button').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
    && document.querySelector('.replay-workspace')?.dataset.layoutId === 'layout.two-columns'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);
  const softRestored = await evaluate(cdp, workspaceState);
  assertRestored(softRestored, before, saved.checkpoint);
  assert.equal((await evaluate(cdp, persistedWorkspace)).checkpoint.cursorEpochMs,
    saved.checkpoint.cursorEpochMs);

  await cdp.send('Page.reload', { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 150));
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
    && document.querySelector('.replay-workspace')?.dataset.layoutId === 'layout.two-columns'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);
  const hardRestored = await evaluate(cdp, workspaceState);
  assertRestored(hardRestored, before, saved.checkpoint);
  assert.equal((await evaluate(cdp, persistedWorkspace)).checkpoint.cursorEpochMs,
    saved.checkpoint.cursorEpochMs);

  await evaluate(cdp, `performance.clearResourceTimings()`);
  const warmupRevision = hardRestored.replayRevision;
  await evaluate(cdp, `document.querySelector('.replay-next').click()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.replayRevision)
    === ${warmupRevision + 1}
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  const restoredWarmupProviderRequestCount = Number(await evaluate(cdp,
    `performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/v4/bars?')).length`));
  assert.ok(restoredWarmupProviderRequestCount <= 1,
    'restored workspace warmup may refill at most one evicted primary forward window');
  await evaluate(cdp, `performance.clearResourceTimings()`);
  const restoredRevision = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.replayRevision`));
  const cadenceEvidence = await evaluate(cdp, `(async () => {
    const root = document.querySelector('.replay-workspace');
    const next = document.querySelector('.replay-next');
    const samples = [];
    const adapterApply = [];
    const adapterMutation = [];
    const adapterPaint = [];
    const mutationModes = new Set();
    function awaitVisibleRevision(expected) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          observer.disconnect();
          reject(new Error('restored cadence timed out at revision ' + expected));
        }, 10_000);
        const check = () => {
          if (Number(root.dataset.replayRevision) !== expected
            || root.getAttribute('aria-busy') !== 'false') return;
          clearTimeout(timeout);
          observer.disconnect();
          resolve();
        };
        const observer = new MutationObserver(check);
        observer.observe(root, { attributes: true });
        check();
      });
    }
    for (let index = 0; index < 100; index += 1) {
      const expected = ${restoredRevision} + index + 1;
      const visible = awaitVisibleRevision(expected);
      const startedAt = performance.now();
      next.click();
      await visible;
      samples.push(performance.now() - startedAt);
      for (const host of document.querySelectorAll(
        '.workspace-pane:not(.is-prepared) .lightweight-chart-host'
      )) {
        mutationModes.add(host.dataset.lastMutationMode);
        adapterApply.push(Number(host.dataset.lastApplyMs));
        adapterMutation.push(Number(host.dataset.lastMutationMs));
        adapterPaint.push(Number(host.dataset.lastPaintMs));
      }
    }
    return { adapterApply, adapterMutation, adapterPaint,
      mutationModes: [...mutationModes], samples };
  })()`);
  assert.deepEqual(cadenceEvidence.mutationModes, ['tail-update'],
    'restored mixed-Pane Next must retain the bounded tail-update path');
  const restoredLatency = Object.freeze({
    ...summarizeLatency(cadenceEvidence.samples),
    adapterApply: summarizeLatency(cadenceEvidence.adapterApply),
    adapterMutation: summarizeLatency(cadenceEvidence.adapterMutation),
    adapterPaint: summarizeLatency(cadenceEvidence.adapterPaint),
    providerRequestCount: Number(await evaluate(cdp,
      `performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/v4/bars?')).length`)),
  });
  assert.ok(restoredLatency.p95Ms < 100,
    `restored mixed-Pane Next p95 exceeded budget: ${JSON.stringify(restoredLatency)}`);
  assert.ok(restoredLatency.p99Ms < 150,
    `restored mixed-Pane Next p99 exceeded budget: ${JSON.stringify(restoredLatency)}`);
  assert.ok(restoredLatency.maxMs < 250,
    `restored mixed-Pane Next max exceeded budget: ${JSON.stringify(restoredLatency)}`);
  assert.equal(restoredLatency.providerRequestCount, 0,
    `100 restored cache-hit Next actions must issue zero provider requests: ${JSON.stringify(restoredLatency)}`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('[data-pane-id="pane-main"] .lightweight-chart-host')?.dataset.viewportOrigin`),
  'manual', 'restored cache-hit advancement must retain the manual Viewport');

  const postCadenceState = await evaluate(cdp, workspaceState);
  const postCadencePersisted = await evaluate(cdp, persistedWorkspace);
  assert.equal(postCadencePersisted.checkpoint.cursorEpochMs, postCadenceState.replayCursorEpochMs,
    `restored cache-hit checkpoint must match its Replay cursor: ${JSON.stringify({
      persisted: postCadencePersisted.checkpoint.cursorEpochMs,
      replay: postCadenceState.replayCursorEpochMs,
    })}`);
  const requestsBeforeAutoplay = Number(await evaluate(cdp,
    `performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/v4/bars?')).length`));
  await evaluate(cdp, `document.querySelector('.replay-autoplay').click()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.replayRevision)
    >= ${postCadenceState.replayRevision + 3}`, 12_000);
  await evaluate(cdp, `document.querySelector('.replay-pause').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.replayPlayback === 'paused'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  assert.equal(Number(await evaluate(cdp,
    `performance.getEntriesByType('resource').filter((entry) => entry.name.includes('/v4/bars?')).length`)),
  requestsBeforeAutoplay, 'restored cache-hit Autoplay must issue zero provider requests');
  const postAutoplayState = await evaluate(cdp, workspaceState);
  await waitFor(cdp, `${persistedWorkspace}?.checkpoint?.cursorEpochMs
    === ${postAutoplayState.replayCursorEpochMs}`, 5_000);
  assert.deepEqual(await evaluate(cdp, `globalThis.__browserErrors`), []);

  console.log('v7 Workspace checkpoint restore browser harness passed', {
    restoredWarmupProviderRequestCount,
    restoredLatency,
    scope: 'multi-session first-save, Next/Autoplay, soft re-entry, hard refresh, restored mixed-Pane cache-hit performance',
  });
} finally {
  try { await cdp?.close(); } catch { /* best effort */ }
  if (chrome.exitCode === null) {
    chrome.kill('SIGTERM');
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 1_000);
      chrome.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
  await new Promise((resolve) => server.close(resolve));
  try { fs.rmSync(userDataDirectory, { force: true, recursive: true }); } catch { /* best effort */ }
}
