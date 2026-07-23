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
    cursorText: root.dataset.cursorText,
    layoutId: root.dataset.layoutId,
    playback: root.dataset.replayPlayback,
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
  const key = Object.keys(localStorage).find((candidate) =>
    candidate.startsWith('v7.session-browser:record:'));
  return key ? JSON.parse(localStorage.getItem(key)).value.workspace : null;
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
  await waitFor(cdp, `document.querySelectorAll('.session-card').length === 1`);
  await evaluate(cdp, `document.querySelector('.session-card .open-session-button').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
    && document.querySelector('.replay-workspace')?.dataset.layoutId === 'layout.two-columns'`, 12_000);
  const softRestored = await evaluate(cdp, workspaceState);
  assertRestored(softRestored, before, saved.checkpoint);
  assert.equal((await evaluate(cdp, persistedWorkspace)).checkpoint.cursorEpochMs,
    saved.checkpoint.cursorEpochMs);

  await cdp.send('Page.reload', { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 150));
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
    && document.querySelector('.replay-workspace')?.dataset.layoutId === 'layout.two-columns'`, 12_000);
  const hardRestored = await evaluate(cdp, workspaceState);
  assertRestored(hardRestored, before, saved.checkpoint);
  assert.equal((await evaluate(cdp, persistedWorkspace)).checkpoint.cursorEpochMs,
    saved.checkpoint.cursorEpochMs);
  assert.deepEqual(await evaluate(cdp, `globalThis.__browserErrors`), []);

  console.log('v7 Workspace checkpoint restore browser harness passed', {
    scope: 'first-save, soft re-entry, hard refresh, cursor/panes/viewport/layout/session-hours restore',
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
