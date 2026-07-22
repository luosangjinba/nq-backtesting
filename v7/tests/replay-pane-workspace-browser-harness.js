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
  assert.equal(actual.equals(fs.readFileSync(fixture)), true,
    `${path.basename(fixture)} visual fixture changed`);
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
          paneWidth: pane.getBoundingClientRect().width,
          sessionHoursMode: host.dataset.sessionHoursMode,
          timeframeId: host.dataset.displayTimeframeId,
          viewportOrigin: host.dataset.viewportOrigin,
          viewportRevision: Number(host.dataset.viewportRevision),
          visibleRevision: Number(host.dataset.visibleRevision),
          visibleThroughEpochMs: Number(host.dataset.visibleThroughEpochMs),
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
  await new Promise((resolve) => setTimeout(resolve, 250));
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

  const beforeSync = state;
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

  await evaluate(cdp, `document.querySelector('[data-pane-id="pane-main"] .pane-reset').click()`);
  const beforeTruncation = await evaluate(cdp, paneStateExpression());
  await evaluate(cdp, `document.querySelector('.replay-truncation').click()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.truncationSelection === 'active'`);
  assert.equal(await evaluate(cdp, `document.querySelector('.replay-playback').disabled`), true,
    'Replay navigation must lock while the chart owns a truncation-point gesture');
  const truncationPoint = await evaluate(cdp, `(() => {
    const host = document.querySelector('[data-pane-id="pane-main"] .lightweight-chart-host');
    const bounds = host.getBoundingClientRect();
    const from = Number(host.dataset.logicalFrom);
    const to = Number(host.dataset.logicalTo);
    const barCount = Number(host.dataset.barCount);
    const plotWidth = bounds.width - 70;
    return {
      x: bounds.left + (((barCount - 3) - from) / (to - from)) * plotWidth,
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
    document.querySelector('.goto-toggle').click();
    document.querySelector('.goto-custom').click();
    document.querySelector('.goto-dialog [name="goto-target"]').value = '2026-05-06T16:00';
    document.querySelector('.goto-submit').click();
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

  await evaluate(cdp, `document.querySelector('.replay-back').click()`);
  await waitFor(cdp, `document.querySelector('#app')?.dataset.screen === 'list'`);
  await evaluate(cdp, `document.querySelector('.page-header .button-primary').click()`);
  await waitFor(cdp, `document.querySelector('.create-dialog')?.open === true`);
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
  const preferenceStorage = await evaluate(cdp, `(() => {
    const preference = JSON.parse(localStorage.getItem('v7.replay-navigation-preferences'));
    const sessionRecords = Object.keys(localStorage)
      .filter((key) => key.includes(':record:'))
      .map((key) => JSON.parse(localStorage.getItem(key)).value);
    return {
      dayOpen: preference.replayNavigationSettings.anchors.dayOpen,
      sessionOwnsSettings: sessionRecords.some((record) => (
        Object.hasOwn(record.workspace, 'replayNavigationSettings')
      )),
    };
  })()`);
  assert.deepEqual(preferenceStorage, { dayOpen: '12:00', sessionOwnsSettings: false },
    'one global record must own Quick GoTo settings independently of Session workspace records');

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
