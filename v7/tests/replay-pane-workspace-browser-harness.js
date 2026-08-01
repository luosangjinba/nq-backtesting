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
const gotoSettingsVisualFile = path.join(
  TEST_DIR, 'fixtures/replay-workspace/goto-settings-dialog.png',
);
const exactGotoVisualFile = path.join(
  TEST_DIR, 'fixtures/replay-workspace/exact-goto-dialog.png',
);
const workstationSettingsVisualFile = path.join(
  TEST_DIR, 'fixtures/replay-workspace/workstation-settings-dialog.png',
);
const workstationStatusVisualFile = path.join(
  TEST_DIR, 'fixtures/replay-workspace/workstation-settings-status-dialog.png',
);
const workstationCurrentPriceVisualFile = path.join(
  TEST_DIR, 'fixtures/replay-workspace/workstation-settings-current-price-dialog.png',
);
const workstationCanvasVisualFile = path.join(
  TEST_DIR, 'fixtures/replay-workspace/workstation-settings-canvas-dialog.png',
);
const colorPickerVisualFile = path.join(
  TEST_DIR, 'fixtures/replay-workspace/color-picker.png',
);
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

async function capture(cdp, fixture = visualFile, selector = null) {
  await new Promise((resolve) => setTimeout(resolve, 160));
  await evaluate(cdp, `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
  const clip = selector === null ? undefined : await evaluate(cdp, `(() => {
    const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { height: rect.height, scale: 1, width: rect.width, x: rect.x, y: rect.y };
  })()`);
  const { data } = await cdp.send('Page.captureScreenshot', {
    captureBeyondViewport: false,
    clip,
    format: 'png',
    fromSurface: true,
  });
  const actual = Buffer.from(data, 'base64');
  if (process.env.V7_UPDATE_VISUALS === '1') {
    fs.writeFileSync(fixture, actual);
    return;
  }
  assert.ok(fs.existsSync(fixture), `missing visual fixture ${path.basename(fixture)}`);
  const expected = fs.readFileSync(fixture);
  if (actual.equals(expected)) return;
  const pixelDifference = await evaluate(cdp, `(async () => {
    const decode = async (base64) => createImageBitmap(await (await fetch(
      'data:image/png;base64,' + base64
    )).blob());
    const [left, right] = await Promise.all([
      decode(${JSON.stringify(actual.toString('base64'))}),
      decode(${JSON.stringify(expected.toString('base64'))}),
    ]);
    if (left.width !== right.width || left.height !== right.height) {
      return { dimensionsEqual: false, differentPixels: null, maxChannelDelta: null };
    }
    const canvas = new OffscreenCanvas(left.width, left.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(left, 0, 0);
    const leftPixels = context.getImageData(0, 0, left.width, left.height).data;
    context.clearRect(0, 0, left.width, left.height);
    context.drawImage(right, 0, 0);
    const rightPixels = context.getImageData(0, 0, right.width, right.height).data;
    let differentPixels = 0;
    let maxChannelDelta = 0;
    for (let index = 0; index < leftPixels.length; index += 4) {
      let pixelChanged = false;
      for (let channel = 0; channel < 4; channel += 1) {
        const delta = Math.abs(leftPixels[index + channel] - rightPixels[index + channel]);
        if (delta > 0) pixelChanged = true;
        maxChannelDelta = Math.max(maxChannelDelta, delta);
      }
      if (pixelChanged) differentPixels += 1;
    }
    return { dimensionsEqual: true, differentPixels, maxChannelDelta };
  })()`);
  assert.equal(pixelDifference.dimensionsEqual, true,
    `${path.basename(fixture)} visual dimensions changed`);
  assert.equal(pixelDifference.maxChannelDelta <= 1 && pixelDifference.differentPixels <= 16, true,
    `${path.basename(fixture)} visual pixels changed: ${JSON.stringify(pixelDifference)}`);
}

function paneStateExpression() {
  return `(() => {
    const root = document.querySelector('.replay-workspace');
    return {
      activePaneId: root.dataset.activePaneId,
      autoplaySpeedId: root.dataset.autoplaySpeedId,
      cursorText: root.dataset.cursorText,
      paneCount: Number(root.dataset.paneCount),
      playback: root.dataset.replayPlayback,
      replayRevision: Number(root.dataset.replayRevision),
      replayStepId: root.dataset.replayStepId,
      sessionHoursMode: root.dataset.sessionHoursMode,
      syncTimeframe: root.dataset.syncTimeframe,
      truncationSelection: root.dataset.truncationSelection,
      workspaceRevision: Number(root.dataset.workspaceRevision),
      panes: [...document.querySelectorAll('.workspace-pane:not(.is-prepared)')].map((pane) => {
        const host = pane.querySelector('.lightweight-chart-host');
        return {
          barCount: Number(host.dataset.barCount),
          canvasCount: host.querySelectorAll('canvas').length,
          instrumentId: host.dataset.instrumentId,
          hostWidth: host.getBoundingClientRect().width,
          latestDisplayEpochMs: Number(host.dataset.latestDisplayEpochMs),
          paneId: pane.dataset.paneId,
          paneNumber: Number(pane.dataset.paneNumber),
          paneWidth: pane.getBoundingClientRect().width,
          sessionHoursMode: host.dataset.sessionHoursMode,
          timeframeId: host.dataset.displayTimeframeId,
          viewportOrigin: host.dataset.viewportOrigin,
          viewportRevision: Number(host.dataset.viewportRevision),
          visibleRevision: Number(host.dataset.visibleRevision),
          visibleThroughEpochMs: Number(host.dataset.visibleThroughEpochMs),
        };
      }).sort((left, right) => left.paneNumber - right.paneNumber),
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
  await waitFor(cdp, `document.querySelector('.create-dialog')?.dataset.dateAvailabilityState === 'ready'`);
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'NQ ES Pane Replay';
    for (const input of form.querySelectorAll('[name="instrument"]')) input.checked = true;
    form.elements.start.value = '2026-05-04T12:40';
    form.elements.end.value = '2026-05-06T16:00';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`);

  await evaluate(cdp, `document.querySelector('[data-layout-id="layout.two-columns"]').click()`);
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

  const beforeLocalSymbolPolicy = state;
  await evaluate(cdp, `(() => {
    document.querySelector('.pane-layout-toggle').click();
    document.querySelector('.pane-symbol-sync input').click();
    document.querySelector('.pane-layout-toggle').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.layoutSyncSymbol === 'false'`);
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.workspaceRevision, beforeLocalSymbolPolicy.workspaceRevision,
    'changing Symbol policy alone must not materialize a Pane set');
  assert.equal(state.replayRevision, beforeLocalSymbolPolicy.replayRevision,
    'changing Symbol policy alone must not move Replay');

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
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-main"] .lightweight-chart-host')
    ?.dataset.viewportOrigin === 'manual'`, 2_000);
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

  await evaluate(cdp, `document.querySelector('.workstation-settings-open').click()`);
  await waitFor(cdp, `document.querySelector('.workstation-settings-dialog')?.open === true`);
  assert.deepEqual(await evaluate(cdp, `[...document.querySelectorAll('.workstation-settings-tab')]
    .map((tab) => tab.textContent)`), ['Symbol', 'Status line', 'Scales and lines', 'Canvas']);
  await evaluate(cdp, `document.querySelector('[data-settings-tab="status"]').click()`);
  assert.deepEqual(await evaluate(cdp, `Object.fromEntries(
    ['ohlcVisible', 'changeVisible', 'volumeVisible'].map((name) => [
      name, document.querySelector('[name="' + name + '"]').checked,
    ])
  )`), { changeVisible: true, ohlcVisible: true, volumeVisible: false });
  await capture(cdp, workstationStatusVisualFile, '.workstation-settings-dialog');
  await evaluate(cdp, `document.querySelector('[data-settings-tab="scales"]').click()`);
  assert.deepEqual(await evaluate(cdp, `Object.fromEntries(
    ['currentPriceNameVisible', 'currentPriceValueVisible', 'currentPriceLineVisible'].map((name) => [
      name, document.querySelector('[name="' + name + '"]').checked,
    ])
  )`), {
    currentPriceLineVisible: true,
    currentPriceNameVisible: true,
    currentPriceValueVisible: true,
  });
  assert.deepEqual(await evaluate(cdp, `Object.fromEntries([
    'displayTimezone', 'dateFormat', 'hourFormat',
  ].map((name) => [name, document.querySelector('[name="' + name + '"]').value]))`), {
    dateFormat: 'MM/DD/YYYY',
    displayTimezone: 'America/New_York',
    hourFormat: '24-hour',
  });
  assert.equal(await evaluate(cdp,
    `document.querySelector('[name="dayOfWeekVisible"]').checked`), false);
  await capture(cdp, workstationCurrentPriceVisualFile, '.workstation-settings-dialog');
  await evaluate(cdp, `document.querySelector('[data-settings-tab="canvas"]').click()`);
  assert.deepEqual(await evaluate(cdp, `Object.fromEntries([
    'crosshairStyle', 'crosshairWidth', 'scaleFontSize', 'paneControlDockVisibility',
    'topMarginPercent', 'bottomMarginPercent', 'rightMarginBars',
  ].map((name) => [name, document.querySelector('[name="' + name + '"]').value]))`), {
    bottomMarginPercent: '12',
    crosshairStyle: 'dashed',
    crosshairWidth: '1',
    paneControlDockVisibility: 'hover',
    rightMarginBars: '12',
    scaleFontSize: '12',
    topMarginPercent: '10',
  });
  await capture(cdp, workstationCanvasVisualFile, '.workstation-settings-dialog');
  await evaluate(cdp, `document.querySelector('[data-settings-tab="symbol"]').click()`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('[name="gridVisible"]').checked`), true);
  assert.equal(await evaluate(cdp,
    `document.querySelectorAll('.workstation-color-picker-button').length`), 9);
  await evaluate(cdp, `document.querySelector('.workstation-color-picker-button').click()`);
  await waitFor(cdp, `document.querySelector('.workstation-color-picker-popover')?.hidden === false`);
  assert.equal(await evaluate(cdp,
    `document.querySelectorAll(
      '.workstation-color-picker-popover:not([hidden]) .workstation-color-palette .workstation-color-swatch'
    ).length`), 70);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.workstation-color-recent-section').hidden`), true);
  await evaluate(cdp, `document.querySelector('.workstation-color-precise-toggle').click()`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.workstation-color-precise-panel').hidden`), false);
  assert.equal(await evaluate(cdp,
    `document.querySelectorAll('hex-alpha-color-picker').length`), 9,
  'the precise engine must stay encapsulated inside each owned color control');
  await capture(cdp, colorPickerVisualFile, '.workstation-color-picker-popover');
  await evaluate(cdp, `(() => {
    const draft = document.querySelector('[name="upBodyColor"]');
    draft.value = '#5c6bc080';
    draft.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[name="gridVisible"]').click();
    for (const [name, value] of Object.entries({
      dateFormat: 'YYYY-MM-DD', displayTimezone: 'UTC', hourFormat: '12-hour',
    })) {
      const control = document.querySelector('[name="' + name + '"]');
      control.value = value;
      control.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.querySelector('[name="dayOfWeekVisible"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.gridVisible === 'false'
    && document.querySelector('.replay-workspace')?.dataset.displayTimezone === 'UTC'
    && document.querySelector('.replay-workspace')?.dataset.dateFormat === 'YYYY-MM-DD'
    && document.querySelector('.replay-workspace')?.dataset.hourFormat === '12-hour'
    && document.querySelector('.replay-workspace')?.dataset.dayOfWeekVisible === 'true'
    && [...document.querySelectorAll('.lightweight-chart-host')]
      .every((host) => host.dataset.gridVisible === 'false'
        && host.dataset.displayTimezone === 'UTC'
        && host.dataset.dateFormat === 'YYYY-MM-DD'
        && host.dataset.hourFormat === '12-hour'
        && host.dataset.dayOfWeekVisible === 'true')`);
  assert.match(await evaluate(cdp,
    `document.querySelector('.replay-session-range').textContent`),
  /Mon 2026-05-04, 4:40 PM UTC.*Wed 2026-05-06, 8:00 PM UTC/,
  'live preview must reformat the shared Session range without changing either instant');
  assert.deepEqual(await evaluate(cdp, `(() => ({
    range: document.querySelector('.exact-goto-range').textContent,
    timeZone: document.querySelector('.exact-goto-dialog').dataset.displayTimezone,
  }))()`), {
    range: 'Replay Session · Mon 2026-05-04, 4:40 PM – Wed 2026-05-06, 8:00 PM · UTC',
    timeZone: 'UTC',
  }, 'Exact GoTo must consume the same live time presentation');
  assert.equal(await evaluate(cdp,
    `localStorage.getItem('v7.workstation-settings:global')`), null,
  'live preview must not write durable Settings');
  await evaluate(cdp, `document.querySelector('.workstation-settings-cancel').click()`);
  await waitFor(cdp, `document.querySelector('.workstation-settings-dialog')?.open === false
    && document.querySelector('.replay-workspace')?.dataset.gridVisible === 'true'
    && document.querySelector('.replay-workspace')?.dataset.displayTimezone === 'America/New_York'
    && document.querySelector('.replay-workspace')?.dataset.dateFormat === 'MM/DD/YYYY'
    && document.querySelector('.replay-workspace')?.dataset.hourFormat === '24-hour'
    && document.querySelector('.replay-workspace')?.dataset.dayOfWeekVisible === 'false'
    && [...document.querySelectorAll('.lightweight-chart-host')]
      .every((host) => host.dataset.gridVisible === 'true'
        && host.dataset.displayTimezone === 'America/New_York')`);
  assert.match(await evaluate(cdp,
    `document.querySelector('.replay-session-range').textContent`),
  /05\/04\/2026, 12:40 EDT.*05\/06\/2026, 16:00 EDT/,
  'Cancel must restore the committed time presentation on every shared surface');
  assert.equal(await evaluate(cdp, `localStorage.getItem('v7.color-history:global')`), null,
    'Cancel must not leak draft colors into global recent history');
  await evaluate(cdp, `document.querySelector('.workstation-settings-open').click()`);
  await evaluate(cdp, `(() => {
    document.querySelector('[name="gridVisible"]').click();
    document.querySelector('.workstation-settings-cancel').click();
    document.querySelector('.workstation-settings-open').click();
  })()`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('[name="gridVisible"]').checked`), true,
  'Cancel must discard the Settings draft');
  await evaluate(cdp, `(() => {
    document.querySelector('[name="gridVisible"]').click();
    document.querySelector('.workstation-settings-reset').click();
  })()`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('[name="gridVisible"]').checked`), true,
  'Reset must restore defaults only in the open draft');
  await capture(cdp, workstationSettingsVisualFile, '.workstation-settings-dialog');
  await evaluate(cdp, `document.querySelector('.workstation-settings-cancel').click()`);
  for (const dismiss of [
    `document.querySelector('.workstation-settings-close').click()`,
    `document.querySelector('.workstation-settings-dialog')
      .dispatchEvent(new Event('cancel', { cancelable: true }))`,
    `document.querySelector('.workstation-settings-dialog')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))`,
  ]) {
    await evaluate(cdp, `(() => {
      document.querySelector('.workstation-settings-open').click();
      document.querySelector('[name="gridVisible"]').click();
    })()`);
    await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.gridVisible === 'false'`);
    await evaluate(cdp, dismiss);
    await waitFor(cdp, `document.querySelector('.workstation-settings-dialog')?.open === false
      && document.querySelector('.replay-workspace')?.dataset.gridVisible === 'true'`);
  }

  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-12-hour"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-secondary"]')?.dataset.timeframeId
    === 'timeframe.display-12-hour' && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`);
  const beforeSync = await evaluate(cdp, paneStateExpression());
  await evaluate(cdp, `document.querySelector('.replay-timeframe-sync input').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.syncTimeframe === 'true'
    && document.querySelector('.replay-workspace')?.dataset.replayStepId === 'replay-step.fixed-240-minute'`);
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.workspaceRevision, beforeSync.workspaceRevision,
    'enabling Sync timeframe must not issue a Pane transaction');
  assert.equal(state.replayRevision, beforeSync.replayRevision,
    'enabling Sync timeframe must not move the Replay cursor');
  assert.equal(await evaluate(cdp, `document.querySelector('.replay-step-select').disabled`), true,
    'Replay step is read-only while Sync timeframe owns it');
  await evaluate(cdp, `document.querySelector('[data-pane-id="pane-main"]')
    .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.activePaneId === 'pane-main'
    && document.querySelector('.replay-workspace')?.dataset.replayStepId === 'replay-step.fixed-1-minute'`);
  await evaluate(cdp, `document.querySelector('[data-pane-id="pane-secondary"]')
    .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.activePaneId === 'pane-secondary'
    && document.querySelector('.replay-workspace')?.dataset.replayStepId === 'replay-step.fixed-240-minute'`);
  await evaluate(cdp, `document.querySelector('.replay-timeframe-sync input').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.syncTimeframe === 'false'
    && !document.querySelector('.replay-step-select').disabled`);
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-4-hour"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-secondary"]')?.dataset.timeframeId
    === 'timeframe.display-4-hour' && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`);
  state = await evaluate(cdp, paneStateExpression());

  const beforeStepSelection = state;
  await evaluate(cdp, `(() => {
    const select = document.querySelector('.replay-step-select');
    select.value = 'replay-step.fixed-5-minute';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.replayStepId === 'replay-step.fixed-5-minute'`);
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.workspaceRevision, beforeStepSelection.workspaceRevision,
    'Replay step selection must not issue a Pane materialization transaction');
  assert.equal(state.replayRevision, beforeStepSelection.replayRevision,
    'Replay step selection must not move the shared Replay cursor');
  assert.equal(state.panes[1].timeframeId, 'timeframe.display-4-hour');
  assert.equal(state.autoplaySpeedId, 'autoplay-speed-1x');

  const beforeNext = state;
  await evaluate(cdp, `document.querySelector('.replay-next').click()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeNext.workspaceRevision}`);
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.replayRevision, beforeNext.replayRevision + 1);
  assert.match(state.cursorText, /12:44 EDT/,
    '5m Next bar must finish at the 12:44 display completion rather than add one minute');
  assert.ok(state.panes.every((pane, index) => pane.visibleRevision > beforeNext.panes[index].visibleRevision),
    'one shared Next must visibly apply every Pane');

  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="rth"]').click()`);
  await waitFor(cdp, `[...document.querySelectorAll('.lightweight-chart-host')]
    .every((host) => host.dataset.sessionHoursMode === 'rth')
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  state = await evaluate(cdp, paneStateExpression());
  assert.ok(state.panes.every(({ sessionHoursMode }) => sessionHoursMode === 'rth'),
    'Session Hours must reproject the complete Pane set');

  const beforeSpeed = state;
  await evaluate(cdp, `(() => {
    const select = document.querySelector('.replay-speed-select');
    select.value = 'autoplay-speed-5x';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.autoplaySpeedId === 'autoplay-speed-5x'`);
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.workspaceRevision, beforeSpeed.workspaceRevision,
    'Autoplay speed selection must not issue a Pane materialization transaction');
  assert.equal(state.replayRevision, beforeSpeed.replayRevision,
    'Autoplay speed selection must not move the Replay cursor');
  assert.equal(await evaluate(cdp,
    `document.querySelector('.replay-autoplay') === document.querySelector('.replay-pause')`), true,
  'Play and Pause must be one stateful transport control');

  const beforeAuto = state;
  const autoplayStartedAt = performance.now();
  await evaluate(cdp, `document.querySelector('.replay-autoplay').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.replayPlayback === 'playing'
    && document.querySelector('.replay-playback')?.getAttribute('aria-label') === 'Pause replay'`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) >= ${beforeAuto.workspaceRevision + 3}`,
    10_000);
  assert.ok(performance.now() - autoplayStartedAt < 3_000,
    '5× Autoplay must apply three completion-driven steps without using the default 500ms cadence');
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.playback, 'playing');
  assert.ok(state.replayRevision >= beforeAuto.replayRevision + 3,
    'continuous Autoplay must advance more than one selected Replay bar');
  assert.ok(state.panes.every((pane, index) => pane.visibleRevision > beforeAuto.panes[index].visibleRevision));
  await evaluate(cdp, `document.querySelector('.replay-pause').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.replayPlayback === 'paused'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`);
  assert.equal(await evaluate(cdp, `document.querySelector('.replay-playback').getAttribute('aria-label')`),
    'Play replay continuously');
  const pausedState = await evaluate(cdp, paneStateExpression());
  await new Promise((resolve) => setTimeout(resolve, 1_200));
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.workspaceRevision, pausedState.workspaceRevision,
    'Pause must cancel every future Autoplay transaction');
  assert.equal(state.replayRevision, pausedState.replayRevision,
    'Pause must keep the Replay cursor stable beyond two cadence intervals');
  assert.equal(state.cursorText, pausedState.cursorText);

  const beforePrevious = state.workspaceRevision;
  await evaluate(cdp, `document.querySelector('.replay-previous').click()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforePrevious}`);
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.playback, 'paused');

  await evaluate(cdp, `document.querySelector('.goto-toggle').click()`);
  assert.deepEqual(await evaluate(cdp, `[...document.querySelectorAll('[data-goto-anchor]')]
    .map((button) => ({ anchor: button.dataset.gotoAnchor, key: button.querySelector('kbd')?.textContent ?? null }))`), [
    { anchor: 'next-day-open', key: 'Y' },
    { anchor: 'next-session', key: 'Z' },
    { anchor: 'asian-session', key: 'I' },
    { anchor: 'london-session', key: 'L' },
    { anchor: 'new-york-session', key: 'N' },
    { anchor: 'silver-bullet-new-york-am', key: null },
    { anchor: 'silver-bullet-new-york-pm', key: null },
    { anchor: 'silver-bullet-london', key: null },
  ], 'Quick GoTo exposes eight fixed actions and only the five accepted shortcuts');
  await evaluate(cdp, `document.querySelector('.goto-settings').click()`);
  await waitFor(cdp, `document.querySelector('.goto-settings-dialog')?.open === true`);
  assert.deepEqual(await evaluate(cdp, `[...document.querySelectorAll('.goto-settings-time')]
    .map((select) => ({
      element: select.tagName,
      first: select.options[0]?.value,
      last: select.options[select.options.length - 1]?.value,
      optionCount: select.options.length,
      offGrid: [...select.options].some((option) => Number(option.value.slice(3)) % 15 !== 0),
    }))`), Array.from({ length: 7 }, () => ({
    element: 'SELECT',
    first: '00:00',
    last: '23:45',
    optionCount: 96,
    offGrid: false,
  })), 'each Quick GoTo time uses the complete 24-hour quarter-hour selector');
  assert.deepEqual(await evaluate(cdp, `Object.fromEntries([...document.querySelectorAll('.goto-settings-time')]
    .map((input) => [input.name, input.value]))`), {
    asianSession: '19:00',
    dayOpen: '18:00',
    londonSession: '02:00',
    newYorkSession: '09:30',
    silverBulletLondon: '03:00',
    silverBulletNewYorkAm: '10:00',
    silverBulletNewYorkPm: '14:00',
  });
  await evaluate(cdp, `(() => {
    document.querySelector('.goto-settings-time[name="dayOpen"]').value = '17:00';
    document.querySelector('.goto-settings-reset').click();
  })()`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.goto-settings-time[name="dayOpen"]').value`), '18:00',
  'Reset to defaults must restore the default Quick GoTo schedule before Save');
  await evaluate(cdp, `document.activeElement?.blur()`);
  await capture(cdp, gotoSettingsVisualFile, '.goto-settings-dialog');
  const beforeSettings = await evaluate(cdp, paneStateExpression());
  await evaluate(cdp, `(() => {
    document.querySelector('.goto-settings-time[name="dayOpen"]').value = '12:00';
    document.querySelector('.goto-settings-time[name="silverBulletNewYorkPm"]').value = '15:00';
    document.querySelector('.goto-settings-save').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.goto-settings-dialog')?.open === false`);
  state = await evaluate(cdp, paneStateExpression());
  assert.equal(state.workspaceRevision, beforeSettings.workspaceRevision,
    'saving GoTo settings must not issue a Pane transaction');
  assert.equal(state.replayRevision, beforeSettings.replayRevision,
    'saving GoTo settings must not move Replay');
  await evaluate(cdp, `(() => {
    document.querySelector('.goto-toggle').click();
    document.querySelector('.goto-settings').click();
    document.querySelector('.goto-settings-time[name="silverBulletNewYorkPm"]').value = '16:00';
    document.querySelector('.goto-settings-discard').click();
    document.querySelector('.goto-toggle').click();
    document.querySelector('.goto-settings').click();
  })()`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.goto-settings-time[name="silverBulletNewYorkPm"]').value`), '15:00',
  'Discard must restore the last saved Quick GoTo settings');
  assert.equal(await evaluate(cdp,
    `document.querySelector('.goto-settings-time[name="dayOpen"]').value`), '12:00',
  'Discard must preserve the saved Next Day Open setting');
  await evaluate(cdp, `document.querySelector('.goto-settings-discard').click()`);

  await evaluate(cdp, `(() => {
    document.querySelector('.goto-toggle').click();
    document.querySelector('[data-goto-anchor="next-day-open"]').click();
  })()`);
  const beforeDayOpen = state.workspaceRevision;
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeDayOpen}`, 10_000);
  state = await evaluate(cdp, paneStateExpression());
  assert.match(await evaluate(cdp, `document.querySelector('.replay-visible-through').textContent`),
    /05\/05\/2026, 11:59 EDT/,
    'custom Next Day Open must cross the trading day and stop one minute before its wall time');
  assert.equal(await evaluate(cdp, `document.querySelector('.replay-workspace').dataset.viewState`), 'ready',
    'custom Next Day Open must leave the accepted Workspace ready');

  await evaluate(cdp, `(() => {
    document.querySelector('.goto-toggle').click();
    document.querySelector('[data-goto-anchor="silver-bullet-new-york-pm"]').click();
  })()`);
  const beforeQuick = state.workspaceRevision;
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeQuick}`, 10_000);
  state = await evaluate(cdp, paneStateExpression());
  assert.ok(state.panes.every(({ visibleRevision }) => visibleRevision >= 1));
  assert.match(await evaluate(cdp, `document.querySelector('.replay-visible-through').textContent`),
    /05\/05\/2026, 14:59 EDT/,
    'Quick GoTo must stop one minute before the saved Silver Bullet time');
  const quickVisibleThrough = Date.parse('2026-05-05T18:59:00.000Z');
  assert.ok(state.panes.every(({ visibleThroughEpochMs }) => visibleThroughEpochMs === quickVisibleThrough),
    `every Pane must exclude source data at or after the configured 15:00 anchor: ${JSON.stringify(state.panes)}`);
  assert.equal(state.panes.find(({ timeframeId }) => timeframeId === 'timeframe.display-1-minute')
    ?.latestDisplayEpochMs, quickVisibleThrough,
  'the 1m Pane latest candle must be exactly one minute before the configured shortcut time');

  assert.equal(await evaluate(cdp, `document.querySelector('.goto-menu .exact-goto-toggle') === null`), true,
    'Exact GoTo must remain separate from the Quick GoTo menu');
  await evaluate(cdp, `document.querySelector('.exact-goto-toggle').click()`);
  await waitFor(cdp, `document.querySelector('.exact-goto-dialog')?.open === true`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.exact-goto-dialog [name="goto-target"]').value`), '2026-05-05T15:00',
  'Exact GoTo must default to the current shared Replay cursor');
  assert.deepEqual(await evaluate(cdp, `(() => {
    const find = (label) => document.querySelector('.exact-goto-dialog [aria-label="' + label + '"]');
    return {
      beforeDisabled: find('April 30, 2026').disabled,
      startState: find('May 4, 2026').dataset.rangeState,
      endState: find('May 6, 2026').dataset.rangeState,
      afterDisabled: find('May 7, 2026').disabled,
    };
  })()`), {
    beforeDisabled: true, startState: 'start', endState: 'end', afterDisabled: true,
  }, 'Exact GoTo Calendar must highlight the Session range and disable outside dates');
  await evaluate(cdp, `document.activeElement?.blur()`);
  await capture(cdp, exactGotoVisualFile, '.exact-goto-dialog');
  await evaluate(cdp, `(() => {
    document.querySelector('.exact-goto-dialog [aria-label="May 4, 2026"]').click();
    document.querySelector('.exact-goto-dialog [aria-label="Increase minute"]').click();
  })()`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.exact-goto-dialog [name="goto-target"]').value`), '2026-05-04T15:01',
  'the inline Calendar day and time controls must update the one exact target value');
  const beforeInvalidExact = await evaluate(cdp, paneStateExpression());
  await evaluate(cdp, `(() => {
    document.querySelector('.exact-goto-dialog [name="goto-target"]').value = '2026-04-30T23:59';
    document.querySelector('.exact-goto-dialog .goto-submit').click();
  })()`);
  assert.equal(await evaluate(cdp, `document.querySelector('.exact-goto-dialog').open`), true,
    'an out-of-range Exact GoTo must keep the dialog open');
  assert.match(await evaluate(cdp,
    `document.querySelector('.exact-goto-validation').textContent`), /Time must be between .*New York/,
  'an out-of-range Exact GoTo must report the explicit Session boundary');
  assert.deepEqual(await evaluate(cdp, paneStateExpression()), beforeInvalidExact,
    'invalid Exact GoTo input must not issue a Replay or Workspace transaction');
  await evaluate(cdp, `(() => {
    document.querySelector('.exact-goto-dialog [name="goto-target"]').value = '2026-05-04T13:00';
    document.querySelector('.exact-goto-dialog .goto-submit').click();
  })()`);
  const beforeExact = state.workspaceRevision;
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeExact}`, 10_000);
  assert.match(await evaluate(cdp, `document.querySelector('.replay-visible-through').textContent`),
    /05\/04\/2026, 12:59 EDT/, 'exact GoTo uses a New York exclusive cutoff');

  for (let cycle = 0; cycle < 3; cycle += 1) {
    const beforeQuickCycle = Number(await evaluate(cdp,
      `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
    await evaluate(cdp, `(() => {
      document.querySelector('.goto-toggle').click();
      document.querySelector('[data-goto-anchor="new-york-session"]').click();
    })()`);
    await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeQuickCycle}
      && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
    assert.equal(await evaluate(cdp, `document.querySelector('.replay-workspace').dataset.viewState`), 'ready',
      'repeated Exact/Quick navigation must retain one ready shared Workspace');
    assert.equal(await evaluate(cdp, `[...document.querySelectorAll('.lightweight-chart-host')]
      .some((host) => host.dataset.lastApplyError?.includes('CHART_CANDLES_NOT_PAINTED'))`), false,
    'a current pane paint must receive bounded follow-up frames before failing the shared transaction');
    const beforeExactCycle = Number(await evaluate(cdp,
      `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
    await evaluate(cdp, `(() => {
      document.querySelector('.exact-goto-toggle').click();
      document.querySelector('.exact-goto-dialog [name="goto-target"]').value = '2026-05-04T13:00';
      document.querySelector('.exact-goto-dialog .goto-submit').click();
    })()`);
    await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeExactCycle}
      && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  }

  await evaluate(cdp, `document.querySelector('[data-pane-id="pane-main"] .pane-reset').click()`);
  const beforeTruncation = await evaluate(cdp, paneStateExpression());
  await evaluate(cdp, `document.querySelector('.replay-truncation').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.truncationSelection === 'active'`);
  assert.equal(await evaluate(cdp, `document.querySelector('.replay-playback').disabled`), true,
    'Replay navigation must lock while the chart owns a truncation-point gesture');
  const truncationPoint = await evaluate(cdp, `(() => {
    const host = document.querySelector('[data-pane-id="pane-main"] .lightweight-chart-host');
    const bounds = host.getBoundingClientRect();
    return {
      x: bounds.left + bounds.width * 0.65,
      y: bounds.top + bounds.height / 2,
    };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: truncationPoint.x, y: truncationPoint.y,
    button: 'none', buttons: 0,
  });
  for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', {
    type, x: truncationPoint.x, y: truncationPoint.y,
    button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1,
  });
  try {
    await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision)
      > ${beforeTruncation.workspaceRevision}
      && document.querySelector('.replay-workspace')?.dataset.truncationSelection === 'inactive'`, 10_000);
  } catch (error) {
    const diagnostic = await evaluate(cdp, `(() => {
      const root = document.querySelector('.replay-workspace');
      const host = document.querySelector('[data-pane-id="pane-main"] .lightweight-chart-host');
      return {
        barCount: host.dataset.barCount,
        cursorText: root.dataset.cursorText,
        lastSelection: host.dataset.lastTruncationSelection,
        lastLogical: host.dataset.lastTruncationLogical,
        lastStart: host.dataset.lastTruncationStartEpochMs,
        logicalFrom: host.dataset.logicalFrom,
        logicalTo: host.dataset.logicalTo,
        status: document.querySelector('.workspace-inline-status').textContent,
        truncationSelection: root.dataset.truncationSelection,
        workspaceRevision: root.dataset.workspaceRevision,
      };
    })()`);
    throw new Error(`${error.message}; truncation diagnostic: ${JSON.stringify({ diagnostic, truncationPoint })}`);
  }
  state = await evaluate(cdp, paneStateExpression());
  assert.ok(state.panes[0].barCount < beforeTruncation.panes[0].barCount,
    'selected candle and every later candle must be removed from the visible Pane snapshot');
  assert.equal(state.replayRevision, beforeTruncation.replayRevision + 1);
  assert.ok(state.panes.every((pane, index) => (
    pane.visibleRevision > beforeTruncation.panes[index].visibleRevision
  )), 'one truncation click must visibly apply every Pane through the shared Replay transaction');

  const beforeRestart = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
  await evaluate(cdp, `document.querySelector('.replay-restart').click()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeRestart}`, 10_000);
  assert.match(await evaluate(cdp, `document.querySelector('.replay-visible-through').textContent`),
    /No Session bar visible/, 'Restart hides the Session start bar without losing historical context');

  const beforeSessionEnd = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
  await evaluate(cdp, `(() => {
    document.querySelector('.exact-goto-toggle').click();
    document.querySelector('.exact-goto-dialog [name="goto-target"]').value = '2026-05-06T16:00';
    document.querySelector('.exact-goto-dialog .goto-submit').click();
  })()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeSessionEnd}
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  const completedAvailability = await evaluate(cdp, `(() => ({
    next: document.querySelector('.replay-next').disabled,
    playback: document.querySelector('.replay-playback').disabled,
    previous: document.querySelector('.replay-previous').disabled,
    speed: document.querySelector('.replay-speed-select').disabled,
    step: document.querySelector('.replay-step-select').disabled,
    syncTimeframe: document.querySelector('.replay-timeframe-sync input').disabled,
    truncation: document.querySelector('.replay-truncation').disabled,
  }))()`);
  assert.deepEqual(completedAvailability, {
    next: true, playback: true, previous: false, speed: true, step: false,
    syncTimeframe: false, truncation: false,
  }, 'Session completion must still allow Previous and Replay-step recovery');
  const beforeRangeEnd = await evaluate(cdp, paneStateExpression());
  await evaluate(cdp, `(() => {
    document.querySelector('.goto-toggle').click();
    document.querySelector('[data-goto-anchor="silver-bullet-london"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.gotoFeedback.includes('Replay range ends')`);
  const afterRangeEnd = await evaluate(cdp, paneStateExpression());
  assert.equal(afterRangeEnd.workspaceRevision, beforeRangeEnd.workspaceRevision,
    'Quick GoTo range exhaustion must not issue a Pane transaction');
  assert.equal(afterRangeEnd.replayRevision, beforeRangeEnd.replayRevision,
    'Quick GoTo range exhaustion must not move Replay');
  assert.equal(await evaluate(cdp, `document.querySelector('.replay-workspace').dataset.viewState`), 'ready');
  assert.match(await evaluate(cdp, `document.querySelector('.workspace-inline-status').textContent`),
    /No later SB London is available.*05\/06\/2026, 16:00 EDT/,
    'range-end feedback names the shortcut and Replay Session end');
  const beforeCompletedPrevious = Number(await evaluate(cdp,
    `document.querySelector('.replay-workspace').dataset.workspaceRevision`));
  await evaluate(cdp, `document.querySelector('.replay-previous').click()`);
  await waitFor(cdp,
    `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeCompletedPrevious}`);

  await evaluate(cdp, `document.querySelector('[data-layout-id="layout.single"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '1'
    && document.querySelectorAll('.workspace-pane:not(.is-prepared)').length === 1`);
  const manualWallPoint = await evaluate(cdp, `(() => {
    const rect = document.querySelector('.lightweight-chart-host').getBoundingClientRect();
    return { x: rect.left + rect.width * .55, y: rect.top + rect.height * .5 };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel', x: manualWallPoint.x, y: manualWallPoint.y, deltaX: 140, deltaY: 0,
  });
  await waitFor(cdp, `document.querySelector('.lightweight-chart-host')?.dataset.viewportOrigin === 'manual'`);
  const rightMarginWallBefore = await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return {
      latestOffsetBars: host.dataset.latestOffsetBars,
      origin: host.dataset.viewportOrigin,
      revision: host.dataset.viewportRevision,
    };
  })()`);
  const beforeSettingsCommit = await evaluate(cdp, paneStateExpression());
  await evaluate(cdp, `(() => {
    document.querySelector('.workstation-settings-open').click();
    document.querySelector('[name="gridVisible"]').click();
    document.querySelector('[name="bodyVisible"]').click();
    const upBorder = document.querySelector('[name="upBorderColor"]');
    upBorder.value = '#36c28fff';
    upBorder.dispatchEvent(new Event('input', { bubbles: true }));
    const downWick = document.querySelector('[name="downWickColor"]');
    downWick.value = '#ff7185cc';
    downWick.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[name="pricePrecision"]').value = '1';
    document.querySelector('[name="ohlcVisible"]').click();
    document.querySelector('[name="changeVisible"]').click();
    document.querySelector('[name="volumeVisible"]').click();
    document.querySelector('[name="currentPriceValueVisible"]').click();
    for (const [name, value] of Object.entries({
      canvasBackgroundColor: '#101820ff',
      crosshairColorAndOpacity: '#33669973',
      scaleTextColor: '#f1e9daff',
    })) {
      const input = document.querySelector('[name="' + name + '"]');
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.querySelector('[name="crosshairStyle"]').value = 'dotted';
    document.querySelector('[name="crosshairWidth"]').value = '3';
    document.querySelector('[name="scaleFontSize"]').value = '16';
    document.querySelector('[name="paneControlDockVisibility"]').value = 'always';
    document.querySelector('[name="displayTimezone"]').value = 'UTC';
    document.querySelector('[name="dateFormat"]').value = 'YYYY-MM-DD';
    document.querySelector('[name="dayOfWeekVisible"]').click();
    document.querySelector('[name="hourFormat"]').value = '12-hour';
    document.querySelector('[name="topMarginPercent"]').value = '14';
    document.querySelector('[name="bottomMarginPercent"]').value = '18';
    document.querySelector('[name="rightMarginBars"]').value = '24';
    for (const name of [
      'crosshairStyle', 'crosshairWidth', 'scaleFontSize', 'paneControlDockVisibility',
      'displayTimezone', 'dateFormat', 'hourFormat',
      'topMarginPercent', 'bottomMarginPercent', 'rightMarginBars',
    ]) document.querySelector('[name="' + name + '"]')
      .dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await waitFor(cdp, `document.querySelector('.workstation-settings-dialog')?.open === true
    && document.querySelector('.replay-workspace')?.dataset.canvasBackgroundColor === '#101820ff'
    && document.querySelector('.replay-workspace')?.dataset.gridVisible === 'false'
    && document.querySelector('.replay-workspace')?.dataset.displayTimezone === 'UTC'
    && document.querySelector('.replay-workspace')?.dataset.dateFormat === 'YYYY-MM-DD'
    && document.querySelector('.replay-workspace')?.dataset.dayOfWeekVisible === 'true'
    && document.querySelector('.replay-workspace')?.dataset.hourFormat === '12-hour'
    && document.querySelector('.lightweight-chart-host')?.dataset.crosshairStyle === 'dotted'
    && document.querySelector('.lightweight-chart-host')?.dataset.scaleFontSize === '16'`);
  assert.equal(await evaluate(cdp,
    `localStorage.getItem('v7.workstation-settings:global')`), null,
  'even a complete live preview must remain non-durable before OK');
  assert.deepEqual(await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return {
      latestOffsetBars: host.dataset.latestOffsetBars,
      origin: host.dataset.viewportOrigin,
      revision: host.dataset.viewportRevision,
    };
  })()`), rightMarginWallBefore,
  'live right-margin preview must not overwrite an existing manual wall');
  await evaluate(cdp, `document.querySelector('.workstation-settings-save').click()`);
  await waitFor(cdp, `document.querySelector('.workstation-settings-dialog')?.open === false
    && localStorage.getItem('v7.workstation-settings:global') !== null`);
  const afterSettingsCommit = await evaluate(cdp, paneStateExpression());
  assert.deepEqual(await evaluate(cdp, `JSON.parse(
    localStorage.getItem('v7.color-history:global')
  ).colors.slice(0, 5)`), [
    '#f1e9daff', '#33669973', '#101820ff', '#ff7185cc', '#36c28fff',
  ],
  'only successfully committed touched colors must enter global recent history');
  assert.equal(afterSettingsCommit.replayRevision, beforeSettingsCommit.replayRevision,
    'Settings must not move Replay');
  assert.equal(afterSettingsCommit.workspaceRevision, beforeSettingsCommit.workspaceRevision,
    'Settings must not issue a Workspace transaction');
  assert.match(await evaluate(cdp,
    `document.querySelector('.replay-session-range').textContent`),
  /Mon 2026-05-04, 4:40 PM UTC.*Wed 2026-05-06, 8:00 PM UTC/,
  'committed time presentation must retain canonical Session bounds');
  await evaluate(cdp, `document.querySelector('.exact-goto-toggle').click()`);
  await waitFor(cdp, `document.querySelector('.exact-goto-dialog')?.open === true`);
  assert.deepEqual(await evaluate(cdp, `(() => ({
    date: document.querySelector('.exact-goto-dialog .date-time-inline-date').textContent,
    hourFormat: document.querySelector('.replay-workspace').dataset.hourFormat,
    time: document.querySelector('.exact-goto-dialog .date-time-inline-time').textContent,
    timeZone: document.querySelector('.exact-goto-dialog').dataset.displayTimezone,
  }))()`), {
    date: 'Wed 2026-05-06', hourFormat: '12-hour', time: '7:55 PM', timeZone: 'UTC',
  }, 'Exact GoTo must share the committed timezone, date, weekday, and hour format');
  await evaluate(cdp, `document.querySelector('.exact-goto-dialog .date-time-period').click()`);
  assert.deepEqual(await evaluate(cdp, `(() => ({
    time: document.querySelector('.exact-goto-dialog .date-time-inline-time').textContent,
    value: document.querySelector('.exact-goto-dialog [name="goto-target"]').value,
  }))()`), { time: '7:55 AM', value: '2026-05-06T07:55' },
  '12-hour Exact GoTo must offer an explicit AM/PM toggle over the same wall value');
  await evaluate(cdp, `document.querySelector('.exact-goto-dialog .date-time-period').click()`);
  await evaluate(cdp, `document.querySelector('.exact-goto-dialog .goto-dialog-close').click()`);
  assert.deepEqual(await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    return {
      latestOffsetBars: host.dataset.latestOffsetBars,
      origin: host.dataset.viewportOrigin,
      revision: host.dataset.viewportRevision,
    };
  })()`), rightMarginWallBefore,
  'saving a right-margin default must not overwrite an existing manual wall');
  assert.equal(await evaluate(cdp,
    `[...document.querySelectorAll('.lightweight-chart-host')]
      .every((host) => host.dataset.gridVisible === 'false')`), true,
  'the committed Grid value must apply to every mounted Pane');
  assert.deepEqual(await evaluate(cdp, `(() => {
    const host = document.querySelector('.lightweight-chart-host');
    const pane = document.querySelector('.workspace-pane');
    return {
      bodyVisible: host.dataset.bodyVisible,
      bordersVisible: host.dataset.bordersVisible,
      canvasBackgroundColor: host.dataset.canvasBackgroundColor,
      changeHidden: pane.querySelector('.pane-change').hidden,
      controlVisibility: pane.querySelector('.pane-overlay-controls').dataset.visibility,
      crosshairOpacityPercent: host.dataset.crosshairOpacityPercent,
      crosshairStyle: host.dataset.crosshairStyle,
      crosshairWidth: host.dataset.crosshairWidth,
      currentPriceLineVisible: host.dataset.currentPriceLineVisible,
      currentPriceNameVisible: host.dataset.currentPriceNameVisible,
      currentPriceValueVisible: host.dataset.currentPriceValueVisible,
      ohlcHidden: pane.querySelector('.pane-ohlc').hidden,
      pricePrecision: host.dataset.pricePrecision,
      scaleFontSize: host.dataset.scaleFontSize,
      scaleMarginBottomPercent: host.dataset.scaleMarginBottomPercent,
      scaleMarginTopPercent: host.dataset.scaleMarginTopPercent,
      scaleTextColor: host.dataset.scaleTextColor,
      volumeHidden: pane.querySelector('.pane-volume').hidden,
    };
  })()`), {
    bodyVisible: 'false',
    bordersVisible: 'true',
    canvasBackgroundColor: '#101820ff',
    changeHidden: true,
    controlVisibility: 'always',
    crosshairOpacityPercent: '45',
    crosshairStyle: 'dotted',
    crosshairWidth: '3',
    currentPriceLineVisible: 'true',
    currentPriceNameVisible: 'true',
    currentPriceValueVisible: 'false',
    ohlcHidden: true,
    pricePrecision: '1',
    scaleFontSize: '16',
    scaleMarginBottomPercent: '18',
    scaleMarginTopPercent: '14',
    scaleTextColor: '#f1e9daff',
    volumeHidden: false,
  }, 'Symbol, readout, and name-only current-price settings must apply without moving Replay');
  assert.match(await evaluate(cdp,
    `document.querySelector('.pane-volume').textContent`), /^Vol \d/,
  'enabled Volume must expose the latest source value without fixing one brittle bar');
  await evaluate(cdp, `document.querySelector('.pane-reset').click()`);
  await waitFor(cdp, `document.querySelector('.lightweight-chart-host')?.dataset.latestOffsetBars === '24'
    && document.querySelector('.lightweight-chart-host')?.dataset.viewportOrigin === 'default'`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
    && document.querySelector('.replay-workspace')?.dataset.paneCount === '1'`, 10_000);
  await evaluate(cdp, `(() => {
    document.querySelector('.goto-toggle').click();
    document.querySelector('.goto-settings').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.goto-settings-dialog')?.open === true`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.goto-settings-time[name="silverBulletNewYorkPm"]').value`), '15:00',
  'hard Session re-entry must restore the global Quick GoTo settings alongside Pane layout');
  await evaluate(cdp, `document.querySelector('.goto-settings-discard').click()`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.gridVisible`), 'false',
  'hard Session re-entry must restore the global Grid preference before ready paint');
  assert.equal(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.pricePrecision`), '1',
  'hard Session re-entry must restore Symbol precision before ready paint');
  assert.deepEqual(await evaluate(cdp, `(() => {
    const root = document.querySelector('.replay-workspace');
    return {
      canvasBackgroundColor: root.dataset.canvasBackgroundColor,
      changeVisible: root.dataset.changeVisible,
      currentPriceValueVisible: root.dataset.currentPriceValueVisible,
      dateFormat: root.dataset.dateFormat,
      dayOfWeekVisible: root.dataset.dayOfWeekVisible,
      displayTimezone: root.dataset.displayTimezone,
      hourFormat: root.dataset.hourFormat,
      ohlcVisible: root.dataset.ohlcVisible,
      paneControlDockVisibility: root.dataset.paneControlDockVisibility,
      rightMarginBars: root.dataset.rightMarginBars,
      volumeVisible: root.dataset.volumeVisible,
    };
  })()`), {
    canvasBackgroundColor: '#101820ff', changeVisible: 'false',
    currentPriceValueVisible: 'false', ohlcVisible: 'false',
    dateFormat: 'YYYY-MM-DD', dayOfWeekVisible: 'true', displayTimezone: 'UTC',
    hourFormat: '12-hour', paneControlDockVisibility: 'always',
    rightMarginBars: '24', volumeVisible: 'true',
  }, 'hard Session re-entry must restore Status/current-price settings');

  await evaluate(cdp, `document.querySelector('.replay-back').click()`);
  await waitFor(cdp, `document.querySelector('#app')?.dataset.screen === 'list'`);
  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.open === true`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.dataset.dateAvailabilityState === 'ready'`);
  await evaluate(cdp, `(() => {
    const form = document.querySelector('.create-form');
    form.elements.name.value = 'Global GoTo Witness';
    form.querySelectorAll('[name="instrument"]')[0].checked = true;
    form.elements.start.value = '2026-05-01T08:10';
    form.elements.end.value = '2026-05-05T08:11';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`, 10_000);
  await evaluate(cdp, `(() => {
    document.querySelector('.goto-toggle').click();
    document.querySelector('.goto-settings').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.goto-settings-dialog')?.open === true`);
  assert.deepEqual(await evaluate(cdp, `Object.fromEntries([...document.querySelectorAll('.goto-settings-time')]
    .filter((input) => ['dayOpen', 'silverBulletNewYorkPm'].includes(input.name))
    .map((input) => [input.name, input.value]))`), {
    dayOpen: '12:00',
    silverBulletNewYorkPm: '15:00',
  }, 'a newly created Session must inherit the existing workstation-wide Quick GoTo settings');
  await evaluate(cdp, `document.querySelector('.goto-settings-discard').click()`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.lightweight-chart-host').dataset.gridVisible`), 'false',
  'a newly created Session must inherit the global Grid preference');
  assert.equal(await evaluate(cdp,
    `document.querySelector('.pane-volume').hidden`), false,
  'a newly created Session must inherit the global Volume readout preference');
  await evaluate(cdp, `document.querySelector('[data-layout-id="layout.two-columns"]').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '2'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 10_000);
  assert.equal(await evaluate(cdp,
    `[...document.querySelectorAll('.lightweight-chart-host')]
      .every((host) => host.dataset.gridVisible === 'false')`), true,
  'future Panes must inherit the latest committed Grid preference before ready paint');
  assert.equal(await evaluate(cdp,
    `[...document.querySelectorAll('.lightweight-chart-host')]
      .every((host) => host.dataset.bodyVisible === 'false' && host.dataset.pricePrecision === '1')`), true,
  'future Panes must inherit the committed Symbol presentation before ready paint');
  assert.equal(await evaluate(cdp,
    `[...document.querySelectorAll('.lightweight-chart-host')]
      .every((host) => host.dataset.currentPriceNameVisible === 'true'
        && host.dataset.currentPriceValueVisible === 'false'
        && host.dataset.currentPriceLineVisible === 'true')`), true,
  'future Panes must inherit the independent current-price combination before ready paint');
  assert.equal(await evaluate(cdp,
    `[...document.querySelectorAll('.lightweight-chart-host')]
      .every((host) => host.dataset.canvasBackgroundColor === '#101820ff'
        && host.dataset.crosshairStyle === 'dotted'
        && host.dataset.crosshairWidth === '3'
        && host.dataset.scaleFontSize === '16')`), true,
  'future Panes must inherit the committed Canvas presentation before ready paint');
  assert.equal(await evaluate(cdp,
    `[...document.querySelectorAll('.lightweight-chart-host')]
      .every((host) => host.dataset.displayTimezone === 'UTC'
        && host.dataset.dateFormat === 'YYYY-MM-DD'
        && host.dataset.dayOfWeekVisible === 'true'
        && host.dataset.hourFormat === '12-hour')`), true,
  'future Panes must inherit the shared time presentation before ready paint');
  assert.equal(await evaluate(cdp,
    `[...document.querySelectorAll('.workspace-pane')]
      .every((pane) => pane.querySelector('.pane-overlay-controls').dataset.visibility === 'always')`), true,
  'future Panes must inherit the committed control-dock visibility');
  assert.equal(await evaluate(cdp,
    `[...document.querySelectorAll('.lightweight-chart-host')]
      .every((host) => host.dataset.latestOffsetBars === '24')`), true,
  'future Pane Viewports must start with the latest owner-routed right-margin default');
  assert.equal(await evaluate(cdp,
    `[...document.querySelectorAll('.workspace-pane')]
      .every((pane) => pane.querySelector('.pane-ohlc').hidden
        && pane.querySelector('.pane-change').hidden
        && !pane.querySelector('.pane-volume').hidden)`), true,
  'future Panes must inherit the Status readout combination');
  await evaluate(cdp, `(() => {
    document.querySelector('.workstation-settings-open').click();
    document.querySelector('.workstation-color-picker-button').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.workstation-color-recent-section')?.hidden === false`);
  assert.deepEqual(await evaluate(cdp,
    `[...document.querySelectorAll('.workstation-color-recent .workstation-color-swatch')]
      .map((button) => button.getAttribute('aria-label'))`), [
    'Choose recent color #f1e9daff',
    'Choose recent color #33669973',
    'Choose recent color #101820ff',
    'Choose recent color #ff7185cc',
    'Choose recent color #36c28fff',
  ], 'recent colors must remain global across hard reload and a newly created Session');
  await evaluate(cdp, `(() => {
    document.querySelector('.workstation-color-picker-button').click();
    document.querySelector('[name="wicksVisible"]').click();
    document.querySelector('.workstation-settings-save').click();
  })()`);
  await waitFor(cdp, `[...document.querySelectorAll('.lightweight-chart-host')]
    .every((host) => host.dataset.wicksVisible === 'false')`);
  assert.equal(await evaluate(cdp,
    `[...document.querySelectorAll('.lightweight-chart-host')]
      .every((host) => host.dataset.wicksVisible === 'false')`), true,
  'one Symbol save must update every currently mounted Pane');
  const preferenceStorage = await evaluate(cdp, `(() => {
    const preference = JSON.parse(localStorage.getItem('v7.replay-navigation-preferences'));
    const sessionRecords = Object.keys(localStorage)
      .filter((key) => key.includes(':record:'))
      .map((key) => JSON.parse(localStorage.getItem(key)).value);
    return {
      dayOpen: preference.replayNavigationSettings.anchors.dayOpen,
      canvasBackgroundColor: JSON.parse(localStorage.getItem('v7.workstation-settings:global'))
        .settings.value.canvas.backgroundColor,
      dateFormat: JSON.parse(localStorage.getItem('v7.workstation-settings:global'))
        .settings.value.time.dateFormat,
      dayOfWeekVisible: JSON.parse(localStorage.getItem('v7.workstation-settings:global'))
        .settings.value.time.dayOfWeekVisible,
      displayTimezone: JSON.parse(localStorage.getItem('v7.workstation-settings:global'))
        .settings.value.time.displayTimezone,
      gridVisible: JSON.parse(localStorage.getItem('v7.workstation-settings:global'))
        .settings.value.canvas.gridVisible,
      hourFormat: JSON.parse(localStorage.getItem('v7.workstation-settings:global'))
        .settings.value.time.hourFormat,
      currentPriceValueVisible: JSON.parse(localStorage.getItem('v7.workstation-settings:global'))
        .settings.value.currentPrice.valueVisible,
      pricePrecision: JSON.parse(localStorage.getItem('v7.workstation-settings:global'))
        .settings.value.candles.pricePrecision,
      rightMarginBars: JSON.parse(localStorage.getItem('v7.workstation-settings:global'))
        .settings.value.canvas.rightMarginBars,
      settingsVersion: JSON.parse(localStorage.getItem('v7.workstation-settings:global'))
        .settings.version,
      sessionOwnsSettings: sessionRecords.some((record) => (
        Object.hasOwn(record.workspace, 'replayNavigationSettings')
      )),
      volumeVisible: JSON.parse(localStorage.getItem('v7.workstation-settings:global'))
        .settings.value.paneReadout.volumeVisible,
    };
  })()`);
  assert.deepEqual(preferenceStorage, {
    canvasBackgroundColor: '#101820ff',
    currentPriceValueVisible: false,
    dateFormat: 'YYYY-MM-DD',
    dayOpen: '12:00',
    dayOfWeekVisible: true,
    displayTimezone: 'UTC',
    gridVisible: false,
    hourFormat: '12-hour',
    pricePrecision: 1,
    rightMarginBars: 24,
    sessionOwnsSettings: false,
    settingsVersion: 6,
    volumeVisible: true,
  }, 'independent global records must own Quick GoTo and visual Settings outside Sessions');

  await evaluate(cdp, `document.querySelector('.replay-back').click()`);
  await waitFor(cdp, `document.querySelector('#app')?.dataset.screen === 'list'`);
  await evaluate(cdp, `(() => {
    const original = [...document.querySelectorAll('.session-card')]
      .find((card) => card.querySelector('h3')?.textContent === 'NQ ES Pane Replay');
    original.querySelector('.delete-session-button').click();
    original.querySelector('.session-delete-confirm').click();
  })()`);
  await waitFor(cdp, `document.querySelectorAll('.session-card').length === 1`);
  await evaluate(cdp, `document.querySelector('.open-session-button').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`, 10_000);
  await evaluate(cdp, `(() => {
    document.querySelector('.goto-toggle').click();
    document.querySelector('.goto-settings').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.goto-settings-dialog')?.open === true`);
  assert.equal(await evaluate(cdp,
    `document.querySelector('.goto-settings-time[name="dayOpen"]').value`), '12:00',
  'deleting the Session that originally changed Quick GoTo must not delete the global preference');
  await evaluate(cdp, `document.querySelector('.goto-settings-discard').click()`);
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
    scope: 'single/multi Pane, truncation, Sync timeframe, continuous Replay/Pause, both GoTo forms',
  });
