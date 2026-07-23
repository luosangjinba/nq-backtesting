import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';
import { formatPaneVolume } from '../src/replay-workspace-ui/pane-overlay-view.js';

assert.equal(formatPaneVolume(null), '—');
assert.equal(formatPaneVolume(845), '845');
assert.equal(formatPaneVolume(2_730), '2.73K');

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_DIR, '../..');
const visualFile = path.join(TEST_DIR, 'fixtures/replay-workspace/layout-four-left-stack-1440x900.png');
const syncVisualFile = path.join(TEST_DIR, 'fixtures/replay-workspace/layout-crosshair-sync-1440x900.png');
const maximizeVisualFile = path.join(TEST_DIR, 'fixtures/replay-workspace/layout-maximized-1440x900.png');
const MAX_STABLE_VISUAL_BYTE_DIFFERENCES = 96;
const overlayCases = new Map(JSON.parse(fs.readFileSync(path.join(
  TEST_DIR, 'fixtures/replay-workspace/negative/pane-overlay-cases.json',
), 'utf8')).map((fixture) => [fixture.name, fixture]));
assert.deepEqual([...overlayCases.keys()], [
  'single-pane-maximize-unavailable',
  'maximize-is-transient-and-keeps-two-charts-mounted',
  'reset-is-pane-local',
  'pointer-focus-does-not-pin-controls',
]);
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-r6-9-chrome-'));
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

function inflatedPngScanlines(buffer) {
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(buffer.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  return inflateSync(Buffer.concat(chunks));
}

function isStableVisual(actual, expected) {
  if (actual.equals(expected)) return true;
  const actualScanlines = inflatedPngScanlines(actual);
  const expectedScanlines = inflatedPngScanlines(expected);
  if (actualScanlines.length !== expectedScanlines.length) return false;
  let differenceCount = 0;
  for (let index = 0; index < actualScanlines.length; index += 1) {
    if (actualScanlines[index] === expectedScanlines[index]) continue;
    differenceCount += 1;
    // Canvas text anti-aliasing varies by a few bytes across serial Chrome runs.
    if (differenceCount > MAX_STABLE_VISUAL_BYTE_DIFFERENCES) return false;
  }
  return true;
}

async function capture(cdp, targetFile = visualFile) {
  await new Promise((resolve) => setTimeout(resolve, 160));
  await evaluate(cdp, `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
  if (process.env.V7_UPDATE_VISUALS === '1') {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const actual = Buffer.from(data, 'base64');
    fs.writeFileSync(targetFile, actual);
    return;
  }
  assert.ok(fs.existsSync(targetFile), 'missing R6.9 Pane visual fixture');
  const expected = fs.readFileSync(targetFile);
  let actual;
  let matches = false;
  for (let attempt = 0; attempt < 5 && !matches; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await evaluate(cdp, `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    }
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    actual = Buffer.from(data, 'base64');
    matches = isStableVisual(actual, expected);
  }
  if (!matches) fs.writeFileSync(path.join(os.tmpdir(), 'v7-layout-workspace-actual.png'), actual);
  assert.equal(matches, true, 'R6.9 Pane visual fixture changed');
}

function layoutStateExpression() {
  return `(() => {
    const root = document.querySelector('.replay-workspace');
    return {
      cursor: root.dataset.cursorText,
      layoutId: root.dataset.layoutId,
      paneCount: Number(root.dataset.paneCount),
      replayRevision: Number(root.dataset.replayRevision),
      rootRatio: Number(document.querySelector('[data-split-id="root"][role="separator"]')?.getAttribute('aria-valuenow')),
      workspaceRevision: Number(root.dataset.workspaceRevision),
      panes: [...document.querySelectorAll('.workspace-pane:not(.is-prepared)')].map((pane) => {
        const host = pane.querySelector('.lightweight-chart-host');
        const rect = pane.getBoundingClientRect();
        return {
          barCount: Number(host.dataset.barCount),
          height: rect.height,
          instrumentId: host.dataset.instrumentId,
          left: rect.left,
          paneId: pane.dataset.paneId,
          sessionHoursMode: host.dataset.sessionHoursMode,
          timeframeId: host.dataset.displayTimeframeId,
          top: rect.top,
          visibleRevision: Number(host.dataset.visibleRevision),
          width: rect.width,
        };
      }),
    };
  })()`;
}

