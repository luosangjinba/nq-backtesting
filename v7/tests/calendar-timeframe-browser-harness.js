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
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-calendar-timeframe-chrome-'));
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

function readState(cdp) {
  return evaluate(cdp, `(() => {
    const root = document.querySelector('.replay-workspace');
    const host = document.querySelector('.lightweight-chart-host');
    return {
      bars: Number(host?.dataset.barCount),
      browserErrors: globalThis.__browserErrors,
      busy: root?.getAttribute('aria-busy'),
      cursor: Number(root?.dataset.replayCursorEpochMs),
      from: Number(host?.dataset.logicalFrom),
      historyBoundaryCaptureCount: Number(host?.dataset.historyBoundaryCaptureCount),
      mode: root?.dataset.sessionHoursMode,
      revision: Number(root?.dataset.workspaceRevision),
      spanBars: Number(host?.dataset.spanBars),
      state: root?.dataset.viewState,
      status: document.querySelector('.workspace-inline-status')?.textContent ?? '',
      timeframeId: root?.dataset.timeframeId,
    };
  })()`);
}

async function chooseTimeframe(cdp, timeframeId) {
  const before = await readState(cdp);
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="${timeframeId}"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.timeframeId === '${timeframeId}'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 20_000);
  const after = await readState(cdp);
  assert.equal(after.state, 'ready', `${timeframeId} must settle ready: ${JSON.stringify(after)}`);
  assert.ok(after.revision > before.revision,
    `${timeframeId} must apply one complete Workspace replacement: ${JSON.stringify({ before, after })}`);
  assert.ok(after.bars >= 100,
    `${timeframeId} must arrive with useful projected left history: ${JSON.stringify(after)}`);
  assert.ok(after.spanBars >= 40,
    `${timeframeId} must retain a usable chart wall: ${JSON.stringify(after)}`);
  assert.equal(after.historyBoundaryCaptureCount, before.historyBoundaryCaptureCount,
    `${timeframeId} must not wait for a mouse/wheel history event`);
  assert.equal(after.cursor, before.cursor, `${timeframeId} must not move Replay`);
  return after;
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
    form.elements.name.value = 'Calendar timeframe regression';
    for (const input of form.querySelectorAll('[name="instrument"]')) input.checked = true;
    form.elements.start.value = '2026-05-01T05:47';
    form.elements.end.value = '2026-05-31T05:48';
    form.requestSubmit();
  })()`);
  try {
    await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`, 10_000);
  } catch (error) {
    const evidence = await evaluate(cdp, `(() => ({
      appState: document.querySelector('#app')?.dataset.viewState,
      browserErrors: globalThis.__browserErrors,
      dialogError: document.querySelector('.create-dialog [role="alert"]')?.textContent ?? '',
      route: location.hash,
      workspace: document.querySelector('.replay-workspace') ? {
        busy: document.querySelector('.replay-workspace').getAttribute('aria-busy'),
        state: document.querySelector('.replay-workspace').dataset.viewState,
        status: document.querySelector('.workspace-inline-status')?.textContent ?? '',
      } : null,
    }))()`);
    throw new Error(`${error.message}; entry evidence: ${JSON.stringify(evidence)}`);
  }

  const menu = await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    const ids = ['timeframe.display-1-day', 'timeframe.display-1-week', 'timeframe.display-1-month'];
    const result = ids.map((id) => {
      const option = document.querySelector('[data-timeframe-id="' + id + '"]');
      return { disabled: option.disabled, id, role: option.getAttribute('role') };
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return result;
  })()`);
  assert.deepEqual(menu, [
    { disabled: false, id: 'timeframe.display-1-day', role: 'menuitemradio' },
    { disabled: false, id: 'timeframe.display-1-week', role: 'menuitemradio' },
    { disabled: false, id: 'timeframe.display-1-month', role: 'menuitemradio' },
  ]);

  await chooseTimeframe(cdp, 'timeframe.display-1-day');
  await chooseTimeframe(cdp, 'timeframe.display-1-week');
  await chooseTimeframe(cdp, 'timeframe.display-1-month');
  const beforeRth = await readState(cdp);
  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="rth"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.sessionHoursMode === 'rth'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 20_000);
  const rth = await readState(cdp);
  assert.equal(rth.state, 'ready', `premarket RTH calendar replacement must stay ready: ${JSON.stringify(rth)}`);
  assert.ok(rth.bars >= 100, `premarket RTH monthly history must be nonempty: ${JSON.stringify(rth)}`);
  assert.equal(rth.historyBoundaryCaptureCount, beforeRth.historyBoundaryCaptureCount,
    'ETH-to-RTH calendar replacement must not wait for a mouse/wheel history event');
  assert.equal(rth.cursor, beforeRth.cursor, 'ETH-to-RTH calendar replacement must not move Replay');
  assert.deepEqual(rth.browserErrors, []);
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
  await fs.promises.rm(userDataDirectory, {
    force: true, maxRetries: 10, recursive: true, retryDelay: 50,
  });
}

console.log('v7 calendar timeframe browser harness passed', {
  scope: 'enabled 1D/1W/1M, automatic projected history, Replay safety, premarket RTH',
});
