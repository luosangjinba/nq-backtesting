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
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-rth-history-chrome-'));
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
    return {
      busy: root?.getAttribute('aria-busy'),
      mode: root?.dataset.sessionHoursMode,
      revision: Number(root?.dataset.workspaceRevision),
      state: root?.dataset.viewState,
      status: document.querySelector('.workspace-inline-status')?.textContent ?? '',
      browserErrors: globalThis.__browserErrors,
      controlsDisabled: [...document.querySelectorAll('.session-hours-control button')]
        .every((button) => button.disabled),
      replayCursorEpochMs: Number(root?.dataset.replayCursorEpochMs),
      panes: [...document.querySelectorAll('.workspace-pane:not(.is-prepared)')].map((pane) => {
        const host = pane.querySelector('.lightweight-chart-host');
        return {
          bars: Number(host.dataset.barCount),
          empty: !pane.querySelector('.pane-empty-state').hidden,
          lastApplyError: host.dataset.lastApplyError ?? '',
          logicalFrom: Number(host.dataset.logicalFrom),
          logicalTo: Number(host.dataset.logicalTo),
          paneId: pane.dataset.paneId,
          paneNumber: Number(pane.dataset.paneNumber),
          spanBars: Number(host.dataset.spanBars),
          visibleRevision: Number(host.dataset.visibleRevision),
        };
      }).sort((left, right) => left.paneNumber - right.paneNumber),
    };
  })()`);
}

async function resetPane(cdp, paneNumber) {
  await evaluate(cdp, `document.querySelector('[aria-label="Reset Pane ${paneNumber} view"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
}