async function chooseLayout(cdp, layoutId) {
  await evaluate(cdp, `(() => {
    const toggle = document.querySelector('.pane-layout-toggle');
    if (toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
    document.querySelector('[data-layout-id=${JSON.stringify(layoutId)}]').click();
  })()`);
}

async function moveCrosshairToCandle(cdp, paneId) {
  const bounds = await evaluate(cdp, `(() => {
    const rect = document.querySelector(${JSON.stringify(`[data-pane-id="${paneId}"] .lightweight-chart-host`)})
      .getBoundingClientRect();
    return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
  })()`);
  for (const ratio of [.12, .2, .28, .36, .44, .52, .6, .68, .76]) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: bounds.left + (bounds.right - bounds.left) * ratio,
      y: bounds.top + (bounds.bottom - bounds.top) * .45,
      button: 'none',
      buttons: 0,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const state = await evaluate(cdp,
      `document.querySelector(${JSON.stringify(`[data-pane-id="${paneId}"]`)})?.dataset.ohlcState`);
    if (state === 'selected') return bounds;
  }
  throw new Error(`No candle crosshair point resolved for ${paneId}.`);
}

async function clickPaneControl(cdp, paneId, selector) {
  const point = await evaluate(cdp, `(() => {
    const rect = document.querySelector(${JSON.stringify(`[data-pane-id="${paneId}"] ${selector}`)})
      .getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: point.x, y: point.y, button: 'none', buttons: 0,
  });
  await waitFor(cdp, `getComputedStyle(document.querySelector(${JSON.stringify(
    `[data-pane-id="${paneId}"] .pane-overlay-controls`,
  )})).opacity === '1'`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: point.x, y: point.y, button: 'left', buttons: 1, clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: point.x, y: point.y, button: 'left', buttons: 0, clickCount: 1,
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
    form.elements.name.value = 'R6.9 Layout Review';
    for (const input of form.querySelectorAll('[name="instrument"]')) input.checked = true;
    form.elements.start.value = '2026-05-04T12:40';
    form.elements.end.value = '2026-05-06T16:00';
    form.requestSubmit();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'`, 12_000);

  assert.deepEqual(await evaluate(cdp, `(() => {
    const root = document.querySelector('.replay-workspace');
    return {
      symbol: root.dataset.layoutSyncSymbol,
      interval: root.dataset.layoutSyncInterval,
      crosshair: root.dataset.layoutSyncCrosshair,
      time: root.dataset.layoutSyncTime,
      dateRange: root.dataset.layoutSyncDateRange,
    };
  })()`), {
    symbol: 'true', interval: 'false', crosshair: 'false', time: 'false', dateRange: 'false',
  }, 'a newly configured Session must project the reviewed Layout Sync defaults');

  const singleHeader = await evaluate(cdp, `(() => {
    const pane = document.querySelector('[data-pane-id="pane-main"]');
    const header = pane.querySelector('.workspace-pane-header');
    const host = pane.querySelector('.lightweight-chart-host');
    const ohlc = pane.querySelector('.pane-ohlc');
    const activeBorder = getComputedStyle(pane, '::after');
    const paneRect = pane.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    return {
      borderColor: activeBorder.borderTopColor,
      borderWidth: activeBorder.borderTopWidth,
      changeText: pane.querySelector('.pane-change').textContent,
      controlsOpacity: getComputedStyle(pane.querySelector('.pane-overlay-controls')).opacity,
      crosshairDisabled: document.querySelector('.pane-crosshair-sync input').disabled,
      headerFontSize: parseFloat(getComputedStyle(header).fontSize),
      headerPosition: getComputedStyle(header).position,
      hostTopDelta: Math.abs(hostRect.top - paneRect.top),
      maximizeDisplay: getComputedStyle(pane.querySelector('.pane-maximize')).display,
      ohlcState: pane.dataset.ohlcState,
      ohlcText: ohlc.textContent,
      timeframe: pane.querySelector('.pane-timeframe').textContent,
    };
  })()`);
  assert.equal(singleHeader.ohlcState, 'latest');
  assert.match(singleHeader.ohlcText, /O\d+\.\d{2}H\d+\.\d{2}L\d+\.\d{2}C\d+\.\d{2}/);
  assert.match(singleHeader.changeText, /^[+-]?\d+\.\d{2}\([+-]?\d+\.\d{2}%\)$/);
  assert.equal(singleHeader.timeframe, '1', 'minute Pane labels omit the m unit');
  assert.equal(singleHeader.headerPosition, 'absolute');
  assert.ok(singleHeader.headerFontSize >= 10);
  assert.ok(singleHeader.hostTopDelta < 1, 'Pane Canvas must extend behind its integrated status overlay');
  assert.equal(singleHeader.controlsOpacity, '0', 'Pane-local controls remain hidden until hover/focus');
  assert.equal(singleHeader.maximizeDisplay,
    overlayCases.get('single-pane-maximize-unavailable').expectedDisplay,
    'single Pane does not expose a meaningless maximize action');
  const resetCase = overlayCases.get('reset-is-pane-local');
  assert.equal(await evaluate(cdp, `document.querySelector(${JSON.stringify(resetCase.forbiddenSelector)})`), null);
  assert.equal(await evaluate(cdp, `document.querySelectorAll(${JSON.stringify(resetCase.requiredSelector)}).length`), 1);
  const controlHoverPoint = await evaluate(cdp, `(() => {
    const rect = document.querySelector('[data-pane-id="pane-main"]').getBoundingClientRect();
    return { x: rect.right - 14, y: rect.top + 14 };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: controlHoverPoint.x, y: controlHoverPoint.y, button: 'none', buttons: 0,
  });
  await waitFor(cdp, `getComputedStyle(document.querySelector('.pane-overlay-controls')).opacity === '1'`);
  assert.equal(singleHeader.borderWidth, '2px');
  assert.notEqual(singleHeader.borderColor, 'rgba(0, 0, 0, 0)');
  assert.equal(singleHeader.crosshairDisabled, true,
    'Crosshair sync is meaningful only when multiple Panes are visible');
  const singleBounds = await moveCrosshairToCandle(cdp, 'pane-main');
  assert.equal(await evaluate(cdp,
    `document.querySelector('[data-pane-id="pane-main"]').dataset.ohlcState`), 'selected');
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: singleBounds.right - 90,
    y: singleBounds.top + (singleBounds.bottom - singleBounds.top) * .45,
    button: 'none',
    buttons: 0,
  });
  await waitFor(cdp,
    `document.querySelector('[data-pane-id="pane-main"]')?.dataset.ohlcState === 'latest'`);

  await evaluate(cdp, `document.querySelector('.pane-layout-toggle').click()`);
  const menuEvidence = await evaluate(cdp, `(() => ({
    counts: [...document.querySelectorAll('.pane-layout-menu-row')].map((row) => row.querySelectorAll('.pane-layout-option').length),
    expanded: document.querySelector('.pane-layout-toggle').getAttribute('aria-expanded'),
    optionCount: document.querySelectorAll('.pane-layout-option').length,
  }))()`);
  assert.deepEqual(menuEvidence, { counts: [1, 2, 4, 5], expanded: 'true', optionCount: 12 });
  await evaluate(cdp, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);

  await chooseLayout(cdp, 'layout.two-columns');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '2'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);
  let state = await evaluate(cdp, layoutStateExpression());
  assert.deepEqual(state.panes.map(({ paneId }) => paneId), ['pane-main', 'pane-secondary']);
  const twoColumns = state;

  const secondaryClickPoint = await evaluate(cdp, `(() => {
    const rect = document.querySelector('[data-pane-id="pane-secondary"] .lightweight-chart-host')
      .getBoundingClientRect();
    return { x: rect.left + rect.width * .45, y: rect.top + rect.height * .4 };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: secondaryClickPoint.x, y: secondaryClickPoint.y, button: 'none', buttons: 0,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: secondaryClickPoint.x, y: secondaryClickPoint.y,
    button: 'left', buttons: 1, clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: secondaryClickPoint.x, y: secondaryClickPoint.y,
    button: 'left', buttons: 0, clickCount: 1,
  });
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.activePaneId === 'pane-secondary'`);
  const pointerFocusCase = overlayCases.get('pointer-focus-does-not-pin-controls');
  await waitFor(cdp, `getComputedStyle(document.querySelector(
    '[data-pane-id="pane-secondary"] .pane-overlay-controls'
  )).opacity === ${JSON.stringify(pointerFocusCase.expectedHoveredOpacity)}`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: 16, y: 18, button: 'none', buttons: 0,
  });
  await waitFor(cdp, `[...document.querySelectorAll('.pane-overlay-controls')]
    .every((controls) => getComputedStyle(controls).opacity === ${JSON.stringify(
    pointerFocusCase.expectedExitedOpacity,
  )})`);
  if (pointerFocusCase.preserveActivePane) {
    assert.equal(await evaluate(cdp,
      `document.querySelector('.replay-workspace')?.dataset.activePaneId`), 'pane-secondary',
    'pointer exit must hide controls without changing the active Pane');
  }
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9,
  });
  await waitFor(cdp, `document.activeElement?.matches(
    '[data-pane-id="pane-secondary"] .pane-maximize:focus-visible'
  )`);
  await waitFor(cdp, `getComputedStyle(document.querySelector(
    '[data-pane-id="pane-secondary"] .pane-overlay-controls'
  )).opacity === ${JSON.stringify(pointerFocusCase.expectedKeyboardOpacity)}`);
  await evaluate(cdp, 'document.activeElement.blur()');
  await waitFor(cdp, `getComputedStyle(document.querySelector(
    '[data-pane-id="pane-secondary"] .pane-overlay-controls'
  )).opacity === ${JSON.stringify(pointerFocusCase.expectedExitedOpacity)}`);
  const borderEvidence = await evaluate(cdp, `(() => ({
    inactive: getComputedStyle(document.querySelector('[data-pane-id="pane-main"]'), '::after').borderTopColor,
    active: getComputedStyle(document.querySelector('[data-pane-id="pane-secondary"]'), '::after').borderTopColor,
  }))()`);
  assert.notEqual(borderEvidence.active, borderEvidence.inactive,
    `active Pane border must be visually distinct: ${JSON.stringify(borderEvidence)}`);

  const beforeMaximize = await evaluate(cdp, layoutStateExpression());
  const normalSecondary = beforeMaximize.panes.find(({ paneId }) => paneId === 'pane-secondary');
  const controlGeometry = await evaluate(cdp, `(() => {
    const pane = document.querySelector('[data-pane-id="pane-secondary"]');
    const controls = pane.querySelector('.pane-overlay-controls');
    const maximize = pane.querySelector('.pane-maximize');
    const reset = pane.querySelector('.pane-reset');
    const paneRect = pane.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    const maximizeRect = maximize.getBoundingClientRect();
    const resetRect = reset.getBoundingClientRect();
    return {
      bottomInset: paneRect.bottom - controlsRect.bottom,
      flexDirection: getComputedStyle(controls).flexDirection,
      horizontalDelta: Math.abs(maximizeRect.left - resetRect.left),
      rightInset: paneRect.right - controlsRect.right,
      verticalGap: resetRect.top - maximizeRect.bottom,
    };
  })()`);
  const maximizeCase = overlayCases.get('maximize-is-transient-and-keeps-two-charts-mounted');
  assert.equal(controlGeometry.flexDirection, 'column');
  assert.ok(controlGeometry.horizontalDelta < 1 && controlGeometry.verticalGap >= 4,
    `Pane controls must form one vertical stack: ${JSON.stringify(controlGeometry)}`);
  assert.ok(controlGeometry.rightInset >= maximizeCase.minimumRightInsetPx,
    `Pane controls must remain left of the price scale: ${JSON.stringify(controlGeometry)}`);
  assert.ok(controlGeometry.bottomInset >= maximizeCase.minimumBottomInsetPx,
    `Pane controls must remain above the time scale: ${JSON.stringify(controlGeometry)}`);
  await clickPaneControl(cdp, 'pane-secondary', '.pane-maximize');
  await waitFor(cdp, `document.querySelector('.workspace-pane-grid')?.dataset.maximizedPaneId === 'pane-secondary'`);
  const maximized = await evaluate(cdp, `(() => {
    const workspace = document.querySelector('.replay-workspace');
    const grid = document.querySelector('.workspace-pane-grid');
    const pane = document.querySelector('[data-pane-id="pane-secondary"]');
    const other = document.querySelector('[data-pane-id="pane-main"]');
    const button = pane.querySelector('.pane-maximize');
    const gridRect = grid.getBoundingClientRect();
    const paneRect = pane.getBoundingClientRect();
    return {
      buttonLabel: button.getAttribute('aria-label'),
      buttonPressed: button.getAttribute('aria-pressed'),
      mountedPaneCount: [...document.querySelectorAll('.workspace-pane:not(.is-prepared)')]
        .filter((item) => item.querySelector('.lightweight-chart-host canvas')).length,
      heightDelta: Math.abs(gridRect.height - paneRect.height),
      layoutId: workspace.dataset.layoutId,
      otherAriaHidden: other.getAttribute('aria-hidden'),
      otherClass: other.className,
      otherOpacity: other.style.opacity,
      paneCount: Number(workspace.dataset.paneCount),
      replayRevision: Number(workspace.dataset.replayRevision),
      widthDelta: Math.abs(gridRect.width - paneRect.width),
      workspaceRevision: Number(workspace.dataset.workspaceRevision),
    };
  })()`);
  assert.deepEqual(maximized, {
    buttonLabel: 'Restore pane-secondary chart',
    buttonPressed: 'true',
    mountedPaneCount: maximizeCase.expectedPaneCount,
    heightDelta: 0,
    layoutId: 'layout.two-columns',
    otherAriaHidden: 'true',
    otherClass: 'workspace-pane is-layout-hidden',
    otherOpacity: maximizeCase.expectedHiddenOpacity,
    paneCount: 2,
    replayRevision: beforeMaximize.replayRevision,
    widthDelta: 0,
    workspaceRevision: beforeMaximize.workspaceRevision,
  }, 'maximize is a transient outer-DOM presentation and keeps every chart mounted');
  await capture(cdp, maximizeVisualFile);
  await clickPaneControl(cdp, 'pane-secondary', '.pane-maximize');
  await waitFor(cdp, `document.querySelector('.workspace-pane-grid')?.dataset.maximizedPaneId === 'none'`);
  const restoredSecondary = (await evaluate(cdp, layoutStateExpression())).panes
    .find(({ paneId }) => paneId === 'pane-secondary');
  assert.ok(Math.abs(restoredSecondary.left - normalSecondary.left) < 1
    && Math.abs(restoredSecondary.width - normalSecondary.width) < 1,
  'restore must recover the exact accepted layout geometry');

  const beforeCrosshair = await evaluate(cdp, layoutStateExpression());
  await moveCrosshairToCandle(cdp, 'pane-main');
  let crosshairState = await evaluate(cdp, `(() => ({
    activePaneId: document.querySelector('.replay-workspace').dataset.activePaneId,
    main: document.querySelector('[data-pane-id="pane-main"]').dataset.ohlcState,
    secondary: document.querySelector('[data-pane-id="pane-secondary"]').dataset.ohlcState,
  }))()`);
  assert.deepEqual(crosshairState, {
    activePaneId: 'pane-secondary', main: 'selected', secondary: 'latest',
  }, 'a non-active Pane must own its native crosshair while other Panes show latest OHLC');
  await evaluate(cdp, `(() => {
    document.querySelector('.pane-layout-toggle').click();
    document.querySelector('.pane-crosshair-sync input').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.crosshairSync === 'true'`);
  await moveCrosshairToCandle(cdp, 'pane-main');
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-secondary"]')?.dataset.ohlcState === 'selected'`);
  crosshairState = await evaluate(cdp, `(() => ({
    activePaneId: document.querySelector('.replay-workspace').dataset.activePaneId,
    main: document.querySelector('[data-pane-id="pane-main"]').dataset.ohlcState,
    projectedOrigin: document.querySelector('[data-pane-id="pane-secondary"] .lightweight-chart-host')
      .dataset.crosshairOrigin,
    replayRevision: Number(document.querySelector('.replay-workspace').dataset.replayRevision),
    secondary: document.querySelector('[data-pane-id="pane-secondary"]').dataset.ohlcState,
    workspaceRevision: Number(document.querySelector('.replay-workspace').dataset.workspaceRevision),
  }))()`);
  assert.deepEqual(crosshairState, {
    activePaneId: 'pane-secondary',
    main: 'selected',
    projectedOrigin: 'projected',
    replayRevision: beforeCrosshair.replayRevision,
    secondary: 'selected',
    workspaceRevision: beforeCrosshair.workspaceRevision,
  }, 'Sync crosshair must project to every Pane without changing focus, Replay, or Workspace');
  await waitFor(cdp, `getComputedStyle(document.querySelector(
    '[data-pane-id="pane-main"] .pane-overlay-controls'
  )).opacity === '1'`);
  await capture(cdp, syncVisualFile);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: 700, y: 18, button: 'none', buttons: 0,
  });
  await waitFor(cdp, `[...document.querySelectorAll('.workspace-pane:not(.is-prepared)')]
    .every((pane) => pane.dataset.ohlcState === 'latest')`);

  await chooseLayout(cdp, 'layout.two-rows');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.layoutId === 'layout.two-rows'`);
  state = await evaluate(cdp, layoutStateExpression());
  assert.equal(state.workspaceRevision, twoColumns.workspaceRevision,
    'same-count layout changes must not issue a Pane materialization');
  assert.equal(state.replayRevision, twoColumns.replayRevision,
    'same-count layout changes must not move Replay');

  await chooseLayout(cdp, 'layout.three-right-stack');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '3'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);
  state = await evaluate(cdp, layoutStateExpression());
  assert.equal(state.panes.length, 3);
  assert.ok(state.panes.every(({ barCount }) => barCount > 0));

  await chooseLayout(cdp, 'layout.four-grid');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.paneCount === '4'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);
  await evaluate(cdp, `document.querySelector('[data-pane-id="pane-quaternary"]')
    .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.activePaneId === 'pane-quaternary'`);
  await evaluate(cdp, `(() => {
    const select = document.querySelector('.market-symbol-select');
    select.value = 'instrument.cme.es';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-quaternary"]')?.dataset.instrumentId === 'instrument.cme.es'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);
  await evaluate(cdp, `(() => {
    document.querySelector('.timeframe-toggle').click();
    document.querySelector('[data-timeframe-id="timeframe.display-4-hour"]').click();
  })()`);
  await waitFor(cdp, `document.querySelector('[data-pane-id="pane-quaternary"]')?.dataset.timeframeId === 'timeframe.display-4-hour'
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);

  const beforeSameCount = await evaluate(cdp, layoutStateExpression());
  await chooseLayout(cdp, 'layout.four-left-stack');
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.layoutId === 'layout.four-left-stack'`);
  state = await evaluate(cdp, layoutStateExpression());
  assert.equal(state.workspaceRevision, beforeSameCount.workspaceRevision);
  assert.equal(state.replayRevision, beforeSameCount.replayRevision);
  assert.equal(state.panes.at(-1).instrumentId, 'instrument.cme.es');
  assert.equal(state.panes.at(-1).timeframeId, 'timeframe.display-4-hour');

  await moveCrosshairToCandle(cdp, 'pane-main');
  await waitFor(cdp, `[...document.querySelectorAll('.workspace-pane:not(.is-prepared)')]
    .filter((pane) => pane.dataset.paneId !== 'pane-quaternary')
    .every((pane) => pane.dataset.ohlcState === 'selected')`);
  const mixedCrosshair = await evaluate(cdp, `(() => ({
    quaternary: document.querySelector('[data-pane-id="pane-quaternary"]').dataset.ohlcState,
    quaternaryOrigin: document.querySelector('[data-pane-id="pane-quaternary"] .lightweight-chart-host')
      .dataset.crosshairOrigin,
  }))()`);
  assert.deepEqual(mixedCrosshair, { quaternary: 'latest', quaternaryOrigin: 'projected' },
    'a synchronized target without an exact mixed-TF candle must retain its latest OHLC');
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: 700, y: 18, button: 'none', buttons: 0,
  });
  await waitFor(cdp, `[...document.querySelectorAll('.workspace-pane:not(.is-prepared)')]
    .every((pane) => pane.dataset.ohlcState === 'latest')`);

  const beforeResize = state;
  const drag = await evaluate(cdp, `(() => {
    const split = document.querySelector('.workspace-pane-split[data-split-id="root"]');
    const divider = split.querySelector(':scope > .workspace-pane-divider');
    const splitRect = split.getBoundingClientRect();
    const dividerRect = divider.getBoundingClientRect();
    return {
      startX: dividerRect.left + dividerRect.width / 2,
      startY: dividerRect.top + dividerRect.height / 2,
      targetX: splitRect.left + splitRect.width * .6,
    };
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: drag.startX, y: drag.startY, button: 'none', buttons: 0,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: drag.startX, y: drag.startY, button: 'left', buttons: 1, clickCount: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: drag.targetX, y: drag.startY, button: 'left', buttons: 1,
  });
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: drag.targetX, y: drag.startY, button: 'left', buttons: 0, clickCount: 1,
  });
  await waitFor(cdp, `Number(document.querySelector('[data-split-id="root"][role="separator"]')?.getAttribute('aria-valuenow')) >= 58`);
  state = await evaluate(cdp, layoutStateExpression());
  assert.equal(state.workspaceRevision, beforeResize.workspaceRevision,
    'dragging a divider must not issue a Pane transaction');
  assert.equal(state.replayRevision, beforeResize.replayRevision,
    'dragging a divider must not move Replay');
  assert.ok(state.panes.every(({ height, width }) => height >= 120 && width >= 280),
    `every Pane must retain its minimum size: ${JSON.stringify(state.panes)}`);
  const draggedRatio = state.rootRatio;
  await evaluate(cdp, `(() => {
    const divider = document.querySelector('[data-split-id="root"][role="separator"]');
    divider.focus();
    divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  })()`);
  await waitFor(cdp, `Number(document.querySelector('[data-split-id="root"][role="separator"]')?.getAttribute('aria-valuenow'))
    <= ${draggedRatio - 4}`);
  state = await evaluate(cdp, layoutStateExpression());
  assert.equal(state.workspaceRevision, beforeResize.workspaceRevision,
    'keyboard divider resize must not issue a Pane transaction');
  assert.equal(state.replayRevision, beforeResize.replayRevision,
    'keyboard divider resize must not move Replay');
  const persistedRatio = state.rootRatio;

  await evaluate(cdp, `document.querySelector('.session-hours-control [data-value="rth"]').click()`);
  await waitFor(cdp, `[...document.querySelectorAll('.lightweight-chart-host')]
    .every((host) => host.dataset.sessionHoursMode === 'rth')
    && document.querySelector('.replay-workspace')?.getAttribute('aria-busy') === 'false'`, 12_000);
  const beforeNext = await evaluate(cdp, layoutStateExpression());
  await evaluate(cdp, `document.querySelector('.replay-next').click()`);
  await waitFor(cdp, `Number(document.querySelector('.replay-workspace')?.dataset.workspaceRevision) > ${beforeNext.workspaceRevision}`);
  state = await evaluate(cdp, layoutStateExpression());
  assert.ok(state.panes.every(({ sessionHoursMode }) => sessionHoursMode === 'rth'));
  assert.ok(state.panes.every((pane, index) => pane.visibleRevision > beforeNext.panes[index].visibleRevision),
    'one shared Next must visibly update all four Panes');
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved', x: 700, y: 18, button: 'none', buttons: 0,
  });
  await waitFor(cdp, `[...document.querySelectorAll('.workspace-pane:not(.is-prepared)')]
    .every((pane) => pane.dataset.ohlcState === 'latest')`);
  await capture(cdp);

  await evaluate(cdp, `document.querySelector('.replay-back').click()`);
  await waitFor(cdp, `document.querySelector('#app')?.dataset.screen === 'list'`);
  await evaluate(cdp, `(() => {
    const card = [...document.querySelectorAll('.session-card')]
      .find((item) => item.querySelector('h3')?.textContent === 'R6.9 Layout Review');
    card.querySelector('.open-session-button').click();
  })()`);
  await waitFor(cdp, `document.querySelector('.replay-workspace')?.dataset.viewState === 'ready'
    && document.querySelector('.replay-workspace')?.dataset.layoutId === 'layout.four-left-stack'
    && document.querySelector('.replay-workspace')?.dataset.paneCount === '4'`, 15_000);
  const restored = await evaluate(cdp, layoutStateExpression());
  assert.ok(Math.abs(restored.rootRatio - persistedRatio) <= 1,
    `Session re-entry must restore the accepted divider ratio: ${JSON.stringify({ persistedRatio, restored: restored.rootRatio })}`);
  assert.equal(restored.panes.length, 4);
  assert.deepEqual(await evaluate(cdp, `(() => ({
    checked: document.querySelector('.pane-crosshair-sync input').checked,
    crosshair: document.querySelector('.replay-workspace').dataset.layoutSyncCrosshair,
  }))()`), { checked: true, crosshair: 'true' },
  'Session re-entry must restore the accepted Crosshair synchronization policy');
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
  await new Promise((resolve) => server.close(resolve));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      fs.rmSync(userDataDirectory, { force: true, recursive: true });
      break;
    } catch (error) {
      if (error.code !== 'ENOTEMPTY' || attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

console.log('v7 Replay Layout Workspace browser harness passed', {
  scope: '12 layouts, Canvas OHLC/change, transient maximize, Layout Sync persistence, resize persistence, shared Replay/ETH-RTH',
});
