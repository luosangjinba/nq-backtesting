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
const visualFile = path.join(TEST_DIR, 'fixtures/replay-workspace/multi-mixed-1440x900.png');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-r6-5-chrome-'));
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

async function capture(cdp) {
  await evaluate(cdp, `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const actual = Buffer.from(data, 'base64');
  if (process.env.V7_UPDATE_VISUALS === '1') {
    fs.writeFileSync(visualFile, actual);
    return;
  }
  assert.ok(fs.existsSync(visualFile), 'missing mixed multi-Pane visual fixture');
  assert.equal(actual.equals(fs.readFileSync(visualFile)), true, 'mixed multi-Pane visual fixture changed');
}

function paneStateExpression() {
  return `(() => {
    const root = document.querySelector('.replay-workspace');
    return {
      activePaneId: root.dataset.activePaneId,
      paneCount: Number(root.dataset.paneCount),
      playback: root.dataset.replayPlayback,
      replayRevision: Number(root.dataset.replayRevision),
      sessionHoursMode: root.dataset.sessionHoursMode,
      workspaceRevision: Number(root.dataset.workspaceRevision),
      panes: [...document.querySelectorAll('.workspace-pane:not(.is-prepared)')].map((pane) => {
        const host = pane.querySelector('.lightweight-chart-host');
        return {
          barCount: Number(host.dataset.barCount),
          canvasCount: host.querySelectorAll('canvas').length,
          instrumentId: host.dataset.instrumentId,
          hostWidth: host.getBoundingClientRect().width,
          paneId: pane.dataset.paneId,
          paneWidth: pane.getBoundingClientRect().width,
          sessionHoursMode: host.dataset.sessionHoursMode,
          timeframeId: host.dataset.displayTimeframeId,
          viewportOrigin: host.dataset.viewportOrigin,
          viewportRevision: Number(host.dataset.viewportRevision),
          visibleRevision: Number(host.dataset.visibleRevision),
        };
      }),
    };
  })()`;
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
  await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'America/Los_Angeles' });
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
    form.elements.name.value = 'NQ ES Pane Replay';
    for (const input of form.querySelectorAll('[name="instrument"]')) input.checked = true;
    form.elements.start.value = '2026-05-04T12:40';
    form.elements.end.value = '2026-05-06T16:00';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`);

  await evaluate(cdp, `document.querySelector('.pane-count-control [data-value="2"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '2'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  let state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.paneCount, 2);
  assert.deepEqual(state.panes.map(({ paneId }) => paneId), ['pane-main', 'pane-secondary']);
  assert.ok(state.panes.every(({ canvasCount }) => canvasCount > 0), 'each Pane must own a real chart canvas');
  assert.ok(state.panes.every(({ hostWidth, paneWidth }) => Math.abs(hostWidth - paneWidth) < 1),
    `each chart host must fit its Pane: ${JSON.stringify(state.panes)}`);
  assert.deepEqual(state.panes.map(({ instrumentId }) => instrumentId), [
    'instrument.cme.nq', 'instrument.cme.nq',
  ]);

  const focusRevision = state.workspaceRevision;
  await evaluate(cdp, `document.querySelector('[data-pane-id="pane-secondary"]')
    .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.activePaneId === 'pane-secondary'`);
  assert.equal(Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.workspaceRevision`)), focusRevision,
  'focus must not issue a Workspace transaction');

  await evaluate(cdp, `(() => {
    const select = document.querySelector('.market-symbol-select');
    select.value = 'instrument.cme.es';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-secondary"]')?.dataset.instrumentId === 'instrument.cme.es'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-4-hour"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-secondary"]')?.dataset.timeframeId === 'timeframe.display-4-hour'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  state = await evaluate(cdp, paneStateExpression());
  assert.deepEqual(state.panes.map(({ instrumentId, timeframeId }) => ({ instrumentId, timeframeId })), [
    { instrumentId: 'instrument.cme.nq', timeframeId: 'timeframe.display-1-minute' },
    { instrumentId: 'instrument.cme.es', timeframeId: 'timeframe.display-4-hour' },
  ], 'active-Pane controls must preserve the inactive Pane intent');

  const beforeDrag = state;
  const dragPoint = await evaluate(cdp, `(() => {
    const rect = document.querySelector('.workspace-pane[data-pane-id="pane-main"]').getBoundingClientRect();
    const x = rect.left + rect.width * .62;
    const y = rect.top + rect.height * .5;
    const hit = document.elementFromPoint(x, y);
    return { x, y, hitClass: hit?.className ?? '',
      hitPaneId: hit?.closest('.lightweight-chart-host')?.dataset.paneId ?? null };
  })()`);
  assert.equal(dragPoint.hitPaneId, 'pane-main', `main Pane input point must hit its chart: ${JSON.stringify(dragPoint)}`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: dragPoint.x, y: dragPoint.y, button: 'none', buttons: 0,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel', x: dragPoint.x, y: dragPoint.y, deltaX: 0, deltaY: -180,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel', x: dragPoint.x, y: dragPoint.y, deltaX: 160, deltaY: 0,
  });
  await waitFor(cdp, `Number(document.querySelector('[data-pane-id="pane-main"] .lightweight-chart-host')
    ?.dataset.wheelEventCount) >= 2`);
  await new Promise((resolve) => setTimeout(resolve, 100));
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.panes[0].viewportOrigin, 'manual',
    `native main-Pane wheel must create a manual wall: ${JSON.stringify(state.panes[0])}`);
  assert.equal(state.panes[1].viewportRevision, beforeDrag.panes[1].viewportRevision,
    'zooming one Pane must not mutate another Pane viewport');
  assert.ok(state.panes[0].viewportRevision > beforeDrag.panes[0].viewportRevision);
  await evaluate(cdp, `document.querySelector('[data-pane-id="pane-secondary"]')
    .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.activePaneId === 'pane-secondary'`);
  state = await evaluate(cdp, paneStateExpression());
  await capture(cdp);

  const beforeNext = state;
  await evaluate(cdp, `document.querySelector('.replay-next').click()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeNext.workspaceRevision}`);
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.replayRevision, beforeNext.replayRevision + 1);
  assert.ok(state.panes.every((pane, index) => pane.visibleRevision > beforeNext.panes[index].visibleRevision),
    'one shared Next must visibly apply every Pane');

  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="rth"]').click()`);
  await waitFor(cdp, `[...document.querySelectorAll('.lightweight-chart-host')]
    .every((host) => host.dataset.sessionHoursMode === 'rth')
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  state = await evaluate(cdp, paneStateExpression());
  assert.ok(state.panes.every(({ sessionHoursMode }) => sessionHoursMode === 'rth'),
    'Session Hours must reproject the complete Pane set');

  const beforeAuto = state;
  await evaluate(cdp, `document.querySelector('.replay-autoplay').click()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeAuto.workspaceRevision}`);
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.playback, 'playing');
  assert.ok(state.panes.every((pane, index) => pane.visibleRevision > beforeAuto.panes[index].visibleRevision));
  await evaluate(cdp, `document.querySelector('.replay-pause').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.replayPlayback === 'paused'`);

  const beforePrevious = state.workspaceRevision;
  await evaluate(cdp, `document.querySelector('.replay-previous').click()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforePrevious}`);
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.playback, 'paused');

  await evaluate(cdp, `(() => {
    document.querySelector('.goto-toggle').click();
    document.querySelector('[data-goto-anchor="new-york-session"]').click();
  })()`);
  const beforeQuick = state.workspaceRevision;
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeQuick}`, 10_000);
  state = await evaluate(cdp, paneStateExpression());
  assert.ok(state.panes.every(({ visibleRevision }) => visibleRevision >= 1));

  await evaluate(cdp, `(() => {
    document.querySelector('.goto-toggle').click();
    document.querySelector('.goto-custom').click();
    document.querySelector('.goto-dialog [name="goto-target"]').value = '2026-05-04T13:00';
    document.querySelector('.goto-submit').click();
  })()`);
  const beforeExact = state.workspaceRevision;
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeExact}`, 10_000);
  assert.match(await evaluate(cdp, `document.querySelector('.replay-visible-through').textContent`),
    /05\/04\/2026, 12:59 EDT/, 'exact GoTo uses a New York exclusive cutoff');

  const beforeRestart = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
  await evaluate(cdp, `document.querySelector('.replay-restart').click()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeRestart}`, 10_000);
  assert.match(await evaluate(cdp, `document.querySelector('.replay-visible-through').textContent`),
    /No Session bar visible/, 'Restart hides the Session start bar without losing historical context');

  await evaluate(cdp, `document.querySelector('.pane-count-control [data-value="1"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '1'
    && document.querySelectorAll('.workspace-pane:not(.is-prepared)').length === 1`);
  assert.deepEqual(await evaluate(cdp, `globalThis.__browserErrors`), []);
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

console.log('v7 Replay Pane Workspace browser harness passed', {
  scope: 'single/multi Pane, mixed instrument/TF, shared Replay, both GoTo forms',
});