async function dragTowardHistory(cdp, paneId) {
  const box = await evaluate(cdp, `(() => {
    const rect = document.querySelector('[data-pane-id="${paneId}"] .lightweight-chart-host').getBoundingClientRect();
    return { right: rect.right - 12, x: rect.left + rect.width * .3, y: rect.top + rect.height * .5 };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: box.x, y: box.y, button: 'none', buttons: 0,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: box.x, y: box.y, button: 'left', buttons: 1, clickCount: 1,
  });
  for (const ratio of [.1, .2, .3, .4, .5, .6, .7, .8, .9, 1]) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: box.x + ((box.right - box.x) * ratio), y: box.y,
      button: 'left', buttons: 1,
    });
  }
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: box.right, y: box.y, button: 'left', buttons: 0, clickCount: 1,
  });
}

async function extendHistory(cdp, paneId) {
  const before = await readState(cdp);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await dragTowardHistory(cdp, paneId);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const current = await readState(cdp);
    if (current.revision > before.revision || current.state === 'error' || current.panes.some(({ empty }) => empty)) break;
  }
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  return readState(cdp);
}

async function zoomOutDense(cdp, paneId, minimumSpanBars = 900) {
  const point = await evaluate(cdp, `(() => {
    const rect = document.querySelector('[data-pane-id="${paneId}"] .lightweight-chart-host')
      .getBoundingClientRect();
    return { x: rect.left + rect.width * .3, y: rect.top + rect.height * .5 };
  })()`);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: point.x, y: point.y, deltaX: 0, deltaY: 300,
    });
    await new Promise((resolve) => setTimeout(resolve, 35));
    const span = Number(await evaluate(cdp,
      `document.querySelector('[data-pane-id="${paneId}"] .lightweight-chart-host').dataset.spanBars`));
    if (span >= minimumSpanBars) break;
  }
  await waitFor(cdp, `Number(document.querySelector('[data-pane-id="${paneId}"]'
    + ' .lightweight-chart-host')?.dataset.spanBars) >= ${minimumSpanBars}`, 5_000);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 20_000);
  return readState(cdp);
}

async function locateFromSourceToTarget(cdp, sourcePaneId, targetPaneId) {
  const target = await evaluate(cdp, `(() => {
    const sourceRect = document.querySelector('[data-pane-id="${sourcePaneId}"] .lightweight-chart-host')
      .getBoundingClientRect();
    const targetPane = document.querySelector('[data-pane-id="${targetPaneId}"]');
    return {
      bounds: { bottom: sourceRect.bottom, left: sourceRect.left,
        right: sourceRect.right, top: sourceRect.top },
      label: 'Locate in P' + targetPane.dataset.paneNumber,
    };
  })()`);
  let point = null;
  for (const ratio of [.12, .2, .28, .36, .44, .52]) {
    const candidate = {
      x: target.bounds.left + ((target.bounds.right - target.bounds.left) * ratio),
      y: target.bounds.top + ((target.bounds.bottom - target.bounds.top) * .45),
    };
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: candidate.x, y: candidate.y, button: 'none', buttons: 0,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const selected = await evaluate(cdp,
      `document.querySelector('[data-pane-id="${sourcePaneId}"]')?.dataset.ohlcState === 'selected'`);
    if (selected) {
      point = candidate;
      break;
    }
  }
  assert.ok(point, `a real source candle must be available in ${sourcePaneId}`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: point.x, y: point.y, button: 'right', buttons: 2, clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: point.x, y: point.y, button: 'right', buttons: 0, clickCount: 1,
  });
  await waitFor(cdp, `document.querySelector('.pane-time-location-menu')?.hidden === false`);
  await evaluate(cdp, `((label) => {
    const action = [...document.querySelectorAll('.pane-time-location-action')]
      .find((button) => button.textContent.startsWith(label));
    action.click();
  })(${JSON.stringify(target.label)})`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="${targetPaneId}"] .lightweight-chart-host')
    ?.dataset.lastLocatedMarketEpochMs`, 20_000);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 20_000);
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
    form.elements.name.value = 'RTH history regression';
    for (const input of form.querySelectorAll('[name="instrument"]')) input.checked = true;
    form.elements.start.value = '2026-05-01T05:47';
    form.elements.end.value = '2026-05-31T05:48';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`, 10_000);
  await evaluate(cdp, `document.querySelector('[data-layout-id="layout.two-columns"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '2'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);

  await resetPane(cdp, 1);
  await resetPane(cdp, 2);
  const resetState = await readState(cdp);
  const replayCursorEpochMs = resetState.replayCursorEpochMs;

  let state = await extendHistory(cdp, 'pane-main');
  assert.ok(state.panes.every(({ bars, empty }) => bars > 0 && !empty),
    `ETH extension must preserve both Panes: ${JSON.stringify(state)}`);

  state = await zoomOutDense(cdp, 'pane-main');
  assert.ok(state.panes[0].spanBars >= 900 && state.panes[0].bars > state.panes[1].bars,
    `the source Pane must own genuinely denser history before RTH replacement: ${JSON.stringify(state)}`);

  const beforeEthLocations = state;
  await locateFromSourceToTarget(cdp, 'pane-main', 'pane-secondary');
  await locateFromSourceToTarget(cdp, 'pane-main', 'pane-secondary');
  state = await readState(cdp);
  assert.ok(state.panes[0].bars >= beforeEthLocations.panes[0].bars
    && state.panes[0].spanBars >= beforeEthLocations.panes[0].spanBars * .9,
  `repeated ETH Locate must preserve the dense non-target Pane: ${JSON.stringify({
    beforeEthLocations, afterEthLocations: state,
  })}`);
  assert.equal(state.replayCursorEpochMs, replayCursorEpochMs,
    'ETH Pane time location must not move Replay');

  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="rth"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.sessionHoursMode === 'rth'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  let beforeFirstRthHistory = await readState(cdp);
  assert.equal(beforeFirstRthHistory.state, 'ready',
    `premarket RTH replacement must retain prior-session context: ${JSON.stringify(beforeFirstRthHistory)}`);
  assert.ok(beforeFirstRthHistory.panes.every(({ bars, empty }) => bars >= 200 && !empty),
    `premarket RTH replacement must paint eligible prior-session bars: ${JSON.stringify(beforeFirstRthHistory)}`);
  assert.ok(beforeFirstRthHistory.panes[0].bars > beforeFirstRthHistory.panes[1].bars,
    `dense RTH replacement must retain a wider source Pane: ${JSON.stringify(beforeFirstRthHistory)}`);
  await locateFromSourceToTarget(cdp, 'pane-main', 'pane-secondary');
  const afterRthTimeLocation = await readState(cdp);
  assert.ok(afterRthTimeLocation.panes[0].bars >= beforeFirstRthHistory.panes[0].bars,
    `RTH target-history location must not collapse the non-target source Pane: ${JSON.stringify({
      beforeFirstRthHistory, afterRthTimeLocation,
    })}`);
  assert.ok(afterRthTimeLocation.panes[0].spanBars >= beforeFirstRthHistory.panes[0].spanBars * .9,
    `RTH target-history location must preserve the non-target source wall: ${JSON.stringify({
      beforeFirstRthHistory, afterRthTimeLocation,
    })}`);
  await locateFromSourceToTarget(cdp, 'pane-secondary', 'pane-main');
  const afterReverseRthTimeLocation = await readState(cdp);
  assert.ok(afterReverseRthTimeLocation.panes[1].bars >= afterRthTimeLocation.panes[1].bars,
    `reverse RTH location must not collapse the non-target Pane: ${JSON.stringify({
      afterRthTimeLocation, afterReverseRthTimeLocation,
    })}`);
  assert.ok(afterReverseRthTimeLocation.panes.every(({ logicalFrom, logicalTo, spanBars }) => (
    spanBars >= 40 && logicalTo - logicalFrom >= 40
  )), `both RTH target directions must retain usable walls: ${JSON.stringify(afterReverseRthTimeLocation)}`);
  assert.equal(afterReverseRthTimeLocation.replayCursorEpochMs, replayCursorEpochMs,
    'RTH Pane time location must not move Replay');
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.sessionHoursMode === 'rth'
    && document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  beforeFirstRthHistory = await readState(cdp);
  assert.equal(beforeFirstRthHistory.panes.length, 2,
    `premarket RTH hard reload must restore the two-Pane checkpoint: ${JSON.stringify(beforeFirstRthHistory)}`);
  assert.ok(beforeFirstRthHistory.panes.every(({ bars, empty }) => bars >= 200 && !empty),
    `premarket RTH hard reload must restore eligible prior-session bars: ${JSON.stringify(beforeFirstRthHistory)}`);
  state = await extendHistory(cdp, 'pane-main');
  assert.ok(state.panes[0].bars >= beforeFirstRthHistory.panes[0].bars + 200,
    `one premarket RTH drag must prepend another useful prior-session block: ${JSON.stringify({
      beforeFirstRthHistory, state,
    })}`);
  for (const paneId of ['pane-main', 'pane-secondary']) {
    for (let extension = 0; extension < 4; extension += 1) state = await extendHistory(cdp, paneId);
  }
  for (let drag = 0; drag < 8; drag += 1) {
    await dragTowardHistory(cdp, drag % 2 === 0 ? 'pane-main' : 'pane-secondary');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  await new Promise((resolve) => setTimeout(resolve, 500));
  state = await readState(cdp);
  assert.equal(state.state, 'ready',
    `RTH history must not fail the complete Workspace transaction: ${JSON.stringify(state)}`);
  assert.equal(state.controlsDisabled, false, 'Session Hours must remain interactive after RTH history');
  assert.ok(state.panes.every(({ logicalFrom, logicalTo, spanBars }) => spanBars >= 40
    && logicalTo - logicalFrom >= 40),
    `rapid RTH history must not collapse the visible span into oversized candles: ${JSON.stringify(state)}`);
  const rthHistoryState = state;

  await evaluate(cdp, `document.querySelector('[data-layout-id="layout.single"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '1'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  const singleBefore = await readState(cdp);
  assert.equal(singleBefore.panes.length, 1);
  assert.equal(singleBefore.panes[0].paneId, 'pane-main',
    'two-to-one must retain P1 even though P1 occupied the right column');
  assert.ok(singleBefore.panes[0].spanBars >= 40
    && singleBefore.panes[0].logicalTo - singleBefore.panes[0].logicalFrom >= 40,
    `two-to-one Pane replacement must preserve a usable RTH wall: ${JSON.stringify(singleBefore)}`);
  state = await extendHistory(cdp, 'pane-main');
  assert.ok(state.revision > singleBefore.revision,
    `the first deliberate single-Pane drag must extend history: ${JSON.stringify({ singleBefore, state })}`);

  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="eth"]').click()`);
  await waitFor(cdp, `(document.querySelector('.replay-workspace')?.dataset.sessionHoursMode === 'eth'
    || document.querySelector('.replay-workspace')?.dataset.viewState === 'error')
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  state = await readState(cdp);
  assert.ok(rthHistoryState.panes.every(({ bars, empty }) => bars > 0 && !empty),
    `RTH history must preserve ready candles in both Panes: ${JSON.stringify({ rthHistoryState, ethState: state })}`);
  assert.equal(state.state, 'ready');
  assert.ok(state.panes.every(({ bars, empty }) => bars > 0 && !empty));
  assert.deepEqual(state.browserErrors, []);
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

console.log('v7 multi-Pane RTH history browser harness passed', {
  scope: 'two resets, repeated ETH Locate, atomic RTH, bidirectional Locate, rapid span, recovery',
});
